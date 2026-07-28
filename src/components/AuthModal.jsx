import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BrandMark from './BrandMark';

export default function AuthModal({ onClose, onSuccess }) {
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode]     = useState('login');
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState('');
  const [form, setForm]     = useState({ username: '', name: '', email: '', password: '' });
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
        await login(form.email, form.password);
      } else {
        await register(form.username, form.name, form.password, form.email);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m) => { setMode(m); setError(''); };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="auth-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        {/* Header */}
        <div className="auth-modal__head">
          <div className="brand-icon" style={{ width: 36, height: 36 }}>
            <BrandMark />
          </div>
          <div>
            <strong>ChemOlymp</strong>
            <span>{t('home.chemistryChat')}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="auth-modal__tabs">
          <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')}>
            {t('auth.login')}
          </button>
          <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => switchMode('register')}>
            {t('auth.register')}
          </button>
        </div>

        {/* Register-only fields */}
        {mode === 'register' && (
          <>
            <label>
              {t('auth.fullName')}
              <input ref={firstRef} placeholder="Aziza Karimova" value={form.name}
                     onChange={e => set('name', e.target.value)} required autoComplete="name" />
            </label>
          </>
        )}

        <label>
          {t('auth.email')}
          <input
            ref={mode === 'login' ? firstRef : null}
            type="email"
            placeholder="aziza@example.com"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        {mode === 'register' && (
          <label>
            {t('auth.username')}
            <input
              placeholder="aziza_kimyo"
              value={form.username}
              onChange={e => set('username', e.target.value)}
              required
              autoComplete="username"
            />
          </label>
        )}

        <label>
          {t('auth.password')}
          <input type="password" placeholder={mode === 'register' ? t('auth.minPassword') : '••••••'}
                 value={form.password} onChange={e => set('password', e.target.value)}
                 required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>

        {error && <p className="auth-modal__error">{error}</p>}

        <button className="primary-button" type="submit" disabled={busy}
                style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}>
          {busy ? t('common.loading') : mode === 'login' ? t('auth.login') : t('auth.createAccount')}
        </button>

        <p className="auth-modal__hint">
          {mode === 'login'
            ? <>{t('auth.noAccount')} <button type="button" onClick={() => switchMode('register')}>{t('auth.registerAction')}</button></>
            : <>{t('auth.haveAccount')} <button type="button" onClick={() => switchMode('login')}>{t('auth.loginAction')}</button></>}
        </p>
      </form>
    </div>
  );
}
