// Post-build script: patch output for Cloudflare Pages GitHub integration.
//
// Problem: @astrojs/cloudflare generates dist/server/wrangler.json with
// Workers-only fields (main, rules, no_bundle) that CF Pages rejects.
// It also creates .wrangler/deploy/config.json which redirects CF Pages to
// that invalid config.
//
// Solution:
//   1. Create dist/_worker.js so CF Pages (advanced mode) finds the entry point.
//   2. Delete .wrangler/deploy/config.json so CF Pages uses wrangler.toml directly.

import { readFileSync, writeFileSync, rmSync, existsSync } from 'fs'

// 1. Create dist/_worker.js that re-exports the Astro SSR handler
writeFileSync(
  'dist/_worker.js',
  `export { default } from './server/entry.mjs';\n`
)
console.log('✓ Created dist/_worker.js')

// 2. Remove the redirect file so CF Pages uses wrangler.toml
const redirectFile = '.wrangler/deploy/config.json'
if (existsSync(redirectFile)) {
  rmSync(redirectFile)
  console.log('✓ Removed .wrangler/deploy/config.json')
}

console.log('✓ Cloudflare Pages build patched')
