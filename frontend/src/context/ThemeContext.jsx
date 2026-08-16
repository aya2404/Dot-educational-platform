import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

// Applies the tenant's white-label branding: primary/secondary colors are
// written to the CSS custom properties the design system already reads
// (--dj-primary is used app-wide), and the platform name becomes the document
// title. Settings are fetched once the user is authenticated.
const ThemeContext = createContext(null);

const applyTheme = (settings) => {
  if (!settings) return;
  const root = document.documentElement;
  if (settings.primaryColor) root.style.setProperty('--dj-primary', settings.primaryColor);
  if (settings.secondaryColor) root.style.setProperty('--dj-secondary', settings.secondaryColor);
  if (settings.platformName) document.title = settings.platformName;
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);

  const refreshTheme = useCallback(async () => {
    try {
      const response = await api.get('/organizations/settings');
      setSettings(response.data.data);
      applyTheme(response.data.data);
    } catch {
      /* keep the built-in defaults on failure */
    }
  }, []);

  // Load (and apply) branding whenever the user session changes.
  useEffect(() => {
    if (user) refreshTheme();
  }, [user, refreshTheme]);

  return (
    <ThemeContext.Provider
      value={{ settings, refreshTheme, refreshSettings: refreshTheme, applyTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext) || {};

export default ThemeContext;
