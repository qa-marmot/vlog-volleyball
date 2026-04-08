// Post-build script: fix dist/server/wrangler.json for Cloudflare Pages compatibility
// The @astrojs/cloudflare adapter generates some fields that are invalid for Pages:
//   - "triggers": {} → must be { crons: [] } or omitted
//   - "kv_namespaces" with binding: false (when sessionKVBindingName is unused)
//   - "assets" binding named "ASSETS" (reserved name in Pages)

import { readFileSync, writeFileSync, existsSync } from 'fs'

const path = 'dist/server/wrangler.json'
if (!existsSync(path)) process.exit(0)

const config = JSON.parse(readFileSync(path, 'utf8'))

// Fix triggers: {} → { crons: [] }
if (config.triggers !== undefined && !Array.isArray(config.triggers?.crons)) {
  config.triggers = { crons: [] }
}

// Remove KV namespace entries that have no "id" field
// The adapter adds a SESSION KV stub without an id, which Pages rejects.
// Since we don't use Astro.session, this binding is not needed.
if (Array.isArray(config.kv_namespaces)) {
  config.kv_namespaces = config.kv_namespaces.filter(
    (kv) => typeof kv.id === 'string' && kv.id.length > 0
  )
}

// Remove the auto-generated "ASSETS" binding — Pages reserves this name automatically
if (config.assets?.binding === 'ASSETS') {
  delete config.assets
}

writeFileSync(path, JSON.stringify(config))
console.log('✓ dist/server/wrangler.json patched for Cloudflare Pages')
