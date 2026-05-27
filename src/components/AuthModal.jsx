import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ onClose, onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode]     = useState('login'); // 'login' | 'register'
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState('');
  const [form, setForm]     = useState({ username: '', name: '', password: '' });
  const firstRef            = useRef(null);

  useEffect(() => { firstRef.current?.focus(); }, [mode]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.username, form.password);
      } else {
        await register(form.username, form.name, form.password);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="auth-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        {/* Header */}
        <div className="auth-modal__head">
          <div className="brand-icon" style={{ width: 36, height: 36 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <path d="M9 3h6M9 3v7l-5 9a1 1 0 0 0 .9 1.5h12.2A1 1 0 0 0 21 19l-5-9V3" />
              <path d="M7.5 15h9" opacity=".5" />
            </svg>
          </div>
          <div>
            <strong>So'ra!</strong>
            <span>{mode === 'login' ? 'Xush kelibsiz' : 'Hisob yaratish'}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="auth-modal__tabs">
          <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setError(''); }}>
            Kirish
          </button>
          <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => { setMode('register'); setError(''); }}>
            Ro'yxatdan o'tish
          </button>
        </div>

        {/* Fields */}
        {mode === 'register' && (
          <label>
            To'liq ism
            <input ref={firstRef} placeholder="Aziza Karimova" value={form.name}
                   onChange={e => set('name', e.target.value)} required autoComplete="name" />
          </label>
        )}

        <label>
          Username
          <input ref={mode === 'login' ? firstRef : null}
                 placeholder="aziza_kimyo" value={form.username}
                 onChange={e => set('username', e.target.value)}
                 required autoComplete="username" />
        </label>

        <label>
          Parol
          <input type="password" placeholder={mode === 'register' ? 'kamida 6 ta belgi' : '••••••'}
                 value={form.password} onChange={e => set('password', e.target.value)}
                 required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>

        {error && <p className="auth-modal__error">{error}</p>}

        <button className="primary-button" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}>
          {busy ? 'Yuklanmoqda…' : mode === 'login' ? 'Kirish' : 'Hisob yaratish'}
        </button>

        <p className="auth-modal__hint">
          {mode === 'login'
            ? <>Hisob yo'qmi? <button type="button" onClick={() => { setMode('register'); setError(''); }}>Ro'yxatdan o'ting</button></>
            : <>Hisob bormi? <button type="button" onClick={() => { setMode('login'); setError(''); }}>Kiring</button></>}
        </p>
      </form>
    </div>
  );
}
