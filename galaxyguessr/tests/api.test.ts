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

test('names are case-insensitively unique, anonymous posting hides names, and claims are atomic', () => fixture(async alice => {
  const first = await alice.mission('planets')
  await alice.request('scores', { ...first, name: 'Orbit_One', anonymous: false })
  const bob = alice.other(); const second = await bob.mission('planets')
  assert.equal((await bob.request('scores', { ...second, name: 'orbit_one', anonymous: false })).status, 409)
  assert.equal((await bob.request('leaderboard?category=planets')).data.entries.length, 1)
  assert.equal((await bob.request('scores', { ...second, anonymous: true })).status, 201)
  assert.equal((await bob.request('leaderboard?category=planets')).data.entries.length, 2)
  const next = await alice.mission('moons')
  assert.equal((await alice.request('scores', { ...next, anonymous: true })).status, 201)
  assert.ok((await bob.request('leaderboard?category=overall')).data.entries.every((r: { name: string }) => r.name === 'Anonymous'))
  assert.equal((await bob.request('scores', { ...second, name: 'ORBIT_ONE', anonymous: false })).status, 409)
}))

test('invalid, foreign, incomplete, and replayed results are rejected', () => fixture(async alice => {
  assert.equal((await alice.request('missions', { category: 'imaginary' })).status, 400)
  assert.equal((await alice.request('missions', { category: 'planets' }, 'http://elsewhere.test')).status, 403)
  const mission = await alice.mission('planets')
  assert.equal((await alice.other().request('scores', { ...mission, anonymous: true })).status, 404)
  assert.equal((await alice.request('scores', { ...mission, rounds: mission.rounds.slice(0, 4), anonymous: true })).status, 400)
  const invalid = structuredClone(mission); invalid.rounds[0].guessId = 'moon'
  assert.equal((await alice.request('scores', { ...invalid, anonymous: true })).status, 400)
  const duplicate = structuredClone(mission); duplicate.rounds[1].locationId = duplicate.rounds[0].locationId
  assert.equal((await alice.request('scores', { ...duplicate, anonymous: true })).status, 400)
  const badHint = structuredClone(mission); badHint.rounds[0].hints = -1
  assert.equal((await alice.request('scores', { ...badHint, anonymous: true })).status, 400)
  const time = structuredClone(mission); time.rounds[0].seconds = 7000
  assert.equal((await alice.request('scores', { ...time, anonymous: true })).status, 400)
  assert.equal((await alice.request('scores', { ...mission, name: 'Anonymous', anonymous: false })).status, 400)
  assert.equal((await alice.request('scores', { ...mission, anonymous: true })).status, 201)
  mission.rounds[0].hints = 1
  assert.equal((await alice.request('scores', { ...mission, anonymous: true })).status, 409)
}))

test('unconfigured hosted storage reports unavailability honestly', async () => {
  const response = await handleApi(new Request('https://game.test/api/leaderboard'), {})
  assert.equal(response.status, 503)
})
