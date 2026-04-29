<div align="center">

# 🎓 Dot — Educational Platform

### A Full-Stack MERN Educational Platform for Students and Instructors

[![Live Demo](https://img.shields.io/badge/Live%20Demo-dot--vqx9.onrender.com-brightgreen?style=for-the-badge&logo=render)](https://dot-vqx9.onrender.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)

</div>

---

## 📌 Table of Contents

- [Project Overview](#-project-overview)
- [Features](#-features)
- [Demo](#-demo)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Seed Data](#-seed-data)
- [Demo Credentials](#-demo-credentials)
- [Screenshots](#-screenshots)
- [Future Improvements](#-future-improvements)
- [Contact](#-contact)

---

## 📖 Project Overview

**Dot** is a modern, full-stack educational platform inspired by e-learning systems like Coursera and Udemy. It enables instructors to create and manage courses while students can enroll, track progress, and interact with course content — all through a clean, responsive interface.

The platform was built as a capstone MERN project showcasing end-to-end full-stack development skills including RESTful API design, JWT authentication, role-based access control, and cloud deployment.

---

## ✨ Features

### 👩‍🎓 Student
- Register and log in securely with JWT-based authentication
- Browse and search available courses
- Enroll in courses and track learning progress
- View course materials, lessons, and resources
- Manage personal profile and enrollment history

### 👨‍🏫 Instructor
- Create, edit, and delete courses
- Upload course content and structure lessons
- View enrolled students per course
- Manage course visibility and details

### 🔐 Authentication & Security
- Role-based access control (Student / Instructor / Admin)
- Secure password hashing with bcrypt
- JWT token-based session management
- Protected routes on both client and server

### 🎨 UI/UX
- Fully responsive design for all screen sizes
- Clean, modern interface with intuitive navigation
- Loading states, error handling, and user feedback

---

## 🚀 Demo

🌐 **Live Deployment:** [https://dot-vqx9.onrender.com/](https://dot-vqx9.onrender.com/)

> ⚠️ The app is hosted on Render's free tier. It may take **30–60 seconds** to wake up on the first visit.

### 🎥 Video Demo

> 📎 **[LinkedIn Post with Demo Video](#)**
> *(Replace this placeholder with your actual LinkedIn post URL)*

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router v6, Axios, CSS Modules |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose ODM |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs |
| **Deployment** | Render (full-stack), MongoDB Atlas |
| **Dev Tools** | Git, GitHub, Postman, VS Code |

---

## 📁 Project Structure

```
Dot-educational-platform/
│
├── client/                     # React frontend
│   ├── public/
│   └── src/
│       ├── assets/             # Images, icons, static files
│       ├── components/         # Reusable UI components
│       ├── pages/              # Page-level components
│       ├── context/            # React Context (auth, etc.)
│       ├── hooks/              # Custom React hooks
│       ├── services/           # Axios API call functions
│       ├── utils/              # Utility/helper functions
│       ├── App.js
│       └── index.js
│
├── server/                     # Express backend
│   ├── config/                 # DB connection and config
│   ├── controllers/            # Route handler logic
│   ├── middleware/             # Auth and error middlewares
│   ├── models/                 # Mongoose data models
│   ├── routes/                 # Express API routes
│   └── server.js               # Entry point
│
├── seed/                       # Sample database seed data
│   └── ...                     # JSON/JS files with demo data
│
├── .env.example                # Environment variable template
├── package.json
└── README.md
```

---

## 🏁 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v16+)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/) (local) or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

### 1. Clone the Repository

```bash
git clone https://github.com/aya2404/Dot-educational-platform.git
cd Dot-educational-platform
```

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `server/` directory based on `.env.example`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

### 4. Run the Application

**Development mode (both client and server):**

```bash
# From the root directory (if concurrently is configured)
npm run dev

# Or run them separately:

# Terminal 1 — Start the backend
cd server
npm run dev

# Terminal 2 — Start the frontend
cd client
npm start
```

The client runs on **http://localhost:3000** and the server on **http://localhost:5000**.

---

## 🌱 Seed Data

The `seed/` folder contains sample data to populate the database with demo users, courses, and enrollments for testing and development purposes.

**To seed the database:**

```bash
cd server
node seed/seeder.js
```

> This will insert demo students, instructors, and courses into your MongoDB database.

---

## 🔑 Demo Credentials

Use the following credentials to explore the platform on the [live demo](https://dot-vqx9.onrender.com/):

### 👩‍🎓 Student Account

| Field | Value |
|-------|-------|
| **Student ID** | `STU-1003` |
| **Password** | `student1003` |

> Additional demo accounts may be available via the seed data. See the `seed/` folder for details.

---

## 📸 Screenshots

> 🖼️ *Screenshots will be added here. Replace each placeholder with actual images.*

### 🏠 Home Page
![Home Page](./screenshots/home.png)

### 📚 Courses Page
![Courses Page](./screenshots/courses.png)

### 📋 Course Detail
![Course Detail](./screenshots/course-detail.png)

### 🎓 Student Dashboard
![Student Dashboard](./screenshots/student-dashboard.png)

### 👨‍🏫 Instructor Dashboard
![Instructor Dashboard](./screenshots/instructor-dashboard.png)

### 🔐 Login Page
![Login Page](./screenshots/login.png)

---

## 🔮 Future Improvements

- [ ] **Payment Integration** — Add Stripe or PayPal for paid course enrollment
- [ ] **Video Streaming** — Embed video lessons with progress tracking
- [ ] **Live Sessions** — Real-time webinars using WebSockets or a video API (e.g., Agora, Twilio)
- [ ] **Discussion Forums** — Per-course comment threads and Q&A sections
- [ ] **Certificates** — Auto-generate PDF completion certificates
- [ ] **Quiz & Assessment** — In-course quizzes with instant grading
- [ ] **Admin Dashboard** — Platform-wide analytics and user management panel
- [ ] **Email Notifications** — Welcome emails, enrollment confirmations via Nodemailer
- [ ] **Dark Mode** — Theme toggle for better accessibility
- [ ] **Mobile App** — React Native companion app

---

## 👩‍💻 Contact

**Aya Abu Taha**

- 🐙 GitHub: [@aya2404](https://github.com/aya2404)
- 💼 LinkedIn: *(Add your LinkedIn profile URL here)*
- 📧 Email: *(Add your email here)*

---

<div align="center">

Made with ❤️ by Aya Abu Taha

⭐ If you found this project helpful, please consider giving it a star!

</div>
