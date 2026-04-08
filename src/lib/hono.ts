import { Hono } from 'hono'
import { SESSION_COOKIE } from './auth'
import { getDb } from './db'
import { validateSession } from './auth'
import authRoute from './routes/auth'
import teamsRoute from './routes/teams'
import matchesRoute from './routes/matches'

export type HonoEnv = {
  Bindings: { DB: D1Database }
  Variables: { user: { id: string; email: string } | null }
}

const app = new Hono<HonoEnv>()

// 認証ミドルウェア
app.use('*', async (c, next) => {
  const cookieHeader = c.req.header('Cookie') ?? ''
  const sessionId = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1]

  c.set('user', null)
  if (sessionId && c.env.DB) {
    const db = getDb(c.env.DB)
    const user = await validateSession(db, sessionId)
    c.set('user', user)
  }
  await next()
})

app.route('/api/auth', authRoute)
app.route('/api/teams', teamsRoute)
app.route('/api/matches', matchesRoute)

export { app }
