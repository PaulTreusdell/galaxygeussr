import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve, sep, extname } from 'node:path'
import { handleApi } from './api.ts'

const filename = process.env.DATABASE_PATH || '.local/production.sqlite'
mkdirSync(dirname(resolve(filename)), { recursive: true })
const sqlite = new DatabaseSync(filename)
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY)')
for (const name of readdirSync('drizzle').filter(n => n.endsWith('.sql')).sort()) {
  if (sqlite.prepare('SELECT name FROM app_migrations WHERE name = ?').get(name)) continue
  sqlite.exec('BEGIN IMMEDIATE')
  try { sqlite.exec(readFileSync('drizzle/' + name, 'utf8')); sqlite.prepare('INSERT INTO app_migrations VALUES (?)').run(name); sqlite.exec('COMMIT') }
  catch (e) { sqlite.exec('ROLLBACK'); throw e }
}
class Statement {
  constructor(sql, values = []) { this.sql = sql; this.values = values }
  bind(...values) { return new Statement(this.sql, values) }
  async first() { return sqlite.prepare(this.sql).get(...this.values) ?? null }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.values) } }
  async run() { return sqlite.prepare(this.sql).run(...this.values) }
}
const DB = { prepare: sql => new Statement(sql), batch: async statements => {
  sqlite.exec('BEGIN IMMEDIATE')
  try { const results = statements.map(s => sqlite.prepare(s.sql).run(...s.values)); sqlite.exec('COMMIT'); return results }
  catch (e) { sqlite.exec('ROLLBACK'); throw e }
} }
const root = resolve('dist/client')
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.mp3':'audio/mpeg', '.ico':'image/x-icon' }
const publicOrigin = process.env.PUBLIC_ORIGIN
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, publicOrigin || 'http://127.0.0.1:' + (process.env.PORT || 3000))
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (url.pathname === '/healthz') { res.end('ok'); return }
    if (url.pathname.startsWith('/api/')) {
      let size = 0; const chunks = []
      for await (const chunk of req) { size += chunk.length; if (size > 8192) { res.writeHead(413); res.end('Request too large'); return }; chunks.push(chunk) }
      const headers = new Headers()
      for (const [name, value] of Object.entries(req.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
      const response = await handleApi(new Request(url, { method:req.method, headers, body: ['GET','HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }), { DB })
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return
    }
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return }
    const file = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname))
    if (!file.startsWith(root + sep)) { res.writeHead(404); res.end(); return }
    let data
    try { data = readFileSync(file) } catch { res.writeHead(404); res.end('Not found'); return }
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
    res.setHeader('Cache-Control', url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache')
    res.end(req.method === 'HEAD' ? undefined : data)
  } catch (e) { console.error('Request failed:', e.message); if (!res.headersSent) res.writeHead(500); res.end('Request failed') }
})
server.requestTimeout = 15000
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('GalaxyGuessr listening on port ' + (process.env.PORT || 3000)))
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => { sqlite.close(); process.exit(0) }))
