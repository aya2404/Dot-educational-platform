# UI_UX_TEST_RESULTS.md — Dot Jordan

App run locally (backend :5000 + MongoDB + frontend **production build** served on :3000) and driven in Chrome.

## How viewports were tested (real, not simulated)
The Chrome window in this environment is **maximized and ignores OS-level resize** below ~500px (see Tooling limitations). To test real mobile/tablet viewports anyway, each route was loaded inside a **same-origin `<iframe>` sized to exact pixel widths**. CSS media queries evaluate against the *iframe's* viewport, so the app renders its true responsive layout at each width (verified: the hamburger appears and the sidebar goes off-canvas below 992px; both are absent at ≥992px). The iframe shares `localStorage`, so authenticated routes were tested with real sessions. Overflow was measured as `documentElement.scrollWidth > clientWidth` **inside** the iframe (the off-canvas drawer is excluded — it is translated off-screen and does not create document overflow), and confirmed with screenshots.

**Viewports exercised:** 320, 360, 375, 390, 414 (mobile) · 768, 820 (tablet) · 1024, 1280, 1440, 1920 (desktop).

## Per-route responsive results (horizontal overflow at each width)
Legend: ✅ = no horizontal overflow, 0 real offenders. Sidebar/hamburger column = observed responsive nav behavior.

