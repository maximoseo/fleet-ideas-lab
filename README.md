# Fleet Ideas Lab

Meta-dashboard that audits the MaximoSEO fleet and generates new dashboard ideas.
Web (Next 16 / Tailwind 4) + Native Android APK (Kotlin + Compose).

- **Web:** inventory + gap radar + idea cards — https://fleet-ideas-lab.maximo-seo.ai
- **APK:** ai.maximo.ideaslab — native Compose, Room cache, signed

## Running it

- **Operations** — access map, env table, web and APK release runbooks, retention policy and
  known limitations: [OPERATIONS.md](OPERATIONS.md).
- **Tests** — `npm test` (96 web) and `cd android && ./gradlew testReleaseUnitTest` (8).
- **Gates** — `npm run typecheck`, `npm run lint`, `npm run check:version`,
  `node scripts/smoke-auth-matrix.mjs <baseUrl>`. All of them run in CI.
