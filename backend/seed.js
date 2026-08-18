require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Course = require('./models/Course');
const Content = require('./models/Content');
const Enrollment = require('./models/Enrollment');
const Submission = require('./models/Submission');
const Badge = require('./models/Badge');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const Note = require('./models/Note');
const UserStat = require('./models/UserStat');
const UserBadge = require('./models/UserBadge');
const Notification = require('./models/Notification');

// ============================================================================
// Idempotent, NON-DESTRUCTIVE, fully-fictional university-style demo seed.
//
//  * Never deletes anything (no deleteMany / drop / deleteOne). Every record is
//    created once and updated in place on re-runs, keyed by a deterministic
//    field, so running `npm run seed` repeatedly converges without duplicates.
//  * All identities are FICTIONAL demo data — safe to showcase publicly.
//  * No plaintext passwords in this file — the demo-account passwords are read
//    from environment variables and documented only in LOCAL_SETUP.md.
//  * External resource links are real, reputable educational sites; videos are
//    real, verified public educational YouTube videos.
// ============================================================================

// ---- idempotent helpers (create-or-update, never delete) ----
const ensureUser = async ({ name, username, studentId, password, role }) => {
  const user = await User.findOne({ username }).select('+password');
  if (user) {
    user.name = name;
    user.studentId = studentId;
    user.role = role;
    user.isActive = true;
    user.password = password; // re-hashed by the pre-save hook
    await user.save();
    return user;
  }
  return User.create({ name, username, studentId, password, role });
};

const ensureCourse = async (data) => {
  const course = await Course.findOne({ name: data.name });
  if (course) {
    Object.assign(course, data);
    await course.save();
    return course;
  }
  return Course.create(data);
};

const ensureEnrollment = async (student, course) => {
  const existing = await Enrollment.findOne({ student, course });
  if (existing) {
    existing.isActive = true;
    await existing.save();
    return existing;
  }
  return Enrollment.create({ student, course, isActive: true });
};

const ensureContent = async (item) => {
  const existing = await Content.findOne({ course: item.course, title: item.title });
  if (existing) {
    Object.assign(existing, item);
    await existing.save();
    return existing;
  }
  return Content.create(item);
};

// Keyed on the unique {task, student} pair so re-runs update in place (never
// duplicate — the Submission model enforces one submission per task+student).
const ensureSubmission = async (data) => {
  const existing = await Submission.findOne({ task: data.task, student: data.student });
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return Submission.create(data);
};

// Keyed on {tenantId, name} (the Badge unique index) so re-runs update in place.
const ensureBadge = async (data) => {
  const existing = await Badge.findOne({ tenantId: data.tenantId || 'default', name: data.name });
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return Badge.create(data);
};

// Initial gamification badges for the default tenant.
const SEED_BADGES = [
  { name: 'أول تسليم', description: 'سلّم أول واجب لك', icon: 'FaRocket', color: '#3b82f6', criteria: 'سلّم واجباً واحداً', criteriaType: 'submission_count', criteriaValue: 1 },
  { name: 'سلسلة 7 أيام', description: 'سجّل الدخول 7 أيام متتالية', icon: 'FaFire', color: '#f59e0b', criteria: 'سجّل الدخول 7 أيام متتالية', criteriaType: 'streak_days', criteriaValue: 7 },
  { name: 'قاهر الكورس', description: 'أكمل جميع محاضرات كورس', icon: 'FaGraduationCap', color: '#8b5cf6', criteria: 'أكمل كورساً كاملاً', criteriaType: 'course_completion', criteriaValue: 1 },
  { name: 'كثير النقاش', description: 'أرسل 10 رسائل في محادثة الكورس', icon: 'FaComments', color: '#ec4899', criteria: 'أرسل 10 رسائل', criteriaType: 'chat_messages', criteriaValue: 10 },
  { name: 'المثالي', description: 'احصل على درجة كاملة في مهمة', icon: 'FaStar', color: '#facc15', criteria: 'احصل على درجة كاملة (100%)', criteriaType: 'perfect_score', criteriaValue: 1 },
  { name: 'الأكثر تميزاً', description: 'أكمل 5 مهام', icon: 'FaTrophy', color: '#ef4444', criteria: 'سلّم 5 مهام', criteriaType: 'submission_count', criteriaValue: 5 },
];

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const linkAttachment = (url, name) => ({ kind: 'link', url, name: name || url, storage: 'external' });

// ============================ RICH DEMO CONTENT ============================
// Long, realistic bodies so the UI's truncation / "Show More" affordances appear.
const LONG_ANSWER = [
  'For this assignment I designed and implemented a complete REST API following a layered architecture that cleanly separates the routing, controller, service, and data-access concerns.',
  'The routing layer only maps HTTP verbs and paths to controller handlers; it contains no business logic. Each controller validates and normalizes the incoming request, delegates to a service function, and shapes the HTTP response, returning consistent envelopes of the form { success, data } or { success, message }.',
  'Validation happens at the boundary: every field is checked for presence, type, and range before anything touches the database, and invalid input returns a 400 with a clear, user-facing message rather than a raw stack trace. I paid particular attention to error status codes — 400 for validation, 401 for missing or invalid authentication, 403 for authorization failures, 404 for missing resources, and 500 only for genuinely unexpected server faults.',
  'For persistence I used Mongoose models with explicit schemas, required-field constraints, and indexes on the fields I query most often, which keeps reads fast as the collection grows. Ownership is always derived on the server from the authenticated user, never trusted from the client, which closes a whole class of IDOR vulnerabilities.',
  'I implemented full CRUD for the primary resource and wrote idempotent create logic so retries never produce duplicates. Pagination is cursor-friendly with sensible defaults and hard caps so a client can never request an unbounded result set. I also added consistent sorting and a light filtering layer that coerces query parameters to plain strings to prevent operator-injection through crafted query objects.',
  'Testing was a first-class concern. I wrote unit tests around the service functions and integration tests that spin up the app against an isolated test database, covering the happy paths as well as the failure modes: missing fields, wrong types, unauthorized access, and not-found resources. Each test asserts both the status code and the response body so regressions surface immediately.',
  'Finally, I documented every endpoint with its method, path, required auth, request shape, and possible responses, and I kept the code readable by matching the surrounding style, writing small single-responsibility functions, and adding comments only where the intent was not obvious from the code itself. If I had more time I would add rate limiting on the write endpoints and structured request logging for observability.',
].join('\n\n');

