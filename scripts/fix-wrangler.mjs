// Post-build script: patch output for Cloudflare Pages GitHub integration.
//
// Problem 1: @astrojs/cloudflare generates dist/server/wrangler.json with
// Workers-only fields (main, rules, no_bundle) that CF Pages rejects.
// It also creates .wrangler/deploy/config.json which redirects CF Pages to
// that invalid config.
//
// Problem 2: @astrojs/cloudflare puts static assets in dist/client/ but
// CF Pages advanced mode (_worker.js) serves ASSETS from dist/ root.
// Result: /_astro/*.css returns 404 because CF Pages can't find the files.
//
// Solution:
//   1. Copy dist/client/ contents up to dist/ so ASSETS binding can serve them.
//   2. Create dist/_worker.js so CF Pages (advanced mode) finds the entry point.
//   3. Delete .wrangler/deploy/config.json so CF Pages uses wrangler.toml directly.

import { readFileSync, writeFileSync, rmSync, existsSync, readdirSync, cpSync } from 'fs'

// 1. Hoist dist/client/ contents to dist/
if (existsSync('dist/client')) {
  cpSync('dist/client', 'dist', { recursive: true })
  console.log('✓ Hoisted dist/client/ → dist/')
}

// 2. Create dist/_worker.js that re-exports the Astro SSR handler
writeFileSync(
  'dist/_worker.js',
  `export { default } from './server/entry.mjs';\n`
)
console.log('✓ Created dist/_worker.js')

// 3. Remove the redirect file so CF Pages uses wrangler.toml
const redirectFile = '.wrangler/deploy/config.json'
if (existsSync(redirectFile)) {
  rmSync(redirectFile)
  console.log('✓ Removed .wrangler/deploy/config.json')
}

console.log('✓ Cloudflare Pages build patched')
