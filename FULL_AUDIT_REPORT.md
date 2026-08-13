# FULL_AUDIT_REPORT.md — Dot Jordan Educational Platform

**Audit date:** 2026-08-12
**Scope:** Full-stack audit, repair, local execution and verification of the entire repository.
**Method:** Static reading of all source, dependency audit, backend brought up against a real MongoDB (Docker `mongo:7`), 30 scripted API checks against the live server, production frontend build, and a real-browser smoke test (Chrome automation).

---

## Executive summary
Dot Jordan is a well-structured MERN LMS. Core business logic is **sound**: authentication, role-based access control, ownership-based permissions, content timeline, submissions, enrollment and progress all behaved correctly under live testing (30/30 checks passed both before and after fixes). No P0/critical defects (no auth bypass, no data corruption, no committed secrets, the app starts cleanly).

Issues found were concentrated in **security hardening**, **dependency vulnerabilities**, and **dead code**. All safe, verifiable fixes were applied and confirmed. Remaining items are non-blocking and clearly documented (notably the intentionally-unbuilt grading feature and CRA dev-tooling advisories).

**Before:** builds/runs but 7 backend dependency vulnerabilities (3 high), no login throttling, password hash selectable by default, no `JWT_SECRET` guard, a dead misconfigured API file, no automated tests, and it had never been verified running locally.
**After:** 0 backend dependency vulnerabilities, login brute-force throttled, password `select:false`, fail-fast on missing `JWT_SECRET`, dead file removed, a committed backend test suite (`npm test`, 5/5) guarding the fixes, and the full stack verified running locally end-to-end.

---

## Architecture overview
React SPA (CRA) ⇄ Express REST API ⇄ MongoDB (Mongoose). JWT bearer auth (token in `localStorage`). Files stored locally or on Cloudinary. Deployed on Render (static site + web service). See `PROJECT_SUMMARY.md` for the full breakdown.

## Technology stack
React 18 / React Router 6 / Bootstrap 5 / Axios · Node + Express 4 · MongoDB + Mongoose 7 · JWT + bcryptjs · Multer + Cloudinary · express-rate-limit · Render.

---

## Findings

Severity key: **P0** critical · **P1** high · **P2** medium · **P3** low/info.
Status key: **FIXED**, **ACCEPTED** (documented, intentionally not changed), **KNOWN GAP** (out-of-scope to build).

### Security findings
| ID | Sev | File(s) | Explanation | Status |
|----|-----|---------|-------------|--------|
| SEC-1 | P2 | `backend/routes/auth.js` | `POST /api/auth/login` had no rate limiting → unlimited credential brute-force. Added an `express-rate-limit` throttle (20 attempts / 15 min / IP). Verified: attempts return `429` after the limit. | FIXED |
| SEC-2 | P2 | `backend/models/User.js` | `password` field lacked `select:false`, so every default query returned the bcrypt hash in the document (never rendered to clients today, but a latent exposure). Added `select:false`; login still authenticates via explicit `.select('+password')`. | FIXED |
| SEC-3 | P2 | `backend/server.js` | No startup validation of `JWT_SECRET`; if unset, `jwt.sign` throws an opaque 500 at login time. Added a fail-fast guard at boot. Verified: server exits 1 with a clear message when unset. | FIXED |
| SEC-4 | P3 | `backend/package-lock.json` | 7 dependency advisories (3 high: `multer`, `brace-expansion`, `ip-address`; moderate: `mongoose` prototype-pollution, `qs`, `body-parser`). Fixed with non-breaking `npm audit fix`. Verified: `npm audit` → 0 vulnerabilities. | FIXED |
| SEC-5 | P3 | `frontend` (`axios`) | `axios` advisory in the installed range. Bumped to `1.19.0` via non-breaking `npm audit fix`; `react-scripts` untouched. | FIXED |
| SEC-6 | P3 | `backend/server.js` (CORS) | When `CLIENT_ORIGIN` is empty the CORS callback allows **all** origins. In production `render.yaml` sets `CLIENT_ORIGIN`, and the app uses `Authorization` headers (not cookies), so cross-origin risk is limited. Left as-is for local-dev convenience; documented. | ACCEPTED |
| SEC-7 | P3 | `frontend` build deps | `react-scripts@5` pulls transitive advisories (`nth-check`, `postcss`, `serialize-javascript`, `uuid`, `webpack-dev-server`, `shell-quote`, etc.) only resolvable via a breaking `npm audit fix --force` that downgrades CRA. These run only during `npm run build` and do **not** ship in the production browser bundle. (Note: `--omit=dev` does not reduce the count because CRA declares `react-scripts` as a *regular* dependency.) | ACCEPTED |
| SEC-8 | P3 | `frontend` (`react-router-dom`) | Two moderate advisories: open-redirect via backslash in `<Link>`/`useNavigate`, and SSR-hydration constructor injection. Already on the latest 6.x (`6.30.4`); the only fix is a breaking react-router **v7** migration. **Not exploitable in this app:** it is a client-only SPA (no SSR → hydration CVE N/A) and every `useNavigate`/`<Link>` target is a hardcoded role path or a backend-supplied ID (no user-controlled destinations → open-redirect/XSS vectors N/A). | ACCEPTED |