const LONG_LECTURE = [
  'In this session we build a shared mental model of how a modern application fits together, from the browser all the way down to the database, and why each layer exists.',
  'We start with the client: how the browser parses HTML, applies CSS, and runs JavaScript to build an interactive interface, and how the component model lets us compose complex screens from small, testable pieces of UI that each own a slice of state.',
  'We then cross the network boundary. We look at how the client talks to the server over HTTP, what a well-designed REST endpoint looks like, and how request and response bodies are serialized as JSON. We discuss status codes as a contract, why 4xx and 5xx mean very different things, and how authentication tokens travel with each request.',
  'On the server we walk through routing, middleware, controllers, and services, and we see how separating these concerns keeps the codebase maintainable as it grows. We cover validation at the boundary, consistent error handling, and why business logic should never live in the routing layer.',
  'Finally we reach persistence: how the server models data, enforces constraints, and indexes the fields it queries most, and how tenant isolation and ownership checks keep every user’s data private. By the end you should be able to trace a single click in the browser all the way to a database write and back, and explain what each layer contributed along the way. Come to the next lab ready to implement a small slice of this end to end.',
].join('\n\n');

// --- idempotent upserts for the enrichment models ---
const ensureNote = async (data) => {
  const filter = { student: data.student, title: data.title, tenantId: data.tenantId || 'default' };
  const existing = await Note.findOne(filter);
  if (existing) { Object.assign(existing, data); await existing.save(); return existing; }
  return Note.create(data);
};

const ensureUserStat = async (studentId, data) => {
  const existing = await UserStat.findOne({ student: studentId });
  if (existing) { Object.assign(existing, data); await existing.save(); return existing; }
  return UserStat.create({ student: studentId, tenantId: 'default', ...data });
};

const ensureUserBadge = async (studentId, badgeId) => {
  const existing = await UserBadge.findOne({ student: studentId, badge: badgeId });
  if (existing) return existing;
  return UserBadge.create({ student: studentId, badge: badgeId, tenantId: 'default' });
};

const ensureNotification = async (data) => {
  const filter = { recipient: data.recipient, type: data.type, title: data.title, tenantId: data.tenantId || 'default' };
  const existing = await Notification.findOne(filter);
  if (existing) { Object.assign(existing, data); await existing.save(); return existing; }
  return Notification.create(data);
};

// Find-or-create a course group chat, ensuring all demo participants are members.
const ensureCourseChat = async (courseId, participantIds) => {
  let chat = await Chat.findOne({ course: courseId, isGroupChat: true, tenantId: 'default' });
  if (!chat) {
    chat = await Chat.create({ course: courseId, isGroupChat: true, participants: participantIds, tenantId: 'default' });
    return chat;
  }
  const present = new Set(chat.participants.map((p) => p.toString()));
  let changed = false;
  for (const id of participantIds) {
    if (!present.has(id.toString())) { chat.participants.push(id); changed = true; }
  }
  if (changed) await chat.save();
  return chat;
};

// Seed a message thread only if the chat has none yet (idempotent + non-destructive).
const seedChatThread = async (chat, messages) => {
  if ((await Message.countDocuments({ chat: chat._id })) > 0) return 0;
  for (const m of messages) {
    await Message.create({ chat: chat._id, sender: m.sender, content: m.content, readBy: [m.sender], tenantId: 'default' });
  }
  await Chat.updateOne({ _id: chat._id }, { $set: { updatedAt: new Date() } });
  return messages.length;
};

// ============================= DEMO ACCOUNTS ================================
// Exactly one fictional demo account per role. Passwords come from environment
// variables (see LOCAL_SETUP.md → Demo Accounts) — never hardcoded here.
const DEMO_USERS = [
  { name: 'Lina Salem',   username: 'demo.student',    studentId: 'STU-9001', role: 'student',    password: process.env.DEMO_STUDENT_PASSWORD },
  { name: 'Omar Naji',    username: 'demo.teacher',    studentId: 'TCH-9001', role: 'teacher',    password: process.env.DEMO_TEACHER_PASSWORD },
  { name: 'Sara Haddad',  username: 'demo.admin',      studentId: 'ADM-9001', role: 'admin',      password: process.env.DEMO_ADMIN_PASSWORD },
  { name: 'Kareem Faris', username: 'demo.superadmin', studentId: 'SAD-9001', role: 'superadmin', password: process.env.DEMO_SUPERADMIN_PASSWORD },
];

// ============================ FICTIONAL STAFF ==============================
// Eight fictional teachers (share the demo-teacher password from env).
const TEACHER_NAMES = [
  'د. ماجد الفارس', 'د. هالة النجار', 'د. سامي القاسم', 'د. رنا الحسيني',
  'د. طارق العبادي', 'د. ديما الشريف', 'د. باسل الزعبي', 'د. لينا الطيب',
];

