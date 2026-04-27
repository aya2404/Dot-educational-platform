# Dot Jordan — Technical Documentation

## 1) Architecture Overview
- **Frontend:** React (CRA), React Router, Axios, role-based route protection.
- **Backend:** Node.js + Express + MongoDB (Mongoose), JWT auth middleware, role authorization.
- **Core domains:** Users, Courses, Content Timeline, Enrollments, Submissions.

## 2) Key Changes Implemented
- Fixed critical backend validation crash in content creation and hardened ObjectId validation paths.
- Hardened enrollment flow to prevent server crashes on invalid IDs and improved role-safe checks.
- Stabilized session handling by removing forced hard-redirect logout behavior on every 401 response.
- Added centralized unauthorized handler integration between Axios and AuthContext.
- Added full file upload system:
  - Backend upload endpoint (`/api/uploads`)
  - Multer-based secure file filtering and size limits
  - Cloudinary support with local fallback storage
  - Frontend reusable upload component for content creation and task submissions
- Replaced destructive browser confirm dialog with reusable centered modal using Arabic title:
  - **"تأكيد الحذف"**
- Upgraded shared navigation icons to library-based icon system (React Icons).
- Integrated Dot Jordan logo in login and sidebar branding.
- Added Bootstrap base CSS integration for scalable utility usage.

## 3) Files Modified
- `backend/server.js`
- `backend/controllers/contentController.js`
- `backend/controllers/enrollmentController.js`
- `backend/controllers/submissionController.js`
- `backend/controllers/userController.js`
- `backend/package.json`
- `backend/package-lock.json`
- `frontend/src/utils/api.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/pages/CreateContentPage.jsx`
- `frontend/src/components/student/TaskSubmissionModal.jsx`
- `frontend/src/components/common/Sidebar.jsx`
- `frontend/src/components/common/Sidebar.css`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/LoginPage.css`
- `frontend/src/index.js`
- `frontend/package.json`
- `frontend/package-lock.json`

## 4) Files Added
- `backend/config/cloudinary.js`
- `backend/middleware/upload.js`
- `backend/controllers/uploadController.js`
- `backend/routes/uploads.js`
- `frontend/src/components/common/FileUploader.jsx`
- `frontend/src/components/common/ConfirmModal.jsx`

## 5) Local Setup
### Backend
1. `cd backend`
2. `npm install`
3. Ensure `.env` exists with required variables.
4. `npm run dev` (or `npm start`)

### Frontend
1. `cd frontend`
2. `npm install`
3. Ensure optional `.env` includes `REACT_APP_API_URL` if needed.
4. `npm start`

## 6) Local Run Validation
- Frontend production build:
  - `cd frontend && npm run build`
- Backend start check:
  - `cd backend && npm start`

## 7) Render Deployment Steps
1. Create Backend Web Service (Node).
2. Set root directory to `backend`.
3. Add environment variables from section below.
4. Build command: `npm install`
5. Start command: `npm start`
6. Health check path: `/api/health`
6. Create Frontend Static Site:
   - Root directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `build`
7. Add a Rewrite rule to the frontend static site:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: `Rewrite`
8. Set frontend API URL to the backend API base path, not just the backend root:
   - Correct: `https://your-backend.onrender.com/api`
   - Incorrect: `https://your-backend.onrender.com`
9. Set backend `CLIENT_ORIGIN` to the frontend URL and `PUBLIC_API_URL` to the backend root URL.
10. If you are not using Cloudinary, attach a Render persistent disk and point `UPLOAD_DIR` to it (for example `/var/data/uploads`).

## 8) Required Production ENV Variables
### Backend
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_ORIGIN`
- `PUBLIC_API_URL`
- `UPLOAD_DIR` *(recommended if you are not using Cloudinary)*
- `CLOUDINARY_CLOUD_NAME` *(recommended)*
- `CLOUDINARY_API_KEY` *(recommended)*
- `CLOUDINARY_API_SECRET` *(recommended)*
- `PORT` *(Render sets this automatically; you usually do not need to add it manually)*
- `NODE_VERSION` *(recommended: `22`)*

### Frontend
- `REACT_APP_API_URL`
- `NODE_VERSION` *(recommended: `22`)*

## 9) Troubleshooting
- **Random logout:** confirm valid JWT secret consistency and no stale token in localStorage.
- **Upload fails or uploaded files disappear after redeploy:** verify Cloudinary env vars, or attach a Render persistent disk and set `UPLOAD_DIR`.
- **Enrollment error:** confirm selected student/course IDs are valid Mongo ObjectIds.
- **403 route issues:** verify role + protected route mapping and backend `authorize(...)` constraints.
- **Login or API calls return 404 on production:** ensure `REACT_APP_API_URL` ends with `/api`.
- **Refreshing `/login` or any protected frontend route returns 404:** add the Render rewrite `/* -> /index.html`.
