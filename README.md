# 🎓 Dot Jordan — Full Stack Educational Platform

<div align="center">

![Platform](https://img.shields.io/badge/Platform-Educational-blue?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-MERN-green?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Deployed-Render-purple?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**A role-based learning management system built with the MERN stack**

🌐 [Live Demo](https://dot-vqx9.onrender.com/) | 📽️ [Demo Video on LinkedIn](#)

</div>

---

## 📋 Table of Contents
- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Getting Started](#-getting-started)
- [Demo Credentials](#-demo-credentials)
- [Deployment](#-deployment)
- [Future Improvements](#-future-improvements)

---

## 🌟 Overview
Dot Jordan is a full-stack Learning Management System (LMS) built using the MERN stack (MongoDB, Express, React, Node.js).  
It supports four roles: Student, Teacher, Admin, and Super Admin, each with its own dashboard and permissions system.

The platform is designed for an Arabic full-stack bootcamp and supports bilingual UI (Arabic/English).

---

## ✨ Features

### 👩‍🎓 Student
- View enrolled courses and timeline
- Submit tasks with files or text
- Edit/delete submissions before deadline
- View locked submissions after deadline

### 👩‍🏫 Teacher
- Create and manage course content
- Add lectures, tasks, announcements
- View student submissions

### 🛡️ Admin
- Manage users and courses
- Control platform content
- Monitor system activity

### 👑 Super Admin
- Full system control
- Manage users, courses, and global content

### 🔐 Authentication & Security
- JWT authentication
- Role-based access control
- Protected routes (frontend + backend)
- Ownership-based permissions

### 📁 File Management
- Multer (local uploads)
- Cloudinary (cloud storage support)
- File attachments for tasks and content

### 🎨 UI / UX
- Bilingual interface (Arabic / English)
- Bootstrap 5 styling
- Responsive mobile-friendly layout
- Clean dashboard system

---

## 🛠️ Tech Stack

| Layer       | Technology |
|------------|------------|
| Frontend   | React, React Router, Bootstrap, Axios |
| Backend    | Node.js, Express |
| Database   | MongoDB, Mongoose |
| Auth       | JWT, bcrypt |
| Uploads    | Multer, Cloudinary |
| Deployment | Render |

---

## 📁 Project Structure

```
dot/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── seed.js
│   └── server.js
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── context/
│       ├── utils/
│       └── App.jsx
│
└── render.yaml
```

---

## 🚀 Getting Started

### 1. Clone repository
```bash
git clone https://github.com/aya2404/Dot-educational-platform.git
cd dot
```

### 2. Install backend
```bash
cd backend
npm install
npm run dev
```

### 3. Install frontend
```bash
cd frontend
npm install
npm start
```

---

## 🔑 Demo Credentials

| Role | ID | Password |
|------|----|----------|
| Student | STU-1003 | student1003 |
| Teacher | TCH-0001 | eng123456 |
| Super Admin | SAD-0001 | super2004 |

---

## ☁️ Deployment
- Frontend: Render Static Site  
- Backend: Render Web Service  

🔗 Live: https://dot-vqx9.onrender.com/

---

## 🔮 Future Improvements
- Grading system
- Notifications
- Progress tracking
- Attendance system
- Discussion/comments
- Email notifications
- Mobile app
- Dark mode

---

<div align="center">

Built with 💚 using MERN Stack

</div>
