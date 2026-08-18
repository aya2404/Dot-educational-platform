import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BsBoxArrowRight,
  BsCalendarWeek,
  BsGraphUpArrow,
  BsHouseDoor,
  BsMoon,
  BsPlusSquare,
  BsShieldCheck,
  BsSliders,
  BsStars,
  BsStickies,
  BsSun,
  BsTrophy,
  BsXLg,
} from 'react-icons/bs';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLE_LABELS } from '../../utils/auth';
import BrandLogo from './BrandLogo';
import NotificationBell from './NotificationBell';
import './Sidebar.css';

const NAV_LINKS = {
  student: [
    { path: '/student', label: 'لوحة التحكم', icon: BsHouseDoor },
    { path: '/student/calendar', label: 'التقويم', icon: BsCalendarWeek },
    { path: '/student/notes', label: 'ملاحظاتي', icon: BsStickies },
    { path: '/student/achievements', label: 'إنجازاتي', icon: BsTrophy },
    { path: '/pricing', label: 'الاشتراك', icon: BsStars },
  ],
  teacher: [
    { path: '/teacher', label: 'لوحة التحكم', icon: BsHouseDoor },
    { path: '/teacher/content/new', label: 'إضافة محتوى', icon: BsPlusSquare },
    { path: '/pricing', label: 'الاشتراك', icon: BsStars },
  ],
  admin: [
    { path: '/admin', label: 'لوحة الإدارة', icon: BsShieldCheck },
    { path: '/executive-dashboard', label: 'المؤشرات', icon: BsGraphUpArrow },
    { path: '/admin/content/new', label: 'إضافة محتوى', icon: BsPlusSquare },
  ],
  superadmin: [
    { path: '/superadmin', label: 'لوحة الإدارة', icon: BsShieldCheck },
    { path: '/executive-dashboard', label: 'المؤشرات', icon: BsGraphUpArrow },
    { path: '/superadmin/content/new', label: 'إضافة محتوى', icon: BsPlusSquare },
    { path: '/superadmin/global-settings', label: 'الإعدادات العامة', icon: BsSliders },
  ],
};

const Sidebar = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const links = NAV_LINKS[user?.role] || [];

  const handleLogout = () => {
    logout();
    onClose?.();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`sidebar-shell ${open ? 'open' : ''}`}>
      <div className="sidebar-shell__header">
        <BrandLogo className="sidebar-brand" />

        <button
          type="button"
          className="btn btn-outline-primary d-lg-none"
          onClick={onClose}
          aria-label="إغلاق القائمة"
        >
          <BsXLg size={16} />
        </button>
      </div>

      <div className="sidebar-user-card">
        <div className="sidebar-user-card__avatar">{user?.name?.charAt(0) || 'D'}</div>
        <div>
          <p className="sidebar-user-card__name">{user?.name}</p>
          <p className="sidebar-user-card__role">{ROLE_LABELS[user?.role]}</p>
        </div>
      </div>

      <div className="sidebar-notifications">
        <NotificationBell onNavigate={onClose} />
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path.split('/').length === 2}
              className={({ isActive }) => `sidebar-nav__link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon size={16} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="btn btn-outline-primary w-100 sidebar-theme-toggle"
          onClick={toggleMode}
          aria-label={mode === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
        >
          {mode === 'dark' ? <BsSun size={16} /> : <BsMoon size={16} />}
          {mode === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
        </button>

        <div className="sidebar-user-id">
          <span>المعرف</span>
          <strong>{user?.studentId || user?.username}</strong>
        </div>
        <button type="button" className="btn btn-outline-danger w-100" onClick={handleLogout}>
          <BsBoxArrowRight size={16} />
          تسجيل الخروج
        </button>

        <div className="sidebar-legal">
          <Link to="/privacy" onClick={onClose}>الخصوصية</Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms" onClick={onClose}>الشروط</Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
