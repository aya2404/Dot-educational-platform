<div align="center">

# 🎓 Dot Educational Platform

### A production-deployed, security-hardened, multi-tenant Learning Management System & EdTech SaaS

**Arabic-first • RTL • Multi-Tenancy • Chat • Calendar • Certificates • Gamification • BI Dashboard • Payments • White-Labeling**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-2ea44f?style=for-the-badge)](https://dot-educational-platform-1.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/aya2404/Dot-educational-platform)
[![Tests](https://img.shields.io/badge/Backend_Tests-149%2F149_Passing-brightgreen?style=for-the-badge&logo=node.js)](https://github.com/aya2404/Dot-educational-platform)

[**Launch Live Application →**](https://dot-educational-platform-1.onrender.com)

</div>

---

## 📌 Overview

**Dot** is a full-stack, **multi-tenant** Learning Management System that has grown into a complete **EdTech SaaS** platform. It centralizes the academic workflows of students, teachers, and administrators in a single role-aware product — and layers on the engagement, communication, monetization, and branding features expected of a modern SaaS.

The system supports the complete learning lifecycle — from **course creation and enrollment** to **content publishing, assignment submission, grading, gradebooks, deadlines, and notifications** — and extends it with **chat, an academic calendar, digital sticky notes, QR-verified certificates with an approval workflow, gamification, an executive BI dashboard, Stripe subscriptions, per-tenant + global white-labeling, and an email channel**.

Dot is built with an **Arabic-first RTL interface** and a security-focused backend where authorization is enforced server-side, and every tenant's data is isolated.

### Key Highlights

- 🏢 **Multi-tenancy** — full institution-level data isolation (`tenantId` scoping everywhere)
- 🔐 Layered authentication, RBAC hierarchy, and object-level authorization
- 💬 In-app **Chat / Messaging** (course groups + direct), with privacy-preserving notifications
- 📅 **Academic Calendar** aggregating tasks, lectures, and submissions
- 📝 **Digital Sticky Notes** — colors, pinning, drag-to-reorder, handwriting font
- 🎖️ **Certificates** — PDF + QR verification and a **teacher → admin approval workflow**, plus admin-editable templates
- 🏆 **Gamification** — badges, XP, streaks, and per-course leaderboards
- 📊 **Executive BI Dashboard** with charts (Recharts)
- 💳 **Stripe** subscriptions (Monthly **$299**, Yearly **$2990**)
- 🎨 **White-Labeling** — per-tenant and global logo, colors, and favicon (with file upload)
- 📧 **Email channel** (SMTP via nodemailer, graceful console fallback)
- 🌐 Arabic-first responsive RTL interface
- 🛡️ Upload validation, CORS hardening, security headers, rate limiting
- 🧪 149/149 backend tests passing
- 🚀 Deployed on Render with a production frontend and API

---

## 🚀 Live Demo

### [Launch Dot Educational Platform →](https://dot-educational-platform-1.onrender.com)

The deployed application provides the complete platform experience across its supported user roles.

> **Note:** The application runs on Render. The free hosting tier may require a short wake-up period after inactivity.

---

## 🔐 Demo Accounts

Explore the platform using the following fictional demo accounts. Log in with **either** the Student ID **or** the username in the identifier field.

| Role | Name | Username | Student ID | Password |
|------|------|----------|-----------|----------|
| 👨‍🎓 Student | Lina Salem | `demo.student` | `STU-9001` | `DotStudent2026!` |
| 👩‍🏫 Teacher | Omar Naji | `demo.teacher` | `TCH-9001` | `DotTeacher2026!` |
| 🧑‍💼 Admin | Sara Haddad | `demo.admin` | `ADM-9001` | `DotAdmin2026!` |
| 👑 Super Admin | Kareem Faris | `demo.superadmin` | `SAD-9001` | `DotSuper2026!` |

> These are fictional demo accounts created for testing. Do not reuse them for any real account or production environment.
> On the deployed site the passwords match the `DEMO_*_PASSWORD` environment variables configured on the host.

---

## 🎬 Rich Demo Data (for walkthroughs & video)

The idempotent seed (`npm run seed`) pre-populates the main student **`STU-9001`** so the platform looks alive on first login — no manual setup needed:

| Data | Included |
|------|----------|
| 📝 Sticky notes | **6** (2 pinned, multiple colors, one course-linked, one checklist) |
| 💬 Chat messages | **25+** across two course chats (Arabic Q&A with code snippets + emojis) |
| 🎖️ Badges earned | **4** unlocked (First Submission, 7-Day Streak, Course Conqueror, Chatterbox) + locked ones to earn |
| ⭐ XP / streak | **470 XP**, 7-day login streak |
| 🏆 Leaderboard | **11** ranked students on Full-Stack (top 640 XP; the demo student sits at ~#3) |
| 🔔 Notifications | **5** (graded, announcement, chat, certificate issued, new task) |
| 📚 Long lecture descriptions | 300+ word bodies that trigger the **"Show More"** truncation + attachments/videos |
| 🗂️ Submissions | Long (500+ word) answers with attachments; varied statuses; **8** filler-student submissions to populate the teacher's grading queue |

The seed is **idempotent and non-destructive** — safe to re-run without duplicating records.

---

## 🏗️ Architecture

Dot follows a layered, multi-tenant client-server architecture:

```text
┌─────────────────────────────────────────────┐
│              React 18 SPA                   │
│     Arabic / RTL • White-Label Theming      │
│   Bootstrap • Axios • Router • Recharts      │
│   react-big-calendar • @hello-pangea/dnd     │
└──────────────────────┬──────────────────────┘
                       │ HTTPS / REST API  •  Bearer JWT
                       ▼
┌─────────────────────────────────────────────┐
│              Express REST API               │
│ Auth • Validation • Rate Limiting • CORS    │
│ Security Headers • Stripe Webhook (raw body) │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│      Multi-Tenant Authorization Boundary    │
│  Route Role Check → Authentication →        │
│  Tenant Scoping → Controller Permission →   │
│  Object Ownership Resolution                │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│          Controllers & Business Logic       │
│ Auth • Users • Courses • Content • Enroll   │
│ Submissions • Grading • Notifications       │
│ Chat • Calendar • Notes • Certificates      │
│ Gamification • Analytics • Payments         │
│ Organizations • Platform Settings           │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│           Mongoose 7 / MongoDB              │
│   Tenant-scoped, validated data models      │
└─────────────────────────────────────────────┘
```

This layered model ensures the backend remains the final security boundary — and that **every read/write is scoped to the caller's tenant** (Super Admin excepted) even if a client attempts to bypass frontend restrictions.

---

## 👥 User Roles & Permissions

| Role | Core Capabilities |
|------|-------------------|
| 👨‍🎓 **Student** | Enrolled courses, published content, assignment submission, grades & deadlines, chat, calendar, notes, achievements/XP, request certificates, notifications |
| 👩‍🏫 **Teacher** | Manage **own** courses & rosters, publish content, review & grade submissions, gradebooks, **teacher-approve certificates**, course chat |
| 🧑‍💼 **Admin** (Organization Admin) | Manage **all users & courses within their tenant**, enrollments, **final certificate approval**, certificate templates, tenant branding, executive dashboard. Cannot access other tenants or promote to Super Admin |
| 👑 **Super Admin** | Full control across **all tenants**, global platform settings (global logo/favicon/colors), executive BI, plus account safeguards |

Role privileges follow a hierarchy (`superadmin ⊇ admin ⊇ teacher`); student self-service endpoints remain student-only. Permissions are enforced on the backend through role checks, tenant scoping, and resource-level ownership validation.

---

## ✨ Feature Catalog

### 🎓 Core LMS
- Secure authentication, role-aware dashboards
- Course, content, enrollment, and roster management
- Content types: announcements, lectures, videos, materials, external links, tasks
- Draft vs. published states; lecture completion tracking
- Assignment submission (text + file attachments), editing, deletion
- Grading, feedback, gradebooks, late-submission flagging
- Deadlines, overdue indicators, in-app notifications

### 🏢 Multi-Tenancy (Institution Isolation)
- Every model carries a `tenantId`; all reads/writes are tenant-scoped
- Organization Admins are confined to their own tenant; Super Admin spans all

### 💬 Chat / Messaging
- Course **group chats** and **direct** 1:1 chats
- REST + lightweight polling for near-real-time updates
- **Privacy-preserving notifications** — new-message alerts never reveal the sender or message content (users open the chat to see who/what)

### 📅 Academic Calendar
- Unified month/week/day/agenda views (react-big-calendar, RTL, themed)
- Aggregates task deadlines, lecture dates, and the student's submissions
- Click an event to jump to the relevant course

### 📝 Digital Sticky Notes
- Pinterest/Miro-style board with a handwriting font (**Caveat**)
- Color palette, pin/unpin, inline auto-save on blur
- **Drag-and-drop reorder** (@hello-pangea/dnd), optional course link
- Readable contrast (dark text on light notes, white on dark)

### 🎖️ Certificates
- PDF generation (**pdfkit**) with a scannable **QR verification** code (**qrcode**)
- **Approval workflow:** student requests → **teacher approves** → **admin approves** → issued (PDF becomes downloadable & publicly verifiable)
- **Admin-customizable templates** (title, body, signatures, color, logo, footer)
- Public verification page shows valid/pending/rejected states without leaking data

### 🏆 Gamification
- Event-driven engine awards **XP** and **badges** for submissions, lecture/course completion, chat, and daily-login streaks
- Per-course **leaderboards** ranked by XP
- Achievements page with unlocked + locked (progress) badges

### 📊 Executive BI Dashboard
- Charts (**Recharts**): top courses, daily submissions, user growth, teacher performance
- Summary KPIs (users, courses, submissions, average grade), tenant-scoped

### 💳 Payments (Stripe)
- Subscription checkout — **Monthly $299**, **Yearly $2990** (two months free)
- Webhook handling with raw-body signature verification
- Gracefully **disabled** (503) when Stripe keys are not configured — the app still boots

### 🎨 White-Labeling
- **Per-tenant** branding (Organization): platform name, primary/secondary colors, logo
- **Global** platform settings (Super Admin): global logo, **favicon**, colors, name
- Effective theme = tenant → global fallback; favicon is always global
- **File upload** for logo/favicon (Super Admin) via the hardened upload endpoint

### 📧 Email
- Reusable SMTP channel (**nodemailer**) for grading/welcome messages
- **Graceful fallback:** logs the email to the console when SMTP is unconfigured, so nothing breaks in dev/CI

---

## 🧰 Technology Stack

| Layer | Technologies |
|------|--------------|
| **Frontend** | React 18, React Router 6, Bootstrap 5, Axios, React Icons, Context API |
| **Data Viz & UX** | **Recharts** (charts), **react-big-calendar** + **moment** (calendar), **@hello-pangea/dnd** (drag-and-drop — the maintained `react-beautiful-dnd` fork, React 18 / StrictMode-safe) |
| **Backend** | Node.js, Express 4, Mongoose 7, Multer |
| **Certificates** | **pdfkit** (PDF), **qrcode** (QR verification) |
| **Payments** | **stripe** |
| **Email** | **nodemailer** (SMTP) |
| **Database** | MongoDB |
| **Authentication** | JWT, bcryptjs |
| **Security** | Multi-tenancy isolation, RBAC hierarchy, object-level authorization, CORS, rate limiting, security headers, input validation |
| **File Storage** | Local uploads with optional Cloudinary support |
| **Testing** | Node.js built-in test runner + browser-based QA |
| **Deployment** | Render |

---

# 🛡️ Security Architecture

Security was treated as a core engineering concern rather than a frontend-only feature.

### Multi-Tenancy Isolation
- Every model carries an indexed `tenantId`; all reads/writes are tenant-scoped
- Cross-tenant access is denied (responds as *not-found* to avoid disclosure)
- Super Admin is the only role permitted to span tenants

### Authentication
- JWT-based authentication, bcrypt password hashing (`select: false`)
- Active-account validation, uniform failures to reduce account enumeration

### Authorization
- Role-based access control with a `superadmin ⊇ admin ⊇ teacher` hierarchy
- Controller-level permission checks and object-level ownership validation
- Course ownership, submission boundaries, and notification ownership isolation

### File Upload Security
- Extension allow-list + blocked executable/renderable types (**SVG/HTML/JS rejected**)
- MIME **and** extension validation, size/count limits, **upload rate limiting**
- Hardened serving: `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment`

### API & Payments Protection
- Production CORS deny-by-default, input validation, NoSQL operator-injection guards
- Stripe **webhook raw-body signature verification**
- Fail-fast when `JWT_SECRET` is missing

### HTTP Security Headers
`X-Content-Type-Options` • `X-Frame-Options` • `Referrer-Policy` • `X-DNS-Prefetch-Control` • HSTS (production)

### Security Status

| Security Area | Status |
|---------------|--------|
| Multi-tenancy isolation | ✅ Implemented |
| Authentication | ✅ Implemented |
| RBAC hierarchy | ✅ Implemented |
| Object-level authorization | ✅ Implemented |
| Upload validation & rate limiting | ✅ Implemented |
| CORS hardening | ✅ Implemented |
| Security headers | ✅ Implemented |
| NoSQL operator protection | ✅ Implemented |
| Stripe webhook verification | ✅ Implemented |
| Enumeration resistance | ✅ Implemented |

> **Security note:** Dot is security-hardened against the identified application findings and has undergone focused security verification. It is not presented as vulnerability-free or formally security-certified.

---

# 🧪 Testing & Quality Assurance

### Backend

**149 / 149 automated tests passing**

```text
149 passed
0 failed
```

Coverage includes authentication & activation, security hardening, security headers, role authorization, course ownership & management, enrollment, notifications, submissions, late submissions, publishing, grading, gradebook, deadlines, and permission boundaries.

```bash
cd backend
npm test
```

### Frontend Production Build

```bash
CI=true npm run build   # → Compiled successfully, 0 warnings
```

### Browser QA & Responsive/RTL
Real-browser verification across Student, Teacher, Admin, and Super Admin covering login/logout, dashboards, course & content management, submissions, grading, chat, calendar, notes, achievements, notifications, error/loading states, and responsive layouts (mobile → wide desktop) with Arabic RTL alignment.

---

# 📁 Project Structure

```text
Dot-educational-platform/
│
├── backend/
│   ├── config/
│   ├── controllers/    # auth, users, courses, content, enrollment, submissions,
│   │                   # notifications, chat, calendar, notes, certificates,
│   │                   # gamification, analytics, payments, organizations,
│   │                   # platformSettings
│   ├── middleware/
│   ├── models/         # + Chat, Message, Note, Badge, UserStat, UserBadge,
│   │                   #   Certificate, CertificateTemplate, Organization,
│   │                   #   PlatformSettings, Subscription
│   ├── routes/
│   ├── utils/          # notifications, gamification, email, certificateGenerator
│   ├── tests/
│   ├── seed.js
│   └── server.js
│
├── frontend/
│   └── src/
│       ├── pages/      # + StudentCalendar, StudentNotes, StudentAchievements,
│       │               #   ExecutiveDashboard, PricingPage, GlobalSettingsPage,
│       │               #   CertificateVerify, PrivacyPolicy, TermsOfService, NotFoundPage
│       ├── components/
│       ├── context/    # AuthContext, ThemeContext (white-label + global)
│       ├── hooks/
│       └── utils/
│
├── render.yaml
├── LOCAL_SETUP.md
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites
- Node.js 18+, npm, MongoDB (local, Docker, or Atlas)

## 1. Clone
```bash
git clone https://github.com/aya2404/Dot-educational-platform.git
cd Dot-educational-platform
```

## 2. Install
```bash
cd backend && npm install
cd ../frontend && npm install
```

## 3. Configure `backend/.env`
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dot-jordan
JWT_SECRET=your_secure_secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:3000
PUBLIC_API_URL=http://localhost:5000

# Demo-account passwords (seed only)
DEMO_STUDENT_PASSWORD=DotStudent2026!
DEMO_TEACHER_PASSWORD=DotTeacher2026!
DEMO_ADMIN_PASSWORD=DotAdmin2026!
DEMO_SUPERADMIN_PASSWORD=DotSuper2026!

# Optional — Stripe payments (leave blank to keep payments disabled → 503)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

# Optional — SMTP email (leave blank to log emails to the console instead)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Frontend:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

> Never commit real secrets or production credentials.

## 4. Seed Demo Data
```bash
cd backend
npm run seed
```

## 5. Run
```bash
# terminal 1
cd backend && npm run dev      # http://localhost:5000  (health: /api/health)
# terminal 2
cd frontend && npm start       # http://localhost:3000
```

Detailed local setup is in [`LOCAL_SETUP.md`](./LOCAL_SETUP.md).

---

# ⚙️ Environment Variables

The source of truth is [`backend/.env.example`](./backend/.env.example).

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | No | Backend server port |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_EXPIRES_IN` | No | Token lifetime |
| `CLIENT_ORIGIN` | Yes | Allowed frontend origin(s) |
| `PUBLIC_API_URL` | Yes | Public API base URL for generated file links |
| `REACT_APP_API_URL` | Yes | Frontend API base URL |
| `DEMO_*_PASSWORD` | Seed only | Demo-account passwords |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PUBLISHABLE_KEY` | Optional | Enable Stripe payments (disabled → 503 if blank) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Optional | Enable SMTP email (console fallback if blank) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Optional | Cloud file storage |

---

# 🌍 Deployment

Dot is deployed on **Render** (React static site + Express web service + MongoDB), configured via `render.yaml`.

**[🚀 Launch Dot Educational Platform](https://dot-educational-platform-1.onrender.com)**

---

# 📸 Project Demo

### 🚀 Live Application
**[Open Dot Educational Platform →](https://dot-educational-platform-1.onrender.com)**

### 🎥 Video Walkthrough
> _Coming soon — a full product walkthrough will be published on LinkedIn and linked here._
>
> **▶️ Watch the walkthrough:** _[LinkedIn video link placeholder]_
>
> The walkthrough tours the Student, Teacher, and Admin journeys — including chat, calendar, sticky notes, gamification, certificates, the BI dashboard, and white-labeling.

---

# 🔮 Future Improvements

Deferred engineering and product enhancements (not blockers to the current scope):

### Product
- 📱 Native / PWA **mobile app**
- 📈 **Advanced learning analytics** (cohort insights, attendance, course-level reporting, instructor analytics)
- 🎮 **More gamification** (additional badges, seasonal challenges, level tiers, rewards)
- 🔔 True **real-time** chat & notifications via WebSockets (currently REST + polling)
- 🗓️ Custom calendar events & exam scheduling as first-class types
- 🧾 Fully Arabic certificate PDFs (embed an Arabic TTF for correct shaping)
- 🌗 Optional theming and accessibility passes

### Platform & Security
- 🧭 Centralized **audit logging** of sensitive admin actions
- 🛡️ Tailored **Content Security Policy** after auditing external resources
- ⚙️ Migrate the build toolchain to **Vite** (faster builds, fewer transitive advisories)
- 🔀 Evaluate **React Router 7** migration (addresses known advisories; needs route regression testing)

---

# 🎯 Engineering Focus

Dot demonstrates practical full-stack SaaS engineering across frontend architecture, REST API design, authentication & RBAC, **multi-tenant** data modeling, object-level access control, assessment & gamification systems, PDF/QR generation, payment integration, white-label theming, email delivery, file handling, automated testing, browser QA, security hardening, and production deployment.

The project emphasizes not only feature breadth, but **security, tenant isolation, authorization boundaries, data integrity, testing, maintainability, and real user workflows**.

---

# 👩‍💻 Author

## Aya Abu Taha

**Software Engineer & Full-Stack Developer**

Focused on building secure, maintainable, user-centered web applications.

- 🌐 **Live Demo:** [dot-educational-platform-1.onrender.com](https://dot-educational-platform-1.onrender.com)
- 💻 **GitHub:** [github.com/aya2404/Dot-educational-platform](https://github.com/aya2404/Dot-educational-platform)
- 🔗 **LinkedIn:** [linkedin.com/in/aya-abu-taha](https://linkedin.com/in/aya-abu-taha)

---

<div align="center">

### 🎓 Dot Educational Platform

**Learn. Teach. Manage. Engage.**

Built with React, Node.js, Express, and MongoDB — with a strong focus on security, multi-tenancy, UX, and role-based educational workflows.

**2026**

</div>
