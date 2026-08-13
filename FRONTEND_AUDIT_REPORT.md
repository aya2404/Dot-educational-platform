# FRONTEND_AUDIT_REPORT.md — Dot Jordan

**Date:** 2026-08-12 · **Scope:** Complete frontend / UI-UX / accessibility / responsive audit.
**Method:** Full source review of every page, component and stylesheet + the app run locally (backend :5000, MongoDB, frontend production build served on :3000) and driven in Chrome — screenshots, DOM/computed-style probes, a content-based mobile-overflow probe, keyboard-interaction tests, and console/network inspection.

> **Testing method & limitation (stated up front):** The Chrome window here is maximized and **ignores programmatic resize below ~500px** (requests to 320/375 were no-ops; sub-500px froze the renderer). To test real mobile/tablet viewports anyway, each route was loaded in a **same-origin `<iframe>` sized to exact pixel widths** — CSS media queries evaluate against the iframe's viewport, so the app renders its true responsive layout (confirmed: the hamburger appears and the sidebar goes off-canvas below 992px, and both are absent ≥992px). This produced **real per-viewport rendering + overflow measurement + screenshots** at 320/360/375/390/414/768/820/1024/1280/1440/1920. It is a valid rendering path but not a physical device; a DevTools device-mode / real-device pass is still recommended. Full matrix in `UI_UX_TEST_RESULTS.md`.

---

## Frontend architecture
- **Framework/build:** React 18 + Create React App (`react-scripts` 5), Bootstrap 5, React Router 6, Axios, `react-icons`.
- **Entry:** `src/index.js` → `src/App.jsx` (`BrowserRouter` → `AuthProvider` → route table).
- **Auth state:** `AuthContext` (JWT + user in `localStorage`, re-validated via `GET /auth/me`). Route guards: `ProtectedRoute` (role-gated) and `GuestRoute`.
- **API layer:** `src/utils/api.js` (Axios instance, Bearer injection, 401 → session clear).
- **Layout:** `AppLayout` + `Sidebar` (fixed 300px rail on desktop; off-canvas drawer at ≤991.98px with a hamburger and backdrop).
- **CSS architecture:** design-system tokens + base component styling in `styles/global.css` (CSS custom properties: colors, shadows, organic radii, RTL); page/component styles in `LoginPage.css`, `Sidebar.css`, `Timeline.css`, `TaskSubmissionModal.css`; Bootstrap 5 base. Visual identity: Arabic RTL, glassmorphism, IBM Plex Sans Arabic / Cairo / Manrope fonts.
- **State management:** local component state + Context (no Redux). **Icons:** react-icons (Bootstrap set). **Assets:** one PNG logo (`assets/dot-jordan-logo.png`).
- **Reusable components:** `AppLayout`, `Sidebar`, `BrandLogo`, `ProtectedRoute`, `ConfirmModal`, `FileUploader`, `AttachmentList`, `Timeline`, `TaskSubmissionModal`.
- **UI states present:** loading (spinners), error (Bootstrap alerts), empty (`.empty-panel`), success (inline). Double-submit guarded (buttons disable during async).

## Route inventory
| Route | Component | Guard |
|-------|-----------|-------|
| `/` | SessionRedirect → role home | any |
| `/login` | LoginPage | GuestRoute |
| `/student` | StudentDashboard | student |
| `/student/course/:courseId` | CoursePage (timeline) | student |
| `/teacher` | TeacherDashboard | teacher |
| `/teacher/content/new` · `/teacher/content/:id/edit` | CreateContentPage | teacher |
| `/teacher/course/:courseId` | CoursePage | teacher |
| `/admin` | AdminDashboard (→ SuperAdminDashboard `mode=admin`) | admin |
| `/admin/course/:courseId` · `/admin/content/new` · `/admin/content/:id/edit` | CoursePage / CreateContentPage | admin |
| `/superadmin` | SuperAdminDashboard | superadmin |
| `/superadmin/course/:courseId` · `/superadmin/content/new` · `/superadmin/content/:id/edit` | CoursePage / CreateContentPage | superadmin |
| `*` | SessionRedirect | any |

## Findings (severity: P0 crit · P1 high · P2 med · P3 low)

