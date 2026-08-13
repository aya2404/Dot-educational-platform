# PROJECT_SUMMARY.md — Dot Jordan Educational Platform

## Project name
**Dot Jordan** (`dot-jordan`) — a role-based Learning Management System (LMS).

## Project purpose
A full-stack LMS for an Arabic full-stack (MERN) bootcamp. It lets an institution
manage courses, publish course content on a dated timeline (lectures, materials,
tasks, announcements), enroll students, collect task submissions with file
attachments, and track per-student lecture-completion progress. UI is Arabic /
RTL first.

## Target users
Four roles, each with its own dashboard and permission set:
- **student** – views enrolled courses & timeline, submits/edits tasks before the deadline, marks lectures complete.
- **teacher** – creates/edits/deletes content for the courses they are assigned to; views enrolled students.
- **admin** – manages users and courses (cannot manage the enrollment table or other admins).
- **superadmin** – full control: users (incl. admins), courses, enrollments, all content.

## Main features
- JWT authentication; login by **username** or **student ID** (e.g. `STU-1003`).
- Role-based access control (backend middleware + frontend route guards).
- Course content timeline grouped by date, with four content types.
- Task submissions (text + attachments), one per student per task, editable until the due date.
- Ownership-based permissions (teachers manage only their own courses/content).
- File uploads via Multer → local disk **or** Cloudinary (auto-selected by env).
- Lecture completion tracking per enrollment.

## Technology stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Bootstrap 5, Axios, react-icons (Create React App / react-scripts 5) |
| Backend | Node.js, Express 4 |
| Database | MongoDB + Mongoose 7 |
| Auth | JSON Web Tokens (`jsonwebtoken`), password hashing with `bcryptjs` |
| Uploads | Multer (memory storage) + Cloudinary SDK |
| Rate limiting | `express-rate-limit` |
| Deployment | Render (static site + web service) |

## Frontend architecture
- CRA single-page app. Entry: `src/index.js` → `src/App.jsx`.
- `AuthContext` holds session; token + user cached in `localStorage`, re-validated on load via `GET /auth/me`.
- Axios instance (`src/utils/api.js`) injects the Bearer token and, on a `401`, clears the session via a registered unauthorized handler.
- Route protection: `ProtectedRoute` (role-gated) and `GuestRoute` (redirects logged-in users away from `/login`).
- Pages per role: `StudentDashboard`, `TeacherDashboard`, `AdminDashboard` (thin wrapper over `SuperAdminDashboard`), `SuperAdminDashboard`, `CoursePage`, `CreateContentPage`.
- Reusable components: `Timeline`, `TaskSubmissionModal`, `FileUploader`, `AttachmentList`, `ConfirmModal`, `AppLayout`, `Sidebar`.
- API base URL from `REACT_APP_API_URL` (baked in at build time), normalized by `utils/apiBaseUrl.js`.

## Backend architecture
- Express app in `server.js`: CORS (allow-list from `CLIENT_ORIGIN`), JSON body limit 2 MB, static `/uploads`, `/api/health`, central `notFound` + `errorHandler`.
- Layered: `routes/` → `controllers/` → `models/` + `utils/`.
- Middleware: `protect` (JWT verify + active-user check) and `authorize(...roles)`.
- Shared helpers: `utils/courseAccess.js` (course access resolution), `utils/permissions.js` (ownership/deadline rules), `utils/serializers.js` (safe response shaping), `utils/attachments.js` (attachment normalization + public URL building).

## Database
MongoDB via Mongoose. Collections/models:
- **User** – name, unique `username`, sparse-unique `studentId`, hashed `password` (`select:false`), role enum, `isActive`, `avatar`.
- **Course** – name, description, `teacher` (ref User), group, time, days[], startDate.
- **Content** – `course` ref, `createdBy` ref, type enum, title, body, attachments[], contentDate, order, dueDate, maxScore. Compound index `{course, contentDate, order}`.
- **Enrollment** – `student` + `course` refs, `completedLectures[]`, `isActive`. Unique compound index `{student, course}`.
- **Submission** – `task` (Content ref) + `student` ref, answer, attachments[], grade, feedback, status enum. Unique compound index `{task, student}`.

