import { createMission, isCategory, locations, scoreRound } from '../src/game'
import type { RoundResult } from '../src/game'

export interface Statement {
  bind(...values: unknown[]): Statement
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results: T[] }>
  run(): Promise<unknown>
}
export interface Database { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown> }
export type ApiEnv = { DB?: Database }
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } })
const cookieName = 'galaxy-explorer'
type MissionRow = { id: string; player_id: string; category: string; destinations: string; created_at: number }

export async function handleApi(request: Request, env: ApiEnv): Promise<Response> {
  const url = new URL(request.url)
  if (!env.DB) return json({ error: 'Leaderboards are temporarily unavailable. You can still play an expedition.' }, 503)
  const db = env.DB
  let player = request.headers.get('cookie')?.match(/(?:^|;\s*)galaxy-explorer=([a-f0-9-]{36})(?:;|$)/)?.[1]
  const headers: Record<string, string> = {}
  if (!player) {
    player = crypto.randomUUID()
    headers['Set-Cookie'] = `${cookieName}=${player}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${url.protocol === 'https:' ? '; Secure' : ''}`
  }
  const respond = (data: unknown, status = 200) => json(data, status, headers)
  try {
    if (request.method === 'GET' && url.pathname === '/api/leaderboard') {
      const category = url.searchParams.get('category') ?? 'overall'
      if (category !== 'overall' && !isCategory(category)) return respond({ error: 'Choose a valid leaderboard.' }, 400)
      // Rank each explorer's best attempt per category, with elapsed time breaking ties.
      const best = `WITH best AS (
        SELECT s.*, ROW_NUMBER() OVER (PARTITION BY player_id, category ORDER BY score DESC, seconds ASC, created_at ASC, mission_id ASC) AS attempt
        FROM scores s ${category === 'overall' ? "WHERE category <> 'all'" : 'WHERE category = ?'}
      )`
      const sql = category === 'overall'
        ? `${best} SELECT COALESCE(p.public_name, 'Anonymous') AS name, SUM(b.score) AS score, SUM(b.seconds) AS seconds,
            SUM(b.correct) AS correct, COUNT(*) AS categories, MAX(b.created_at) AS achieved_at
            FROM best b JOIN players p ON p.id = b.player_id WHERE attempt = 1
            GROUP BY b.player_id ORDER BY score DESC, seconds ASC, achieved_at ASC, b.player_id ASC LIMIT 50`
        : `${best} SELECT COALESCE(p.public_name, 'Anonymous') AS name, b.score, b.seconds, b.correct, 1 AS categories, b.created_at AS achieved_at
            FROM best b JOIN players p ON p.id = b.player_id WHERE attempt = 1
            ORDER BY b.score DESC, b.seconds ASC, b.created_at ASC, b.player_id ASC LIMIT 50`
      const statement = db.prepare(sql)
      const { results } = await (category === 'overall' ? statement : statement.bind(category)).all()
      return respond({ entries: results, category })
    }
    if (request.method !== 'POST') return respond({ error: 'Not found.' }, 404)
    // Browser writes must originate on this site; no permissive CORS on score submission.
    const origin = request.headers.get('origin')
    if (origin && origin !== url.origin) return respond({ error: 'Please submit from the game website.' }, 403)
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return respond({ error: 'Expected JSON.' }, 415)
    const raw = await request.text()
    if (raw.length > 8192) return respond({ error: 'Request too large.' }, 413)
    let body: Record<string, unknown>
    try { body = JSON.parse(raw) } catch { return respond({ error: 'Invalid JSON.' }, 400) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return respond({ error: 'Invalid request.' }, 400)
    if (url.pathname === '/api/missions') {
      if (!isCategory(body.category)) return respond({ error: 'Choose a valid category.' }, 400)
      await db.prepare('INSERT INTO players (id) VALUES (?) ON CONFLICT(id) DO NOTHING').bind(player).run()
      const recent = await db.prepare('SELECT COUNT(*) AS count FROM missions WHERE player_id = ? AND created_at > ?')
        .bind(player, Date.now() - 60000).first<{ count: number }>()
      if ((recent?.count ?? 0) >= 10) return respond({ error: 'Please wait a minute before starting another expedition.' }, 429)
      const mission = createMission(body.category)
      const id = crypto.randomUUID()
      await db.prepare('INSERT INTO missions (id, player_id, category, destinations, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, player, body.category, JSON.stringify(mission.map(w => w.id)), Date.now()).run()
      return respond({ id, destinations: mission.map(w => w.id) }, 201)
    }
    if (url.pathname !== '/api/scores') return respond({ error: 'Not found.' }, 404)
    if (typeof body.missionId !== 'string') return respond({ error: 'A completed expedition is required.' }, 400)
    const mission = await db.prepare('SELECT * FROM missions WHERE id = ? AND player_id = ?')
      .bind(body.missionId, player).first<MissionRow>()
    if (!mission) return respond({ error: 'This expedition could not be found. Start a new mission.' }, 404)
    if (Date.now() - mission.created_at > 86400000) return respond({ error: 'This expedition has expired. Start a new mission.' }, 410)
    const rounds = body.rounds as RoundResult[]
    const destinations: string[] = JSON.parse(mission.destinations)
    if (!Array.isArray(rounds) || rounds.length !== 5 || rounds.some((r, i) => !r || r.locationId !== destinations[i] ||
      !Number.isInteger(r.hints) || r.hints < 0 || r.hints > 2 || !Number.isInteger(r.seconds) || r.seconds < 0 || r.seconds > 7200 ||
      !locations.some(w => w.id === r.guessId && (mission.category === 'all' || w.category === mission.category)))) {
      return respond({ error: 'The expedition results are invalid.' }, 400)
    }
    const seconds = rounds.reduce((sum, r) => sum + r.seconds, 0)
    if (seconds > (Date.now() - mission.created_at) / 1000 + 10) return respond({ error: 'The expedition time is invalid.' }, 400)
    const score = rounds.reduce((sum, r) => sum + scoreRound(r.locationId === r.guessId, r.hints, r.seconds), 0)
    const correct = rounds.filter(r => r.locationId === r.guessId).length
    const anonymous = body.anonymous === true
    const name = typeof body.name === 'string' ? body.name.normalize('NFKC').trim() : ''
    if (!anonymous && (!/^[\p{L}\p{N}_ -]{3,20}$/u.test(name) || name.toLowerCase() === 'anonymous')) {
      return respond({ error: 'Choose a unique name with 3–20 letters, numbers, spaces, hyphens, or underscores.' }, 400)
    }
    const previous = await db.prepare('SELECT score, seconds, correct FROM scores WHERE mission_id = ?')
      .bind(mission.id).first<{ score: number; seconds: number; correct: number }>()
    if (previous && (previous.score !== score || previous.seconds !== seconds || previous.correct !== correct)) {
      return respond({ error: 'This expedition has already been submitted.' }, 409)
    }
    // The name claim and score write are atomic. Uniqueness is enforced by the database.
    await db.batch([
      anonymous
        ? db.prepare('UPDATE players SET public_name = NULL WHERE id = ?').bind(player)
        : db.prepare('UPDATE players SET handle = ?, normalized_name = ?, public_name = ? WHERE id = ?')
          .bind(name, name.toLowerCase(), name, player),
      db.prepare('INSERT INTO scores (mission_id, player_id, category, score, seconds, correct, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(mission_id) DO NOTHING')
        .bind(mission.id, player, mission.category, score, seconds, correct, Date.now()),
    ])
    return respond({ score, correct, seconds, name: anonymous ? 'Anonymous' : name }, previous ? 200 : 201)
  } catch (error) {
    if (/UNIQUE constraint failed: players.normalized_name/i.test(String(error))) return respond({ error: 'That name is already taken. Choose another name or post anonymously.' }, 409)
    console.error('Leaderboard request failed', error instanceof Error ? error.message : 'Unknown database error')
    return respond({ error: 'Leaderboards are temporarily unavailable. Please try again.' }, 503)
  }
}