### UI / CSS
| ID | Sev | Finding | File | Status |
|----|-----|---------|------|--------|
| FE-1 | P2 | `LoginPage.css` redefined **unscoped global** `.btn-primary` (flat `#6d5acf`, radius 40px) and `.login-card input` (own radius + `margin-bottom:20px`) — fragile design-system override + double vertical spacing on the login form. | `pages/LoginPage.css` | **FIXED** |
| FE-6 | P3 | Bootstrap CSS is imported (in `index.js`) **after** `global.css` (via `App.jsx`), so Bootstrap wins over the design-system tokens **app-wide** — buttons/inputs use Bootstrap's `border-radius` (~6–8px, not the organic radii) and `body` uses Bootstrap's system-font stack (not IBM Plex Sans Arabic). Verified in-browser (`getComputedStyle`). | `index.js` order vs `global.css` | **Not fixed — intentional.** The app is currently *visually consistent* (Bootstrap radii + system Arabic font everywhere); forcing the tokens to win would restyle every page — an unrequested redesign. Documented. |
| FE-7 | P3 | Timeline rules were duplicated in **both** `global.css` and `Timeline.css`; `global.css` (later) overrode `Timeline.css`'s intended `padding`/`gap` while `Timeline.css` still supplied the dots — a load-order "Frankenstein". | `global.css`, `Timeline.css` | **FIXED** — removed the timeline block from `global.css`; `Timeline.css` is now the single source. Verified: `.timeline-entry` padding `22px…`, view gap `26px`, dots present, no overflow at 320/768/1280. |
| FE-8 | P3 | Inline style hacks (`style={{width:'100%',maxWidth:'100%'}}`, row `marginLeft/Right:0`) in `TeacherDashboard`/`CoursePage`. | pages | Not fixed (functional, low value). |

### Accessibility
| ID | Sev | Finding | File | Status |
|----|-----|---------|------|--------|
| FE-2 | P2 | Form `<label>`s not associated with their controls (no `htmlFor`/`id`) — clicking a label doesn't focus, screen readers don't announce the field. 5 labels in create-user/enrollment, 7 in create-content. | `SuperAdminDashboard.jsx`, `CreateContentPage.jsx` | **FIXED** (all single-control labels associated) |
| FE-3 | P2 | Modals lacked dialog semantics and **Escape-to-close** (`ConfirmModal`, `TaskSubmissionModal`). | modal components | **FIXED** (`role="dialog"`, `aria-modal`, `aria-label`, Escape handler) |
| FE-4 | P2 | `TaskSubmissionModal` close (X) is an icon-only button with **no accessible name**. | `TaskSubmissionModal.jsx` | **FIXED** (`aria-label="إغلاق"`) |
| FE-11 | P2 | Login page had **no `<h1>`** (heading hierarchy started at h2) — screen-reader page-title gap. | `LoginPage.jsx` | **FIXED** (`h2`→`h1`, class-based styling unchanged) |
| FE-9 | P3 | 3 remaining `<label>`s in create-content are **group/section labels** (type-button group, file uploader, external-link pair) with no single control. | `CreateContentPage.jsx` | Not fixed (acceptable; grouped inputs carry placeholders). |
| FE-10 | P2 | Modals did not implement a **focus trap** (Tab could move focus behind the modal). | modal components + new `hooks/useFocusTrap.js` | **FIXED** — added a reusable `useFocusTrap` hook (focus-into-dialog on open, Tab/Shift+Tab cycling, focus-restore on close). Fully verified in-browser on both ConfirmModal consumers + TaskSubmissionModal (incl. nested): focus enters modal, Tab & Shift+Tab wrap inside, Escape+Cancel close + restore focus to trigger, disabled excluded while loading, no trap after close. |
| FE-13 | P2 | With the nested delete-submission `ConfirmModal` open inside `TaskSubmissionModal`, a single **Escape closed both** dialogs (both had document-level Escape handlers from FE-3). | `TaskSubmissionModal.jsx` | **FIXED** — guarded its Escape handler with `!showDeleteConfirm` so Escape closes only the topmost dialog. Verified: 1st Escape closes only the nested confirm (task modal stays open), 2nd closes the task modal. |
| FE-12 | P3 | Timeline heading order skips a level (course title `h1` → item titles `h3`, no `h2`). | `Timeline.jsx` | Not fixed — changing the tag would alter the intended visual hierarchy; documented. |

