# Setting Up Screendiff (Browser) Tests on a Fresh Linux Box

_Added 2026-11-03 with PR #69 (Linux screendiff goldens)._

A macOS box needs nothing beyond `npx playwright install chromium`. On Linux the same command can fail in three unrelated ways. Verified on Ubuntu 26.04 arm64; nothing here is Ubuntu-specific.

## 1. Install the browser, with downloads kept off `/tmp`

```bash
npm ci                                      # brings the pinned @playwright/test
rm -rf /tmp/playwright-download-* || true   # ~180 MB each, left behind by failed attempts
mkdir -p ~/.cache/pw-tmp
TMPDIR=$HOME/.cache/pw-tmp npx playwright install chromium
```

Plain `install chromium` fetches Chrome for Testing *and* the headless shell. The default headless session launches the headless shell, so a partial install shows up later as `Executable doesn't exist at …/chromium_headless_shell-<revision>/chrome-linux/headless_shell`. Don't add `--with-deps` reflexively (it wants sudo); check whether the distro already has the libraries:

```bash
~/.cache/ms-playwright/chromium_headless_shell-<revision>/chrome-linux/headless_shell --version
```

A version string means you're done. `error while loading shared libraries` means you aren't — then run `npx playwright install-deps chromium`.

## 2. If Playwright refuses to install: `ERROR: Playwright does not support chromium on ubuntu26.04-arm64`

Playwright maps your distro release onto the newest release its *own version* knows (see `node_modules/playwright-core/lib/server/utils/hostPlatform.js`). An LTS newer than that gets a literal `ubuntu26.04-arm64` key with no download entry. Either of:

```bash
# a) Keep the pin, install for the nearest supported release. Needed only while installing —
#    running the suite afterwards requires no special environment.
TMPDIR=$HOME/.cache/pw-tmp PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-arm64 \
  npx playwright install --force chromium

# b) Or raise the pin: 1.61 is the first minor with Ubuntu 26.04 entries (1.60.0 has none).
npm i -D @playwright/test@^1.61.1
```

Option (b) changes the bundled Chromium build — Chrome 145 on 1.58.2 vs Chrome 156 on 1.64.1 — and therefore *every* golden file, so it must land together with an `--update-snapshots` run on each OS. The same reasoning applies to `npx playwright install --with-deps chromium` in the deploy workflow: it fails identically the day the runner moves to a newer release than the pinned Playwright.

## 3. If the download dies part-way or hangs at 100%

`Unknown system error -122` (EDQUOT) on `write` means `/tmp` is a small quota'd tmpfs on this box — that's what step 1's `TMPDIR` prevents. A fetch that stalls after completing is the bundled fetcher hanging; get the same archive by hand instead. Revision comes from `node_modules/playwright-core/browsers.json`, and the archive URL for your architecture from `DOWNLOAD_PATHS` in `node_modules/playwright-core/lib/server/registry/index.js` (arm64 unpacks to `chrome-linux/`, x64 Chrome-for-Testing to `chrome-linux64/`):

```bash
REV=1208; M=$HOME/.cache/ms-playwright; cd ~/.cache/pw-tmp
B=https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/$REV
curl -fL -O $B/chromium-linux-arm64.zip -O $B/chromium-headless-shell-linux-arm64.zip
mkdir -p $M/chromium-$REV $M/chromium_headless_shell-$REV
unzip -qo chromium-linux-arm64.zip -d $M/chromium-$REV
unzip -qo chromium-headless-shell-linux-arm64.zip -d $M/chromium_headless_shell-$REV
chmod +x $M/chromium-$REV/chrome-linux/chrome $M/chromium_headless_shell-$REV/chrome-linux/headless_shell
touch $M/chromium-$REV/INSTALLATION_COMPLETE $M/chromium_headless_shell-$REV/INSTALLATION_COMPLETE
rm -f ~/.cache/pw-tmp/*.zip
```

`INSTALLATION_COMPLETE` is the marker that says "this browser is installed". A directory without it is garbage-collected by the next `npx playwright install` (`Removing unused browser at …`), which is why a half-finished install can look like it reverted itself.

## 4. Mint this platform's goldens once, then commit them

```bash
npx playwright test --grep-invert '@screendiff'             # behaviour first — no images, fast
npx playwright test --grep '@screendiff' --update-snapshots # writes tests/*-chromium-linux.png
git add tests/*-snapshots/*-chromium-linux.png
```

`npm run test` should then report the full unit + 10 E2E suites passing.

Baselines are named `{name}-{projectName}-{os.platform()}.png`, so a Linux run reads only `*-chromium-linux.png` and a Mac only `*-chromium-darwin.png`. There is no selector and nothing to configure; a platform with no golden simply writes one and fails that run once. Commit both sets and keep them apart — they are not interchangeable (a Linux render against the darwin goldens differs by 10,500–13,900 px at identical 1280×720, ~100× the `maxDiffPixels: 100` budget, from font rasterisation alone). Note what the suffix does *not* record: the Chromium build or the installed fonts. A `-linux` golden is only valid on boxes with the same `@playwright/test` revision and comparable font packages, which is why CI keeps running `--grep-invert '@screendiff'` and never mints its own.
