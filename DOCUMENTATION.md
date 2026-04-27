# Dot Jordan Technical Documentation

## 1. Project Overview

Dot Jordan is a MERN educational platform with four roles:

- `student`: views enrolled courses, marks lectures complete, and submits tasks.
- `teacher`: manages assigned course content.
- `admin`: manages users and courses, and can manage course content across the platform.
- `superadmin`: manages users, courses, enrollments, and global content operations.

The stack is split into:

- `backend/`: Express API, MongoDB models, JWT auth, uploads, and role/ownership validation.
- `frontend/`: React + Bootstrap UI with role-protected routing and a shared pastel design system.

This pass focused on production-quality stabilization and refinement rather than adding unrelated features.

## 2. Architecture Summary

### Frontend

- `frontend/src/App.jsx`: role-aware routing and protected screens.
- `frontend/src/context/AuthContext.jsx`: session restore, login/logout, token persistence.
- `frontend/src/utils/api.js`: shared Axios client and unauthorized handling.
- `frontend/src/utils/auth.js`: role labels, home routes, course routes, and content-form routes.
- `frontend/src/utils/attachments.js`: attachment normalization and public URL resolution.
- `frontend/src/utils/contentTypes.js`: content labels/colors plus deadline formatting helpers.
- `frontend/src/components/common/*`: shared shell, branding, attachment, file upload, and modal UI.
- `frontend/src/pages/*`: dashboards, course view, login, and content create/edit screen.

### Backend

- `backend/server.js`: API bootstrapping, static uploads, CORS, error middleware.
- `backend/middleware/auth.js`: JWT validation and role authorization.
- `backend/utils/courseAccess.js`: course-level access validation.
- `backend/utils/permissions.js`: ownership-aware content/submission permission rules.
- `backend/utils/serializers.js`: normalized API responses with permission flags.
- `backend/controllers/*`: auth, course, content, submission, upload, enrollment, and user logic.
- `backend/models/*`: MongoDB domain models for users, courses, content, enrollments, and submissions.

## 3. Summary Of Changes

### Backend

- Added ownership-aware permission helpers for content and submissions.
- Enforced that teachers can only edit/delete content they created.
- Allowed `admin` and `superadmin` to manage content where appropriate.
- Added permission metadata to serialized content and submission responses.
- Blocked student submission edits/deletes after the task deadline.
- Kept submission creation/update on the existing stable upsert flow, but hardened the deadline rules.
- Blocked content course reassignment after creation to keep ownership and audit flow clear.
- Added stricter content type/title validation during updates.

### Frontend

- Added role-specific routes for:
  - admin course pages
  - admin content creation/edit
  - superadmin content edit
  - teacher content edit
- Reworked the content form into a shared create/edit page.
- Added edit/delete actions inside the course timeline for owned content and admin-level managers.
- Added student submission locking in the UI once a deadline passes.
- Added query-based course preselection when creating content from a course page.
- Added clearer course-management entry points from teacher/admin/superadmin dashboards.

### UI / UX / Branding

- Replaced placeholder branding with the real Dot Jordan logo asset.
- Added a reusable `BrandLogo` component for login, sidebar, and mobile header.
- Refined the full Bootstrap theme with softer surfaces, calmer shadows, and more consistent spacing.
- Added a subtle beige grid background inspired by the provided references.
- Improved the login page with a stronger branded split layout and a cleaner visual panel.
- Kept a consistent Bootstrap Icons system through `react-icons/bs`, but upgraded icon choices for clarity.

### Typography

- Added `Manrope` for English brand/supporting text.
- Kept Arabic-friendly typography with `IBM Plex Sans Arabic` for body text.
- Used `Cairo` for stronger Arabic headings and display hierarchy.
- Applied clearer hierarchy across dashboards, cards, forms, and branded areas.

## 4. CRUD Permissions And Ownership Rules

### Content Ownership

The `Content` model is the shared source for:

- lectures
- materials
- tasks
- announcements

Rules now applied:

- Teachers can create content inside courses they manage.
- Teachers can edit/delete only content they created themselves.
- Admins and superadmins can create/edit/delete content as platform managers.
- Students can read course content only through enrollment access and cannot mutate course content.
- Attachment editing inherits the same content ownership rule.

Backend enforcement:

- `backend/controllers/contentController.js`
- `backend/routes/content.js`
- `backend/utils/permissions.js`
- `backend/utils/serializers.js`

Frontend enforcement:

- Timeline action buttons render only when `item.permissions.canEdit` or `item.permissions.canDelete` is true.
- Edit pages are role-routed and protected.

