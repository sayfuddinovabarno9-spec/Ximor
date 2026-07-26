import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLanguage } from './LanguageContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const STORAGE_KEY = 'ximor_token';

const AuthContext = createContext(null);

function normalizeUser(value) {
  if (!value) return null;
  let interests = [];
  if (Array.isArray(value.interests)) {
    interests = value.interests;
  } else if (typeof value.interests === 'string') {
    try { interests = JSON.parse(value.interests); } catch { interests = []; }
  }
  return {
    id: value.id,
    username: value.username,
    email: value.email || '',
    name: value.name,
    initials: value.initials,
    role: value.role,
    is_admin: Boolean(value.is_admin),
    is_moderator: Boolean(value.is_moderator),
    bio: value.bio || '',
    avatar_url: value.avatar_url || '',
    cover_url: value.cover_url || '',
    headline: value.headline || '',
    location: value.location || '',
    website: value.website || '',
    study_goal: value.study_goal || '',
    interests,
  };
}

export function AuthProvider({ children }) {
  const { t } = useLanguage();
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user,  setUser]  = useState(() => {
    try {
      const t = localStorage.getItem(STORAGE_KEY);
      if (!t) return null;
      // Decode JWT payload (no verification — server does that)
      const payload = JSON.parse(atob(t.split('.')[1]));
      return normalizeUser({
        id: payload.id,
        username: payload.username,
        email: payload.email || '',
        name: payload.name,
        initials: payload.initials,
        role: payload.role,
        is_admin: Boolean(payload.is_admin),
        is_moderator: Boolean(payload.is_moderator),
      });
    } catch { return null; }
  });

  // On mount, verify stored token against the server; clear if expired/invalid
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(u => setUser(normalizeUser(u)))
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
      });
  }, []);

  const saveSession = useCallback((newToken, newUser) => {
    localStorage.setItem(STORAGE_KEY, newToken);
    setToken(newToken);
    setUser(normalizeUser(newUser));
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` },
    });
    if (!res.ok) throw new Error('refresh failed');
    const data = await res.json();
    const next = normalizeUser(data);
    setUser(next);
    return next;
  }, []);

  const updateLocalUser = useCallback((nextUser) => {
    setUser(normalizeUser(nextUser));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const register = useCallback(async (username, name, password, email) => {
    const res  = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, name, password, email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t('auth.registerError'));
    saveSession(data.token, data.user);
    return data.user;
  }, [saveSession, t]);

  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t('auth.loginError'));
    saveSession(data.token, data.user);
    return data.user;
  }, [saveSession, t]);

  /** Attach auth header to fetch options */
  const authHeaders = useCallback(() =>
    token ? { Authorization: `Bearer ${token}` } : {}
  , [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, authHeaders, refreshUser, updateLocalUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}
