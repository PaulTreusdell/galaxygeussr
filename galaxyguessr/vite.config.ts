import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleApi } from './server/api'
import { localDatabase } from './scripts/local-database'
import path from 'node:path'

export default defineConfig({ plugins: [react(), tailwindcss(), {
  name: 'local-leaderboards',
  configureServer(server) {
    const DB = localDatabase(path.resolve('.local/leaderboard.sqlite'))
    server.middlewares.use('/api', async (req, res) => {
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk))
        if (chunks.reduce((sum, item) => sum + item.length, 0) > 8192) { res.statusCode = 413; res.end('Request too large'); return }
      }
      const request = new Request(`http://${req.headers.host}/api${req.url}`, {
        method: req.method, headers: req.headers as Record<string, string>,
        body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
      })
      const response = await handleApi(request, { DB })
      res.statusCode = response.status
      response.headers.forEach((value, key) => res.setHeader(key, value))
      res.end(await response.text())
    })
  },
}], build: { outDir: 'dist/client', emptyOutDir: true, rollupOptions: { output: { manualChunks: { three: ['three', '@react-three/fiber'] } } } } })
