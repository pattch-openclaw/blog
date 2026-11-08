# Lessons Learned

Operational and testing gotchas hit while building this blog. Each entry is the root cause plus the fix that shipped.

## Testing

**Screenshot baselines are per-OS.** Goldens are keyed by host OS (`{name}-{projectName}-{os.platform()}.png`), so `*-chromium-darwin.png` and `*-chromium-linux.png` sit side by side in the same directory and each machine reads only its own. Don't force a shared set, and don't let CI generate one — a Linux render against the darwin goldens differs ~100× the `maxDiffPixels` budget from font rasterisation alone. See [screendiff-linux-setup.md](screendiff-linux-setup.md).

**Visual regression is sensitive to active UI states.** A plain `locator.click()` can leave a focus ring that fails a screenshot diff. Appending `.blur()` immediately resolves it.

**Don't rewrite HTML in Playwright route mocks.** Replacing page HTML via `route.fulfill({ body: html.replace(...) })` strips SvelteKit's generated scoped CSS classes (e.g. `svelte-1x4t1v1`), destroying the layout. Network-level JSON mocking of API responses is safer and cleaner.

**Screendiff belongs in hooks, not CI.** Font rendering differs between the dev machine and the CI runner, so screendiff in CI produced deployment failures for harmless drift. It now runs locally in the Husky hooks; CI runs `--grep-invert '@screendiff'`.

## Server actions, git, and the deploy pipeline

**A CI restart during form submission returns 500/502.** Handle UI state client-side with `use:enhance`, and delay the CI trigger (`git push`) via `setTimeout` until after the HTTP response closes.

**Husky + PM2 + Playwright conflict.** When a SvelteKit server action runs `git commit`/`git push`, Husky fires the hooks inside the server process. Because PM2 inherits its environment from the GitHub Actions runner, `GITHUB_ACTIONS=true` leaks into the PM2 daemon — tricking Vitest into writing step summaries to runner temp folders that no longer exist, crashing the action. Fixes that shipped:

- `unset GITHUB_ACTIONS` and `unset GITHUB_STEP_SUMMARY` at the top of `.husky/pre-commit` and `.husky/pre-push`.
- Playwright pinned to a deterministic `1280x720` viewport in `playwright.config.ts` (headless rendering in background daemons otherwise varies).
- Media-upload server actions commit with `git commit --no-verify` / `git push --no-verify origin main` to bypass tests for upload-only commits.

_Historical note:_ hooks were briefly narrowed to `npm run test:unit` only because Playwright in background daemon processes was flaky. That narrowing has since been reverted — both hooks run the full `npm test` today, with the viewport lock and env unsets above doing the stabilization work.

## Security & routing

**CSRF origin check vs. tunnels.** `adapter-node`'s CSRF protection (`checkOrigin`) breaks when requests arrive via `localhost` vs `127.0.0.1` or through Cloudflare Tunnels and `ORIGIN` isn't set explicitly. It is disabled deliberately: the admin routes return 404 in production (`SHOW_DRAFTS=false` in `src/hooks.server.ts`), so there is no admin surface to attack.
