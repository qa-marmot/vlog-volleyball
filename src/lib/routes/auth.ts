import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { users } from '@/schema'
import { getDb } from '../db'
import { createSession, deleteSession, SESSION_COOKIE, sessionCookieOptions } from '../auth'
import { toJapaneseError } from '../utils/errors'
import type { HonoEnv } from '../hono'

const auth = new Hono<HonoEnv>()

auth.post('/register', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>()

  if (!email || !password || password.length < 8) {
    return c.json({ error: 'メールアドレスとパスワード（8文字以上）を入力してください' }, 400)
  }

  const db = getDb(c.env.DB)
  const existing = await db.select().from(users).where(eq(users.email, email)).get()
  if (existing) {
    return c.json({ error: 'このメールアドレスはすでに登録されています' }, 400)
  }

  const hashedPassword = await bcrypt.hash(password, 8)
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.insert(users).values({ id, email, hashedPassword, createdAt: now })

  const sessionId = await createSession(db, id)
  c.header('Set-Cookie', `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`)
  return c.json({ ok: true })
})

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>()

  const db = getDb(c.env.DB)
  const user = await db.select().from(users).where(eq(users.email, email)).get()

  if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
    return c.json({ error: 'メールアドレスまたはパスワードが違います' }, 401)
  }

  const sessionId = await createSession(db, user.id)
  c.header('Set-Cookie', `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`)
  return c.json({ ok: true })
})

auth.post('/logout', async (c) => {
  const sessionId = c.req.header('Cookie')?.match(/vlog_session=([^;]+)/)?.[1]
  if (sessionId) {
    const db = getDb(c.env.DB)
    await deleteSession(db, sessionId)
  }
  c.header('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`)
  return c.json({ ok: true })
})

export default auth
