'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function VerifyPendingPage() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const handleResend = async () => {
    if (!userEmail) return;
    setResending(true);
    setError('');
    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=/kyc`,
        },
      });
      if (resendError) {
        setError(resendError.message);
      } else {
        setResent(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 mb-10 justify-center">
          <svg width="28" height="28" viewBox="0 0 342 512" fill="currentColor" className="text-primary" aria-hidden="true">
            <path d="M0 57.3C0 57.3 57.3 0 171 0s171 57.3 171 57.3L285 85.5s-28.5-28.5-114-28.5S57 85.5 57 85.5L0 57.3zM171 512L57 85.5s28.5 28.5 114 28.5 114-28.5 114-28.5L171 512z" />
          </svg>
          <span className="text-white font-bold text-base tracking-widest uppercase">Tesla Trade</span>
        </Link>

        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-[#111111] border border-[#2A2A2A] flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-white tracking-tight mb-3">Email Verification Required</h1>
        <p className="text-sm text-[#888888] leading-relaxed mb-2">
          Your dashboard is locked until you verify your email.
        </p>
        {userEmail && (
          <p className="text-sm font-semibold text-white mb-6">{userEmail}</p>
        )}
        <p className="text-sm text-[#666666] leading-relaxed mb-8">
          We sent a verification link to your email address. Click the link to unlock your account and continue to your dashboard.
        </p>

        {/* Status messages */}
        {resent && (
          <div className="px-4 py-3 rounded bg-green-900/20 border border-green-700/30 text-sm text-green-400 mb-4">
            ✓ Verification email resent successfully. Check your inbox.
          </div>
        )}
        {error && (
          <div className="px-4 py-3 rounded bg-primary/10 border border-primary/30 text-sm text-primary mb-4">
            {error}
          </div>
        )}

        {/* Tips */}
        <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-4 mb-8 text-left">
          <p className="text-xs text-[#555555] uppercase tracking-widest font-semibold mb-2">Didn't receive it?</p>
          <ul className="text-xs text-[#666666] space-y-1 list-disc list-inside">
            <li>Check your spam or junk folder</li>
            <li>Make sure you used the correct email</li>
            <li>Wait a few minutes and check again</li>
          </ul>
        </div>

        {/* Actions */}
        <button
          onClick={handleResend}
          disabled={resending || resent}
          className="w-full py-3.5 tesla-btn-primary rounded min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mb-3"
        >
          {resending ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Resending...
            </>
          ) : resent ? (
            '✓ Email Sent'
          ) : (
            'Resend Verification Email'
          )}
        </button>

        <Link
          href="/login"
          className="block w-full py-3 rounded border border-[#2A2A2A] text-sm text-[#888888] hover:text-white hover:border-[#444444] transition-colors text-center"
        >
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
