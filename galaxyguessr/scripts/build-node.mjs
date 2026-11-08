import { build } from 'esbuild'
await build({ entryPoints: ['server/node.mjs'], bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile: 'dist/node/server.mjs' })
