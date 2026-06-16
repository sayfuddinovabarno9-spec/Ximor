import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const STORAGE_KEY = 'ximor_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user,  setUser]  = useState(() => {
    try {
      const t = localStorage.getItem(STORAGE_KEY);
      if (!t) return null;
      // Decode JWT payload (no verification — server does that)
      const payload = JSON.parse(atob(t.split('.')[1]));
      return { id: payload.id, username: payload.username, name: payload.name, initials: payload.initials, role: payload.role };
    } catch { return null; }
  });

  // On mount, verify stored token against the server; clear if expired/invalid
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(u => setUser({ id: u.id, username: u.username, name: u.name, initials: u.initials, role: u.role }))
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
      });
  }, []);

  const saveSession = useCallback((newToken, newUser) => {
    localStorage.setItem(STORAGE_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const register = useCallback(async (username, name, password) => {
    const res  = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, name, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ro\'yxatdan o\'tishda xato');
    saveSession(data.token, data.user);
    return data.user;
  }, [saveSession]);

  const login = useCallback(async (username, password) => {
    const res  = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kirish xatosi');
    saveSession(data.token, data.user);
    return data.user;
  }, [saveSession]);

  /** Attach auth header to fetch options */
  const authHeaders = useCallback(() =>
    token ? { Authorization: `Bearer ${token}` } : {}
  , [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, authHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}
