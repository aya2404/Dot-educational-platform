# Dot Jordan Documentation

## Overview

Dot Jordan is a MERN-based education system for managing courses, lectures, tasks, submissions, enrollments, and users.

Supported roles:

- `student`: views enrolled courses, reads course content, uploads files, and submits tasks.
- `teacher`: manages content inside assigned courses.
- `admin`: manages users and can manage content platform-wide.
- `superadmin`: manages users, courses, enrollments, and full platform administration.

Current implementation goals already reflected in the codebase:

- stable backend startup without missing-module crashes
- consistent routing between frontend and backend
- working upload pipeline with local storage and optional Cloudinary
- permission-aware CRUD operations
- frontend cleaned from marketing and descriptive filler text

## Technology Stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT, Multer
- Frontend: React 18, React Router 6, Axios, Bootstrap 5, `react-icons/bs`
- Storage:
  - MongoDB for data
  - `backend/uploads` for local files
  - optional Cloudinary for hosted uploads

## Project Structure

### Root

- `backend/`: Express API and business logic
- `frontend/`: React client application
- `DOCUMENTATION.md`: main technical and operational documentation
- `TECHNICAL_DOCUMENTATION.md`: supplementary notes
- `QA_NOTION_PACKAGE.md`: QA/support notes

### Backend folders

- `backend/config/`
  - `db.js`: Mongo connection bootstrap
  - `cloudinary.js`: optional Cloudinary setup
- `backend/controllers/`
  - request handlers for auth, users, courses, content, enrollments, submissions, uploads
- `backend/middleware/`
  - `auth.js`: JWT validation and role checks
  - `errorHandler.js`: not found + centralized error responses
  - `upload.js`: Multer file filtering and memory storage
- `backend/models/`
  - `User.js`: user accounts and roles
  - `Course.js`: course metadata
  - `Content.js`: lectures, tasks, announcements, materials
  - `Enrollment.js`: student-course mapping
  - `Submission.js`: student task submissions
- `backend/routes/`
  - API route registration for each domain
- `backend/seed/`
  - seed script and sample data
- `backend/utils/`
  - `attachments.js`: normalize attachment metadata and public URLs
  - `courseAccess.js`: course visibility/access rules
  - `permissions.js`: permission and deadline helpers
  - `serializers.js`: normalized API output formatting
- `backend/uploads/`
  - runtime directory for locally stored uploaded files

### Frontend folders

- `frontend/src/assets/`
  - logo and static visual assets
- `frontend/src/components/common/`
  - shared layout, sidebar, logo, file upload, attachments, modals, route guards
- `frontend/src/components/student/`
  - timeline rendering and task submission UI
- `frontend/src/context/`
  - `AuthContext.jsx`: session restore, login/logout, current user
- `frontend/src/pages/`
  - login, dashboards, course page, content create/edit page
- `frontend/src/styles/`
  - global theme and shared UI styling
- `frontend/src/utils/`
  - API client, auth helpers, content labels, attachment helpers

## Backend Architecture

### Request flow

1. `backend/server.js` loads environment variables and connects to MongoDB.
2. Express mounts middleware for CORS, JSON parsing, urlencoded parsing, and static uploads.
3. `/api/*` routes forward requests to controllers.
4. Controllers validate input, check permissions, call Mongoose models, and serialize responses.
5. `notFound` and `errorHandler` handle unknown routes and runtime failures.

### API mounting

- `/api/auth`
- `/api/users`
- `/api/courses`
- `/api/content`
- `/api/enrollments`
- `/api/submissions`
- `/api/uploads`
- `/api/health`

### Access and permissions

Authorization is enforced in two layers:

- route-level role checks via `middleware/auth.js`
- resource-level checks via `utils/courseAccess.js` and `utils/permissions.js`

Important rules currently implemented:

- teachers can create content only in courses they are assigned to
- teachers can edit/delete content in their assigned courses
- admins and superadmins can manage content platform-wide
- students cannot mutate course content
- students can submit and delete their own submissions only before the task deadline
- upload endpoint is available to `student`, `teacher`, `admin`, and `superadmin`

### Stability fixes already applied

