# Operations

Everything needed to run, release and recover this app. Written 2026-08-17.

## 1. Access

### Web dashboard

| | |
|---|---|
| Login | https://fleet-ideas-lab.maximo-seo.ai/login |
| Method | username + password + Cloudflare Turnstile |
| Session | `dl_session` cookie — HMAC-SHA256, stateless, 30-day TTL, httpOnly, sameSite=lax |
| Credentials | Vercel **production** env `DASHBOARD_AUTH_USERNAME` + `DASHBOARD_AUTH_PASSWORD` |

Two behaviours worth knowing before you debug a login:

- If `DASHBOARD_AUTH_USERNAME` is **empty**, login is **password-only**. If it is set and
  either side contains `@`, the comparison is case-insensitive.
- Session tokens carry a `pv` tag derived from the password. Changing
  `DASHBOARD_AUTH_PASSWORD` logs out every session everywhere, immediately — web and phone.
  That, not expiry, is the revocation mechanism.

All auth variables are marked **Sensitive** on Vercel, so they are write-only: `vercel env pull`
returns `[SENSITIVE]` and the REST API returns an empty value. There is no way to read the
password back out. Losing it means setting a new one.

### Android app

Same credentials. The app sends `appToken` (`BuildConfig.APP_TOKEN`) instead of a Turnstile
token; the server accepts it as the challenge. Session lands in DataStore +
`EncryptedSharedPreferences`, and biometric unlock takes over after the first password login.

### Route protection

`src/middleware.ts` covers pages **and** `/api/*`. The entire public surface is
`src/lib/publicRoutes.json`, and `scripts/smoke-auth-matrix.mjs` fails CI if anything else stops
returning 401. Adding a public route is an explicit, test-covered decision.

## 2. Environment variables

| Variable | Where | Required | Notes |
|---|---|---|---|
| `DASHBOARD_AUTH_SECRET` | prod, preview | yes in prod | Signs session tokens. Boot fails without it in production. |
| `DASHBOARD_AUTH_SECRET_PREVIOUS` | optional | no | Rotation window — old tokens stay valid while set. |
| `DASHBOARD_AUTH_USERNAME` | prod, preview | no | Empty means password-only login. |
| `DASHBOARD_AUTH_PASSWORD` | prod, preview | yes in prod | Changing it force-logs-out everyone. |
| `TURNSTILE_SECRET_KEY` | prod, preview | recommended | Missing = captcha disabled, with a warning. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | prod, preview | yes | Widget `0x4AAAAAAEQyCmGw2i6fiaAq`. |
| `APP_TOKEN` | prod | yes for the app | Bearer for `/api/app/fleet`; also the app's challenge bypass. |
| `APP_TOKEN_PREVIOUS` | prod | temporary | Rotation window only — clear it once the new APK is out. |
| `CRON_SECRET` | prod | yes | Bearer for `/api/fleet/probe` and `/api/fleet/sync`. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | prod | yes | Probe history, ideas, login throttle. Service role — never ships to the client. |
| `TELEGRAM_NOTIFY64_TOKEN` / `TELEGRAM_NOTIFY64_CHAT` | prod | for alerts | No hardcoded fallback any more; unset means `/api/fleet/notify` returns 503. |
| `V0_API_KEY` | prod, preview | optional | Absent = the no-AI "Quick CSS tweak" mode. |
| `FIRECRAWL_API_KEY` | prod, preview | optional | Absent = local DOM parser only, and the UI says so. |

## 3. Releasing the web app

The Vercel project has **no git integration** — pushing to `main` runs CI but does not deploy.

```bash
git push origin main                      # CI: typecheck, lint, tests, version sync, build, auth matrix
npx vercel deploy --prod --token="$VERCEL_TOKEN_2" --scope=maximo-seo --yes
```

Then verify the **deployed artefact**, not the source. A green build is not evidence:

```bash
curl -sI https://fleet-ideas-lab.maximo-seo.ai/login | grep -i content-security-policy
curl -s  https://fleet-ideas-lab.maximo-seo.ai/api/app/version
```

Note: requests from the build server can trip Vercel's bot mitigation and come back as a
"Vercel Security Checkpoint" 403. That is per-IP, not an outage — confirm from a different
vantage point (any external header checker, or Firecrawl) before believing the site is down.

## 4. Releasing the APK

```bash
# android/local.properties (gitignored) must contain:
#   sdk.dir=/opt/android-sdk
#   APP_TOKEN=<must match Vercel production>
#   KEYSTORE_PATH=/root/android-keys/fleet-ideas-lab.jks
#   KEYSTORE_PASS / KEY_ALIAS / KEY_PASS  ← from
#   /root/.hermes/secure/keystores/fleet-ideas-lab.keystore.env

cd android
ANDROID_HOME=/opt/android-sdk ./gradlew clean assembleRelease bundleRelease
```

