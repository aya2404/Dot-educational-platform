import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHomePath } from '../utils/auth';

// Friendly, on-brand 404. Sends the user to their role-based home (or login).
const NotFoundPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const home = user ? getRoleHomePath(user.role) : '/login';

  return (
    <div className="notfound-page" dir="rtl">
      <div className="notfound-page__emoji" aria-hidden="true">🤔</div>
      <h1 className="notfound-page__code">404</h1>
      <p className="notfound-page__message">عذراً، الصفحة التي تبحث عنها غير موجودة.</p>
      <button type="button" className="btn btn-primary" onClick={() => navigate(home, { replace: true })}>
        العودة إلى الرئيسية
      </button>
    </div>
  );
};

export default NotFoundPage;
