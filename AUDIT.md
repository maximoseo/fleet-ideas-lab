# Fleet Inventory Audit — 2026-08-15

**Source:** Vercel team `maximo-seo` (ID `team_NVnIOFO7th3wYtoyRoqJnLhr`) via `GET /v9/projects?teamId=…&limit=100` (paginated, 46 projects).
**Tools scanned:** `npx vercel project ls` (3 pages), `api.vercel.com/v9/projects`, `ls /root/projects`, Hostinger WHM `node1488` read-only probe.
**Local projects:** 9 local-only dirs not on Vercel (jarvis-hud, grr-*, brain-dashboard, central-brain, etc.) — utilities, not dashboards, excluded.
**Utilities excluded:** maximo-seo (marketing), apk-download, ronyb-deploy, summit-garage-prototype, seo-audit-report, site-scan-fix, todo-tasks, to-do-tasks, dp-work — 9 total.
**Verified dashboards:** 37 — every entry has Vercel `projectName` + `updatedAt` → `YYYY-MM-DD` + production alias `https://…` + deterministic domain/capability mapping. Health: healthy ≤3d / degraded 4–7d / stale >7d (ref 2026-08-15).
**Duplicates note:** `competitor-intelligence` and `competitor-intelligence-dashboard` are two real projects (different aliases) — kept distinct.
**WHM:** vault had 0 WHM tokens → TBD, no invention.
**Android sync:** `android/app/src/main/java/ai/maximo/ideaslab/data/FleetData.kt` mirrors the same 37.
