# Dot Educational Platform

**Dot** is a role-aware, Arabic-first (RTL) learning management platform for small education programs. It replaces scattered chat groups and spreadsheets with a single application where teachers run courses — publishing lessons, videos, materials, and assignments — and students enroll, learn, submit work, and track their grades and deadlines, all tied together with in-app notifications.

---

## Overview

Small learning programs juggle course timelines, lecture materials, assignments, and a mix of students, teachers, and administrators — usually across disconnected tools. Dot brings these into one coherent, permission-aware system.

- **Problem:** fragmented course delivery, enrollment tracking, submission handling, and grading.
- **Purpose:** a single platform where each role sees exactly what it needs and can do only what it is authorized to do.
- **User roles:** Student, Teacher, Admin, Super Admin.
- **Major workflows:** authentication → course access/management → content publishing → assignment submission → grading → gradebook → deadlines → notifications.

The interface is Arabic (right-to-left) with mixed Arabic/English technical terminology.

---

## Key Features

### Student
- Secure login with username or student ID
- Dashboard with enrolled courses and progress
- Course content timeline (lectures, videos, materials, external resources, announcements, tasks)
- Mark lectures complete
- Submit, edit, and delete assignment submissions (with text and/or file attachments)
- View grades and teacher feedback
- Upcoming-deadlines feed with overdue indicators
- In-app notifications (new task, announcement, graded submission, enrollment)

### Teacher
- Dashboard listing owned courses
- Create, edit, and delete courses
- Manage the student roster: enroll (by student ID or username) and unenroll
- Create content of every type and publish/unpublish (draft) it
- Review and grade student submissions (late submissions accepted and flagged server-side)
- Course gradebook across all students and tasks
- In-app notifications

### Admin / Super Admin
- Administrative dashboard with users, courses, and (Super Admin) enrollments tabs
- Create user accounts and activate/deactivate accounts
- Manage any course's content and roster (create/edit/delete course, enroll/unenroll)
- Super Admin: enrollment management surface; safeguards such as "at least one active super admin must remain" and no self-deactivation

> Admins and Super Admins reach the same course-management page as teachers; role boundaries are enforced by the backend, not by the UI alone.

### Security (verified controls)
- JWT authentication with bcrypt-hashed passwords (`select: false`)
- Role-based authorization on every protected route
- Object-level ownership checks (course, enrollment, submission, notification) — IDOR-resistant
- Notification ownership isolation (a user can only read/modify their own)
- Upload validation: allow-listed extensions, blocked executable/renderable types, MIME + extension checks; uploads served with `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment`
- Attachment URL scheme validation (only `http`/`https` and local upload paths survive; `javascript:`, `data:`, etc. are stripped)
- CORS deny-by-default in production (no silent allow-all)
- Baseline security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-DNS-Prefetch-Control`; HSTS in production)
- Uniform login failures (no account-existence enumeration) and login/upload rate limiting
- Input validation and NoSQL operator-injection guards; fail-fast if `JWT_SECRET` is missing

This project applies a defined set of hardening measures; it does not claim to be free of all vulnerabilities. See **[Security](#security)** and **[Known Limitations](#known-limitations--future-improvements)**.

---

## Tech Stack

**Frontend**
- React 18 (Create React App / `react-scripts`)
- React Router 6
- Bootstrap 5, React Icons
- Axios

**Backend**
- Node.js, Express 4
- Mongoose 7 (MongoDB ODM)
- Multer (file uploads), optional Cloudinary storage
- `express-rate-limit`, `cors`, `dotenv`

**Database**
- MongoDB

**Authentication**
- JSON Web Tokens (`jsonwebtoken`) + `bcryptjs`

**Testing**
- Node.js built-in test runner (`node --test`)

**Build / Deployment**
- CRA production build for the SPA
- Render (`render.yaml`): a Node web service for the API and a static site for the frontend

---

## Architecture

```
React SPA (Bootstrap, RTL)
        │  Axios (REST, Bearer JWT)
        ▼
Express REST API  ──►  Auth middleware (JWT verify, active-account check)
        │             Role authorization + object-ownership checks
        ▼
