import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

// Applies branding across two layers:
//   • GLOBAL (Super-Admin platform settings) — the site-wide fallback, and the
//     owner of truly global elements: the favicon (always global) and the login-
//     page logo / platform name.
//   • TENANT (per-organization settings) — overrides the global colours/name/logo
//     for a signed-in tenant's own experience.
// Effective value = tenant ?? global. The favicon is always the global one.
const ThemeContext = createContext(null);

// Point the (single) favicon <link> at a new href. index.html ships a
// <link id="app-favicon"> we mutate here so the tab icon can be global-driven.
const setFavicon = (href) => {
  if (!href) return;
  const link = document.getElementById('app-favicon');
  if (link) link.href = href;
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null); // tenant settings
  const [globalSettings, setGlobalSettings] = useState(null);

  // Light/dark mode — persisted in localStorage, applied via a data-theme
  // attribute on <html> that global.css keys its dark-mode variables off.
  const [mode, setMode] = useState(() => localStorage.getItem('theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
  }, [mode]);
  const toggleMode = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), []);

  // Re-apply the merged theme (tenant over global) to the CSS variables, title,
  // and favicon. Called whenever either layer changes.
  const applyMerged = useCallback((tenant, global) => {
    const root = document.documentElement;
    const primary = tenant?.primaryColor || global?.primaryColor;
    const secondary = tenant?.secondaryColor || global?.secondaryColor;
    const name = tenant?.platformName || global?.platformName;
    if (primary) root.style.setProperty('--dj-primary', primary);
    if (secondary) root.style.setProperty('--dj-secondary', secondary);
    if (name) document.title = name;
    setFavicon(global?.faviconUrl); // favicon is always the global one
  }, []);

  // Backwards-compatible single-arg applier (used by existing callers).
  const applyTheme = useCallback(
    (tenant) => applyMerged(tenant, globalSettings),
    [applyMerged, globalSettings]
  );

  // GLOBAL settings are public — fetch once on mount (even pre-auth) so the login
  // page gets the global logo/favicon/name.
  const refreshGlobal = useCallback(async () => {
    try {
      const response = await api.get('/platform/settings');
      setGlobalSettings(response.data.data);
      return response.data.data;
    } catch {
      return null; // keep built-in defaults on failure
    }
  }, []);

  // TENANT settings require auth.
  const refreshTheme = useCallback(async () => {
    try {
      const response = await api.get('/organizations/settings');
      setSettings(response.data.data);
      return response.data.data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    refreshGlobal();
  }, [refreshGlobal]);

  useEffect(() => {
    if (user) refreshTheme();
    else setSettings(null); // logged out -> fall back to global branding
  }, [user, refreshTheme]);

  // Whenever either layer changes, re-apply the merged theme.
  useEffect(() => {
    applyMerged(settings, globalSettings);
  }, [settings, globalSettings, applyMerged]);

  return (
    <ThemeContext.Provider
      value={{
        settings,
        globalSettings,
        refreshTheme,
        refreshSettings: refreshTheme,
        refreshGlobal,
        applyTheme,
        mode,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext) || {};

export default ThemeContext;
