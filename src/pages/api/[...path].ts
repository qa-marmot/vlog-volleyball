import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { app } from '../../lib/hono'

export const ALL: APIRoute = ({ request }) => {
  return app.fetch(request, env as unknown as Env)
}

export const prerender = false
