'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { sanitizeText, sanitizeEmail, sanitizePhone, validatePassword } from '@/lib/sanitize';
import { sendWelcomeEmail } from '@/lib/emailService';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanName = sanitizeText(form.name);
    const cleanEmail = sanitizeEmail(form.email);
    const cleanPhone = sanitizePhone(form.phone);
    if (!cleanName || !cleanEmail || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    const pwCheck = validatePassword(form.password);
    if (!pwCheck.valid) {
      setError(pwCheck.message);
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setLoading(true);

    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      // Sign up via Supabase Auth — triggers built-in confirmation email
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: form.password,
        options: {
          data: { full_name: cleanName, phone: cleanPhone },
          emailRedirectTo: `${siteUrl}/auth/callback?next=/kyc`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Send branded verification email via edge function (non-blocking)
      // The Supabase signUp above already sends a confirmation email;
      // this sends our custom branded version in addition.
      if (data?.user) {
        const confirmationUrl = `${siteUrl}/auth/callback?next=/kyc`;
        supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'email_verification',
            to: form.email,
            name: form.name,
            message: confirmationUrl,
          },
        }).catch(() => {/* silent fail */});

        // Send welcome email via Resend using admin-configured template
        sendWelcomeEmail(form.email, form.name).catch(() => {/* silent fail */});
      }

      setRegisteredEmail(form.email);
      setEmailSent(true);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Email sent confirmation screen ──────────────────────────────────────────
  if (emailSent) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 w-full max-w-sm text-center">
          <Link href="/" className="inline-flex items-center gap-3 mb-8 justify-center">
            <svg width="28" height="28" viewBox="0 0 342 512" fill="currentColor" className="text-primary" aria-hidden="true">
              <path d="M0 57.3C0 57.3 57.3 0 171 0s171 57.3 171 57.3L285 85.5s-28.5-28.5-114-28.5S57 85.5 57 85.5L0 57.3zM171 512L57 85.5s28.5 28.5 114 28.5 114-28.5 114-28.5L171 512z" />
            </svg>
            <span className="text-white font-bold text-base tracking-widest uppercase">Tesla Trade</span>
          </Link>

          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-3">Check Your Email</h1>
          <p className="text-sm text-[#888888] leading-relaxed mb-2">
            We sent a verification link to
          </p>
          <p className="text-sm font-semibold text-white mb-6">{registeredEmail}</p>
          <p className="text-sm text-[#666666] leading-relaxed mb-8">
            Click the link in the email to verify your account and access your dashboard. The link expires in 24 hours.
          </p>

          <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-4 mb-8 text-left">
            <p className="text-xs text-[#555555] uppercase tracking-widest font-semibold mb-2">Didn't receive it?</p>
            <ul className="text-xs text-[#666666] space-y-1 list-disc list-inside">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email</li>
              <li>Wait a few minutes and refresh</li>
            </ul>
          </div>

          <Link
            href="/login"
            className="block w-full py-3.5 tesla-btn-primary rounded text-sm font-bold tracking-widest uppercase text-center"
          >
            Go to Sign In
          </Link>
          <p className="text-xs text-[#444444] mt-4">
            Wrong email?{' '}
            <button
              onClick={() => { setEmailSent(false); setForm({ name: '', email: '', phone: '', password: '', confirm: '' }); }}
              className="text-primary hover:underline"
            >
              Register again
            </button>
          </p>
        </div>
      </main>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <svg width="28" height="28" viewBox="0 0 342 512" fill="currentColor" className="text-primary" aria-hidden="true">
              <path d="M0 57.3C0 57.3 57.3 0 171 0s171 57.3 171 57.3L285 85.5s-28.5-28.5-114-28.5S57 85.5 57 85.5L0 57.3zM171 512L57 85.5s28.5 28.5 114 28.5 114-28.5 114-28.5L171 512z" />
            </svg>
            <span className="text-white font-bold text-base tracking-widest uppercase">Tesla Trade</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">Create Account</h1>
          <p className="text-sm text-[#666666]">Join the Tesla investment ecosystem</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-full step-active flex items-center justify-center text-xs font-bold">1</div>
            <span className="text-xs text-white font-semibold tracking-wider uppercase">Account</span>
          </div>
          <div className="flex-1 h-px bg-[#2A2A2A]" />
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-full step-pending flex items-center justify-center text-xs font-bold">2</div>
            <span className="text-xs text-[#555555] tracking-wider uppercase">Verify</span>
          </div>
          <div className="flex-1 h-px bg-[#2A2A2A]" />
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-full step-pending flex items-center justify-center text-xs font-bold">3</div>
            <span className="text-xs text-[#555555] tracking-wider uppercase">KYC</span>
          </div>
          <div className="flex-1 h-px bg-[#2A2A2A]" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full step-pending flex items-center justify-center text-xs font-bold">4</div>
            <span className="text-xs text-[#555555] tracking-wider uppercase">Invest</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-3 rounded bg-primary/10 border border-primary/30 text-sm text-primary">{error}</div>
          )}

          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
              Full Name <span className="text-primary">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="John Smith"
              className="w-full px-4 py-3 rounded text-sm input-tesla"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
              Email Address <span className="text-primary">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded text-sm input-tesla"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-3 rounded text-sm input-tesla"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
              Password <span className="text-primary">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              className="w-full px-4 py-3 rounded text-sm input-tesla"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
              Confirm Password <span className="text-primary">*</span>
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              value={form.confirm}
              onChange={handleChange}
              placeholder="Repeat password"
              className="w-full px-4 py-3 rounded text-sm input-tesla"
            />
          </div>

          <p className="text-xs text-[#555555] leading-relaxed">
            By creating an account you agree to our{' '}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>{' '}
            and{' '}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
          </p>

          {/* Legal acknowledgment checkboxes */}
          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="sr-only"
                />
                <div
                  onClick={() => setAcceptedTerms(!acceptedTerms)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 ${
                    acceptedTerms
                      ? 'bg-primary border-primary' :'bg-[#111111] border-[#2A2A2A] group-hover:border-primary/50'
                  }`}
                >
                  {acceptedTerms && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-[#666666] leading-relaxed">
                I have read and agree to the{' '}
                <Link href="/terms" target="_blank" className="text-primary hover:underline font-semibold">
                  Terms of Service
                </Link>
                , including the investment risk disclosures and eligibility requirements.{' '}
                <span className="text-primary">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  id="acceptPrivacy"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  className="sr-only"
                />
                <div
                  onClick={() => setAcceptedPrivacy(!acceptedPrivacy)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 ${
                    acceptedPrivacy
                      ? 'bg-primary border-primary' :'bg-[#111111] border-[#2A2A2A] group-hover:border-primary/50'
                  }`}
                >
                  {acceptedPrivacy && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-[#666666] leading-relaxed">
                I have read and agree to the{' '}
                <Link href="/privacy" target="_blank" className="text-primary hover:underline font-semibold">
                  Privacy Policy
                </Link>
                , including how my personal and financial data is collected and processed.{' '}
                <span className="text-primary">*</span>
              </span>
            </label>
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
                Creating Account...
              </>
            ) : (
              'Create Account →'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#555555]">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-red-400 font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