Traps, each of which has cost time before:

- **Without `KEYSTORE_PATH` the build still succeeds and silently produces an unsigned APK.**
- The password file `credentials/fleet-ideas-lab-keystore.env` is **wrong**. The working one is
  `keystores/fleet-ideas-lab.keystore.env`. Both exist; that is the trap.
- Verify the certificate before shipping — a different key cannot install as an update:
  ```bash
  /opt/android-sdk/build-tools/34.0.0/apksigner verify --print-certs --verbose \
    app/build/outputs/apk/release/app-release.apk | grep "SHA-256 digest"
  # must be eee3184e93c0d8fa1911709ec6faaf2890d0b78359f2c5f8e354ab049c38bbf8
  ```
- Reading an APK manifest needs `strings -el` (UTF-16 string pool). Plain `strings` reports no
  permissions at all.
- Reproducibility: compare the 508 zip **entries**, never `sha256sum` of the file — zip ordering
  and timestamps differ between builds.
- **R8 is on.** Its failures appear at runtime, and this build machine has no emulator, so the
  first install of a minified build is the test. `./gradlew assembleRelease -PnoMinify=true`
  produces the identical unminified APK if something breaks.

Bump the version in **both** places — `android/app/build.gradle.kts` and `src/lib/appVersion.ts`.
`npm run check:version` asserts they agree, that `apkUrl` names the same version, and that
`/api/app/download` has not grown its own copy of the URL again. CI runs it.

Then publish, so `/api/app/download` and the in-app updater resolve:

```bash
VERSION=1.3.7          # must match build.gradle.kts and appVersion.ts
gh release create "v$VERSION" \
  android/app/build/outputs/apk/release/app-release.apk \
  android/app/build/outputs/bundle/release/app-release.aab
```

## 5. Rotating APP_TOKEN

The token ships inside the APK, so rotation used to lock out every installed build. It no
longer has to:

1. Set `APP_TOKEN_PREVIOUS` to the current value, `APP_TOKEN` to the new one, redeploy.
   Both are accepted (`src/lib/appToken.ts`), so phones in the field keep working.
2. Build and publish an APK carrying the new token.
3. Delete `APP_TOKEN_PREVIOUS` and redeploy.

`GET /api/fleet/manifest` reports `appTokenRotationPending: true` while step 3 is outstanding.

Keep the vault copy at `/root/.hermes/secure/credentials/fleet-ideas-lab-app.env` in step with
Vercel — it drifted once and every local build produced an APK whose feed returned 401.

## 6. Data and retention

- `fil_probes` — raw probe rows, ~3,650/day for 38 targets at 15-minute intervals.
- `fil_probe_daily` — per-slug daily rollup with p50/p95/max latency.
- `fil_rollup_probes(keep_days := 30)` runs on the daily `/api/fleet/sync` cron: rolls finished
  days up, then deletes raw rows past the window. It is never allowed to fail the sync.
- `fil_login_throttle`, `fil_rate_buckets` — login throttling and fixed-window counters, durable
  so they survive serverless. Both **fail open** if Postgres is unreachable, on purpose: an
  outage must not lock the operator out of the console that reports the outage.
- Schema lives in `supabase/migrations/`. It previously existed only in the Supabase dashboard.

## 7. Known limitations

- **CSP keeps `'unsafe-inline'` for scripts.** `/redesign`, `/mockup` and `/prototypes` render
  generated HTML into `srcdoc` iframes, which inherit the parent CSP, so a nonce policy would
  silently blank the feature the app exists for. Upgrading means moving prototype rendering to a
  separate origin first.
- **Turnstile is in managed mode** (an explicit "verify you are human" click). Switching it to
  invisible is one setting in the Cloudflare dashboard; it could not be done from here because
  the API token has no Turnstile write scope and the endpoint rejects the global key with 405.
- **Light theme contrast**: fixed from unusable to usable, but axe still reports ~184 borderline
  contrast nodes in light against 43 in dark. Tracked, not finished.
- **`src/app/redesign/page.tsx` is 850 lines** and not split. Its flow needs a Firecrawl key and
  a live target site to exercise, so rearranging it without being able to run it is a bad trade.
- **`sanitizeHtml` is a copy stripper, not an XSS sanitiser.** It removes whole script/style/
  iframe blocks; it does not neutralise an inline handler on a surviving tag. Never render its
  output as trusted HTML. There is a test that says so out loud.
