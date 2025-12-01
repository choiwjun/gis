import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { corsMiddleware } from './middleware'
import type { Bindings } from './types'

// Import routes
import auth from './routes/auth'
import datasets from './routes/datasets'
import map from './routes/map'
import search from './routes/search'
import features from './routes/features'
import styles from './routes/styles'
import exportRoute from './routes/export'
import users from './routes/users'

const app = new Hono<{ Bindings: Bindings }>()

// CORS for API routes
app.use('/api/*', corsMiddleware)

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// API routes
app.route('/api/auth', auth)
app.route('/api/datasets', datasets)
app.route('/api/map', map)
app.route('/api/search', search)
app.route('/api/features', features)
app.route('/api/styles', styles)
app.route('/api/export', exportRoute)
app.route('/api/users', users)
app.route('/api/admin/users', users)

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Frontend route
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GIS Web App</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.css" rel="stylesheet">
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; }
          .maplibregl-ctrl-group { display: none !important; }
        </style>
    </head>
    <body>
        <div id="app"></div>
        
        <script src="https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