Controllers ──► Utilities (permissions, course access, attachments, gradebook, notifications)
        ▼
Mongoose models ──► MongoDB
```

- Stateless JWT auth; the token carries the user id and role.
- Authorization is layered: route-level role gates plus controller-level ownership resolution (`resolveCourseAccess`, permission helpers).
- File uploads are validated, then stored locally (`/uploads`, served with hardened headers) or on Cloudinary when configured.

---

## User Roles & Permissions

| Role | Main Capabilities |
|------|-------------------|
| **Student** | Access enrolled courses, view published content, mark lectures complete, submit/edit/delete own submissions, view own grades and deadlines, receive notifications |
| **Teacher** | Full management of owned courses: create/edit/delete course, manage roster (enroll/unenroll), create/edit/publish/delete content, review and grade submissions, view course gradebook |
| **Admin** | Create users and activate/deactivate accounts; manage courses, content, and rosters |
| **Super Admin** | All admin capabilities plus enrollment management; system safeguards (retain one active super admin, no self-deactivation) |

Students never see or reach management controls; the backend rejects unauthorized actions regardless of the UI.

---

## Testing & Quality

Verified in this repository:

- **Backend automated tests:** 149 passing (`node --test`), run twice with zero failures. Coverage includes authentication/activation, security hardening (F1–F8), security headers, course management, notifications, gradebook, deadlines, submissions (including late-submission handling), publishing, grading, and permissions.
- **Frontend production build:** `CI=true npm run build` compiles successfully with no warnings (ESLint clean).
- **Browser E2E verification:** login/logout, course management (create/edit/delete + roster enroll/unenroll), content publishing, student submission (submit/edit/delete), grading, notifications, and responsive layouts were exercised in a real browser across student, teacher, admin, and super-admin roles with no console errors.
- **Dependency audit:** backend reports 0 vulnerabilities; frontend advisories are almost entirely build-toolchain transitive dependencies (see Known Limitations).

Run the backend suite:

```bash
cd backend && npm test
```

---

## Security

Implemented and verified security controls:

- JWT auth with bcrypt password hashing; passwords excluded from queries by default
- Role-based authorization and object-level ownership checks (IDOR-resistant)
- Notification ownership isolation
- Upload restrictions (extension allow-list + blocked executable/renderable types + MIME checks) and hardened static serving (`nosniff`, `attachment`)
- Attachment URL scheme validation (unsafe schemes stripped)
- Production CORS deny-by-default; baseline security headers; HSTS in production
- Login-enumeration resistance and rate limiting
- NoSQL operator-injection guards, input validation, and fail-fast on missing `JWT_SECRET`

**Limitations / honesty note:** The frontend dependency audit still reports known advisories (mostly Create React App build-toolchain transitives, plus a React Router advisory that is not exploitable in this client-only, non-SSR SPA). These are documented under Known Limitations and are **not** claimed as resolved. This project is hardened against a defined set of findings, not certified vulnerability-free.

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local `mongod`, Docker, or a MongoDB Atlas connection string)

### 1. Clone
```bash
git clone https://github.com/aya2404/Dot-educational-platform.git
cd Dot-educational-platform
```

### 2. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure environment
Create `backend/.env` (see `backend/.env.example`) and `frontend/.env`:

```env
# frontend/.env
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Database
Ensure MongoDB is running and reachable at your `MONGO_URI` (default `mongodb://localhost:27017/dot-jordan`).

### 5. Seed demo data (optional, idempotent)
```bash
cd backend && npm run seed
```

### 6. Run the backend
```bash
cd backend && npm run dev     # nodemon, or: npm start
# API on http://localhost:5000  (health check: /api/health)
```

### 7. Run the frontend
```bash
cd frontend && npm start      # http://localhost:3000
```

For full local setup, MongoDB-via-Docker instructions, troubleshooting, and demo-account credentials, see **[LOCAL_SETUP.md](./LOCAL_SETUP.md)**.

---

## Environment Variables

Source of truth: `backend/.env.example`.

