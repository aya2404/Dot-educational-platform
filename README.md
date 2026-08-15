<div align="center">

# 🎓 Dot Educational Platform

### A production-deployed, security-hardened Full-Stack Learning Management System

**Arabic-first • RTL • Role-Based Access Control • Assessment & Grading • Secure REST API**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-2ea44f?style=for-the-badge)](https://dot-educational-platform-1.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/aya2404/Dot-educational-platform)
[![Tests](https://img.shields.io/badge/Backend_Tests-149%2F149_Passing-brightgreen?style=for-the-badge&logo=node.js)](https://github.com/aya2404/Dot-educational-platform)

[**Launch Live Application →**](https://dot-educational-platform-1.onrender.com)

</div>

---

## 📌 Overview

**Dot** is a full-stack Learning Management System designed to centralize the academic workflows of students, teachers, and administrators in a single role-aware platform.

The system supports the complete learning lifecycle — from **course creation and enrollment** to **content publishing, assignment submission, grading, gradebook management, deadlines, and notifications**.

Dot is built with an **Arabic-first RTL interface** and a security-focused backend where authorization is enforced server-side rather than relying on frontend visibility alone.

### Key Highlights

- 🔐 Layered authentication, RBAC, and object-level authorization
- 🎓 Complete student, teacher, admin, and super-admin workflows
- 📝 Assignment submission, grading, feedback, and gradebook
- 📚 Course, content, enrollment, and roster management
- 🔔 In-app notifications and deadline tracking
- 🌐 Arabic-first responsive RTL interface
- 🛡️ Upload validation, CORS hardening, security headers, and rate limiting
- 🧪 149/149 backend tests passing
- 🚀 Deployed on Render with a production frontend and API

---

## 🚀 Live Demo

### [Launch Dot Educational Platform →](https://dot-educational-platform-1.onrender.com)

The deployed application provides the complete platform experience across its supported user roles.

> **Note:** The application runs on Render. The free hosting tier may require a short wake-up period after inactivity.

---

## 🏗️ Architecture

Dot follows a layered client-server architecture:

```text
┌─────────────────────────────────────────────┐
│              React 18 SPA                   │
│           Arabic / RTL Interface            │
│        Bootstrap • Axios • Router           │
└──────────────────────┬──────────────────────┘
                       │
                       │ HTTPS / REST API
                       │ Bearer JWT
                       ▼
┌─────────────────────────────────────────────┐
│              Express REST API               │
│ Authentication • Validation • Rate Limiting │
│              CORS • Security Headers        │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│       Layered Authorization Boundary        │
│                                             │
│ Route Role Check                            │
│          ↓                                  │
│ Authentication Middleware                  │
│          ↓                                  │
│ Controller Permission Check                │
│          ↓                                  │
│ Object Ownership Resolution                │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│          Controllers & Business Logic       │
│ Auth • Courses • Content • Enrollment       │
│ Submissions • Grading • Notifications       │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│           Mongoose 7 / MongoDB              │
│        Validated Models & Data Layer        │
└─────────────────────────────────────────────┘
```

### Authorization Pipeline

```text
Request
  ↓
Authentication
  ↓
Role Authorization
  ↓
Resource Ownership / Permission Check
  ↓
Controller Logic
  ↓
Database Operation
```

This layered model ensures that the backend remains the final security boundary, even if a client attempts to bypass frontend restrictions.

---

## 👥 User Roles & Permissions

| Role | Core Capabilities |
|------|-------------------|
| 👨‍🎓 **Student** | Access enrolled courses, view published content, submit assignments, view grades and deadlines, receive notifications |
| 👩‍🏫 **Teacher** | Create and manage courses, manage rosters, publish content, review submissions, grade students, manage gradebooks |
| 🧑‍💼 **Admin** | Manage users, courses, content, and rosters across the platform |
| 👑 **Super Admin** | Administrative capabilities plus enrollment/system-level management and additional account safeguards |

Permissions are enforced on the backend through role checks and resource-level ownership validation.

---

## ✨ Core Features

### 🎓 Student Experience

- Secure authentication
- Student dashboard
- Enrolled course access
- Published learning content
- Lecture completion tracking
- Assignment submission
- Submission editing and deletion
- File attachments
- Grades and teacher feedback
- Deadline tracking
- Overdue indicators
- In-app notifications
- Responsive RTL navigation

### 👩‍🏫 Teacher Experience

- Teacher dashboard
- Course creation, editing, and deletion
- Student roster management
- Enrollment and unenrollment
- Content creation and editing
- Draft and published content states
- Assignment management
- Submission review
- Grading and feedback
- Course gradebook
- Notifications

### 🧑‍💼 Administration

- User management
- Account activation/deactivation
- Platform-wide course management
- Content and roster management
- Enrollment management
- Super-admin safeguards

---

## 🔄 Main Application Workflow

```text
Authentication
      ↓
Role Resolution
      ↓
Dashboard
      ↓
Course Access / Management
      ↓
Learning Content
      ↓
Assignments
      ↓
Student Submission
      ↓
Teacher Review
      ↓
Grading & Feedback
      ↓
Gradebook
      ↓
Deadlines & Notifications
```

### Assessment Workflow

```text
Teacher Creates Assignment
          ↓
Assignment Published
          ↓
Student Submits Work
          ↓
Server Determines Submission Status
          ↓
Teacher Reviews Submission
          ↓
Grade + Feedback
          ↓
Gradebook Updated
          ↓
Student Notification
```

---

## 🧰 Technology Stack

| Layer | Technologies |
|------|--------------|
| **Frontend** | React 18, React Router 6, Bootstrap 5, Axios, React Icons, Context API |
| **Backend** | Node.js, Express 4, Mongoose 7, Multer |
| **Database** | MongoDB |
| **Authentication** | JWT, bcryptjs |
| **Security** | RBAC, object-level authorization, CORS, rate limiting, security headers, input validation |
| **File Storage** | Local uploads with optional Cloudinary support |
| **Testing** | Node.js built-in test runner + browser-based QA |
| **Deployment** | Render |

---

# 🛡️ Security Architecture

Security was treated as a core engineering concern rather than a frontend-only feature.

### Authentication

- JWT-based authentication
- bcrypt password hashing
- Password fields excluded from normal queries
- Active-account validation
- Uniform authentication failures to reduce account enumeration
- Authentication rate limiting

### Authorization

- Role-based access control
- Protected API routes
- Controller-level permission checks
- Object-level ownership validation
- Course ownership enforcement
- Submission ownership boundaries
- Notification ownership isolation

### File Upload Security

- Extension allow-list
- Blocked executable/renderable file types
- MIME and extension validation
- Upload size and count limits
- Hardened upload serving
- `X-Content-Type-Options: nosniff`
- `Content-Disposition: attachment`

### API & Input Protection

- Production CORS deny-by-default
- Input validation
- Required-field validation
- Malformed identifier handling
- NoSQL operator-injection protection
- Fail-fast behavior when `JWT_SECRET` is missing

### HTTP Security Headers

The application applies baseline security headers including:

- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `X-DNS-Prefetch-Control`
- HSTS in production

### Security Status

| Security Area | Status |
|---------------|--------|
| Authentication | ✅ Implemented |
| RBAC | ✅ Implemented |
| Object-level authorization | ✅ Implemented |
| Upload validation | ✅ Implemented |
| CORS hardening | ✅ Implemented |
| Security headers | ✅ Implemented |
| Rate limiting | ✅ Implemented |
| Notification ownership | ✅ Implemented |
| NoSQL operator protection | ✅ Implemented |
| Authentication enumeration resistance | ✅ Implemented |

> **Security note:** Dot is security-hardened against the identified application findings and has undergone focused security verification. It is not presented as vulnerability-free or formally security-certified.

---

# 🧪 Testing & Quality Assurance

The project underwent a comprehensive QA and production-readiness verification covering backend functionality, security boundaries, frontend builds, browser workflows, responsive layouts, and data integrity.

### Backend

**149 / 149 automated tests passing**

```text
149 passed
0 failed
```

The complete backend suite was executed twice with zero failures.

Coverage includes:

- Authentication and account activation
- Security hardening
- Security headers
- Role authorization
- Course ownership
- Course management
- Enrollment
- Notifications
- Submissions
- Late submissions
- Publishing
- Grading
- Gradebook
- Deadlines
- Permission boundaries

Run the backend tests:

```bash
cd backend
npm test
```

### Frontend Production Build

The production frontend build was verified successfully:

```bash
CI=true npm run build
```

Result:

```text
Compiled successfully
0 warnings
```

### Browser QA

Real browser verification covered the major workflows for:

- Student
- Teacher
- Admin
- Super Admin

Verified areas included:

- Login and logout
- Dashboard navigation
- Course management
- Enrollment and roster management
- Content creation and publishing
- Assignment submission
- Submission editing/deletion
- Grading
- Gradebook
- Notifications
- Error and loading states
- Refresh behavior
- Responsive navigation

### Responsive & RTL Verification

The interface was reviewed across approximately:

| Viewport | Target |
|----------|--------|
| 📱 375px | Mobile |
| 📱 390px | Mobile |
| 📟 768px | Tablet |
| 💻 1280px | Desktop |
| 🖥️ 1440px | Wide desktop |

The review covered navigation, sidebars, modals, forms, tables, cards, notifications, buttons, overflow behavior, touch interactions, Arabic alignment, and mixed Arabic/English content.

---

# 📁 Project Structure

```text
Dot-educational-platform/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── tests/
│   ├── seed.js
│   └── server.js
│
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── context/
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

- Node.js 18+
- npm
- MongoDB

MongoDB can run locally, through Docker, or through MongoDB Atlas.

## 1. Clone the Repository

```bash
git clone https://github.com/aya2404/Dot-educational-platform.git
cd Dot-educational-platform
```

## 2. Install Dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

## 3. Configure Environment Variables

Create:

```text
backend/.env
```

using:

```text
backend/.env.example
```

Example local configuration:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dot-jordan
JWT_SECRET=your_secure_secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:3000
PUBLIC_API_URL=http://localhost:5000
```

For the frontend:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

> Never commit real secrets or production credentials.

## 4. Seed Demo Data

The repository includes an idempotent demo-data seed process:

```bash
cd backend
npm run seed
```

Demo account information and detailed local setup instructions are available in [`LOCAL_SETUP.md`](./LOCAL_SETUP.md).

## 5. Start the Backend

```bash
cd backend
npm run dev
```

The API runs locally on:

```text
http://localhost:5000
```

Health endpoint:

```text
http://localhost:5000/api/health
```

## 6. Start the Frontend

In a separate terminal:

```bash
cd frontend
npm start
```

The frontend runs locally on:

```text
http://localhost:3000
```

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
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary configuration |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary configuration |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary configuration |
| `REACT_APP_API_URL` | Yes | Frontend API base URL |
| `DEMO_*_PASSWORD` | Seed only | Demo-account passwords |

---

# 🌍 Deployment

Dot is deployed on **Render** using the repository deployment configuration.

The deployment consists of:

```text
React SPA
   │
   ▼
Render Static Site
   │
   │ REST API
   ▼
Render Web Service
   │
   ▼
MongoDB
```

Deployment configuration is maintained in:

```text
render.yaml
```

### Live Application

**[🚀 Launch Dot Educational Platform](https://dot-educational-platform-1.onrender.com)**

---

# ⚠️ Known Limitations & Future Improvements

These items are intentionally deferred engineering improvements rather than blockers to the current application scope.

### React Router Modernization

The application currently uses React Router 6. A future migration to React Router 7 would address known dependency advisories, but it is a major-version change requiring dedicated route regression testing.

### Frontend Build Toolchain

The current Create React App toolchain has transitive development/build dependency advisories.

A future migration to a modern bundler such as **Vite** would improve long-term maintainability and build performance.

### Content Security Policy

A tailored CSP can be introduced after auditing the application's external resources, embedded media, fonts, images, and scripts.

### Future Product Improvements

Potential future enhancements include:

- Advanced learning analytics
- Student progress dashboards
- Attendance tracking
- Course-level reporting
- Instructor analytics
- Additional assessment types

---

# 🎯 Engineering Focus

Dot was built to demonstrate practical full-stack engineering across:

- Frontend architecture
- REST API design
- Authentication
- Role-based authorization
- Object-level access control
- MongoDB data modeling
- Course and enrollment workflows
- Assessment and grading systems
- File handling
- Notifications
- Responsive UI
- RTL interfaces
- Automated testing
- Browser QA
- Security hardening
- Production deployment

The project emphasizes not only feature implementation, but also **security, authorization boundaries, data integrity, testing, maintainability, and real user workflows**.

---

# 📸 Project Demo

### 🚀 Live Application

**[Open Dot Educational Platform →](https://dot-educational-platform-1.onrender.com)**

### 🎥 Video Walkthrough

A complete project walkthrough can be added here for portfolio presentation.

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

**Learn. Teach. Manage.**

Built with React, Node.js, Express, MongoDB, and a strong focus on security, UX, and role-based educational workflows.

**2026**

</div>
