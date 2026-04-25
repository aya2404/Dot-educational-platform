import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import CoursePage from './pages/CoursePage';
import CreateContentPage from './pages/CreateContentPage';
import { getRoleHomePath } from './utils/auth';

import './styles/global.css';

const SessionRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loader">
        <div className="spinner-border text-primary" role="status" aria-hidden="true" />
      </div>
    );
  }

  return <Navigate to={user ? getRoleHomePath(user.role) : '/login'} replace />;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loader">
        <div className="spinner-border text-primary" role="status" aria-hidden="true" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<SessionRedirect />} />
    <Route
      path="/login"
      element={
        <GuestRoute>
          <LoginPage />
        </GuestRoute>
      }
    />
    <Route
      path="/student"
      element={
        <ProtectedRoute roles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/course/:courseId"
      element={
        <ProtectedRoute roles={['student']}>
          <CoursePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/teacher"
      element={
        <ProtectedRoute roles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/teacher/content/new"
      element={
        <ProtectedRoute roles={['teacher']}>
          <CreateContentPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/teacher/content/:contentId/edit"
      element={
        <ProtectedRoute roles={['teacher']}>
          <CreateContentPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/teacher/course/:courseId"
      element={
        <ProtectedRoute roles={['teacher']}>
          <CoursePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/course/:courseId"
      element={
        <ProtectedRoute roles={['admin']}>
          <CoursePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/content/new"
      element={
        <ProtectedRoute roles={['admin']}>
          <CreateContentPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/content/:contentId/edit"
      element={
        <ProtectedRoute roles={['admin']}>
          <CreateContentPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/superadmin"
      element={
        <ProtectedRoute roles={['superadmin']}>
          <SuperAdminDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/superadmin/content/new"
      element={
        <ProtectedRoute roles={['superadmin']}>
          <CreateContentPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/superadmin/content/:contentId/edit"
      element={
        <ProtectedRoute roles={['superadmin']}>
          <CreateContentPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/superadmin/course/:courseId"
      element={
        <ProtectedRoute roles={['superadmin']}>
          <CoursePage />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<SessionRedirect />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
