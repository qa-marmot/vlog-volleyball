import { eq } from 'drizzle-orm'
import { sessions, users } from '@/schema'
import type { Db } from './db'

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30日

export async function createSession(db: Db, userId: string) {
  const id = crypto.randomUUID()
  const expiresAt = Date.now() + SESSION_DURATION_MS
  await db.insert(sessions).values({ id, userId, expiresAt })
  return id
}

export async function validateSession(db: Db, sessionId: string) {
  const result = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .get()

  if (!result) return null
  if (result.session.expiresAt < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
    return null
  }
  return { id: result.user.id, email: result.user.email }
}

export async function deleteSession(db: Db, sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export const SESSION_COOKIE = 'vlog_session'

export function sessionCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : { maxAge: SESSION_DURATION_MS / 1000 }),
  }
}
