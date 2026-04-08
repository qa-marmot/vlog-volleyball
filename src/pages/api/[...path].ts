import type { APIRoute } from 'astro'
import { app } from '../../lib/hono'

export const ALL: APIRoute = ({ request, locals }) => {
  const env = (locals as App.Locals).runtime?.env
  return app.fetch(request, env)
}

export const prerender = false