**Verified a11y (probe on course/timeline @1280):** 0 images without `alt` (of 2), 0 buttons without an accessible name (of 14), 0 non-semantic clickables, `role=button` div has keyboard support. **CSS scope search (item 5):** after FE-1, **no** global/element selectors leak from any page/component stylesheet — `Sidebar.css`/`Timeline.css`/`TaskSubmissionModal.css` are fully component-scoped; base styling lives only in `global.css`. z-index consistent (modal 1100 > sidebar 1040 > backdrop 1030); no `!important` abuse (2 legit Bootstrap-hover overrides).

### Responsive (all verified with real per-viewport iframe rendering, 320→1920px)
| ID | Sev | Finding | Status |
|----|-----|---------|--------|
| FE-R1 | — | **Zero horizontal overflow on every route at every tested width** (320/360/375/390/414/768/820/1024/1280/1440/1920). Measured `scrollWidth ≤ clientWidth` inside each iframe viewport. | OK (real-viewport verified) |
| FE-R2 | — | Data tables are wrapped in Bootstrap `.table-responsive` (horizontal scroll **within** the card). Verified at 375px on the 6-column Courses table: container fits the viewport, table scrolls internally, page does not overflow — the correct strategy. | OK |
| FE-R3 | — | Sidebar becomes an off-canvas drawer with a hamburger below 992px and a fixed rail at ≥992px (verified via the nav-behavior toggle at each width). Grids `auto-fit minmax`, 2-col forms stack, flex rows wrap. Breakpoints 991.98/575.98. | OK |
| FE-R4 | — | OS-window resize below ~500px is blocked by Chrome-on-Windows (tooling), so testing used same-origin iframe viewports instead (real media-query rendering + screenshots). Not a physical device. | Tooling limitation (worked around) |

### Runtime / Performance
| ID | Sev | Finding | Status |
|----|-----|---------|--------|
| FE-5 | P3 | Font-loading mismatch: `index.html` loaded IBM Plex + an **unused Tajawal**; `global.css` separately `@import`ed Cairo + IBM Plex + Manrope (render-blocking; IBM Plex double-loaded). | **FIXED** — consolidated all fonts into the preconnected `<link>` (Cairo + IBM Plex + Manrope), removed Tajawal and the render-blocking `@import`. Verified: link resolves, Cairo renders, Tajawal gone, fonts URL 200. |
| FE-P1 | — | No console errors/warnings, no failed requests, no 404 assets, no React key warnings (all lists keyed), no unhandled rejections — observed across login + all dashboards + course + create-content. | OK |
| FE-P2 | — | Production JS bundle ~101 KB gzip; single logo asset. No obvious excessive re-renders or duplicate API calls (each page fetches once in `useEffect`). | OK |

## Fixes applied (9)
See `FRONTEND_FIXES.md` for the per-fix table with verification. Summary: **FE-1** (login CSS consistency), **FE-2** (label associations ×15), **FE-3** (modal Escape + dialog semantics ×2), **FE-4** (close-button name), **FE-5** (font-loading consolidation + unused Tajawal removed), **FE-7** (timeline CSS dedup), **FE-10** (modal focus trap), **FE-11** (login h1), **FE-13** (nested-modal Escape closes topmost only). All verified in-browser and/or in the production build.

## Routes that do NOT exist in this app (checked, not fabricated)
The task brief lists some pages that this codebase does not implement: **Register/Signup** (accounts are created by admins in the dashboard — no public registration), **Home/Landing** (`/` is a role-based redirect, not a landing page), **Profile/account page** (none), and **Quiz** (the closest is the **TaskSubmissionModal** — task answer + file upload, which was tested). These are reported as absent rather than tested.

## Remaining known issues (genuine, low-risk — intentionally not changed)
- **FE-6** — design-system organic radii **and body font** are overridden by Bootstrap import order; left as-is to preserve current visual consistency (change only as a deliberate design decision — it would restyle every page).
- **FE-12** — timeline heading order skips H2 (h1→h3); left to preserve visual hierarchy.
- **FE-8 / FE-9** — inline-style hacks and group-label semantics; cosmetic, left as-is.
- **Tooling** — physical mobile devices not available, and Chrome's window would not resize below ~500px; real viewports were produced via same-origin iframes (media queries fire at the iframe width, confirmed by the nav-behavior toggle at 992px) + screenshots. Also, rapid iframe reloads race with the SPA's auth bootstrap, so the matrix was run as short per-route runs at the three breakpoint regimes (375/768/1280) plus a wider sweep on the timeline (8 widths). A DevTools device-mode / real-device pass is recommended as final confirmation.
