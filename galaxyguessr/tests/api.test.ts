import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { handleApi } from '../server/api'
import { localDatabase } from '../scripts/local-database'
import type { CategoryId, RoundResult } from '../src/game'

async function fixture(run: (client: ReturnType<typeof makeClient>) => Promise<void>) {
  const directory = mkdtempSync(path.join(tmpdir(), 'galaxyguessr-api-test-'))
  const DB = localDatabase(path.join(directory, 'test.sqlite'))
  function makeClient() {
    let cookie = ''
    async function request(route: string, body?: unknown, origin = 'http://game.test') {
      const response = await handleApi(new Request(`http://game.test/api/${route}`, {
        method: body === undefined ? 'GET' : 'POST', headers: { cookie, origin, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }), { DB })
      if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie')!.split(';')[0]
      return { status: response.status, data: await response.json() }
    }
    async function mission(category: CategoryId) {
      const response = await request('missions', { category }); assert.equal(response.status, 201)
      const rounds: RoundResult[] = response.data.destinations.map((id: string) => ({ locationId: id, guessId: id, seconds: 0, hints: 0, score: 999999 }))
      return { missionId: response.data.id as string, rounds }
    }
    return { request, mission, other: makeClient }
  }
  try { await run(makeClient()) } finally { rmSync(directory, { recursive: true, force: true }) }
}

test('shared rankings recalculate scores, retain personal bests, and aggregate specialist categories', () => fixture(async alice => {
  assert.equal((await alice.request('auth/register', {username:'Nova',password:'space-password-123'})).status, 201)
  const planets = await alice.mission('planets')
  assert.equal((await alice.request('scores', { ...planets, name: 'Nova', anonymous: false })).data.score, 25000)
  assert.equal((await alice.request('scores', { ...planets, name: 'Nova', anonymous: false })).status, 200)
  const worse = await alice.mission('planets'); worse.rounds.forEach(r => { r.hints = 1 })
  assert.equal((await alice.request('scores', { ...worse, name: 'Nova', anonymous: false })).data.score, 22500)
  const moons = await alice.mission('moons')
  await alice.request('scores', { ...moons, name: 'Nova', anonymous: false })
  const mixed = await alice.mission('all')
  await alice.request('scores', { ...mixed, name: 'Nova', anonymous: false })
  const bob = alice.other()
  const shared = await bob.request('leaderboard?category=planets')
  assert.equal(shared.data.entries.length, 1)
  assert.equal(shared.data.entries[0].score, 25000)
  assert.equal(shared.data.entries[0].name, 'Nova')
  const overall = await bob.request('leaderboard?category=overall')
  assert.equal(overall.data.entries[0].score, 50000)
  assert.equal(overall.data.entries[0].categories, 2)
  assert.equal((await bob.request('leaderboard?category=all')).data.entries[0].score, 25000)
  assert.deepEqual((await bob.request('leaderboard?category=stars')).data.entries, [])
}))

test('accounts require authentication, preserve guest missions, and work across browsers', () => fixture(async alice => {
  const mission = await alice.mission('planets')
  assert.equal((await alice.request('scores', mission)).status, 401)
  assert.equal((await alice.request('auth/register', {username:'Orbit_One',password:'space-password-123'})).status, 201)
  assert.equal((await alice.request('scores', {...mission, name:'Spoofed', anonymous:true})).status, 201)
  const bob = alice.other()
  assert.equal((await bob.request('auth/register', {username:'orbit_one',password:'other-password-123'})).status, 409)
  assert.equal((await bob.request('auth/login', {username:'Orbit_One',password:'incorrect-password'})).status, 401)
  assert.equal((await bob.request('auth/login', {username:'ORBIT_ONE',password:'space-password-123'})).status, 200)
  assert.equal((await bob.request('auth/me')).data.user.username, 'Orbit_One')
  const second = await bob.mission('moons')
  assert.equal((await bob.request('scores', second)).status, 201)
  const board = await alice.request('leaderboard?category=overall')
  assert.equal(board.data.entries[0].name, 'Orbit_One')
  assert.equal(board.data.entries[0].score, 50000)
  assert.equal((await bob.request('auth/logout', {})).status, 200)
  assert.equal((await bob.request('auth/me')).data.user, null)
  assert.equal((await bob.request('scores', second)).status, 401)
}))

test('account validation, same-origin enforcement and rate limiting', () => fixture(async client => {
  assert.equal((await client.request('auth/register', {username:'xx',password:'short'})).status, 400)
  assert.equal((await client.request('auth/register', {username:'Valid',password:'long-password'}, 'http://elsewhere.test')).status, 403)
  for (let i=0;i<10;i++) assert.equal((await client.request('auth/login', {username:'Missing',password:'long-password'})).status,401)
  assert.equal((await client.request('auth/login', {username:'Missing',password:'long-password'})).status,429)
}))

test('invalid, foreign, incomplete, and replayed results are rejected', () => fixture(async alice => {
  assert.equal((await alice.request('missions', { category: 'imaginary' })).status, 400)
  assert.equal((await alice.request('missions', { category: 'planets' }, 'http://elsewhere.test')).status, 403)
  const mission = await alice.mission('planets')
  assert.equal((await alice.other().request('scores', { ...mission, anonymous: true })).status, 401)
  await alice.request('auth/register', {username:'Explorer',password:'space-password-123'})
  const other = alice.other(); await other.request('auth/register', {username:'OtherExplorer',password:'space-password-123'})
  assert.equal((await other.request('scores', mission)).status,404)
  assert.equal((await alice.request('scores', { ...mission, rounds: mission.rounds.slice(0, 4), anonymous: true })).status, 400)
  const invalid = structuredClone(mission); invalid.rounds[0].guessId = 'moon'
  assert.equal((await alice.request('scores', { ...invalid, anonymous: true })).status, 400)
  const duplicate = structuredClone(mission); duplicate.rounds[1].locationId = duplicate.rounds[0].locationId
  assert.equal((await alice.request('scores', { ...duplicate, anonymous: true })).status, 400)
  const badHint = structuredClone(mission); badHint.rounds[0].hints = -1
  assert.equal((await alice.request('scores', { ...badHint, anonymous: true })).status, 400)
  const time = structuredClone(mission); time.rounds[0].seconds = 7000
  assert.equal((await alice.request('scores', { ...time, anonymous: true })).status, 400)
  assert.equal((await alice.request('scores', { ...mission, anonymous: true })).status, 201)
  mission.rounds[0].hints = 1
  assert.equal((await alice.request('scores', { ...mission, anonymous: true })).status, 409)
}))

test('unconfigured hosted storage reports unavailability honestly', async () => {
  const response = await handleApi(new Request('https://game.test/api/leaderboard'), {})
  assert.equal(response.status, 503)
})
