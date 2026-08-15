'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', token: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.token || !form.password || !form.confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));

    // Validate token
    const resets = JSON.parse(localStorage.getItem('tesla_trade_resets') || '{}');
    const entry = resets[form.email.toLowerCase()];

    if (!entry || entry.token !== form.token.trim()) {
      setLoading(false);
      setError('Invalid or expired reset code. Please request a new one.');
      return;
    }
    if (Date.now() > entry.expires) {
      setLoading(false);
      setError('Reset code has expired. Please request a new one.');
      return;
    }

    // Update password in stored users
    const storedUsers = JSON.parse(localStorage.getItem('tesla_trade_users') || '[]');
    const updated = storedUsers.map((u: { email: string; password?: string }) =>
      u.email === form.email.toLowerCase() ? { ...u, password: form.password } : u
    );
    localStorage.setItem('tesla_trade_users', JSON.stringify(updated));

    // Remove used token
    delete resets[form.email.toLowerCase()];
    localStorage.setItem('tesla_trade_resets', JSON.stringify(resets));

    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.push('/login'), 2500);
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <svg width="32" height="32" viewBox="0 0 342 512" fill="currentColor" className="text-primary" aria-hidden="true">
              <path d="M0 57.3C0 57.3 57.3 0 171 0s171 57.3 171 57.3L285 85.5s-28.5-28.5-114-28.5S57 85.5 57 85.5L0 57.3zM171 512L57 85.5s28.5 28.5 114 28.5 114-28.5 114-28.5L171 512z" />
            </svg>
            <span className="text-white font-bold text-lg tracking-widest uppercase">Tesla Trade</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">
            {success ? 'Password Updated' : 'Set New Password'}
          </h1>
          <p className="text-sm text-[#666666]">
            {success ? 'Redirecting you to sign in…' : 'Enter your reset code and new password.'}
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-sm text-[#888888] text-center">
              Your password has been reset successfully. You&apos;ll be redirected to sign in shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded bg-primary/10 border border-primary/30 text-sm text-primary">{error}</div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded text-sm input-tesla"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="token" className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
                Reset Code
              </label>
              <input
                id="token"
                name="token"
                type="text"
                value={form.token}
                onChange={handleChange}
                placeholder="Paste your reset code"
                className="w-full px-4 py-3 rounded text-sm input-tesla font-mono"
              />
              <p className="text-xs text-[#555555] mt-1.5">
                Find the code in your reset email or{' '}
                <Link href="/forgot-password" className="text-primary hover:underline">
                  request a new one
                </Link>
                .
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 rounded text-sm input-tesla"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
                Confirm New Password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                value={form.confirm}
                onChange={handleChange}
                placeholder="Repeat new password"
                className="w-full px-4 py-3 rounded text-sm input-tesla"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 tesla-btn-primary rounded min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Updating...
                </>
              ) : (
                'Reset Password →'
              )}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-6 text-center">
            <p className="text-sm text-[#555555]">
              Remember your password?{' '}
              <Link href="/login" className="text-primary hover:text-red-400 font-semibold transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-[#1A1A1A] text-center">
          <Link href="/" className="text-xs text-[#444444] hover:text-[#888888] transition-colors tracking-wider uppercase">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
