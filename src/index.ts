import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import policyRoutes from './routes/policies.js'
import db from './db/index.js'

const app = new Hono()
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/policies', policyRoutes)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
