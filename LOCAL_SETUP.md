# LOCAL_SETUP.md — Running Dot Jordan locally

Verified on Windows 11, Node v24, npm 11, Docker 29. Node 18+ works. MongoDB can be
run via Docker (used here) or a local `mongod` install / MongoDB Atlas connection string.

---

## 0. Prerequisites
- **Node.js** 18+ and npm
- **MongoDB** — one of:
  - Docker (recommended for a throwaway dev DB), or
  - a local `mongod`, or
  - a MongoDB Atlas cluster (use its connection string as `MONGO_URI`)
- Git

---

## 1. Install dependencies
```bash
# from the repository root
cd backend  && npm install
cd ../frontend && npm install
```

---

## 2. Configure environment

### Backend — create `backend/.env` (never commit it; it is gitignored)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dot-jordan
JWT_SECRET=replace_with_a_long_random_secret      # REQUIRED — server refuses to start without it
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:3000
PUBLIC_API_URL=http://localhost:5000
# Optional Cloudinary (leave blank to store uploads on local disk under backend/uploads/)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Demo-account passwords — used ONLY by `npm run seed` (the seed refuses to run
# without them). These are the fictional demo credentials; keep them here (this
# file is git-ignored) and out of source code and the README.
DEMO_STUDENT_PASSWORD=DotStudent2026!
DEMO_TEACHER_PASSWORD=DotTeacher2026!
DEMO_ADMIN_PASSWORD=DotAdmin2026!
DEMO_SUPERADMIN_PASSWORD=DotSuper2026!
```
> A template is provided at `backend/.env.example`. Do **not** put real secrets in the repo.

### Frontend — create `frontend/.env`
```env
REACT_APP_API_URL=http://localhost:5000/api
```
> `REACT_APP_*` values are baked in at **build** time. Rebuild after changing them.

---

## 3. Start required services

### MongoDB via Docker (recommended)
```bash
docker run -d --name dot-mongo -p 27017:27017 mongo:7
# verify:
docker ps --filter name=dot-mongo
```
> This is a fresh, isolated dev database — it does not touch any existing data.
> If you already run MongoDB locally, skip this and point `MONGO_URI` at it.

---

## 4. Run migrations / seed
There is no migration framework (Mongoose enforces the schema). Seed demo data:
```bash
cd backend
npm run seed        # idempotent & non-destructive — safe to run anytime
```
Expected output ends with `Seed completed successfully (idempotent — safe to re-run)` followed
by the demo-login summary.

The seed is **non-destructive and idempotent**: it never deletes existing users, courses,
enrolments, or content. Every record is created once and updated in place on subsequent runs
(keyed by a deterministic field — username / course name / `student+course` / `course+title`),
so running it multiple times converges to the same state **without creating duplicates**.
Passwords are always hashed by the User model's pre-save bcrypt hook — no plaintext is ever stored.

---

## 🎬 Demo Accounts

The seed creates **exactly one fictional demo account per role**, wired to demo courses so every
role logs into a meaningful (non-empty) dashboard. Every identity in the seed is fictional.

> ⚠️ **Fictional, demo-only accounts** for local development, screenshots and demo videos.
> **Not production credentials** — never reuse them in a real deployment.

The app has no email field — **log in with the username _or_ the ID** (either works):

| Role | Name | Username | ID | Password | Demonstrates |
|------|------|----------|----|----------|--------------|
| Student | Lina Salem | `demo.student` | `STU-9001` | `DotStudent2026!` | Enrolled courses, timeline, task submission |
| Teacher | Omar Naji | `demo.teacher` | `TCH-9001` | `DotTeacher2026!` | Owns two courses, student roster, content management |
| Admin | Sara Haddad | `demo.admin` | `ADM-9001` | `DotAdmin2026!` | User & content administration |
| Super Admin | Kareem Faris | `demo.superadmin` | `SAD-9001` | `DotSuper2026!` | Full administration — users, courses, enrolments |

**How the passwords are supplied:** these passwords are **not** stored in `seed.js`. The seed reads
them from the `DEMO_*_PASSWORD` environment variables (set in `backend/.env`, shown in
[step 2](#-backend--create-backendenv-never-commit-it-it-is-gitignored) above) and hashes them
before saving. The values are documented **only here**, never in source code, logs, or the README.

**Demo data:** the seed builds a small, university-style catalog — **10 fictional courses** across
computer-science disciplines (Full-Stack Web Development, UI/UX Design, Database Systems, Software
Engineering, Artificial Intelligence, Data Analysis, Computer Networks, Cybersecurity Fundamentals,
Cloud Computing, Algorithms & Data Structures). Each course carries realistic content across **every
type**: **announcements, lectures, videos** (embedded from real public educational YouTube videos),
**materials, external resources** (links to reputable docs — MDN, React, Node, MongoDB, PostgreSQL,
Python, OWASP, AWS, GitHub, etc., all opening in a new tab with `rel="noopener noreferrer"`), and
submittable **tasks** with rolling future due dates.

The demo teacher (*Omar Naji*) owns two of the courses — **Full-Stack Web Development** and
**UI/UX Design** — and the demo student (*Lina Salem*) is enrolled in four courses for a full
dashboard. The catalog is taught by **8 additional fictional teachers** (`teacher_001`…`teacher_008`,
sharing the demo-teacher password) and populated by **50 fictional students** (`student_001`…`student_050`,
Arabic demo names, sharing the demo-student password) with varied enrolments, so course rosters and the
admin / super-admin dashboards look realistic. Every identity is fictional.

---

## 5. Start the backend
```bash
cd backend
npm run dev     # nodemon (auto-reload) — or: npm start
```
Expected: `Dot Jordan server running on port 5000`
Health check: open http://localhost:5000/api/health → `{"status":"ok",...}`

---

## 6. Start the frontend

**Development (hot reload):**
```bash
cd frontend
npm start       # serves http://localhost:3000
```

**Production build (what Render deploys):**
```bash
cd frontend
npm run build            # outputs frontend/build
npx serve -s build -l 3000   # serve the static build with SPA fallback
```
Open http://localhost:3000 and log in with the demo credentials above.

---

## 7. Run tests / checks
```bash
# Backend automated tests (Node built-in test runner — needs MongoDB running).
# Uses an isolated `dot-jordan-test` DB; does NOT touch your seeded dev data.
cd backend && npm test
#   Expect: "tests 5 ... pass 5 ... fail 0"
#   Override the test DB if needed:  MONGO_URI_TEST="mongodb://.../my-test-db" npm test

