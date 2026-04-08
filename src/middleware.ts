import { defineMiddleware } from 'astro:middleware'
import { getDb } from './lib/db'
import { validateSession, SESSION_COOKIE } from './lib/auth'

const PUBLIC_PATHS = ['/login', '/register', '/share', '/api/auth']

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url)

  // D1 へのアクセスは runtime.env 経由
  const env = (context.locals as App.Locals).runtime?.env
  const sessionId = context.cookies.get(SESSION_COOKIE)?.value ?? null

  context.locals.user = null
  context.locals.sessionId = sessionId

  if (env && sessionId) {
    const db = getDb(env.DB)
    context.locals.user = await validateSession(db, sessionId)
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!context.locals.user && !isPublic && pathname !== '/') {
    return context.redirect('/login')
  }

  if (context.locals.user && (pathname === '/login' || pathname === '/register')) {
    return context.redirect('/dashboard')
  }

  return next()
})
