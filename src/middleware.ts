import { defineMiddleware } from 'astro:middleware'
import { env } from 'cloudflare:workers'
import { getDb } from './lib/db'
import { validateSession, SESSION_COOKIE } from './lib/auth'

const PUBLIC_PATHS = ['/login', '/register', '/share', '/api/auth']

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url)

  const sessionId = context.cookies.get(SESSION_COOKIE)?.value ?? null

  context.locals.user = null
  context.locals.sessionId = sessionId

  if (sessionId) {
    try {
      const db = getDb((env as unknown as Env).DB)
      context.locals.user = await validateSession(db, sessionId)
    } catch {
      // DB not available or session invalid
    }
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
