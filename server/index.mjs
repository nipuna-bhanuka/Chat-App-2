import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApiHandler } from './api.mjs'

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }
const api = createApiHandler(process.env)
createServer((req, res) => {
  void api(req, res, async () => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
      if (pathname.startsWith('/api/')) { res.writeHead(404); res.end(); return }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return }
      let file = resolve(root, `.${pathname}`)
      if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return }
      if (!extname(file)) file = resolve(root, 'index.html')
      const body = await readFile(file)
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' })
      res.end(req.method === 'HEAD' ? undefined : body)
    } catch { res.writeHead(404); res.end('Not found') }
  })
}).listen(Number(process.env.PORT || 5173), process.env.HOST || '127.0.0.1', () => {
  console.log(`Claritas listening on port ${process.env.PORT || 5173}`)
})