# Backend dependency audit (expect: 0 vulnerabilities)
cd backend && npm audit

# Frontend lint + production build (expect: "Compiled successfully")
cd frontend && npm run build
#   Use CI=true to make ESLint warnings fail the build:  CI=true npm run build

# Manual API smoke test against the running backend, e.g. (use the demo
# super-admin — the password is your DEMO_SUPERADMIN_PASSWORD from backend/.env):
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"demo.superadmin","password":"<DEMO_SUPERADMIN_PASSWORD>"}'
```
> The backend suite covers the audit's security fixes (password `select:false`, user-update
> validation, missing-`JWT_SECRET` fail-fast, login rate limiting). Recommended next step:
> broaden coverage (controller-level API tests, React Testing Library for components).

---

## 8. Stop services
```bash
# Stop backend / frontend: Ctrl+C in their terminals.

# Stop and remove the MongoDB container:
docker stop dot-mongo && docker rm dot-mongo
# (data is discarded with the container; re-run step 3 + 4 to recreate)
```

---

## Troubleshooting
- **`JWT_SECRET is not configured` and the server exits** — set `JWT_SECRET` in `backend/.env` (this fail-fast guard was added intentionally).
- **`MongoDB connection error`** — ensure the DB is running and `MONGO_URI` is correct/reachable.
- **`429 Too Many Requests` on login** — the login rate limiter (20/15 min/IP) tripped; wait or restart the backend to reset the in-memory counter.
- **CORS errors in the browser** — make sure `CLIENT_ORIGIN` matches the frontend origin (`http://localhost:3000`).
- **Port already in use (`EADDRINUSE`)** — another process holds 5000/3000; stop it or change the port.
- **Uploads** — with no Cloudinary env vars set, files are written to `backend/uploads/` and served from `/uploads` (gitignored).
