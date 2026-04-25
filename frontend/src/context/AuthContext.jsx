import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { setUnauthorizedHandler } from '../utils/api';

const AuthContext = createContext(null);

const readStoredUser = () => {
  const savedUser = localStorage.getItem('user');

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const clearSessionStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const persistSession = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const clearSession = () => {
      clearSessionStorage();

      if (isMounted) {
        setUser(null);
      }
    };

    const bootstrapSession = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        clearSessionStorage();

        if (isMounted) {
          setLoading(false);
        }

        return;
      }

      try {
        const response = await api.get('/auth/me', { skipAuthRedirect: true });

        if (!isMounted) {
          return;
        }

        persistSession(token, response.data.user);
        setUser(response.data.user);
      } catch {
        clearSession();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    setUnauthorizedHandler(() => {
      clearSession();
    });

    bootstrapSession();

    return () => {
      isMounted = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = async (identifier, password) => {
    try {
      const response = await api.post(
        '/auth/login',
        { identifier, password },
        { skipAuthRedirect: true }
      );
      const { token, user: nextUser } = response.data;

      persistSession(token, nextUser);
      setUser(nextUser);

      return { success: true, user: nextUser };
    } catch (error) {
      clearSessionStorage();
      setUser(null);

      return {
        success: false,
        error: error.response?.data?.message || 'حدث خطأ أثناء تسجيل الدخول',
      };
    }
  };

  const logout = () => {
    clearSessionStorage();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !loading && !!user,
    isStudent: user?.role === 'student',
    isTeacher: user?.role === 'teacher',
    isAdmin: user?.role === 'admin',
    isSuperAdmin: user?.role === 'superadmin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default AuthContext;
