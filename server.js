// server.js — NinjaHost cPanel startup file (Next.js custom server)
// This file IS the HTTP server — no child process spawning, no port conflicts.
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const path = require('path')

const port = parseInt(process.env.PORT, 10) || 3000
const dev = process.env.NODE_ENV !== 'production'

// Point Next.js at the app inside the monorepo
const app = next({
  dev,
  port,
  dir: path.join(__dirname, 'apps', 'main'),
})
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling', req.url, err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })
  .once('error', (err) => {
    console.error('Server error:', err)
    process.exit(1)
  })
  .listen(port, () => {
    console.log(`> Ready on http://localhost:${port} [${dev ? 'dev' : 'production'}]`)
  })
})

