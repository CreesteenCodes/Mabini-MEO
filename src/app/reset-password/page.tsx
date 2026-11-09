'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import municipalityImage from '../../imports/Municipality of Mabini.jpg';

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message || 'Unable to reset password.');
        return;
      }

      setMessage(payload.message);
    } catch {
      setError('Unable to reach the password reset service.');
    } finally {
      setSaving(false);
    }

  };

  return (
    <main className="mabini-login relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8">
      <div aria-hidden="true" className="mabini-login__photo absolute inset-0" style={{ backgroundImage: `url("${municipalityImage.src}")` }} />
      <div aria-hidden="true" className="mabini-login__overlay absolute inset-0" />
      <div aria-hidden="true" className="mabini-login__glow absolute inset-0" />
      <section className="mabini-login__card relative z-[1] w-full max-w-md overflow-hidden rounded-[28px] border border-white/20 p-8 text-white shadow-[0_24px_64px_rgba(128,128,128,0.15)] sm:p-10">
        <div aria-hidden="true" className="mabini-login__card-shine absolute inset-x-0 top-0 h-32" />
        <div className="relative">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-blue-100/75">Choose a new password for your account.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <p role="alert" className="rounded-lg bg-red-950/30 p-3 text-sm text-red-100">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-emerald-950/30 p-3 text-sm text-emerald-100">{message}</p>}
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="h-12 w-full rounded-lg border border-white/80 bg-white px-3 pr-12 text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-300/25" />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-blue-600">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <button type="submit" disabled={saving || !token} className="h-12 w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 font-semibold text-white shadow-lg disabled:opacity-50">
            {saving ? 'Saving...' : 'Reset password'}
          </button>
        </form>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-4">Loading...</main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
