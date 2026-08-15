'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from '@/lib/emailService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);

    await new Promise((r) => setTimeout(r, 800));

    // Generate reset token and store locally
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const resets = JSON.parse(localStorage.getItem('tesla_trade_resets') || '{}');
    resets[email.toLowerCase()] = { token, expires: Date.now() + 1000 * 60 * 30 };
    localStorage.setItem('tesla_trade_resets', JSON.stringify(resets));

    // Send password reset email via Resend
    sendPasswordResetEmail(email, '', token).catch(console.error);

    setLoading(false);
    setSent(true);
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
            {sent ? 'Check Your Email' : 'Reset Password'}
          </h1>
          <p className="text-sm text-[#666666]">
            {sent
              ? 'Recovery instructions have been sent.' :'Enter your email to receive reset instructions.'}
          </p>
        </div>

        {sent ? (
          <div className="space-y-5">
            {/* Success state */}
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-[#888888] leading-relaxed">
                  We&apos;ve sent password reset instructions to{' '}
                  <span className="text-white font-semibold">{email}</span>.
                </p>
                <p className="text-xs text-[#555555] mt-2">
                  Didn&apos;t receive it? Check your spam folder or try again.
                </p>
              </div>
            </div>

            <Link
              href="/reset-password"
              className="w-full py-3.5 tesla-btn-primary rounded min-h-[48px] flex items-center justify-center text-sm font-bold tracking-widest uppercase"
            >
              Enter Reset Code →
            </Link>

            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="w-full py-3 text-xs text-[#555555] hover:text-white transition-colors tracking-wider uppercase"
            >
              Try a different email
            </button>
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
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded text-sm input-tesla"
                autoComplete="email"
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
                  Sending...
                </>
              ) : (
                'Send Reset Instructions →'
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-[#555555]">
            Remember your password?{' '}
            <Link href="/login" className="text-primary hover:text-red-400 font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1A1A1A] text-center">
          <Link href="/" className="text-xs text-[#444444] hover:text-[#888888] transition-colors tracking-wider uppercase">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
