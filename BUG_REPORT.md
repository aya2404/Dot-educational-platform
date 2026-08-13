# BUG_REPORT.md — Dot Jordan Educational Platform

Structured list of issues discovered during the audit. Severity: P0 critical · P1 high · P2 medium · P3 low/info.

| ID | Severity | Category | File | Problem | Root Cause | Status |
|----|----------|----------|------|---------|-----------|--------|
| SEC-1 | P2 | Security | `backend/routes/auth.js` | Login endpoint has no throttling; unlimited password guessing possible | No rate-limiting middleware on `POST /login` | FIXED |
| SEC-2 | P2 | Security | `backend/models/User.js` | bcrypt password hash returned by all default user queries | `password` schema field missing `select:false` | FIXED |
| SEC-3 | P2 | Security / Reliability | `backend/server.js` | If `JWT_SECRET` unset, login fails with opaque 500 instead of failing at boot | No startup validation of `JWT_SECRET` | FIXED |
| SEC-4 | P2/P3 | Security (deps) | `backend/package-lock.json` | 7 dependency advisories, 3 high (`multer`, `brace-expansion`, `ip-address`) + moderate (`mongoose` prototype pollution, `qs`, `body-parser`) | Outdated transitive/direct versions | FIXED |
| SEC-5 | P3 | Security (deps) | `frontend/package-lock.json` | `axios` in a vulnerable version range | Outdated `axios` | FIXED |
| SEC-6 | P3 | Security (config) | `backend/server.js` | Empty `CLIENT_ORIGIN` makes CORS allow all origins | Permissive fallback in CORS `origin` callback | ACCEPTED (prod sets `CLIENT_ORIGIN`; header-based auth, not cookies) |
| SEC-7 | P3 | Security (build deps) | `frontend` (react-scripts) | Transitive advisories in CRA build tooling (`nth-check`, `postcss`, `serialize-javascript`, `uuid`, `webpack-dev-server`, …) | `react-scripts@5` locked dependency tree; only a breaking `--force` "fixes" it | ACCEPTED (build-time only, not in shipped bundle) |
| SEC-8 | P3 | Security (deps) | `frontend` (react-router-dom) | Moderate advisories: open-redirect via backslash in `<Link>`/`useNavigate`, SSR-hydration constructor injection | Fix only in a breaking react-router v7; already on latest 6.x | ACCEPTED (SPA, no SSR, navigation targets are hardcoded/backend-supplied — not exploitable here) |
| CQ-1 | P3 | Code quality | `frontend/src/api.js` | Unused module hardcoding a wrong backend URL (`dot-backend.onrender.com`) | Leftover dead code from an earlier iteration | FIXED (deleted) |
| CQ-2 | P3 | Code quality | `frontend/src/utils/attachments.js`, `backend/utils/attachments.js` | Two attachment-normalization utilities | Different runtimes need different URL resolution | ACCEPTED (not a defect) |
| PERF-1 | P3 | Performance | `backend/controllers/contentController.js` | `getCourseContent` computes a `timeline` object the client never uses | Client regroups content itself | ACCEPTED (harmless) |
| FUNC-1 | P2 | Functionality (incomplete) | `backend/controllers/submissionController.js`, `models/Submission.js`, frontend | No way to grade submissions; README overstates teacher "view submissions" (no UI) | Grading feature never built (listed under README Future Improvements) | KNOWN GAP (out of scope to build) |
| OPS-2 | P3 | DevOps | repo root | No CI/CD pipeline or committed automated tests before deploy | Not set up | KNOWN GAP (recommendation) |
| TEST-1 | P2 | Testing | repo | No automated test suite present | Tests never written | FIXED (added `backend/tests/` + `npm test`, 5 tests covering the fix areas; broader coverage still recommended) |

## Notes
- **No P0/critical bugs were found.** The application starts, authenticates, enforces authorization, and persists/reads data correctly.
- All items marked **FIXED** were re-verified after the change (see `FIXES_APPLIED.md` and `TEST_RESULTS.md`).
- Items marked **ACCEPTED** are intentional/low-risk and documented rather than changed.
- Items marked **KNOWN GAP** are feature/infra additions that fall outside "repair existing behavior" and would each require their own design + verification.
