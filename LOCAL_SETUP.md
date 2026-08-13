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
npm run seed        # WARNING: seed.js clears Users/Courses/Content/Enrollments/Submissions first
```
Expected output ends with: `Seed completed successfully`.

**Demo credentials** (login by student ID or username):
| Role | ID | Password |
|------|----|----------|
| Super Admin | `SAD-0001` | `super2004` |
| Teacher | `TCH-0001` | `eng123456` |
| Student | `STU-1003` | `student1003` |

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

# Manual API smoke test against the running backend, e.g.:
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"SAD-0001","password":"super2004"}'
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
