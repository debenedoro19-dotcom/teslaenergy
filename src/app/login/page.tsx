'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { setCurrentUser } from '@/lib/portfolioStore';
import { createClient } from '@/lib/supabase/client';
import { sanitizeEmail } from '@/lib/sanitize';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail || !password) {
      setError('Please fill in all fields with valid values.');
      return;
    }
    setLoading(true);

    // Admin login (bypass Supabase auth)
    if (cleanEmail === 'admin@teslatrade.com' && password === 'admin123') {
      setCurrentUser({ id: 'admin_tesla_trade', name: 'Admin', email: 'admin@teslatrade.com' });
      setTimeout(() => {
        window.location.href = '/admin';
      }, 800);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

      if (signInError) {
        setLoading(false);
        setError(signInError.message);
        return;
      }

      const user = data?.user;

      // Gate: email must be verified before accessing dashboard
      if (user && !user.email_confirmed_at) {
        setLoading(false);
        window.location.href = '/verify-pending';
        return;
      }

      if (user) {
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Investor';
        setCurrentUser({
          id: user.id,
          name: fullName,
          email: user.email || '',
        });
      }

      window.location.href = '/dashboard';
    } catch (err: any) {
      setLoading(false);
      // Fallback: localStorage-based login for legacy accounts
      const userId = 'user_' + email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const storedUsers = typeof window !== 'undefined' ? localStorage.getItem('tesla_trade_users') : null;
      const users = storedUsers ? JSON.parse(storedUsers) : [];
      const found = users.find((u: { id: string }) => u.id === userId);

      if (!found) {
        setError('No account found with this email. Please register first.');
        return;
      }

      setCurrentUser({ id: found.id, name: found.name, email: found.email });
      setTimeout(() => {
        setLoading(false);
        window.location.href = '/dashboard';
      }, 1000);
    }
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">Sign In</h1>
          <p className="text-sm text-[#666666]">Access your investment dashboard</p>
        </div>

        {/* Form */}
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
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full px-4 py-3 rounded text-sm input-tesla"
            />
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-[#555555] hover:text-primary transition-colors">
              Forgot password?
            </Link>
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
                Signing In...
              </>
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#555555]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:text-red-400 font-semibold transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