| Variable | Scope | Description |
|----------|-------|-------------|
| `PORT` | backend | API port (default 5000) |
| `MONGO_URI` | backend | MongoDB connection string |
| `JWT_SECRET` | backend | **Required** — server refuses to start without it |
| `JWT_EXPIRES_IN` | backend | Token lifetime (e.g. `7d`) |
| `CLIENT_ORIGIN` | backend | Allowed browser origin(s) for CORS |
| `PUBLIC_API_URL` | backend | Public base URL used for file links |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | backend | Optional — enable Cloudinary storage (otherwise files are stored locally) |
| `DEMO_*_PASSWORD` | backend (seed only) | Fictional demo-account passwords used by `npm run seed`; documented in [LOCAL_SETUP.md](./LOCAL_SETUP.md) |
| `REACT_APP_API_URL` | frontend | API base URL, baked in at build time |

No secrets are committed; `.env` files are git-ignored.

---

## Project Structure

```
Dot-educational-platform/
├── backend/
│   ├── config/          # db, cloudinary, uploads
│   ├── controllers/     # auth, users, courses, content, submissions, enrollments, notifications, uploads
│   ├── middleware/      # auth (JWT + RBAC), upload validation, error handling
│   ├── models/          # User, Course, Enrollment, Content, Submission, Notification
│   ├── routes/          # REST route definitions
│   ├── utils/           # permissions, courseAccess, attachments, gradebook, notifications, cors, serializers
│   ├── tests/           # node --test suites
│   ├── seed.js          # idempotent demo data
│   └── server.js
├── frontend/
│   └── src/
│       ├── pages/       # Login, dashboards, CoursePage, CreateContentPage
│       ├── components/  # common, student, teacher (modals, roster, notifications, etc.)
│       ├── context/     # AuthContext
│       ├── hooks/       # useFocusTrap
│       └── utils/       # api client, auth/route helpers, attachments, content types
├── render.yaml          # Render deployment (API service + static SPA)
└── LOCAL_SETUP.md
```

---

## Application Flow

- **Auth:** `POST /api/auth/login` returns a JWT; the SPA stores it and sends it as a Bearer token. `GET /api/auth/me` bootstraps the session; inactive or invalid tokens are rejected.
- **Courses:** listing is role-scoped (students see enrolled courses, teachers see owned, managers see all); create/edit/delete and roster actions are ownership- and role-checked.
- **Content:** teachers/managers create typed content and publish or keep it as a draft; students only ever receive published content.
- **Submissions & grading:** students submit to published tasks (late submissions accepted and flagged server-side); teachers/managers review and grade; grades and feedback flow back to the student and gradebook.
- **Notifications:** enrollment, new published tasks/announcements, and grading generate in-app notifications, scoped strictly to their recipient.

---

## Current Status

- Core educational workflows implemented and verified (auth, content lifecycle, submissions, grading, gradebook, deadlines)
- Course management implemented (create/edit/delete) for teachers and managers
- Enrollment and roster management implemented
- In-app notifications implemented
- Security hardening completed for the identified findings (F1–F5 and related controls)
- Automated backend regression suite passing (149 tests, run twice)
- Frontend production build passing
- Final QA verified in-browser across all roles with clean console/network and intact data integrity

---

## Known Limitations / Future Improvements

Framed as planned engineering work, not blockers:

- **React Router major upgrade:** migrate from v6 to v7 to clear a dependency advisory (not exploitable in this non-SSR SPA) — deferred to avoid a breaking change without dedicated route regression.
- **Build-toolchain modernization:** the Create React App toolchain carries transitive dev-dependency advisories; migrating to a modern bundler (e.g. Vite) would resolve them and speed up builds.
- **Content Security Policy:** add a CSP tailored to the SPA and embedded media as an additional hardening layer.
- **Richer analytics / attendance:** deeper per-student progress analytics and attendance tracking are candidate future features.

---

## Screenshots

No screenshots are included in the repository. Screens (dashboards, course management, submission and grading flows) can be captured from a running instance and added here for portfolio presentation.

---

## License

No license file is currently included in the repository. Add one before public reuse if desired.

---

## Author

Developed by **Aya Abu Taha**.
Repository: [github.com/aya2404/Dot-educational-platform](https://github.com/aya2404/Dot-educational-platform)