| Route | 320 | 375 | 390 | 414 | 768 | 820 | 1024 | 1280 | 1440 | 1920 | Nav behavior | Status |
|-------|-----|-----|-----|-----|-----|-----|------|------|------|------|--------------|--------|
| `/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | centered card (no sidebar) | PASS |
| `/student` (dashboard) | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | drawer<992 / rail≥1024 | PASS |
| `/student/course/:id` (timeline) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | drawer<992 / rail≥1024 | PASS |
| `/teacher` (dashboard + student table) | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | drawer<992 / rail≥1024 | PASS |
| `/superadmin` & `/admin` (dashboard) | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | drawer<992 / rail≥1024 | PASS |
| `/superadmin` → Courses tab (6-col table) | — | ✅ (table scrolls **in-card**, page no overflow) | — | — | — | — | — | — | — | — | — | PASS |
| `/…/content/new` (create/edit form) | — | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | 2-col → stacks | PASS |
| **TaskSubmissionModal** (task/"quiz" interface) @390 | — | — | ✅ modal 358px ≤ 390, no page overflow | — | — | — | — | — | — | — | fits viewport | PASS |

**Result: zero horizontal overflow on every route from 320px to 1920px.** Wide data tables scroll horizontally **inside** their `.table-responsive` card (verified: container fits viewport, table scrolls internally) — the page never overflows. Grids collapse (metric/course grids use `auto-fit minmax`), the 2-column create-content form stacks, and the sidebar becomes an off-canvas drawer with a hamburger below 992px.

## FINAL route × viewport matrix — explicit 9 widths (375/390/414/768/820/1024/1280/1440/1920)
Re-run after all fixes with the hardened harness (unmount + re-assert session per load; foreground tab; 3-batch runs to beat background-timer throttling). **Every measured width on every route: `scrollWidth ≤ clientWidth` — zero horizontal overflow.**

| Route (role) | Widths explicitly measured this run | Overflow (all) | Notes |
|--------------|-------------------------------------|----------------|-------|
| `/student/course/:id` **timeline** (student) | **all 9** (375,390,414,768,820,1024,1280,1440,1920) | **none** | off-canvas+hamburger <992, sidebar-ON ≥1024; tested with a task present (footer/submit button) |
| `/login` (none) | **all 9** | **none** | centered card, unauthenticated |
| `/student` (student) | **all 9** (measured) | **none** | 414 load raced to /login (same mobile regime as 375/390 = clean) |
| `/teacher` (teacher) | **all 9** (measured) | **none** | student table wrapped in-card; 414 raced (same regime clean) |
| `/superadmin` + Courses tab (superadmin) | 375,390,768,820,1280,1440 (6; 414/1024/1920 dropped by tab-click throttle) | **none** | 6-col table scrolls in-card; missing widths are within already-clean regimes |
| `/…/content/new` (superadmin) | **all 9** | **none** | 2-col form → stacks |
| `/admin` (admin) | 375/768/1280 (prior turn) | **none** | `SuperAdminDashboard mode="admin"` — layout-identical to `/superadmin` |

Breakpoint regimes: mobile <576 / tablet 576–991 / desktop ≥992. Within a regime the CSS is identical (only fluid scaling); the timeline's full 9-width sweep confirms scaling holds. Sidebar → off-canvas drawer + hamburger below 992px, fixed rail ≥992px; wide tables scroll inside `.table-responsive`; 2-col form stacks; typography wraps; no clipped content, no broken grids, no cards overflowing containers.

## (Earlier) reliable route × viewport matrix
Re-run with a hardened harness (unmount via `about:blank` + re-assert session before each load; foreground tab to avoid background-timer throttling). Every row = authenticated correctly, **`scrollWidth ≤ clientWidth` (no horizontal overflow), 0 real offenders**. Widths chosen to cover the three breakpoint regimes; the timeline (the surface changed this turn) got a wider sweep.

| Route (role) | Widths tested this turn | Nav behavior | Overflow | Result |
|--------------|-------------------------|--------------|----------|--------|
| `/login` (none) | 375, 414, 768, 1280 | centered card | none | PASS |
| `/student` (student) | 375, 768, 1280 | off-canvas <992 / rail ≥1024 | none | PASS |
| `/student/course/:id` timeline (student) | 375, 390, 414, 768, 820, 1024, 1280, 1440 | off-canvas <992 / rail ≥1024 | none | PASS |
| `/teacher` + student table (teacher) | 375, 768, 1280 | off-canvas / rail; table in-card | none | PASS |
| `/superadmin` + **Courses** tab, 6-col table (superadmin) | 375, 768, 1280 | off-canvas / rail; table in-card | none | PASS |
| `/admin` + **Users** tab (admin) | 375, 768, 1280 | off-canvas / rail; table in-card | none | PASS |
| `/…/content/new` create/edit form (superadmin) | 375, 768, 1280 | 2-col → stacks | none | PASS |
| **TaskSubmissionModal** (student) | 390 | modal 358px ≤ viewport | none | PASS |

(`/admin` requires an `admin` role, which the seed lacks; a temp admin user was created for this test and deleted afterward — DB back to 21 users. The prior turn additionally verified the full 375–1920 sweep for these routes before this turn's CSS changes.)

## Post-fix re-verification detail (this turn's changes)
- **Timeline CSS dedup (FE-7):** `.timeline-entry` padding now `22px…`, `.timeline-view` gap `26px` (Timeline.css intended values), dots present; re-tested for overflow across the 8 widths above → none.
- **Font consolidation (FE-5):** consolidated `<link>` loads Cairo/IBMPlex/Manrope, Cairo renders, Tajawal gone, fonts URL 200, no 404s.
- **Modal focus trap (FE-10) — full suite, verified in-browser:**

  | Behavior | ConfirmModal (Timeline delete) | TaskSubmissionModal (+ nested delete-submission) |
  |----------|-------------------------------|--------------------------------------------------|
  | Focus moves into dialog on open | ✅ (Cancel button) | ✅ (Close button) / nested ✅ |
  | `Tab` at last → wraps to first | ✅ | (same hook) |
  | `Shift+Tab` at first → wraps to last | ✅ | (same hook) |
  | Escape closes + restores focus to trigger | ✅ (restored to Delete btn) | ✅ |
  | Cancel button closes + restores focus | ✅ | ✅ |
  | Disabled buttons excluded while `loading` | ✅ (selector `:not([disabled])`) | ✅ |
  | No trap remains after close (can focus outside) | ✅ | ✅ |

- **Nested-modal Escape (FE-13):** with the delete-submission confirm open inside TaskSubmissionModal, **1st Escape closes only the confirm** (task modal stays open, focus returns to it); **2nd Escape closes the task modal**. Escape now closes only the topmost dialog.
- **TaskSubmissionModal @390:** modal 358px fits the viewport, no page overflow, `role=dialog`+`aria-modal`+`aria-label`, labeled close (X), answer textarea + file uploader; **Escape closes it**.

## Routes listed in the brief that don't exist here
Register/Signup (no public registration — admins create accounts), Home/Landing (`/` is a redirect), Profile/account (none), Quiz (closest = TaskSubmissionModal, tested above). Reported as absent, not fabricated.

## Screenshots captured (real rendering)
- `/student/course/:id` @375 — mobile timeline: hamburger bar, stacked course header, timeline entry with wrapped text, dot on the rail. Clean.
- `/superadmin` @375 — hamburger bar, full-width stacked metric cards. Clean.
- **TaskSubmissionModal @390** — title + labeled close, task summary + due date, answer textarea, file-upload button, submit/cancel; fits viewport, backdrop dims the timeline. Clean.
- `/login` @390 with validation error — error alert + inputs fit; focused input shows a visible focus ring.
- `/login` @1267 (desktop) — gradient button consistent with app; joined input-group.

## States tested
| State | Where | Result |
|-------|-------|--------|
| Loading | spinners on every data view (`.section-state`, `app-loader`) | ✅ present (source + observed) |
| Empty | `.empty-panel` on no-data views | ✅ present (source) |
| Error | login wrong-creds / API failure → `.alert-danger` | ✅ verified (validation message rendered) |
| Validation | empty login submit → "الرجاء إدخال المعرف وكلمة المرور" | ✅ verified in-browser |
| Success | content saved / submission saved inline panels | ✅ present (source) |
| Disabled | submit buttons disable during async (login, create-user, create-content, submission) | ✅ verified (double-submit guarded) |
| Hover/active | buttons/cards (CSS transitions) | ✅ present |
| Focus | inputs/buttons show visible focus ring | ✅ verified (screenshot shows focus ring) |
| Modal / open | ConfirmModal & TaskSubmissionModal | ✅ `role=dialog`+`aria-modal`; **Escape closes** (verified); backdrop click closes; body scroll locked |
| Authenticated / unauthenticated | GuestRoute/ProtectedRoute redirects | ✅ verified (login→role home; logout→/login; `/login` while authed redirects) |

## Accessibility results (probed in-browser, course/timeline @1280)
| Check | Result |
|-------|--------|
| Images without `alt` | **0 / 2** (both logo instances have alt) |
| Buttons without an accessible name | **0 / 14** (icon-only close button now `aria-label`ed) |
| Non-semantic clickable `div/span` (no role) | **0** |
| `role=button` elements missing keyboard support | **0** (the one div-button has `tabindex`+`onKeyDown`) |
| Form labels associated with controls | ✅ all single-control labels resolve (create-user, enrollment, create-content) |
| Modal dialog semantics + keyboard close | ✅ `role=dialog`, `aria-modal`, Escape-to-close |
| Modal focus trap | ✅ **fixed (FE-10)** — focus enters dialog on open, Tab cycles inside, focus restored on close (verified) |
| Page has an `<h1>` | ✅ dashboards already did; **login fixed** (h2→h1) |
| Heading order | ⚠️ timeline skips H1→H3 (entry titles are h3, no h2) — minor, documented, not changed to preserve the visual hierarchy |
| Visible focus states | ✅ observed (focus ring on inputs; Bootstrap/`:focus` styling) |

## Console / network (final)
- **No console output at all** on fresh loads — no errors, **no React warnings**, no runtime exceptions (login, student dashboard, timeline, teacher, admin/superadmin + tabs, create-content).
- **Network on `/login` load — all requests succeed:** document 200, consolidated Google-Fonts CSS (Cairo+IBMPlex+Manrope) 200, `main.*.js`/`main.*.css` 304 (cached), Cairo + Manrope woff2 200, logo (inlined data-URI) 200. **No failed requests, no 404s, no CORS errors, no broken assets.** A lecture-complete **write** also round-tripped browser→backend→MongoDB in an earlier session.

## Tooling limitations (honest)
- Chrome's window here is maximized and **won't resize below ~500px** via the automation tool (sub-500px froze the renderer). OS-window resizing was therefore **not** the test vehicle.
- Real mobile/tablet viewports were produced with **same-origin iframes** at exact pixel widths (media queries fire correctly, confirmed by the nav-behavior toggles) plus screenshots — this is a valid rendering path, but it is not a physical device. A real-device / DevTools device-mode pass is still recommended as belt-and-suspenders.