- restored missing modules for uploads, Cloudinary config, and attachment utilities
- validated Mongo configuration before startup
- added explicit startup error handling
- added ObjectId validation in multiple controllers
- normalized attachment handling for local files, external links, and Cloudinary files
- fixed permission metadata serialization for frontend actions

## Frontend Structure

### Core files

- `frontend/src/App.jsx`
  - application routes and protected route setup
- `frontend/src/context/AuthContext.jsx`
  - login state, current user, token persistence
- `frontend/src/utils/api.js`
  - shared Axios instance
  - injects JWT token into requests
  - handles unauthorized responses

### Main pages

- `LoginPage.jsx`
  - login form and brand lockup
- `StudentDashboard.jsx`
  - enrolled courses and progress summary
- `TeacherDashboard.jsx`
  - assigned courses and course students
- `AdminDashboard.jsx`
  - user-management entry points
- `SuperAdminDashboard.jsx`
  - user/course/enrollment administration
- `CoursePage.jsx`
  - course timeline and manager actions
- `CreateContentPage.jsx`
  - create/edit lectures, tasks, announcements, and materials

### UI notes

- the frontend does not rely on CRA proxy anymore
- all API calls use `REACT_APP_API_URL`
- branding remains fixed in the top-left area on login and sidebar layouts
- descriptive marketing copy was removed from visible screens
- timeline and submission actions render from backend permission metadata

## Main API Endpoints

### Authentication

- `POST /api/auth/login`
  - login using username or identifier + password
- `GET /api/auth/me`
  - fetch currently authenticated user

### Users

- `GET /api/users`
  - list users
  - roles allowed: `admin`, `superadmin`
- `POST /api/users`
  - create user
  - roles allowed: `admin`, `superadmin`
- `GET /api/users/:id`
  - get user details
  - roles allowed: `admin`, `superadmin`
- `PUT /api/users/:id`
  - update user
  - roles allowed: `admin`, `superadmin`
- `DELETE /api/users/:id`
  - delete user
  - role allowed: `superadmin`

### Courses

- `GET /api/courses`
  - get courses visible to current user
- `POST /api/courses`
  - create course
  - role allowed: `superadmin`
- `GET /api/courses/:id`
  - get single course
- `PUT /api/courses/:id`
  - update course
  - role allowed: `superadmin`
- `DELETE /api/courses/:id`
  - delete course
  - role allowed: `superadmin`
- `GET /api/courses/:id/students`
  - get enrolled students in a course
  - roles allowed: `teacher`, `admin`, `superadmin`

### Content

- `GET /api/content/course/:courseId`
  - get course timeline
- `POST /api/content`
  - create lecture/task/material/announcement
  - roles allowed: `teacher`, `admin`, `superadmin`
- `GET /api/content/:id`
  - get single content item
- `PUT /api/content/:id`
  - update content
  - roles allowed: `teacher`, `admin`, `superadmin`
- `DELETE /api/content/:id`
  - delete content
  - roles allowed: `teacher`, `admin`, `superadmin`

### Enrollments

- `POST /api/enrollments`
  - enroll a student in a course
  - role allowed: `superadmin`
- `GET /api/enrollments/my`
  - student enrolled courses
  - role allowed: `student`
- `POST /api/enrollments/complete`
  - mark lecture as complete
  - role allowed: `student`
- `GET /api/enrollments/progress/:courseId`
  - get student progress for one course
  - role allowed: `student`
- `DELETE /api/enrollments/:id`
  - remove enrollment
  - role allowed: `superadmin`

### Submissions

- `POST /api/submissions`
  - create/update student task submission
  - role allowed: `student`
- `GET /api/submissions/my`
  - get current student submissions
  - role allowed: `student`
- `GET /api/submissions/status/:courseId`
  - get student task submission status in a course
  - role allowed: `student`
- `GET /api/submissions/task/:taskId`
  - get all submissions for a task
  - roles allowed: `teacher`, `admin`, `superadmin`
- `DELETE /api/submissions/:id`
  - delete submission according to resource permissions

### Uploads

- `POST /api/uploads`
  - multipart upload using field name `files`
  - max files per request: `5`
  - size limit: `10MB` per file
  - roles allowed: `student`, `teacher`, `admin`, `superadmin`

### Health

- `GET /api/health`
  - lightweight backend health check