// Fifty fictional students, generated deterministically from name pools so the
// full names are unique. They share the demo-student password (from env).
const FIRST_NAMES = ['ليان', 'ريان', 'سارة', 'يزن', 'نور', 'آدم', 'جود', 'تالا', 'زيد', 'ريم', 'كرم', 'لمى', 'سيف', 'دانة', 'وسيم'];
const SURNAMES = ['السالمي', 'النعيمي', 'المهداوي', 'الرفاعي', 'الكيلاني', 'البرغوثي', 'النبهاني', 'المرادي', 'الحارثي', 'الدروبي', 'الشامي', 'العزام', 'المقداد', 'القيسي', 'الحلبي'];
const STUDENT_NAMES = [];
for (const surname of SURNAMES) {
  for (const first of FIRST_NAMES) {
    if (STUDENT_NAMES.length >= 50) break;
    STUDENT_NAMES.push(`${first} ${surname}`);
  }
}

// ============================ COURSE CATALOG ===============================
// Ten fictional courses across disciplines. `teacher` is an index into the
// teacher list (0 = demo teacher "Omar Naji", 1..8 = fictional teachers).
// Content mixes announcements, lectures, real videos, materials, real external
// resources, and assignments — different content for every course.
const COURSES = [
  {
    name: 'Full-Stack Web Development', teacher: 0, group: 'CS-FS-2026', time: '5 PM - 8 PM', days: ['Monday', 'Wednesday'],
    description: 'Build complete web applications end to end with the modern JavaScript stack.',
    content: [
      { type: 'announcement', title: 'Welcome & Course Roadmap', body: 'An overview of the modules, weekly schedule, and how assignments and submissions work.' },
      { type: 'lecture', title: 'Introduction to Modern Web Development', body: 'The full-stack workflow, tooling, and how the client, API, and database fit together.' },
      { type: 'video', title: 'Full-Stack Web Development — Full Course', body: 'A complete beginner-friendly walkthrough of front-end and back-end fundamentals.', url: 'https://www.youtube.com/watch?v=nu_pCVPKzTk' },
      { type: 'video', title: 'React — Tutorial for Beginners', body: 'Components, props, state, and building interactive UIs with React.', url: 'https://www.youtube.com/watch?v=Ke90Tje7VS0' },
      { type: 'material', title: 'Development Environment Setup Guide', body: 'Step-by-step setup for Node.js, VS Code, and Git.' },
      { type: 'link', title: 'MDN Web Docs', body: 'The reference for HTML, CSS, JavaScript, and web APIs.', url: 'https://developer.mozilla.org/' },
      { type: 'task', title: 'Assignment 1: Build a REST API', body: 'Design and implement CRUD endpoints for a resource of your choice. Submit a repository link or a file.', dueInDays: 30 },
      { type: 'task', title: 'Assignment 2: Add JWT Authentication', body: 'Add login, protected routes, and role checks to your API. Submit a short write-up or a file.', dueInDays: 52 },
    ],
  },
  {
    name: 'UI/UX Design', teacher: 0, group: 'DS-UX-2026', time: '6 PM - 9 PM', days: ['Sunday', 'Tuesday'],
    description: 'Principles and practice of user-centered interface and experience design.',
    content: [
      { type: 'announcement', title: 'Design Studio Kickoff', body: 'Studio expectations, critique format, and the semester design brief.' },
      { type: 'lecture', title: 'Design Principles & Visual Hierarchy', body: 'Contrast, alignment, spacing, and building a clear information hierarchy.' },
      { type: 'material', title: 'Wireframing & Prototyping Toolkit', body: 'A starter kit of components and patterns for low- and high-fidelity prototypes.' },
      { type: 'link', title: 'Material Design Guidelines', body: 'Google’s open design system for usable, accessible interfaces.', url: 'https://m3.material.io/' },
      { type: 'link', title: 'WCAG — Web Accessibility Guidelines', body: 'Standards for building accessible, inclusive user interfaces.', url: 'https://www.w3.org/WAI/standards-guidelines/wcag/' },
      { type: 'task', title: 'Assignment: Mobile App Prototype', body: 'Design a clickable prototype for a small mobile app and submit a link or file.', dueInDays: 40 },
    ],
  },
  {
    name: 'Database Systems', teacher: 1, group: 'CS-DB-2026', time: '4 PM - 6 PM', days: ['Monday', 'Thursday'],
    description: 'Relational and non-relational data modeling, SQL, and database design.',
    content: [
      { type: 'announcement', title: 'Course Introduction', body: 'What we will cover, grading breakdown, and lab schedule.' },
      { type: 'lecture', title: 'The Relational Model', body: 'Relations, keys, integrity constraints, and relational algebra basics.' },
      { type: 'lecture', title: 'SQL Fundamentals', body: 'SELECT, JOINs, aggregation, and writing correct, efficient queries.' },
      { type: 'material', title: 'Database Design Guide', body: 'A practical reference for schema design and indexing decisions.' },
      { type: 'link', title: 'PostgreSQL Documentation', body: 'Official docs for the PostgreSQL relational database.', url: 'https://www.postgresql.org/docs/' },
      { type: 'link', title: 'MongoDB Documentation', body: 'Official docs for the MongoDB document database.', url: 'https://www.mongodb.com/docs/' },
      { type: 'task', title: 'ER Diagram Assignment', body: 'Model a small domain as an ER diagram and submit your design.', dueInDays: 28 },
      { type: 'task', title: 'Normalization Practice', body: 'Normalize a given schema to 3NF and justify each step.', dueInDays: 44 },
    ],
  },
  {
    name: 'Software Engineering', teacher: 2, group: 'CS-SE-2026', time: '10 AM - 12 PM', days: ['Sunday', 'Wednesday'],
    description: 'Engineering practices for building maintainable software in teams.',
    content: [
      { type: 'announcement', title: 'Team Formation & Project Brief', body: 'Form teams of four and choose a project from the provided list.' },
      { type: 'lecture', title: 'The Software Development Lifecycle', body: 'Requirements, design, implementation, testing, and maintenance.' },
      { type: 'lecture', title: 'Agile & Scrum in Practice', body: 'Sprints, backlogs, and iterative delivery for small teams.' },
      { type: 'material', title: 'Clean Code Checklist', body: 'A concise checklist for readable, maintainable code reviews.' },
      { type: 'link', title: 'GitHub — Getting Started', body: 'Version control and collaboration workflows with Git and GitHub.', url: 'https://docs.github.com/en/get-started' },
      { type: 'task', title: 'Requirements Specification Document', body: 'Write a short SRS for your team project and submit it.', dueInDays: 35 },
    ],
  },
  {
    name: 'Artificial Intelligence', teacher: 3, group: 'CS-AI-2026', time: '2 PM - 4 PM', days: ['Tuesday', 'Thursday'],
    description: 'Foundations of machine learning and intelligent systems.',
    content: [
      { type: 'announcement', title: 'Welcome to Artificial Intelligence', body: 'Prerequisites, tools, and how the labs are graded.' },
      { type: 'lecture', title: 'Introduction to Machine Learning', body: 'Supervised vs. unsupervised learning and the ML workflow.' },
      { type: 'video', title: 'Python — Full Course for Beginners', body: 'The Python foundations used throughout the ML labs.', url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc' },
      { type: 'material', title: 'Linear Algebra Refresher', body: 'Vectors, matrices, and operations you will need for ML.' },
      { type: 'link', title: 'Python Documentation', body: 'The official Python language and standard-library reference.', url: 'https://docs.python.org/3/' },
      { type: 'task', title: 'Assignment: Build a Simple Classifier', body: 'Train and evaluate a basic classifier on a provided dataset.', dueInDays: 50 },
    ],
  },
  {
    name: 'Data Analysis', teacher: 4, group: 'DS-DA-2026', time: '11 AM - 1 PM', days: ['Monday', 'Wednesday'],
    description: 'Turning raw data into insight with statistics and Python tooling.',
    content: [
      { type: 'announcement', title: 'Getting Started with Data', body: 'Environment setup and the datasets we will use this term.' },
      { type: 'lecture', title: 'Descriptive Statistics', body: 'Distributions, central tendency, spread, and summarizing data.' },
      { type: 'video', title: 'Learn Python — Full Course for Beginners', body: 'Python fundamentals for data manipulation and analysis.', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw' },
      { type: 'material', title: 'Pandas Cheat Sheet', body: 'Common DataFrame operations for cleaning and reshaping data.' },
      { type: 'link', title: 'Microsoft Learn — Training', body: 'Guided learning paths for data and analytics tools.', url: 'https://learn.microsoft.com/en-us/training/' },
      { type: 'task', title: 'Assignment: Exploratory Data Analysis', body: 'Produce an EDA report on the provided dataset and submit it.', dueInDays: 38 },
    ],
  },
  {
    name: 'Computer Networks', teacher: 5, group: 'CS-NET-2026', time: '9 AM - 11 AM', days: ['Sunday', 'Tuesday'],
    description: 'How data moves across networks, from links to applications.',
    content: [
      { type: 'announcement', title: 'Networking Basics', body: 'Course structure, lab tooling, and the packet-capture assignment.' },
      { type: 'lecture', title: 'The OSI & TCP/IP Models', body: 'Layered models and how protocols map onto them.' },
      { type: 'lecture', title: 'Routing & Switching', body: 'Addressing, forwarding, and how packets find their way.' },
      { type: 'material', title: 'Subnetting Practice Sheet', body: 'Worked examples and exercises for IPv4 subnetting.' },
      { type: 'link', title: 'MDN — HTTP', body: 'How the HTTP protocol works, from requests to caching.', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP' },
      { type: 'task', title: 'Assignment: Packet Analysis Lab', body: 'Capture and analyze traffic, then submit your findings.', dueInDays: 30 },
    ],
  },
  {
    name: 'Cybersecurity Fundamentals', teacher: 6, group: 'CS-SEC-2026', time: '3 PM - 5 PM', days: ['Monday', 'Thursday'],
    description: 'Core security concepts for building and defending systems.',
    content: [
      { type: 'announcement', title: 'The Security Mindset', body: 'Thinking like an attacker to build safer software.' },
      { type: 'lecture', title: 'Threats, Vulnerabilities & Risk', body: 'The vocabulary of security and how to reason about risk.' },
      { type: 'lecture', title: 'Authentication & Authorization', body: 'Sessions vs. tokens, password hashing, and access control.' },
      { type: 'material', title: 'Secure Coding Checklist', body: 'Practical guidance for avoiding common vulnerabilities.' },
      { type: 'link', title: 'OWASP Top Ten', body: 'The most critical web application security risks.', url: 'https://owasp.org/www-project-top-ten/' },
      { type: 'task', title: 'Assignment: Threat Modeling Exercise', body: 'Produce a threat model for a small system and submit it.', dueInDays: 34 },
    ],
  },
  {
    name: 'Cloud Computing', teacher: 7, group: 'CS-CLD-2026', time: '1 PM - 3 PM', days: ['Tuesday', 'Thursday'],
    description: 'Deploying and operating applications on modern cloud platforms.',
    content: [
      { type: 'announcement', title: 'Welcome to the Cloud', body: 'Accounts, free-tier limits, and the deployment project.' },
      { type: 'lecture', title: 'Cloud Service Models (IaaS / PaaS / SaaS)', body: 'Responsibility boundaries and when to use each model.' },
      { type: 'video', title: 'Docker — Tutorial for Beginners', body: 'Containers, images, and running apps consistently anywhere.', url: 'https://www.youtube.com/watch?v=pTFZFxd4hOI' },
      { type: 'material', title: 'Containers vs. Virtual Machines', body: 'A concise comparison and when to choose each.' },
      { type: 'link', title: 'AWS Documentation', body: 'Official documentation for Amazon Web Services.', url: 'https://docs.aws.amazon.com/' },
      { type: 'task', title: 'Assignment: Deploy a Containerized App', body: 'Containerize and deploy a small app, then submit the URL.', dueInDays: 48 },
    ],
  },
  {
    name: 'Algorithms & Data Structures', teacher: 8, group: 'CS-ALG-2026', time: '12 PM - 2 PM', days: ['Sunday', 'Wednesday'],
    description: 'Designing efficient algorithms and choosing the right data structures.',
    content: [
      { type: 'announcement', title: 'Problem-Solving Bootcamp', body: 'How to approach problems and present clean solutions.' },
      { type: 'lecture', title: 'Big-O & Complexity Analysis', body: 'Reasoning about time and space complexity.' },
      { type: 'video', title: 'Learn JavaScript — Full Course for Beginners', body: 'The JavaScript foundations used in the coding labs.', url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg' },
      { type: 'material', title: 'Common Data Structures Reference', body: 'Arrays, lists, stacks, queues, trees, and hash maps.' },
      { type: 'link', title: 'freeCodeCamp — Learn to Code', body: 'Free, hands-on coding curriculum and practice.', url: 'https://www.freecodecamp.org/learn' },
      { type: 'task', title: 'Assignment: Sorting Algorithms', body: 'Implement and compare two sorting algorithms, then submit your report.', dueInDays: 40 },
    ],
  },
];

const buildContent = (courseId, teacherId, items, baseDate) =>
  items.map((it, idx) => {
    const doc = {
      course: courseId,
      createdBy: teacherId,
      type: it.type,
      title: it.title,
      body: it.body || '',
      contentDate: new Date(baseDate.getTime() + idx * 2 * 24 * 60 * 60 * 1000),
      order: idx + 1,
    };
    if (it.url) doc.attachments = [linkAttachment(it.url, it.title)];
    if (it.type === 'task') {
      doc.dueDate = daysFromNow(it.dueInDays || 45);
      doc.maxScore = it.maxScore || 100;
    }
    return doc;
  });

// ================================= SEED ===================================
const seed = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI missing');
    }

    const missing = DEMO_USERS.filter((u) => !u.password).map((u) => u.username);
    if (missing.length) {
      throw new Error(
        `Missing demo password env vars for: ${missing.join(', ')}. ` +
        'Set DEMO_STUDENT_PASSWORD / DEMO_TEACHER_PASSWORD / DEMO_ADMIN_PASSWORD / ' +
        'DEMO_SUPERADMIN_PASSWORD in backend/.env — see LOCAL_SETUP.md → Demo Accounts.'
      );
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected — running non-destructive idempotent demo seed');

    // ----- Demo accounts (one fictional account per role) -----
    const demoUsers = [];
    for (const demo of DEMO_USERS) demoUsers.push(await ensureUser(demo));
    const demoStudent = demoUsers.find((u) => u.role === 'student');
    const demoTeacher = demoUsers.find((u) => u.role === 'teacher');

    // ----- Fictional teachers (index 0 = demo teacher, 1.. = filler teachers) -----
    const teachers = [demoTeacher];
    for (let i = 0; i < TEACHER_NAMES.length; i++) {
      teachers.push(await ensureUser({
        name: TEACHER_NAMES[i],
        username: `teacher_${String(i + 1).padStart(3, '0')}`,
        studentId: `TCH-${1000 + (i + 1)}`,
        password: process.env.DEMO_TEACHER_PASSWORD,
        role: 'teacher',
      }));
    }
    console.log(`Teachers ready (${teachers.length}, incl. demo teacher)`);

    // ----- Fictional students (index 0 = demo student, 1.. = filler students) -----
    const students = [demoStudent];
    for (let i = 0; i < STUDENT_NAMES.length; i++) {
      students.push(await ensureUser({
        name: STUDENT_NAMES[i],
        username: `student_${String(i + 1).padStart(3, '0')}`,
        studentId: `STU-${1000 + (i + 1)}`,
        password: process.env.DEMO_STUDENT_PASSWORD,
        role: 'student',
      }));
    }
    console.log(`Students ready (${students.length}, incl. demo student)`);

    // ----- Courses + content -----
    const courses = [];
    for (let ci = 0; ci < COURSES.length; ci++) {
      const c = COURSES[ci];
      const teacher = teachers[c.teacher] || demoTeacher;
      const course = await ensureCourse({
        name: c.name,
        description: c.description,
        teacher: teacher._id,
        group: c.group,
        time: c.time,
        days: c.days,
        startDate: new Date('2026-02-01'),
      });
      courses.push(course);

      const baseDate = new Date(2026, 1, 2 + ci * 3); // spread course timelines
      for (const item of buildContent(course._id, teacher._id, c.content, baseDate)) {
        await ensureContent(item);
      }
    }
    console.log(`Courses ready (${courses.length}) with content`);

    // ----- Enrollments -----
    // Demo student gets a rich, multi-course dashboard.
    for (const ci of [0, 1, 2, 4]) await ensureEnrollment(demoStudent._id, courses[ci]._id);

    // Filler students: deterministic, varied enrolments (3–4 courses each) so
    // course sizes and per-student course counts look realistic.
    for (let i = 1; i < students.length; i++) {
      const s = students[i];
      const set = new Set([i % courses.length, (i * 3 + 1) % courses.length, (i * 7 + 2) % courses.length]);
      if (i % 2 === 0) set.add((i + 5) % courses.length);
      for (const ci of set) await ensureEnrollment(s._id, courses[ci]._id);
    }

    const enrollmentCount = await Enrollment.countDocuments();
    console.log(`Enrollments ready (${enrollmentCount})`);

    // ----- Demo student learning progress (submissions + completed lectures) -----
    // Populates the demo student's dashboard (progress counter, my-submissions)
    // and, via the demo teacher's courses, the teacher's submission-review view.
    // Non-destructive & idempotent:
    //   * submissions are keyed on the unique {task, student} pair (upsert).
    //   * completedLectures are ASSIGNED (not appended), so re-runs converge
    //     to the same deterministic set without growth or duplicates.
    // Uses only existing schema fields (Submission.status supports
    // 'submitted' | 'graded'; grade never exceeds the task's maxScore).
    let seededCompletedLectures = 0;
    let seededSubmissions = 0;

    // Completed lectures: a deterministic ~60% of each enrolled course's
    // lecture/video content, for every course the demo student is enrolled in.
    for (const ci of [0, 1, 2, 4]) {
      const course = courses[ci];
      const enrollment = await Enrollment.findOne({ student: demoStudent._id, course: course._id });
      if (!enrollment) continue;
      const completable = (await Content.find({ course: course._id, type: { $in: ['lecture', 'video'] } }))
        .sort((a, b) => a.order - b.order);
      const completedIds = completable.slice(0, Math.ceil(completable.length * 0.6)).map((c) => c._id);
      enrollment.completedLectures = completedIds; // assign, never push
      await enrollment.save();
      seededCompletedLectures += completedIds.length;
    }

    // Submissions: a realistic mix of graded and just-submitted work, keyed to
    // existing seeded TASK content. One of the demo student's tasks is left with
    // NO submission on purpose (a pending/unsubmitted task).
    const submissionPlan = [
      { course: 0, title: 'Assignment 1: Build a REST API', status: 'graded', grade: 92,
        answer: LONG_ANSWER, feedback: 'Excellent structure and clear validation. Watch your error status codes.',
        attachments: [linkAttachment('https://github.com/demo/rest-api', 'Project Repository')] },
      { course: 0, title: 'Assignment 2: Add JWT Authentication', status: 'submitted',
        answer: LONG_ANSWER,
        attachments: [linkAttachment('https://github.com/demo/jwt-auth', 'Auth Write-up')] },
      { course: 2, title: 'ER Diagram Assignment', status: 'graded', grade: 88,
        answer: LONG_ANSWER, feedback: 'Good normalization. Consider a weak entity for loan history.',
        attachments: [linkAttachment('https://example.com/er-diagram.pdf', 'ER Diagram (PDF)')] },
      // A "rejected" outcome: the Submission model has no rejected status, so this
      // is a graded-0 with rejection feedback (closest the schema allows).
      { course: 2, title: 'Normalization Practice', status: 'graded', grade: 0,
        answer: 'Submitted an incomplete normalization; several tables remain in 2NF.',
        feedback: 'Rejected — the schema is not fully in 3NF. Revise the transitive dependencies and resubmit.' },
      { course: 4, title: 'Assignment: Build a Simple Classifier', status: 'submitted',
        answer: LONG_ANSWER },
      // Course 1 (UI/UX) task "Assignment: Mobile App Prototype" intentionally
      // left unsubmitted to demonstrate a pending task.
    ];
    for (const p of submissionPlan) {
      const task = await Content.findOne({ course: courses[p.course]._id, title: p.title, type: 'task' });
      if (!task) continue;
      const data = {
        task: task._id,
        student: demoStudent._id,
        answer: p.answer,
        status: p.status,
      };
      if (p.attachments) data.attachments = p.attachments;
      if (p.status === 'graded') {
        data.grade = Math.min(p.grade, task.maxScore || 100);
        data.feedback = p.feedback;
      }
      await ensureSubmission(data);
      seededSubmissions += 1;
    }
    console.log(`Demo progress ready (${seededSubmissions} submissions, ${seededCompletedLectures} completed lectures)`);

    // Gamification badges for the default tenant (idempotent by {tenantId, name}).
    for (const badge of SEED_BADGES) {
      await ensureBadge({ ...badge, tenantId: 'default' });
    }
    console.log(`Badges ready (${SEED_BADGES.length})`);

    // ===================== RICH DEMO ENRICHMENT (promo video) =================
    const c0 = courses[0]; // Full-Stack Web Development
    const c1 = courses[1]; // UI/UX Design

    // --- Sticky notes for the demo student (2 pinned, varied colors, a link, a checklist) ---
    const NOTES = [
      { title: 'قائمة المهام لهذا الأسبوع', pinned: true, color: '#fef08a',
        content: 'المطلوب هذا الأسبوع:\n- إنهاء واجب JWT\n- مراجعة محاضرة النشر (Deployment)\n- تجهيز مشروع التخرج\n- التحضير للامتحان النهائي' },
      { title: 'تذكير مهم', pinned: true, color: '#fbcfe8',
        content: 'موعد تسليم مشروع التخرج بعد أسبوعين — لا تنسَ رفع رابط المستودع قبل الموعد! ⏰' },
      { title: 'ملاحظات Full-Stack', color: '#bfdbfe', course: c0._id,
        content: 'راجع الفرق بين المصادقة (Authentication) والتفويض (Authorization)، وكيفية حماية المسارات بالـ JWT.' },
      { title: 'فكرة مشروع', color: '#bbf7d0',
        content: 'تطبيق لإدارة المهام مع إشعارات فورية ولوحة تحكم تفاعلية ورسوم بيانية للتقدّم.' },
      { title: 'روابط مفيدة', color: '#fef08a',
        content: 'MDN — freeCodeCamp — وثائق React. راجعها قبل الامتحان.' },
      { title: 'اقتباس تحفيزي', color: '#ddd6fe',
        content: 'التعلّم رحلة وليست وجهة. استمر! 🚀' },
    ];
    for (let i = 0; i < NOTES.length; i++) {
      await ensureNote({ student: demoStudent._id, tenantId: 'default', order: i, ...NOTES[i] });
    }

    // --- Badges + XP for the demo student (mix of unlocked + locked) ---
    await ensureUserStat(demoStudent._id, {
      totalXp: 470, submissionCount: 4, perfectScores: 0, streakDays: 7,
      lecturesCompleted: 12, coursesCompleted: 1, chatMessagesSent: 12, lastActivityDate: new Date(),
    });
    for (const badgeName of ['أول تسليم', 'سلسلة 7 أيام', 'قاهر الكورس', 'كثير النقاش']) {
      const b = await Badge.findOne({ tenantId: 'default', name: badgeName });
      if (b) await ensureUserBadge(demoStudent._id, b._id);
    }

    // --- Leaderboard XP for Full-Stack students (demo student lands ~#3) ---
    const c0Enrollments = await Enrollment.find({ course: c0._id }).select('student');
    const c0OtherIds = c0Enrollments
      .map((e) => e.student.toString())
      .filter((id) => id !== demoStudent._id.toString());
    const XP_LADDER = [640, 540, 455, 430, 410, 390, 370, 350, 330, 315, 300];
    const leaderboardCount = Math.min(XP_LADDER.length, c0OtherIds.length);
    for (let i = 0; i < leaderboardCount; i++) {
      await ensureUserStat(c0OtherIds[i], { totalXp: XP_LADDER[i] });
    }

    // --- Chat threads (Full-Stack: 15 msgs, UI/UX: 10 msgs) ---
    const S = demoStudent._id;
    const T = demoTeacher._id;
    const A = students[1]._id; // STU-1001
    const B = students[2]._id; // STU-1002
    const chat0 = await ensureCourseChat(c0._id, [S, T, A, B]);
    const thread0 = [
      { sender: S, content: 'السلام عليكم دكتور 👋 عندي سؤال عن هيكلة الـ REST API — وين الأفضل أحط منطق التحقق (validation)؟' },
      { sender: T, content: 'وعليكم السلام. التحقق يكون عند حدود الطلب داخل الـ controller قبل ما تلمس قاعدة البيانات، وأي مدخل غير صالح يرجّع 400 مع رسالة واضحة.' },
      { sender: A, content: 'يعني نفصل المنطق عن الـ routes؟' },
      { sender: T, content: 'بالضبط. الـ route فقط يربط الـ verb بالـ handler. مثال:\n`router.post("/tasks", protect, createTask);`\nوالمنطق كله داخل الـ controller/service.' },
      { sender: S, content: 'ممتاز، شكراً! سؤال ثاني عن الـ JWT — كيف أحمي المسارات؟' },
      { sender: T, content: 'استخدم middleware يتحقق من التوكن ويضيف req.user. مثال:\n`const decoded = jwt.verify(token, SECRET);`\nثم امنع الوصول إذا التوكن غير صالح (401).' },
      { sender: B, content: 'وش الفرق بين 401 و 403؟ 🤔' },
      { sender: T, content: '401 = غير مُصادق (ما في توكن صالح). 403 = مُصادق لكن لا يملك صلاحية للمورد.' },
      { sender: S, content: 'تمام تمام 🙏' },
      { sender: T, content: 'اقرأوا هذا المرجع قبل المحاضرة القادمة: https://developer.mozilla.org/en-US/docs/Web/HTTP' },
      { sender: A, content: 'خلّصت الـ CRUD وأضفت pagination بحدود قصوى ✅' },
      { sender: T, content: 'أحسنت 👏 لا تنسَ تكتب اختبارات للـ happy path والحالات الفاشلة.' },
      { sender: S, content: 'كيف أنشر المشروع بعد ما أخلص؟' },
      { sender: T, content: 'نغطي النشر في الجلسة المباشرة القادمة (Deployment Q&A) — جهّزوا أسئلتكم.' },
      { sender: S, content: 'رائع! شكراً جزيلاً دكتور 🚀' },
    ];
    const msgs0 = await seedChatThread(chat0, thread0);

    const chat1 = await ensureCourseChat(c1._id, [S, T, A]);
    const thread1 = [
      { sender: S, content: 'دكتور، ما هو أهم مبدأ في التصميم للمبتدئين؟ 🎨' },
      { sender: T, content: 'التسلسل البصري (Visual Hierarchy): وجّه عين المستخدم للأهم أولاً عبر الحجم والتباين والمسافات.' },
      { sender: A, content: 'كيف أختار الألوان؟' },
      { sender: T, content: 'ابدأ بلون أساسي واحد ولون ثانوي للتمييز، وحافظ على تباين كافٍ لسهولة القراءة (WCAG).' },
      { sender: S, content: 'وش أفضل أداة للـ prototyping؟' },
      { sender: T, content: 'أي أداة تريح فريقك — المهم تبدأ بـ low-fidelity ثم ترفع الدقة تدريجياً.' },
      { sender: A, content: 'فهمت، شكراً! 🙏' },
      { sender: T, content: 'راجعوا نظام Material Design كمثال على نظام تصميم متكامل: https://m3.material.io/' },
      { sender: S, content: 'خلّصت أول نموذج أولي للتطبيق ✅' },
      { sender: T, content: 'ممتاز 👏 نراجعه في الاستوديو القادم.' },
    ];
    const msgs1 = await seedChatThread(chat1, thread1);

    // --- Notifications for the demo student (mix of types) ---
    const NOTIFS = [
      { type: 'SUBMISSION_GRADED', title: 'تم تقييم تسليمك', message: '«Assignment 1: Build a REST API»: 92 من 100', course: c0._id, link: `/student/course/${c0._id}` },
      { type: 'COURSE_ANNOUNCEMENT', title: 'إعلان جديد', message: 'Full-Stack Web Development: Welcome & Course Roadmap', course: c0._id, link: `/student/course/${c0._id}` },
      { type: 'CHAT_MESSAGE', title: 'دردشة', message: 'رسالة جديدة في الدردشة', link: `/student/course/${c0._id}` },
      { type: 'CERTIFICATE_ISSUED', title: '🎓 تم إصدار شهادتك', message: 'تمت الموافقة على شهادتك ويمكنك تنزيلها الآن.', link: '/student' },
      { type: 'NEW_TASK', title: 'مهمة جديدة', message: 'Full-Stack Web Development: Final Exam Project', course: c0._id, link: `/student/course/${c0._id}` },
    ];
    for (const n of NOTIFS) {
      await ensureNotification({ recipient: demoStudent._id, tenantId: 'default', isRead: false, ...n });
    }

    // --- Calendar extras: an upcoming lecture + an "exam" task on Full-Stack ---
    await ensureContent({
      course: c0._id, createdBy: demoTeacher._id, type: 'lecture',
      title: 'Live Session: Deployment Q&A', body: LONG_LECTURE, contentDate: daysFromNow(3), order: 20,
      attachments: [linkAttachment('https://www.youtube.com/watch?v=nu_pCVPKzTk', 'Session Recording')],
    });
    await ensureContent({
      course: c0._id, createdBy: demoTeacher._id, type: 'task',
      title: 'Final Exam Project', body: 'Final capstone submission — deploy your app and submit the URL.',
      contentDate: daysFromNow(1), dueDate: daysFromNow(14), maxScore: 100, order: 21,
    });

    // --- Long lecture descriptions on the 4 main courses (first 3 lectures each) ---
    for (const ci of [0, 1, 2, 4]) {
      const lectures = await Content.find({ course: courses[ci]._id, type: { $in: ['lecture', 'video'] } })
        .sort({ order: 1 }).limit(3);
      for (const lec of lectures) {
        lec.body = LONG_LECTURE;
        if (!lec.attachments || lec.attachments.length === 0) {
          lec.attachments = [linkAttachment('https://example.com/lecture-slides.pdf', 'Lecture Slides (PDF)')];
        }
        await lec.save();
      }
    }

    // --- Filler-student submissions on Full-Stack tasks (populate teacher grading) ---
    const c0Tasks = await Content.find({ course: c0._id, type: 'task' }).select('_id maxScore');
    let fillerSubs = 0;
    for (let i = 1; i < Math.min(students.length, 25); i++) {
      const enrolled = await Enrollment.findOne({ student: students[i]._id, course: c0._id });
      if (!enrolled || c0Tasks.length === 0) continue;
      const task = c0Tasks[i % c0Tasks.length];
      const graded = i % 2 === 0;
      const data = {
        task: task._id, student: students[i]._id,
        answer: LONG_ANSWER.slice(0, 480), status: graded ? 'graded' : 'submitted',
      };
      if (graded) { data.grade = Math.min(70 + (i % 25), task.maxScore || 100); data.feedback = 'Good work overall — mind the edge cases.'; }
      await ensureSubmission(data);
      fillerSubs += 1;
    }

    // --- Progress for STU-1001..1003: 2 completed lectures + 1 graded + 1 pending ---
    for (const si of [1, 2, 3]) {
      const s = students[si];
      const enr = await Enrollment.findOne({ student: s._id, course: c0._id });
      if (!enr) continue;
      const lecs = await Content.find({ course: c0._id, type: { $in: ['lecture', 'video'] } }).sort({ order: 1 }).limit(2);
      enr.completedLectures = lecs.map((l) => l._id);
      await enr.save();
      if (c0Tasks[0]) await ensureSubmission({ task: c0Tasks[0]._id, student: s._id, answer: LONG_ANSWER.slice(0, 320), status: 'graded', grade: 85, feedback: 'Well structured.' });
      if (c0Tasks[1]) await ensureSubmission({ task: c0Tasks[1]._id, student: s._id, answer: 'Submitted — pending review.', status: 'submitted' });
    }

    console.log(`Rich demo content ready (notes ${NOTES.length}, chat ${msgs0}+${msgs1} msgs, notifications ${NOTIFS.length}, leaderboard ${leaderboardCount}, filler submissions ${fillerSubs})`);

    console.log('Seed completed successfully (idempotent — safe to re-run)');
    console.log('\nDemo accounts (log in with username OR studentId — passwords in LOCAL_SETUP.md):');
    DEMO_USERS.forEach((d) =>
      console.log(`  ${d.role.padEnd(10)}  ${d.username.padEnd(16)} | ${d.studentId}`)
    );

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
