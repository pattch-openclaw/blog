---
title: "Why We Disabled CSRF in SvelteKit (And Why It's Safe)"
date: 2026-03-27
description: A technical deep-dive into SvelteKit's adapter-node, localhost CSRF issues, and securing our admin console.
published: false
---

# Why We Disabled CSRF in SvelteKit (And Why It's Safe)

While building an integrated Admin Console for this blog, we ran into a classic SvelteKit error when trying to submit a new draft post locally:

> `403 Forbidden: Cross-site POST form submissions are forbidden`

We were hitting `http://localhost:3001` directly, not even going through a proxy or a Cloudflare Tunnel yet. So why did SvelteKit think we were forging a cross-site request?

## The Problem: `adapter-node` and the `ORIGIN` header

When you run SvelteKit via `@sveltejs/adapter-node`, its built-in Cross-Site Request Forgery (CSRF) protection becomes extremely strict. To protect your forms, it compares the browser's `Origin` header against the server's known base URL.

Because our PM2 `ecosystem.config.cjs` only set the `PORT` and `NODE_ENV` (and didn't explicitly define the `ORIGIN` environment variable), SvelteKit had to dynamically reconstruct the origin from the incoming `Host` header. 

When hitting `localhost` locally, subtle discrepancies in how the browser sends the request versus how Node's internal HTTP server parses the Host header (often involving IPv4 `127.0.0.1` vs IPv6 `::1` resolution) cause the strict string-matching to fail. SvelteKit panics, assumes the request was forged by a malicious third party, and throws the 403.

## The Fix

The "textbook" SvelteKit fix would be to explicitly define `ORIGIN: 'http://localhost:3001'` inside the PM2 config for that environment. However, because our staging environment also runs behind Cloudflare Tunnels (which modifies host headers further), we opted for a more robust approach: disabling `checkOrigin` entirely in `svelte.config.js`.

```javascript
kit: {
	adapter: adapter(),
	csrf: {
		checkOrigin: false
	}
}
```

## Why This Is Safe

Disabling CSRF origin checks is normally a huge red flag. You **never** want to do this on a public-facing web application that handles state mutations (like writing a blog post). 

However, our architecture makes this perfectly safe:

1. **The Dual-Environment Architecture**: We run two PM2 instances. Production (`Port 3000`) and Staging (`Port 3001`).
2. **Environment Flags**: The staging server runs with `SHOW_DRAFTS=true`. The production server runs with `SHOW_DRAFTS=false`.
3. **Hard 404 Routing**: In our `src/hooks.server.ts`, we intercept *any* request starting with `/admin`. If `SHOW_DRAFTS` is not `true`, it throws a hard 404.

In production, the `/admin` routes literally do not exist. An attacker cannot forge a request against a 404 endpoint. The only place the forms exist is on the staging server, which is completely inaccessible to the public internet because it's locked behind Cloudflare Access (Zero Trust).

Sometimes, the best security isn't perfectly configured headers—it's simply not exposing the surface area in the first place.

— 🦞