### Student Submission Ownership

Rules now applied:

- Students can create or update their own submission before the deadline.
- Students can delete their own submission before the deadline.
- After the deadline, student submission mutation is blocked in both backend and frontend.
- Admins and superadmins can still manage submissions where needed.
- Teachers can still review task submissions, but destructive submission management is not granted by default.

Backend enforcement:

- `backend/controllers/submissionController.js`
- `backend/utils/permissions.js`
- `backend/utils/serializers.js`

Frontend enforcement:

- Submission buttons are disabled after the deadline.
- The submission modal becomes read-only when the submission window is closed.
- Delete is hidden/disabled unless `existingSubmission.permissions.canDelete` is true.

## 5. Styling, Theme, Typography, And Icons

### Theme Direction

The interface now follows a softer Dot Jordan theme using the existing pastel system:

- `#BDCFFF`
- `#B8C0FF`
- `#C8B6FE`
- `#E7C5FF`
- `#FED5FF`
- background support: `#EFEBE0`
- main text: `#203F9A`

The references influenced three practical decisions:

- a calmer lilac/beige atmosphere instead of plain white-only surfaces
- softer grid-backed background texture instead of a flat canvas
- a cleaner educational dashboard feel with lighter cards and less visual noise

### Typography Decisions

- Body text: `IBM Plex Sans Arabic`, then `Manrope`
- Headings: `Cairo`, then `Manrope`
- Brand lockups and English emphasis: `Manrope`

This keeps Arabic readability strong while giving the brand and metric areas a more premium modern finish.

### Icon System

The app already used Bootstrap Icons through `react-icons/bs`, so the improvement here was standardization rather than another library swap.

Updated icon approach:

- lectures: clearer learning/play-style icon
- materials: folder/content icon
- tasks: checklist icon
- announcements: megaphone icon
- edit/delete/manage actions: consistent Bootstrap action icons

## 6. File-By-File Explanation

### Backend

#### `backend/utils/permissions.js`

- Purpose: central permission rules for ownership and deadline-aware mutation.
- Changed because: content and submission ownership logic was previously scattered and incomplete.

#### `backend/utils/serializers.js`

- Purpose: normalize API payloads before returning them to the frontend.
- Changed because: the frontend now needs trusted `permissions` metadata instead of guessing ownership locally.

#### `backend/controllers/contentController.js`

- Purpose: create, read, update, delete course content.
- Changed because: course-level access alone was not enough; teacher ownership rules were missing on update/delete.

#### `backend/controllers/submissionController.js`

- Purpose: task submission create/update/delete and submission listing.
- Changed because: students could still mutate submissions after the deadline and submission permission data was not explicit.

#### `backend/routes/content.js`

- Purpose: content API routing.
- Changed because: `admin` needed to be included in the content management route authorization.

### Frontend Core Routing / Helpers

#### `frontend/src/App.jsx`

- Purpose: app routing.
- Changed because: new create/edit/content-management flows required role-specific admin/superadmin/teacher routes.

#### `frontend/src/utils/auth.js`

- Purpose: role labels and route helpers.
- Changed because: content edit routes and course management routes needed one consistent source.

#### `frontend/src/utils/contentTypes.js`

- Purpose: content labels/colors/date formatting.
- Changed because: the UI now needs stable deadline helpers for locking submissions and displaying due dates correctly.

### Frontend Shared UI

#### `frontend/src/components/common/BrandLogo.jsx`

- Purpose: reusable branded lockup using the real Dot Jordan logo.
- Changed because: placeholder initials were not enough for a production-quality branded UI.

#### `frontend/src/components/common/AppLayout.jsx`

- Purpose: app shell and mobile header.
- Changed because: the mobile header needed the real logo and a more consistent branded shell.

#### `frontend/src/components/common/Sidebar.jsx`

- Purpose: role navigation and logout.
- Changed because: branding was upgraded and admins now need direct access to content creation.

#### `frontend/src/components/common/Sidebar.css`

- Purpose: sidebar visual styling.
- Changed because: the sidebar needed a softer premium look aligned with the new brand and references.

### Frontend Pages / Flows

#### `frontend/src/pages/CreateContentPage.jsx`

- Purpose: create or edit lectures, materials, tasks, and announcements.
- Changed because: the previous page only handled creation and did not support owner edit flows.

#### `frontend/src/pages/CoursePage.jsx`

- Purpose: shared course experience for students and managers.
- Changed because: owners/admins now need content management actions directly inside course context.

