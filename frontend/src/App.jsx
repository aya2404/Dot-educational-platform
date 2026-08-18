import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Loader from './components/common/Loader';
import LoginPage from './pages/LoginPage';
import { getRoleHomePath } from './utils/auth';

import './styles/global.css';

// Authenticated routes are code-split so the initial (login) load ships a
// smaller JS bundle; each dashboard/page and its heavy children (modals,
// timeline, gradebook) are fetched on demand behind the Suspense boundary.
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const CoursePage = lazy(() => import('./pages/CoursePage'));
const CreateContentPage = lazy(() => import('./pages/CreateContentPage'));
const StudentCalendar = lazy(() => import('./pages/StudentCalendar'));
const StudentNotes = lazy(() => import('./pages/StudentNotes'));
const StudentAchievements = lazy(() => import('./pages/StudentAchievements'));
const GlobalSettingsPage = lazy(() => import('./pages/GlobalSettingsPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));
const CertificateVerify = lazy(() => import('./pages/CertificateVerify'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

const SessionRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader variant="page" />;
  }

  return <Navigate to={user ? getRoleHomePath(user.role) : '/login'} replace />;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader variant="page" />;
  }

  if (user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<SessionRedirect />} />
    <Route path="/certificates/verify/:certificateId" element={<CertificateVerify />} />
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="/terms" element={<TermsOfService />} />
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
      path="/student/calendar"
      element={
        <ProtectedRoute roles={['student']}>
          <StudentCalendar />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/notes"
      element={
        <ProtectedRoute roles={['student']}>
          <StudentNotes />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/achievements"
      element={
        <ProtectedRoute roles={['student']}>
          <StudentAchievements />
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
      path="/superadmin/global-settings"
      element={
        <ProtectedRoute roles={['superadmin']}>
          <GlobalSettingsPage />
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
    <Route
      path="/executive-dashboard"
      element={
        <ProtectedRoute roles={['admin', 'superadmin']}>
          <ExecutiveDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/pricing"
      element={
        <ProtectedRoute>
          <PricingPage />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ThemeProvider>
        <Suspense fallback={<Loader variant="page" />}>
          <AppRoutes />
        </Suspense>
      </ThemeProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