### Performance findings
| ID | Sev | File | Explanation | Status |
|----|-----|------|-------------|--------|
| PERF-1 | P3 | `backend/controllers/contentController.js` | `getCourseContent` builds a `timeline` grouping that the frontend ignores (it regroups client-side in `Timeline.jsx`). Minor redundant work; harmless. | ACCEPTED |
| PERF-2 | — | backend generally | No N+1 patterns found; list endpoints use `.populate()` with field projection and appropriate indexes exist. Frontend production bundle is ~100 KB gzipped. | OK |

### Code quality findings
| ID | Sev | File | Explanation | Status |
|----|-----|------|-------------|--------|
| CQ-1 | P3 | `frontend/src/api.js` | Dead, unused module hardcoding `https://dot-backend.onrender.com` — a backend origin that does **not** match the real deployment (`dot-project-2asd.onrender.com`). No import references it. Removed to prevent confusion/mis-wiring. | FIXED |
| CQ-2 | P3 | `frontend/src/utils/attachments.js` + `backend/utils/attachments.js` | Two parallel attachment-normalization utilities. This is legitimate (different runtimes/URL resolution), not duplication to remove. | ACCEPTED |

### Functionality findings
| ID | Sev | File | Explanation | Status |
|----|-----|------|-------------|--------|
| FUNC-1 | P2 | `backend/controllers/submissionController.js`, `models/Submission.js`, `frontend` | **No grading path.** `Submission` carries `grade`/`feedback`/`status:'graded'`, and staff can *list* submissions (`GET /submissions/task/:taskId`), but there is no endpoint to set a grade and no teacher UI to review/grade submissions — despite the README stating teachers "View student submissions". README's *Future Improvements* explicitly lists "Grading system", so this is an unfinished intentional feature, not a regression. Building it (grade endpoint + review UI) is a feature addition beyond a bug fix and would need its own verification. | KNOWN GAP |

### Database findings
| ID | Sev | File | Explanation | Status |
|----|-----|------|-------------|--------|
| DB-1 | — | `backend/models/*` | Unique indexes present and correct: `User.username`, `User.studentId` (sparse), `Enrollment{student,course}`, `Submission{task,student}`; compound `Content{course,contentDate,order}`. Referential integrity handled in app code (e.g. `deleteCourse` cascades content/enrollments/submissions; `deleteContent` cascades submissions). No dangerous migrations (schema-on-write via Mongoose). Seed runs cleanly. | OK |

### DevOps findings
| ID | Sev | File | Explanation | Status |
|----|-----|------|-------------|--------|
| OPS-1 | — | `render.yaml` | Valid: health check path matches `/api/health`, secrets marked `sync:false`, Node 22 pinned. | OK |
| OPS-2 | P3 | repo | No CI/CD workflow and no Dockerfile committed. Not required for Render's native build, but there is no automated gate before deploy. Documented as a recommendation. | KNOWN GAP |
| OPS-3 | — | `.gitignore` | Correctly ignores `.env` (keeps `.env.example`), `node_modules`, `build/`, `backend/uploads/`. No secrets tracked. | OK |

### Testing findings
| ID | Sev | Explanation | Status |
|----|-----|-------------|--------|
| TEST-1 | P2 | No automated test suite existed. **Addressed:** added a committed backend suite (`backend/tests/`, Node built-in `node:test`, `npm test`) with 5 tests covering the four fix areas (`select:false`, non-password update validation, missing-`JWT_SECRET` fail-fast, login rate-limit). Broader coverage (controllers, frontend RTL) still recommended. | FIXED (partial — core areas covered) |

---

## What was verified running (evidence)
- MongoDB `mongo:7` container up on :27017; `seed.js` → "Seed completed successfully".
- Backend boots: `Dot Jordan server running on port 5000`; `GET /api/health` → `{"status":"ok"}`. Confirmed it still auto-starts after the `require.main` export refactor.
- **`npm test` → 5/5 pass** (select:false, non-password update validation, missing-JWT_SECRET exit-1, login 429), using an isolated `dot-jordan-test` DB; dev DB verified intact (21 users) afterward.
- 30/30 scripted API checks pass (auth by username & studentId, RBAC 403s, content CRUD, submission upsert, enrollment toggle, cascade delete, invalid-id 400, password-change flow, `select:false` save path).
- Login rate limiter observed returning `429` after the threshold.
- Frontend `npm run build` (with `CI=true`, warnings-as-errors) → "Compiled successfully", 100.64 KB JS gzipped, **0 lint warnings**.
- Browser (Chrome): login → student dashboard → course timeline; logout; login → superadmin dashboard, rendering **live backend data**. Session persistence (GuestRoute redirect) confirmed. **Zero console errors** on the fresh build.
- **Full frontend → backend → MongoDB write path proven from the real browser page** (`origin=http://localhost:3000`): cross-origin login returned 200 (CORS honored), a lecture "mark-complete" action wrote to MongoDB (`completedLectures` 0 → 1, independently confirmed via `mongosh`), the re-read progress reflected it, and the change was then reset to keep dev data pristine. Backend log had no errors; dev DB counts still match the seed (21 users).

See `TEST_RESULTS.md` for the before/after table and `FIXES_APPLIED.md` for each change.
