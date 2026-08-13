<div align="center">

# 🎓 Dot Jordan

### An Arabic-first Learning Management System that connects students, teachers, and administrators through one role-aware learning ecosystem.

Built with the **MERN** stack · JWT-secured · role-based · responsive · bilingual (Arabic / English)

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![JWT](https://img.shields.io/badge/Auth-JWT%20%2B%20bcrypt-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![Bootstrap](https://img.shields.io/badge/UI-Bootstrap%205-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com)
[![Render](https://img.shields.io/badge/Deployed-Render-46E3B7?logo=render&logoColor=white)](https://render.com)

**[🌐 Live Demo](https://dot-vqx9.onrender.com/)** · **[💻 Repository](https://github.com/aya2404/Dot-educational-platform)** · **[🎥 LinkedIn Demo Video](#)**

<sub>The live demo runs on a free Render tier — the first request may take ~30s to wake the server.</sub>

</div>

---

## 🧭 Contents

[What is Dot Jordan?](#-what-is-dot-jordan) · [Role-Based Experience](#-role-based-experience) · [Core Features](#-core-features) · [Security & Engineering](#-security--engineering) · [Testing & Quality](#-testing--quality) · [UI / UX](#-ui--ux) · [Architecture](#-architecture) · [Tech Stack](#-tech-stack) · [Project Structure](#-project-structure) · [Demo](#-demo) · [Screenshots](#-screenshots) · [Local Development](#-local-development) · [Deployment](#-deployment) · [Documentation](#-documentation) · [Roadmap](#-roadmap) · [Author](#-author--project)

---

## 🌟 What is Dot Jordan?

Learning programs juggle course timelines, lecture materials, assignments, and a mix of students, teachers, and admins — usually across scattered chat groups and spreadsheets. **Dot Jordan** replaces that with a single role-aware platform.

Every account belongs to one of **four roles** — *Student, Teacher, Admin, Super Admin* — and the interface, data, and permissions adapt to that role. A student sees a clean course timeline and submits assignments; a teacher publishes content and reviews submissions; administrators manage people and courses. The UI is **Arabic-first (RTL)** and bilingual, designed for an Arabic full-stack bootcamp.

It’s a real, working full-stack application: JWT authentication, ownership-based authorization, file uploads, a dated content timeline, and an assignment/submission workflow — not a static prototype.

---

## 👥 Role-Based Experience

Each role logs into its own dashboard with data and actions scoped to what it’s allowed to do.

### 🎓 Student
- View **enrolled courses** and a **date-grouped timeline** of lectures, materials, tasks, and announcements
- **Mark lectures complete** and track progress
- **Submit assignments** (text and/or file attachments), edit or delete a submission **until the deadline**
- Access is limited to courses the student is actually enrolled in

### 👨‍🏫 Teacher
- Manage a course they are assigned to: **create, edit, and delete** lectures, materials, tasks, and announcements
- View the **student roster** for their course
- Review **task submissions** for their tasks
- Cannot manage users or other teachers’ courses (ownership-enforced)

### 🛡️ Admin
- **User management** — create students and teachers, activate/deactivate, edit accounts
- **Content management** across courses
- Course and platform **oversight** dashboards

### 👑 Super Admin
- Everything an admin can do, **plus**: create / update / delete **courses**, manage **enrolments**, delete users, and manage **admin** accounts
- The highest-privilege, full-administration view

---

## ✨ Core Features

**🔑 Authentication & Security** — JWT login by username or ID, bcrypt-hashed passwords, role-based access control, protected frontend & backend routes, login rate limiting.

**📚 Learning Management** — Courses with schedule (group, time, days), a dated content timeline, and per-student lecture-completion tracking.

**📝 Assignments & Submissions** — Task content with due dates and max scores; one submission per student per task; editable until the deadline; server-enforced submission window.

**🗂️ Content Management** — Four content types (lecture, material, task, announcement) with ownership-checked create/edit/delete.

**🛠️ Administration** — User CRUD, course CRUD, and enrolment management gated by role.

**📎 File Management** — Uploads via **Multer** to local disk, or **Cloudinary** when configured (auto-selected by environment); file-type/size validation; rate-limited upload endpoint; external-link attachments.

**🌍 Internationalization** — Arabic-first RTL layout, bilingual (Arabic / English) content.

**📱 Responsive UI** — Mobile-first layout with an off-canvas drawer sidebar; verified free of horizontal overflow from 320px to 1920px.

**♿ Accessibility** — Associated form labels, accessible modals (dialog role, Escape-to-close, focus trap), image alt text, and keyboard navigation.

---

## 🔐 Security & Engineering

Security features **confirmed in the codebase**:

| Area | Implementation |
|------|----------------|
| Authentication | Stateless **JWT** (`jsonwebtoken`), 7-day expiry, `Authorization: Bearer` header |
| Password storage | **bcrypt** hashing via a Mongoose pre-save hook; `password` field is `select: false` (never returned by default queries) |
| Authorization | **Role-based** middleware (`protect` + `authorize`) on every protected route |
| Ownership checks | Teachers manage only their own courses/content; students edit only their own submissions, and only before the deadline |
| Brute-force defense | **Login rate limiting** (`express-rate-limit`) on `/api/auth/login` |
| Fail-fast config | Server refuses to start if `JWT_SECRET` is missing |
| Secure updates | Password changes re-hash through the model; old password is invalidated |
| Secrets | Environment-based (`.env`, git-ignored); Render secrets marked `sync: false` |
| Verification | Automated backend tests cover `select:false`, the user-update path, the `JWT_SECRET` guard, and the login rate limiter |

> Scope note: this is a portfolio/bootcamp project. It implements solid fundamentals but is not a hardened production security audit.

---

## 🧪 Testing & Quality

**Backend — automated tests (`node:test`):**

```bash
cd backend && npm test
```

```
tests 5 · pass 5 · fail 0 · skipped 0
```

They cover: password `select: false` (hidden by default, retrievable with `+password`), updating a user without breaking required-field validation, the server failing fast when `JWT_SECRET` is missing, and the login rate limiter returning `429` after the threshold.

**Frontend — production build verified:**

```bash
cd frontend && CI=true npm run build     # → Compiled successfully, 0 lint warnings
```

> The frontend has no automated test suite yet; quality is verified via the linted production build plus the documented UI/UX and responsive audits.

---

## 🎨 UI / UX

- **Responsive** across mobile, tablet, and desktop — sidebar collapses to a hamburger drawer below 992px; wide tables scroll inside their card instead of breaking the page
- **Accessibility improvements** — form controls tied to labels, modals with `role="dialog"` + `aria-modal`, **Escape-to-close** and **focus trapping**, a single `<h1>` per page
- **Keyboard interaction** — Tab/Shift+Tab cycle within open dialogs and focus returns to the trigger on close
- **Bilingual, Arabic-first** interface with a cohesive design system (custom CSS variables + Bootstrap 5)

---

## 🏗️ Architecture

```
        Browser (React SPA, React Router)
                     │  Axios + JWT (Bearer)
                     ▼
        REST API  /api/*        ── CORS allow-list, JSON body limit
                     │
                     ▼
        Express / Node.js
          ├─ Auth middleware      → JWT verify + active-user check
          ├─ RBAC middleware      → role authorization
          ├─ Controllers          → business logic + ownership checks
          └─ Multer / Cloudinary  → file uploads (local or cloud)
                     │  Mongoose ODM
                     ▼
        MongoDB  (Users · Courses · Content · Enrollments · Submissions)
```

**Cross-cutting:** JWT authentication · role-based access control · ownership authorization · rate limiting · environment-based secrets.

---

## 🧱 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, React Router 6, Bootstrap 5, Axios, react-icons (Create React App) |
| **Backend** | Node.js, Express 4 |
| **Database** | MongoDB, Mongoose 7 |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `express-rate-limit` |
| **File Management** | Multer, Cloudinary |
| **Testing** | Node’s built-in test runner (`node:test`) |
| **Deployment** | Render (static site + Node web service) |

---

## 📁 Project Structure

```
Dot-educational-platform/
├── backend/
│   ├── config/            # db, cloudinary, uploads
│   ├── controllers/       # auth, users, courses, content, submissions, enrollments, uploads
│   ├── middleware/        # auth (protect/authorize), errorHandler, upload
│   ├── models/            # User, Course, Content, Enrollment, Submission
│   ├── routes/            # /api/* route definitions
│   ├── utils/             # permissions, courseAccess, serializers, attachments
│   ├── tests/             # node:test suite (model + integration)
│   ├── seed.js            # demo/data seeder (idempotent demo accounts)
│   └── server.js          # Express app entry point
│
├── frontend/
│   └── src/
│       ├── pages/         # Login, Student/Teacher/Admin/SuperAdmin dashboards, Course, CreateContent
│       ├── components/    # layout, sidebar, modals, uploader, timeline
│       ├── context/       # AuthContext (session + JWT)
│       ├── hooks/         # useFocusTrap (modal accessibility)
│       ├── utils/         # api client, auth helpers, attachments, content types
│       └── styles/        # global design system
│
├── render.yaml            # Render deployment (frontend static + backend web service)
└── docs (*.md)            # audit, setup, and test-result documentation
```

---

## 🎬 Demo

The seed creates **exactly one fictional demo account per role**, wired to realistic demo courses so every role logs into a meaningful, non-empty dashboard. There is no email field — **log in with the username _or_ the student ID** (both work).

| Role | Name | Username | Student ID |
|------|------|----------|------------|
| 🎓 Student | Lina Salem | `demo.student` | `STU-9001` |
| 👨‍🏫 Teacher | Omar Naji | `demo.teacher` | `TCH-9001` |
| 🛡️ Admin | Sara Haddad | `demo.admin` | `ADM-9001` |
| 👑 Super Admin | Kareem Faris | `demo.superadmin` | `SAD-9001` |

> ⚠️ **These are fictional demo accounts created only for showcasing the platform — do not use them in production.**
> 🔑 **Passwords are documented in [LOCAL_SETUP.md → Demo Accounts](./LOCAL_SETUP.md#-demo-accounts)** (kept out of source code and this README on purpose).

**What each role shows in the demo**

- 🎓 **Student** — two enrolled courses, a dated content timeline (lectures, materials, announcements, tasks), and the **assignment submission** flow
- 👨‍🏫 **Teacher** — owns two demo courses, sees the student roster, and manages content
- 🛡️ **Admin** — user and content administration across the platform
- 👑 **Super Admin** — full administration: users, courses, and enrolments

The dataset is fully fictional and includes 22 filler students to populate rosters and the admin dashboards.

**🎥 [Watch the LinkedIn Demo Video](#)** *(link coming soon)*

---

## 🖼️ Screenshots

> Placeholders — add images under `docs/screenshots/` and update the links below.

| | |
|---|---|
| **Login** | **Student Dashboard** |
| _`docs/screenshots/login.png`_ | _`docs/screenshots/student-dashboard.png`_ |
| **Course / Timeline** | **Task Submission** |
| _`docs/screenshots/course-timeline.png`_ | _`docs/screenshots/task-submission.png`_ |
| **Teacher Dashboard** | **Admin / Super Admin Dashboard** |
| _`docs/screenshots/teacher-dashboard.png`_ | _`docs/screenshots/admin-dashboard.png`_ |

<!--
Example once images exist:
![Student Dashboard](docs/screenshots/student-dashboard.png)
-->

---

## 🚀 Local Development

### Prerequisites
- **Node.js** 18+ and npm
- **MongoDB** (local `mongod`, a Docker container, or a MongoDB Atlas connection string)

### 1. Clone
```bash
git clone https://github.com/aya2404/Dot-educational-platform.git
cd Dot-educational-platform
```

### 2. Backend
```bash
cd backend
npm install
```
Create `backend/.env` (git-ignored — never commit it):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dot-jordan
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:3000
PUBLIC_API_URL=http://localhost:5000
# Optional Cloudinary (falls back to local disk uploads if unset)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

**Environment variables**

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | – | Backend port (default `5000`) |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Signing secret for JWTs (server refuses to start without it) |
| `JWT_EXPIRES_IN` | – | Token lifetime (default `7d`) |
| `CLIENT_ORIGIN` | – | Allowed CORS origin(s) |
| `PUBLIC_API_URL` | – | Base URL used to build public file links |
| `CLOUDINARY_*` | – | Cloud file storage; falls back to local disk uploads if unset |
| `DEMO_*_PASSWORD` | seed only | Fictional demo-account passwords used by `npm run seed` — values documented in [LOCAL_SETUP.md](./LOCAL_SETUP.md#-demo-accounts) |

> `.env` files are git-ignored. Never commit secrets — configure them locally, and in Render use environment variables marked `sync: false`.

### 3. Seed the database
```bash
cd backend
npm run seed        # creates demo accounts + demo course (safe to re-run)
```

### 4. Frontend
```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

### 5. Run
```bash
# terminal 1
cd backend && npm run dev        # http://localhost:5000

# terminal 2
cd frontend && npm start         # http://localhost:3000
```

### 6. Tests & production build
```bash
cd backend  && npm test          # backend automated tests (5/5)
cd frontend && npm run build     # production build
```

Log in with any demo account — see **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** for full setup and credentials.

---

## ☁️ Deployment

Deployed on **Render** via [`render.yaml`](./render.yaml) as two services:

| Service | Type | Role |
|---------|------|------|
| `dot-vqx9` | Static site | React build (`frontend/build`) with SPA rewrite → **[live app](https://dot-vqx9.onrender.com/)** |
| `dot-project-2asd` | Node web service | Express API with a `/api/health` health check |

Secrets (`MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*`) are configured in Render (`sync: false`) and never committed.

---

## 📚 Documentation

This repository includes detailed engineering documentation produced during development and auditing:

| Document | Contents |
|----------|----------|
| [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) | Architecture, stack, and how the system runs |
| [LOCAL_SETUP.md](./LOCAL_SETUP.md) | Full local setup + demo accounts |
| [FULL_AUDIT_REPORT.md](./FULL_AUDIT_REPORT.md) | Backend/security audit findings |
| [BUG_REPORT.md](./BUG_REPORT.md) | Issues found (structured) |
| [FIXES_APPLIED.md](./FIXES_APPLIED.md) | Fixes with verification |
| [TEST_RESULTS.md](./TEST_RESULTS.md) | Test & build results |
| [FRONTEND_AUDIT_REPORT.md](./FRONTEND_AUDIT_REPORT.md) | Frontend / UI / accessibility audit |
| [FRONTEND_FIXES.md](./FRONTEND_FIXES.md) | Frontend fixes with verification |
| [UI_UX_TEST_RESULTS.md](./UI_UX_TEST_RESULTS.md) | Responsive & UX test matrix |

---

## 🗺️ Roadmap

- [ ] **Grading** — scores & feedback on submissions (data model already supports it)
- [ ] **Progress dashboards** — richer per-student analytics
- [ ] **Notifications** — in-app and email alerts for new content and deadlines
- [ ] **Attendance** tracking
- [ ] **Discussions / comments** on content
- [ ] **Dark mode**
- [ ] **Expanded frontend testing** (React Testing Library) and **CI/CD**

---

## 💡 Engineering Highlights

- **Full-stack MERN architecture** with a clear routes → controllers → models separation
- **Role-based, ownership-aware authorization** enforced on both the API and the SPA
- **Secure authentication** — JWT + bcrypt, `select:false` password field, login rate limiting, fail-fast config
- **File-upload architecture** with a local/Cloudinary strategy chosen by environment
- **Responsive, accessible UI** — mobile drawer nav, focus-trapped modals, associated labels, verified overflow-free 320→1920px
- **Automated backend verification** (`node:test`) and a linted production build
- **Idempotent, non-destructive seeding** — one account per role, wired to real course data, safe to re-run
- **Structured audit documentation** — the engineering process is written down, not just the code

---

## 👤 Author & Project

**Dot Jordan** is a full-stack Learning Management System built as a portfolio project around a Jordanian full-stack bootcamp use case.

- 🌐 **Live demo:** [dot-vqx9.onrender.com](https://dot-vqx9.onrender.com/)
- 💻 **Repository:** [github.com/aya2404/Dot-educational-platform](https://github.com/aya2404/Dot-educational-platform)
- 🎥 **Demo video:** _LinkedIn (link coming soon)_
- 📄 **License:** MIT

> Feedback and contributions are welcome — open an issue or a pull request.

---

<div align="center">

Built with 💚 using the MERN stack · [Live Demo](https://dot-vqx9.onrender.com/) · [Repository](https://github.com/aya2404/Dot-educational-platform)

</div>
