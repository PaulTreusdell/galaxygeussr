import { build } from 'esbuild'
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon' }
const assets = {}
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(file)
    else assets['/' + path.relative('dist/client', file).split(path.sep).join('/')] = [mime[path.extname(file)] ?? 'application/octet-stream', readFileSync(file).toString('base64')]
  }
}
walk('dist/client')
await build({ entryPoints: ['server/worker.ts'], bundle: true, format: 'esm', target: 'es2022', outfile: 'dist/server/index.js', minify: true,
  plugins: [{ name: 'embedded-assets', setup(builder) {
    builder.onResolve({ filter: /^virtual:site-assets$/ }, () => ({ path: 'assets', namespace: 'embedded' }))
    builder.onLoad({ filter: /.*/, namespace: 'embedded' }, () => ({ contents: `export default ${JSON.stringify(assets)}`, loader: 'js' }))
  } }],
})
mkdirSync('dist/.openai', { recursive: true })
writeFileSync('dist/.openai/hosting.json', readFileSync('.openai/hosting.json'))
console.log(`Built leaderboard Worker with ${Object.keys(assets).length} embedded assets.`)
