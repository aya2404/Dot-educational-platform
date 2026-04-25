import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsBoxArrowInRight, BsLock, BsPerson } from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/common/BrandLogo';
import { getRoleHomePath } from '../utils/auth';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setError('الرجاء إدخال المعرف وكلمة المرور');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await login(identifier.trim(), password);

    setIsLoading(false);

    if (result.success) {
      navigate(getRoleHomePath(result.user?.role), { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login-screen">
      {/* إزالة الأشكال الخلفية اختياري - يمكن الاحتفاظ بها */}
      <div className="login-screen__shape login-screen__shape--one" />
      <div className="login-screen__shape login-screen__shape--two" />
      <div className="login-screen__shape login-screen__shape--three" />

      <div className="login-shell login-shell--centered-only">
        {/* الشعار في الأعلى (اختياري) */}
        <div className="login-shell__brand-anchor">
          <BrandLogo className="login-brand-panel__brand" />
        </div>

        {/* القسم الخاص بالنموذج فقط */}
        <section className="login-shell__form">
          <div className="login-card">
            <div className="mb-4">
              <h2 className="login-card__title">تسجيل الدخول</h2>
            </div>

            {error ? <div className="alert alert-danger">{error}</div> : null}

            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
              <div>
                <label htmlFor="identifier" className="form-label">
                  المعرف أو اسم المستخدم
                </label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text">
                    <BsPerson size={16} />
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    className="form-control"
                    placeholder="STU-1001 أو student_001"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    autoComplete="username"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  كلمة المرور
                </label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text">
                    <BsLock size={16} />
                  </span>
                  <input
                    id="password"
                    type="password"
                    className="form-control"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
                <BsBoxArrowInRight size={16} />
                {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;