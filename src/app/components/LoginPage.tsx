'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  ShieldCheck,
  Timer,
  User,
  X,
} from 'lucide-react';
import municipalityImage from '../../imports/Municipality of Mabini.jpg';
import logoImage from '../../imports/logo.png';

interface LoginPageProps {
  onLogin: (role: string, username: string, email: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [showUnlock, setShowUnlock] = useState(false);
  const [masterCode, setMasterCode] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockMsg, setUnlockMsg] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const lockoutExpiresAt = useRef<number | null>(null);
  const lockoutUsername = useRef<string | null>(null);

  useEffect(() => {
    if (lockSeconds <= 0) return;

    const updateCountdown = () => {
      const expiresAt = lockoutExpiresAt.current;
      if (expiresAt === null) return;

      const remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setLockSeconds(remainingSeconds);
      if (remainingSeconds === 0) {
        lockoutExpiresAt.current = null;
        lockoutUsername.current = null;
        setError('');
      }
    };
    const interval = window.setInterval(updateCountdown, 1000);
    document.addEventListener('visibilitychange', updateCountdown);
    window.addEventListener('focus', updateCountdown);
    window.addEventListener('pageshow', updateCountdown);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', updateCountdown);
      window.removeEventListener('focus', updateCountdown);
      window.removeEventListener('pageshow', updateCountdown);
    };
  }, [lockSeconds > 0]);

  useEffect(() => {
    const key = username.trim().toLowerCase();
    if (!key) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/auth/lock-status', { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Lock status request failed with status ${response.status}.`);
        }
        const payload = await response.json();
        const retryAfterSeconds = payload?.locked?.[key];

        if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
          lockoutUsername.current = key;
          lockoutExpiresAt.current = Date.now() + retryAfterSeconds * 1000;
          setLockSeconds(retryAfterSeconds);
          setError(
            `Account locked due to too many failed attempts. Try again in ${formatLockTime(retryAfterSeconds)}.`
          );
        }
      } catch (lookupError) {
        if (lookupError instanceof Error && lookupError.name === 'AbortError') return;
        console.error('Unable to check account lock status.', lookupError);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [username]);

  useEffect(() => {
    if (!showUnlock) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowUnlock(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showUnlock]);

  const formatLockTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setUnlockMsg('');

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }

    const submittedUsername = username.trim();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: submittedUsername, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        if (payload?.locked && typeof payload?.retryAfterSeconds === 'number') {
          if (username.trim().toLowerCase() === submittedUsername.toLowerCase()) {
            lockoutUsername.current = submittedUsername.toLowerCase();
            lockoutExpiresAt.current = Date.now() + payload.retryAfterSeconds * 1000;
            setLockSeconds(payload.retryAfterSeconds);
            setError(payload?.message || 'Account locked.');
          }
          return;
        }
        setError(payload?.message || 'Unable to sign in. Please try again.');
        return;
      }

      onLogin(payload.role, payload.name, payload.email);
    } catch {
      setError('Authentication service is unavailable. Please try again.');
    }
  };

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setUnlockError('');
    setUnlockMsg('');

    if (!username.trim()) {
      setUnlockError('Enter the username you want to unlock.');
      return;
    }
    if (!masterCode.trim()) {
      setUnlockError('Enter the master unlock code.');
      return;
    }

    try {
      const response = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), masterCode: masterCode.trim() }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setUnlockError(payload?.message || 'Failed to unlock account.');
        return;
      }

      setUnlockMsg(payload?.message || 'Account unlocked. You can now log in.');
      setMasterCode('');
      lockoutUsername.current = null;
      lockoutExpiresAt.current = null;
      setLockSeconds(0);
      setError('');
      setShowUnlock(false);
    } catch {
      setUnlockError('Unable to reach the unlock service. Please try again.');
    }
  };

  const requestResetCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetError('');
    setResetMsg('');
    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setResetError(payload?.message || 'Unable to send verification code.');
        return;
      }
      setResetCodeSent(true);
      setResetMsg(payload.message);
    } catch {
      setResetError('Unable to reach the password reset service. Please try again.');
    }
  };

  const resetPasswordWithCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetError('');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, password: resetPassword }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setResetError(payload?.message || 'Unable to reset password.');
        return;
      }
      setResetMsg(payload.message);
      setResetCodeSent(false);
      setResetCode('');
      setResetPassword('');
    } catch {
      setResetError('Unable to reach the password reset service. Please try again.');
    }
  };

  return (
    <main className="mabini-login relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8">
      <div
        aria-hidden="true"
        className="mabini-login__photo absolute inset-0"
        style={{ backgroundImage: `url("${municipalityImage.src}")` }}
      />
      <div aria-hidden="true" className="mabini-login__overlay absolute inset-0" />
      <div aria-hidden="true" className="mabini-login__glow absolute inset-0" />

      <div className="relative z-[1] flex w-full max-w-[1460px] flex-col justify-between gap-10 px-4 pb-8 pt-6 sm:px-8 lg:flex-row lg:items-center lg:px-10 xl:px-12">
        <aside className="w-full max-w-[620px] text-white lg:ml-[3.5%]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-[0.02em] text-white/90 shadow-[0_8px_25px_rgba(9,18,41,0.18)] backdrop-blur-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" aria-hidden="true" />
            Official Local Government Portal • Mabini, Batangas
          </div>

          <h1 className="max-w-[620px] bg-gradient-to-r from-[#7cc6ff] via-[#dfeeff] to-[#ffffff] bg-clip-text text-[clamp(2.2rem,3vw,3.8rem)] font-black uppercase leading-[0.9] tracking-[-0.07em] text-transparent">
            MUNICIPALITY OF MABINI
          </h1>

          <p className="mt-2 text-[20px] font-light leading-[1.1] tracking-[-0.04em] text-white/95">
            Office of the Municipal Engineer
          </p>

          <div className="mt-4 grid max-w-[520px] gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] border border-white/20 bg-white/5 px-4 py-3 shadow-[0_10px_25px_rgba(8,18,42,0.14)] backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-100/80">Jurisdiction</p>
              <p className="mt-2 text-[1.05rem] font-semibold leading-snug text-white">34 Barangays of Mabini</p>
              <p className="text-[0.76rem] text-blue-100/70">Batangas Province</p>
            </div>
            <div className="rounded-[14px] border border-white/20 bg-white/5 px-4 py-3 shadow-[0_10px_25px_rgba(8,18,42,0.14)] backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-100/80">Focus Area</p>
              <p className="mt-2 text-[1.05rem] font-semibold leading-snug text-white">Local Road Infrastructure</p>
              <p className="text-[0.76rem] text-blue-100/70">Pavements and Road Conditions</p>
            </div>
          </div>

          <div className="mt-5 inline-flex items-center gap-2.5 text-[0.82rem] font-medium text-white/80">
            <MapPin className="h-4 w-4 shrink-0 text-blue-100/90" aria-hidden="true" />
            Mabini Municipal Hall, Poblacion, Mabini, Batangas
          </div>
        </aside>

        <section className="relative z-[1] ml-auto mr-0 w-full max-w-[460px] sm:mr-[4.5%] lg:mr-[2.5%] lg:ml-0">
          <div className="mabini-login__card relative overflow-hidden rounded-[28px] border border-white/20 px-6 py-7 shadow-[0_24px_64px_rgba(128,128,128,0.15)] sm:px-10 sm:py-9">
            <div aria-hidden="true" className="mabini-login__card-shine absolute inset-x-0 top-0 h-32" />
            <div className="relative">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-[68px] w-[68px] items-center justify-center rounded-[20px] border border-white/30 bg-white/10 p-[3px] shadow-[0_0_0_4px_rgba(255,255,255,0.07),0_0_30px_rgba(126,178,255,0.22)] backdrop-blur-sm">
                  <img src={logoImage.src} alt="" className="h-full w-full rounded-full border-2 border-amber-300 object-cover" />
                </div>
                <h2 className="text-[20px] font-extrabold leading-none tracking-tight text-white">Login</h2>
                <p className="mt-2 text-sm font-semibold text-blue-100 sm:text-[15px]">Office of the Municipal Engineer</p>
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-100/75">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Bayan ng Mabini · Lalawigan ng Batangas
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200/30 bg-red-950/30 p-3 text-sm text-red-100">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-200" />
                    <div>
                      <p>{error}</p>
                      {lockSeconds > 0 && (
                        <div className="mt-1.5 flex items-center gap-2 font-medium text-red-100">
                          <Timer className="h-4 w-4" />
                          <span>{formatLockTime(lockSeconds)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="login-username" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-blue-50/90">
                    Username
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-blue-500" aria-hidden="true" />
                    <input
                      id="login-username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(event) => {
                        const nextUsername = event.target.value;
                        setUsername(nextUsername);
                        setUnlockMsg('');
                        if (lockoutUsername.current !== nextUsername.trim().toLowerCase()) {
                          lockoutUsername.current = null;
                          lockoutExpiresAt.current = null;
                          setLockSeconds(0);
                          setError('');
                        }
                      }}
                      className="h-[50px] w-full rounded-[13px] border border-white/80 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 shadow-[0_2px_8px_rgba(9,26,67,0.08)] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-300/25"
                      placeholder="Enter your username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-blue-50/90">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-blue-500" aria-hidden="true" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-[50px] w-full rounded-[13px] border border-white/80 bg-white pl-11 pr-12 text-sm font-medium text-slate-800 shadow-[0_2px_8px_rgba(9,26,67,0.08)] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-300/25"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {showPassword ? <EyeOff className="h-[17px] w-[17px]" /> : <Eye className="h-[17px] w-[17px]" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-center pt-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockError('');
                      setUnlockMsg('');
                      setShowUnlock(true);
                      setShowReset(false);
                    }}
                    className="inline-flex items-center gap-2 font-semibold text-blue-100/80 transition hover:text-white focus:outline-none focus:underline"
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Account locked? Unlock with master code
                  </button>
                </div>
                <div className="flex justify-center text-xs">
                  <button type="button" onClick={() => { setUnlockError(''); setUnlockMsg(''); setShowUnlock(false); setResetError(''); setResetMsg(''); setResetCodeSent(false); setShowReset(true); }} className="font-semibold text-blue-100/80 transition hover:text-white focus:outline-none focus:underline">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={lockSeconds > 0}
                  className={`group mt-1 flex h-[52px] w-full items-center justify-center gap-2 rounded-[13px] text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_10px_25px_rgba(22,85,215,0.32)] transition focus:outline-none focus:ring-4 focus:ring-blue-200/40 ${
                    lockSeconds > 0
                      ? 'cursor-not-allowed bg-slate-500/80 opacity-70'
                      : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 opacity-95 hover:opacity-100'
                  }`}
                >
                  {lockSeconds > 0 ? `Locked (${formatLockTime(lockSeconds)})` : 'Login'}
                  {lockSeconds <= 0 && <ArrowRight className="h-[17px] w-[17px] transition-transform group-hover:translate-x-1" />}
                </button>
              </form>

              <div className="mt-5">
                {unlockMsg && (
                  <p role="status" className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-200">
                    <Check className="h-3.5 w-3.5" />
                    {unlockMsg}
                  </p>
                )}
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-[10px] font-medium tracking-wide text-white/55">
            AUTHORIZED MUNICIPAL PERSONNEL ONLY
          </p>
        </section>
      </div>

      {showReset && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#06132d]/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowReset(false);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="reset-title" className="w-full max-w-[410px] rounded-[24px] border border-white/15 bg-gradient-to-br from-[#214ba8] via-[#173b8b] to-[#0b1e4e] p-6 text-white shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:p-8">
            <div className="mb-5 flex items-start justify-between">
              <div><h2 id="reset-title" className="text-lg font-bold">Reset password</h2><p className="mt-1 text-xs text-blue-100/70">Use your registered email.</p></div>
              <button type="button" onClick={() => setShowReset(false)} aria-label="Close password reset"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={requestResetCode} className="space-y-4">
              {resetError && <p role="alert" className="rounded-xl bg-red-950/30 p-3 text-sm text-red-100">{resetError}</p>}
              {resetMsg && <p role="status" className="rounded-xl bg-emerald-950/30 p-3 text-sm text-emerald-100">{resetMsg}</p>}
              <input type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="Registered email" required className="h-11 w-full rounded-xl border border-white/80 bg-white px-3 text-sm text-slate-800 outline-none" />
              <div className="flex gap-3"><button type="button" onClick={() => setShowReset(false)} className="h-11 flex-1 rounded-xl border border-white/20 bg-white/5 text-sm font-semibold">Cancel</button><button type="submit" className="h-11 flex-1 rounded-xl bg-blue-500 text-sm font-semibold">Send Reset Link</button></div>
            </form>
          </section>
        </div>
      )}

      {showUnlock && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-[#06132d]/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowUnlock(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlock-title"
            className="w-full max-w-[410px] rounded-[24px] border border-white/15 bg-gradient-to-br from-[#214ba8] via-[#173b8b] to-[#0b1e4e] p-6 text-white shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:p-8"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                  <ShieldCheck className="h-5 w-5 text-blue-100" />
                </span>
                <div>
                  <h2 id="unlock-title" className="text-lg font-bold">Security unlock</h2>
                  <p className="mt-0.5 text-xs text-blue-100/70">Unlock an account with the master code.</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close unlock dialog"
                onClick={() => setShowUnlock(false)}
                className="rounded-lg p-1.5 text-blue-100/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4">
              {unlockError && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200/25 bg-red-950/25 p-3 text-sm text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{unlockError}</p>
                </div>
              )}
              <div>
                <label htmlFor="unlock-username" className="mb-1.5 block text-xs font-semibold text-blue-50/90">Username</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
                  <input
                    id="unlock-username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    className="h-11 w-full rounded-xl border border-white/80 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-300/25"
                    placeholder="Account username"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="master-code" className="mb-1.5 block text-xs font-semibold text-blue-50/90">Master unlock code</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
                  <input
                    id="master-code"
                    type="password"
                    value={masterCode}
                    onChange={(event) => setMasterCode(event.target.value)}
                    autoComplete="off"
                    className="h-11 w-full rounded-xl border border-white/80 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-300/25"
                    placeholder="Enter master code"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUnlock(false)}
                  className="h-11 flex-1 rounded-xl border border-white/20 bg-white/5 text-sm font-semibold text-blue-50 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  Unlock account
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