No migration framework (schema is enforced by Mongoose). `seed.js` seeds a superadmin, a teacher, 19 students, one MERN course, enrollments, and 10 content items.

## Authentication & authorization
- Login issues a JWT `{id, role}` signed with `JWT_SECRET`, `JWT_EXPIRES_IN` (default 7d).
- `protect` verifies the token, loads the user (minus password), rejects inactive accounts.
- `authorize` restricts routes by role; controllers add ownership checks (e.g. a teacher may only manage their own courses; submission edits allowed only to the owning student before the deadline, or to admin/superadmin).

## APIs
Base `/api`:
- `auth`: `POST /login`, `GET /me`
- `users` (admin/superadmin): CRUD; delete is superadmin-only
- `courses`: list/read (role-scoped); create/update/delete superadmin-only; `GET /:id/students` (teacher/admin/superadmin)
- `content`: `GET /course/:courseId`, `GET /:id`; create/update/delete (teacher/admin/superadmin, ownership-checked)
- `submissions`: student `POST /`, `GET /my`, `GET /status/:courseId`; staff `GET /task/:taskId`; `DELETE /:id` (owner-in-window or manager)
- `enrollments`: superadmin `POST /`, `DELETE /:id`; student `GET /my`, `POST /complete`, `GET /progress/:courseId`
- `uploads`: `POST /` (rate-limited, any authenticated role)
- `GET /api/health`

## External integrations
- **Cloudinary** (optional) — used only when `CLOUDINARY_*` env vars are all set; otherwise files are stored on local disk under `backend/uploads/`.

## Deployment architecture
`render.yaml` defines two Render services:
1. **dot-project-2asd** – Node web service (`cd backend && npm start`), health check `/api/health`, secrets via `sync:false`.
2. **dot-vqx9** – static site built from `frontend/` with `REACT_APP_API_URL` pointing at the backend.

No background workers, queues, or caching layer. No CI/CD pipeline is committed.

## Important directories
- `backend/{config,controllers,middleware,models,routes,utils}`, `backend/server.js`, `backend/seed.js`
- `frontend/src/{pages,components,context,utils,styles,assets}`

## Important services
Backend Express API (port 5000) + MongoDB. Frontend static SPA (port 3000 in dev).

## How the application is expected to run
1. Provide MongoDB (`MONGO_URI`) and a `JWT_SECRET`.
2. `cd backend && npm install && npm run seed && npm start` (or `npm run dev`).
3. `cd frontend && npm install && npm start` (dev) or `npm run build` (prod).
See `LOCAL_SETUP.md` for exact steps.

## Known configuration requirements
- **Backend** (`backend/.env`): `PORT`, `MONGO_URI` (**required**), `JWT_SECRET` (**required** — server now refuses to start without it), `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`, `PUBLIC_API_URL`, optional `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`, optional `UPLOAD_DIR`.
- **Frontend** (`frontend/.env`): `REACT_APP_API_URL` (build-time).

## Testing infrastructure
A committed backend test suite was added during the audit: `backend/tests/` run via `npm test`, using Node's built-in `node:test` runner (no extra dependency). It covers the security fixes — password `select:false`, updating a user without breaking validation, missing-`JWT_SECRET` fail-fast, and login rate limiting — and runs against an isolated `dot-jordan-test` database. The frontend has no committed tests yet (CRA supports `react-scripts test`); `npm run build` runs ESLint.

## Current project health assessment
**Healthy and runnable.** After this audit the app builds, starts, and passes end-to-end verification: `npm test` 5/5, 30/30 scripted API checks, a browser smoke test across student and superadmin roles with zero console errors, and a full **frontend → backend → MongoDB write** proven from the real browser page (a lecture "mark-complete" persisted to MongoDB and confirmed via `mongosh`, then reset). Backend dependency vulnerabilities were remediated to zero. Remaining known gaps are non-blocking: no grading UI/endpoint (an intentional future feature), test coverage limited to the fix areas (broader suite recommended), and CRA build-tooling / react-router dependency advisories only fixable by breaking upgrades (not exploitable in this SPA). See `FULL_AUDIT_REPORT.md`.
