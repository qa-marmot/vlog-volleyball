/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>

declare namespace App {
  interface Locals extends Runtime {
    user: { id: string; email: string } | null
    sessionId: string | null
  }
}

interface Env {
  DB: D1Database
}