## Permission Matrix

### Student

- login and view own dashboard
- read enrolled course content
- mark lectures completed
- upload files
- submit tasks before deadline
- delete own submission before deadline

### Teacher

- login and view assigned courses
- create lecture/material/task/announcement in assigned courses
- edit/delete course content in assigned courses
- view students in assigned courses
- review task submissions
- upload attachments

### Admin

- manage users except superadmin-only deletions
- access course and content management screens
- create/edit/delete content
- upload attachments

### Superadmin

- full user management
- create/update/delete courses
- enroll and unenroll students
- create admin accounts
- full content management

## File Upload System

### Backend upload flow

1. Frontend sends `multipart/form-data` to `POST /api/uploads`.
2. `backend/middleware/upload.js` validates file type and size.
3. `backend/controllers/uploadController.js` stores files:
   - in Cloudinary when credentials exist
   - locally in `backend/uploads` when Cloudinary is not configured
4. Uploaded files are normalized into a shared attachment format.
5. Frontend stores the returned attachment metadata inside content items or submissions.

### Supported attachment types

- images
- documents such as `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`
- `txt`, `csv`, `json`
- compressed files such as `zip`, `rar`
- external links

### Public file access

- local uploads are served from `/uploads/*`
- public URLs are generated using `PUBLIC_API_URL` when it is set

## Environment Variables

### Backend `.env`

Required:

- `PORT`: backend port, default `5000`
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `CLIENT_ORIGIN`: allowed frontend origin for CORS
- `PUBLIC_API_URL`: public backend URL used to build upload links

Optional:

- `JWT_EXPIRES_IN`: JWT expiry, default depends on auth implementation
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Example:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dot-jordan
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:3000
PUBLIC_API_URL=http://localhost:5000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Frontend `.env`

Required:

- `REACT_APP_API_URL`: full backend API base URL

Example:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Important:

- the frontend is configured to call the backend directly through `REACT_APP_API_URL`
- do not rely on a development proxy value in `package.json`

## How To Run The Project

### 1. Start MongoDB

Make sure MongoDB is running locally before starting the backend.

### 2. Configure backend

From `backend/`:

1. copy `.env.example` to `.env`
2. fill in the required variables
3. install dependencies with `npm install`

### 3. Configure frontend

From `frontend/`:

1. copy `.env.example` to `.env`
2. set `REACT_APP_API_URL`
3. install dependencies with `npm install`

### 4. Seed sample data

From `backend/`:

```bash
npm run seed
```

What the seed currently creates:

- one `superadmin`
- one `teacher`
- multiple `student` accounts
- one course
- course content timeline
- enrollments

Sample credentials created by the seed:

- `superadmin` / `super2004`
- `eng_balqees` / `eng123456`
- `student_001` / `student1001`
- `student_002` / `student1002`
- continue with the same pattern for seeded students

Note:

- the seed does not create a default `admin`
- create an admin later from the superadmin dashboard or via the users API

### 5. Start backend

From `backend/`:

```bash
npm start
```

Backend default URL:

- `http://localhost:5000`

### 6. Start frontend

From `frontend/`:

```bash
npm start
```

Frontend default URL:

- `http://localhost:3000`

## How To Test Locally

### Backend smoke checks

- call `GET /api/health`
- login through `POST /api/auth/login`
- verify `GET /api/auth/me`
- verify course timeline retrieval
- verify content create/update/delete with teacher and admin roles
- verify upload endpoint with at least one file
- verify student submission create/delete before deadline
- verify user creation from superadmin/admin flows

### Frontend smoke checks

- login with each supported role
- open the role dashboard
- open a course page
- create/edit/delete lecture or task as teacher/admin
- upload a file inside content creation
- submit a task as student
- verify buttons are hidden when permission metadata disallows the action

### Build verification

From `frontend/`:

```bash
npm run build
```

This should complete without compile-time errors.

## Maintenance Notes

- keep route registration and controller filenames synchronized
- keep `REACT_APP_API_URL` aligned with the backend port in `.env`
- keep `backend/uploads` ignored from git
- if Cloudinary is disabled, ensure `backend/uploads` is writable
- when adding new content or submission actions, update both backend permission helpers and frontend conditional rendering