#### `frontend/src/components/student/Timeline.jsx`

- Purpose: render course content chronologically.
- Changed because: it needed permission-aware edit/delete actions, creator labels, and student submission locking states.

#### `frontend/src/components/student/TaskSubmissionModal.jsx`

- Purpose: student submission create/edit/delete UI.
- Changed because: it now needs to respect backend deadline rules and switch to read-only when locked.

#### `frontend/src/pages/TeacherDashboard.jsx`

- Purpose: teacher dashboard.
- Changed because: content and course navigation is now routed through the shared role helper flow.

#### `frontend/src/pages/SuperAdminDashboard.jsx`

- Purpose: admin and superadmin management dashboard.
- Changed because: platform managers now need direct, visible entry points into course content management.

#### `frontend/src/pages/LoginPage.jsx`

- Purpose: authentication screen.
- Changed because: the real logo, refined typography, and softer premium split layout were required.

#### `frontend/src/pages/LoginPage.css`

- Purpose: login-specific styling.
- Changed because: the visual treatment needed to better reflect the provided design references and brand.

#### `frontend/src/styles/global.css`

- Purpose: shared design system overrides.
- Changed because: the platform needed a stronger, more cohesive Bootstrap-based visual language and font system.

#### `frontend/src/assets/dot-jordan-logo.png`

- Purpose: brand logo asset.
- Changed because: branding is now using the real provided Dot Jordan logo instead of placeholder initials.

## 7. Testing Checklist

### Authentication / Routing

- Log in as each role and confirm redirect lands on the correct dashboard.
- Refresh each protected page and confirm the session survives.
- Open `/login` while authenticated and confirm redirect away from login.
- Attempt to open another role’s route and confirm redirect back to the correct role home.

### Teacher Content Ownership

- Teacher creates a lecture, task, and announcement.
- Confirm the same teacher sees edit/delete controls for those items.
- Confirm another teacher cannot edit/delete those items.
- Confirm task deletion also removes related submissions.

### Admin / Superadmin Content Management

- Log in as admin and create content from the admin route.
- Open an admin course page and confirm content can be edited/deleted.
- Repeat for superadmin.

### Student Submission Flow

- Submit a task with text only.
- Submit a task with files only.
- Edit an existing submission before the deadline.
- Delete an existing submission before the deadline.
- Confirm a past-deadline task cannot be edited or deleted by the student.

### Attachment Management

- Add uploaded files to content.
- Add uploaded images to content.
- Add external links to content.
- Edit content and remove existing attachments.
- Open/download attachments from course cards and submission records.

### UI / Branding

- Confirm logo appears correctly on:
  - login
  - sidebar
  - mobile header
- Check font rendering in Arabic and English.
- Verify sidebar, cards, buttons, and modals match the softened pastel system.
- Confirm delete confirmation modal is centered and themed.

### Regression Checks

- Student course page still shows lecture completion.
- Teacher dashboard still loads students for the selected course.
- Admin and superadmin dashboards still load users and courses.
- Content create/edit pages still save task due date and max score correctly.

## 8. Environment And Config Notes

No new environment variables were introduced in this pass.

Existing backend variables remain:

- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_ORIGIN`
- `PUBLIC_API_URL`
- `UPLOAD_DIR`
- `PORT` *(Render sets this automatically)*

Existing frontend variables remain:

- `REACT_APP_API_URL`

Render-specific notes:

- `REACT_APP_API_URL` should be the full backend API base path, such as `https://your-backend.onrender.com/api`.
- If your frontend is deployed as a Render Static Site and uses `react-router-dom`, add a rewrite rule from `/*` to `/index.html`.
- Render filesystems are ephemeral by default. If you do not configure Cloudinary, attach a persistent disk and set `UPLOAD_DIR` to that mount path.

## 9. Validation Results

Completed in this workspace:

- `frontend`: `npm run build`
- `backend`: `node --check` across backend `.js` files excluding `node_modules`

Observed during validation:

- frontend production build completed successfully
- backend syntax checks passed
- no new route/import regressions surfaced during build-time validation

Not fully completed in this workspace:

- live backend boot against a real MongoDB instance
- browser-based end-to-end role testing with real seeded data

Those still require a valid `MONGO_URI` and running services.

## 10. Recommendations And Remaining Improvements

- Add automated integration tests for ownership rules on content and submissions.
- Add grading/review actions for teacher task submissions if that workflow is required.
- Add audit logging for destructive content operations in admin/superadmin contexts.
- Run a final in-browser QA pass on responsive states after connecting a live database.
