# FIXES_APPLIED.md — Dot Jordan Educational Platform

Every change made during the audit, with how it was verified. No functionality was removed. No tests were weakened (none existed). Business logic and architecture were preserved.

| ID | Problem | Fix | Files Changed | Verification | Status |
|----|---------|-----|---------------|--------------|--------|
| SEC-1 | Login endpoint had no brute-force protection | Added an `express-rate-limit` limiter (20 attempts / 15 min / IP) in front of the login handler | `backend/routes/auth.js` | 22 rapid wrong-password requests: server returned `401` up to the limit, then `429` for the rest | ✅ Verified |
| SEC-2 | Password hash returned by default user queries | Added `select:false` to the `password` schema field; login already uses explicit `.select('+password')` | `backend/models/User.js` | Re-ran full suites: login works; `/auth/me` and create/list user responses contain no `password`/`$2` hash; `updateUser` `save()` with an unselected required field succeeds; password change → old password rejected (401), new accepted (200) | ✅ Verified (30/30 checks) |
| SEC-3 | Missing `JWT_SECRET` caused opaque 500 at login | Fail-fast guard at server startup | `backend/server.js` | Started with `JWT_SECRET=` → process exits code 1 with `Error: JWT_SECRET is not configured`; started normally → boots and `/api/health` OK | ✅ Verified |
| SEC-4 | 7 backend dependency advisories (3 high) | `npm audit fix` (non-breaking; lockfile-only, no `package.json` semver changes) — express 4.22.2, mongoose 7.8.12, multer 2.2.0, qs 6.15.3 | `backend/package-lock.json` | `npm audit` → **found 0 vulnerabilities**; backend re-seeded, restarted, 30/30 API checks pass | ✅ Verified |
| SEC-5 | `axios` advisory (frontend runtime dep) | `npm audit fix` (non-breaking) → `axios@1.19.0`; `react-scripts@5.0.1` unchanged | `frontend/package-lock.json` | `npm ls axios react-scripts` confirms versions; `npm run build` compiles successfully | ✅ Verified |
| CQ-1 | Dead `src/api.js` hardcoding a wrong backend origin | Deleted the file after confirming zero imports reference it | `frontend/src/api.js` (removed) | `grep` for imports of `./api`/`../api` in `src` → none; production build still compiles successfully | ✅ Verified |
| TEST-1 | No automated tests guarding the fixes | Added a committed backend test suite (Node built-in `node:test`, **no new dependency**) covering `select:false`, non-password update validation, missing-`JWT_SECRET` fail-fast, and login rate limiting; added `npm test` script | `backend/tests/user.model.test.js`, `backend/tests/server.integration.test.js`, `backend/package.json` | `npm test` → **5/5 pass**; tests use isolated `dot-jordan-test` DB and self-clean; dev DB verified intact (21 users) | ✅ Verified |
| ENABLER | `server.js` auto-ran on import, so the app couldn't be tested without opening a port/exiting | Wrapped `startServer()` in `if (require.main === module)` and `module.exports = app` | `backend/server.js` | Restarted `node server.js` → still boots + serves (`/api/health` 200); integration test imports app without side effects | ✅ Verified |

## Intentionally NOT changed (documented instead)
| ID | Why not changed |
|----|-----------------|
| SEC-6 (CORS permissive when `CLIENT_ORIGIN` empty) | Production `render.yaml` sets `CLIENT_ORIGIN`; app uses `Authorization` headers, not cookies, so wildcard risk is limited. Tightening it would break the zero-config local-dev path. |
| SEC-7 (react-scripts build-tooling advisories) | Only "fixable" via a breaking `npm audit fix --force` that downgrades CRA; these deps (nth-check, postcss, serialize-javascript, uuid, webpack-dev-server, …) run only during `npm run build` and are not in the shipped browser bundle. |
| SEC-8 (react-router moderate advisories) | Already on the latest 6.x (`react-router-dom@6.30.4`); the only fix is a breaking upgrade to v7. Not exploitable here: client-only SPA (no SSR → hydration CVE N/A) that navigates only to hardcoded/backend-supplied paths (no user-controlled targets → open-redirect/XSS vectors N/A). |
| FUNC-1 (grading system) | Building a grade endpoint + teacher review UI is a new feature (README lists it under Future Improvements), not a repair. Adding it unverified would risk introducing bugs. Flagged clearly instead. |
| PERF-1 (unused server-side `timeline`) | Harmless; removing it risks changing an API response other clients might depend on for negligible gain. |

## Change footprint
Source changes are minimal and surgical — small backend edits, new test files, one deleted dead frontend file, and two lockfiles updated by `npm audit fix`:

```
 backend/models/User.js                    | +1   (select:false)
 backend/routes/auth.js                    | +13  (login rate limiter)
 backend/server.js                         | +9   (JWT_SECRET guard + require.main export)
 backend/package.json                      | +1   (test script)
 backend/tests/user.model.test.js          | new  (model/select:false/update tests)
 backend/tests/server.integration.test.js  | new  (JWT_SECRET + rate-limit tests)
 frontend/src/api.js                       | deleted (dead code)
 backend/package-lock.json                 | dependency security patches
 frontend/package-lock.json                | dependency security patches
```
No production business logic was changed. The `server.js` refactor is behavior-preserving (still auto-starts when run as `node server.js`).
