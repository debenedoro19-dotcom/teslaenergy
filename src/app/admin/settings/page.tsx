'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser, isAdmin } from '@/lib/portfolioStore';
import { createClient } from '@/lib/supabase/client';

type SettingsTab = 'platform' | 'security' | 'customercare' | 'email';

interface PlatformSettings {
  withdrawalMinAmount: string;
  withdrawalMaxAmount: string;
  withdrawalDailyLimit: string;
  commissionRate: string;
  referralCommission: string;
  kycRequired: boolean;
  kycRequiredForWithdrawal: boolean;
  kycRequiredForInvestment: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  minInvestmentAmount: string;
  maxInvestmentAmount: string;
}

interface SecuritySettings {
  twoFactorRequired: boolean;
  sessionTimeoutMinutes: string;
  maxLoginAttempts: string;
  ipWhitelistEnabled: boolean;
  ipWhitelist: string;
  adminPasswordLastChanged: string;
  requireStrongPassword: boolean;
  auditLogEnabled: boolean;
}

interface CustomerCareSettings {
  whatsappEnabled: boolean;
  whatsappNumber: string;
  whatsappMessage: string;
  telegramEnabled: boolean;
  telegramUsername: string;
  telegramMessage: string;
  supportEmail: string;
  supportHours: string;
}

interface EmailTemplateSettings {
  welcomeSubject: string;
  welcomeBody: string;
  kycApprovedSubject: string;
  kycApprovedBody: string;
  withdrawalSubject: string;
  withdrawalBody: string;
  senderName: string;
  senderEmail: string;
}

const DEFAULT_PLATFORM: PlatformSettings = {
  withdrawalMinAmount: '100',
  withdrawalMaxAmount: '50000',
  withdrawalDailyLimit: '100000',
  commissionRate: '2.5',
  referralCommission: '5',
  kycRequired: true,
  kycRequiredForWithdrawal: true,
  kycRequiredForInvestment: false,
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing scheduled maintenance. We will be back shortly.',
  minInvestmentAmount: '500',
  maxInvestmentAmount: '500000',
};

const DEFAULT_SECURITY: SecuritySettings = {
  twoFactorRequired: false,
  sessionTimeoutMinutes: '60',
  maxLoginAttempts: '5',
  ipWhitelistEnabled: false,
  ipWhitelist: '',
  adminPasswordLastChanged: '2026-08-14',
  requireStrongPassword: true,
  auditLogEnabled: true,
};

const DEFAULT_CUSTOMER_CARE: CustomerCareSettings = {
  whatsappEnabled: false,
  whatsappNumber: '',
  whatsappMessage: 'Hello! I need help with my Tesla Trade account.',
  telegramEnabled: false,
  telegramUsername: '',
  telegramMessage: 'Hello! I need support with Tesla Trade.',
  supportEmail: 'support@teslatrade.com',
  supportHours: 'Mon–Fri, 9am–6pm UTC',
};

const DEFAULT_EMAIL: EmailTemplateSettings = {
  welcomeSubject: 'Welcome to Tesla Trade Energy — Your Account is Ready',
  welcomeBody: 'Dear {{name}},\n\nWelcome to Tesla Trade Energy! Your account has been successfully created.\n\nYou can now log in and start exploring our investment packages.\n\nBest regards,\nThe Tesla Trade Team',
  kycApprovedSubject: 'KYC Verification Approved — Tesla Trade',
  kycApprovedBody: 'Dear {{name}},\n\nYour KYC verification has been approved. You now have full access to all platform features including withdrawals.\n\nBest regards,\nThe Tesla Trade Team',
  withdrawalSubject: 'Withdrawal Request Processed — Tesla Trade',
  withdrawalBody: 'Dear {{name}},\n\nYour withdrawal request of {{amount}} has been processed and is on its way.\n\nExpected arrival: 3–5 business days.\n\nBest regards,\nThe Tesla Trade Team',
  senderName: 'Tesla Trade Energy',
  senderEmail: 'noreply@teslatrade.com',
};

const STORAGE_KEYS = {
  platform: 'admin_settings_platform',
  security: 'admin_settings_security',
  customerCare: 'admin_settings_customercare',
  email: 'admin_settings_email',
};

export default function AdminSettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('platform');
  const [saved, setSaved] = useState<SettingsTab | null>(null);
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<'success' | 'error' | null>(null);

  const [platform, setPlatform] = useState<PlatformSettings>(DEFAULT_PLATFORM);
  const [security, setSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const [customerCare, setCustomerCare] = useState<CustomerCareSettings>(DEFAULT_CUSTOMER_CARE);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateSettings>(DEFAULT_EMAIL);

  // Password change state
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (currentUser && isAdmin(currentUser.id)) {
      setAuthorized(true);
      // Load saved settings from localStorage
      try {
        const savedPlatform = localStorage.getItem(STORAGE_KEYS.platform);
        if (savedPlatform) setPlatform(JSON.parse(savedPlatform));
        const savedSecurity = localStorage.getItem(STORAGE_KEYS.security);
        if (savedSecurity) setSecurity(JSON.parse(savedSecurity));
        const savedCC = localStorage.getItem(STORAGE_KEYS.customerCare);
        if (savedCC) setCustomerCare(JSON.parse(savedCC));
        const savedEmail = localStorage.getItem(STORAGE_KEYS.email);
        if (savedEmail) setEmailTemplates(JSON.parse(savedEmail));
      } catch {}
    }
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      setPwError('Please fill in all password fields.');
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (pwForm.newPw === pwForm.current) {
      setPwError('New password must be different from your current password.');
      return;
    }

    setPwLoading(true);
    try {
      const supabase = createClient();
      // Re-authenticate with current password to verify it
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setPwError('Could not verify your session. Please log in again.');
        setPwLoading(false);
        return;
      }
      // Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pwForm.current,
      });
      if (signInError) {
        setPwError('Current password is incorrect.');
        setPwLoading(false);
        return;
      }
      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({ password: pwForm.newPw });
      if (updateError) {
        setPwError(updateError.message || 'Failed to update password. Please try again.');
        setPwLoading(false);
        return;
      }
      // Update last changed date in security settings
      setSecurity(s => ({ ...s, adminPasswordLastChanged: new Date().toISOString().split('T')[0] }));
      setPwForm({ current: '', newPw: '', confirm: '' });
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 4000);
    } catch {
      setPwError('An unexpected error occurred. Please try again.');
    }
    setPwLoading(false);
  }

  async function sendTestEmail() {
    if (!testEmailAddr) return;
    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'notification',
          to: testEmailAddr,
          name: 'Admin',
          subject: '✅ Test Email — Tesla Trade Email Service',
          message: 'This is a test email from your Tesla Trade admin panel. Your Resend integration is working correctly.\n\nEmail templates configured in admin settings will be applied to all transactional emails.',
          senderName: emailTemplates.senderName,
          senderEmail: emailTemplates.senderEmail,
        }),
      });
      setTestEmailResult(res.ok ? 'success' : 'error');
    } catch {
      setTestEmailResult('error');
    }
    setTestEmailSending(false);
    setTimeout(() => setTestEmailResult(null), 5000);
  }

  function saveSettings(tab: SettingsTab) {
    try {
      if (tab === 'platform') localStorage.setItem(STORAGE_KEYS.platform, JSON.stringify(platform));
      if (tab === 'security') localStorage.setItem(STORAGE_KEYS.security, JSON.stringify(security));
      if (tab === 'customercare') localStorage.setItem(STORAGE_KEYS.customerCare, JSON.stringify(customerCare));
      if (tab === 'email') localStorage.setItem(STORAGE_KEYS.email, JSON.stringify(emailTemplates));
    } catch {}
    setSaved(tab);
    setTimeout(() => setSaved(null), 2500);
  }

  if (!mounted) return null;

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E31937" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Admin Access Required</h1>
          <p className="text-sm text-[#555555] mb-6">You must be logged in as admin to view this page.</p>
          <Link href="/login" className="px-6 py-2.5 tesla-btn-primary rounded text-sm font-semibold">Sign In as Admin</Link>
        </div>
      </main>
    );
  }

  const tabClass = (t: SettingsTab) =>
    `flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg tracking-widest uppercase transition-all ${
      activeTab === t
        ? 'bg-primary/20 border border-primary/40 text-primary' :'bg-[#111111] hover:bg-[#1A1A1A] border border-[#1A1A1A] hover:border-[#2A2A2A] text-[#666666] hover:text-white'
    }`;

  const inputClass = 'w-full px-3 py-2.5 rounded-lg text-sm input-tesla bg-[#0D0D0D] border border-[#1A1A1A] text-white placeholder-[#444444] focus:border-primary/40 focus:outline-none transition-colors';
  const labelClass = 'block text-[10px] font-bold text-[#555555] uppercase tracking-widest mb-1.5';
  const sectionClass = 'bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-6 space-y-5';
  const sectionTitleClass = 'text-sm font-bold text-white mb-4 flex items-center gap-2';

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Top bar */}
      <div className="border-b border-[#1A1A1A] bg-[#0A0A0A]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <svg width="18" height="18" viewBox="0 0 342 512" fill="currentColor" className="text-primary" aria-hidden="true">
                <path d="M0 57.3C0 57.3 57.3 0 171 0s171 57.3 171 57.3L285 85.5s-28.5-28.5-114-28.5S57 85.5 57 85.5L0 57.3zM171 512L57 85.5s28.5 28.5 114 28.5 114-28.5 114-28.5L171 512z" />
              </svg>
              <span className="text-white font-bold text-sm tracking-widest uppercase">Tesla Trade</span>
            </Link>
            <span className="text-[#2A2A2A]">|</span>
            <span className="text-xs text-primary tracking-widest uppercase font-semibold">Admin Settings</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-xs text-[#666666] hover:text-white transition-colors flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Dashboard
            </Link>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">A</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">Platform Settings</h1>
          <p className="text-sm text-[#555555]">Configure withdrawal limits, commissions, KYC rules, security, and customer care.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button className={tabClass('platform')} onClick={() => setActiveTab('platform')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            Platform
          </button>
          <button className={tabClass('security')} onClick={() => setActiveTab('security')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Security
          </button>
          <button className={tabClass('customercare')} onClick={() => setActiveTab('customercare')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Customer Care
          </button>
          <button className={tabClass('email')} onClick={() => setActiveTab('email')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Email Templates
          </button>
        </div>

        {/* ── PLATFORM TAB ── */}
        {activeTab === 'platform' && (
          <div className="space-y-6">
            {/* Maintenance Mode — prominent banner */}
            <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${platform.maintenanceMode ? 'bg-yellow-400/5 border-yellow-400/30' : 'bg-[#0D0D0D] border-[#1A1A1A]'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${platform.maintenanceMode ? 'bg-yellow-400/10' : 'bg-[#111111]'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={platform.maintenanceMode ? '#facc15' : '#666'} strokeWidth="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div>
                  <p className={`text-sm font-bold mb-0.5 ${platform.maintenanceMode ? 'text-yellow-400' : 'text-white'}`}>
                    Maintenance Mode {platform.maintenanceMode ? '— ACTIVE' : '— Disabled'}
                  </p>
                  <p className="text-xs text-[#555555]">When enabled, users see a maintenance page instead of the platform.</p>
                </div>
              </div>
              <button
                onClick={() => setPlatform(p => ({ ...p, maintenanceMode: !p.maintenanceMode }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${platform.maintenanceMode ? 'bg-yellow-400' : 'bg-[#2A2A2A]'}`}
                role="switch"
                aria-checked={platform.maintenanceMode}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${platform.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {platform.maintenanceMode && (
              <div className={sectionClass}>
                <p className={sectionTitleClass}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Maintenance Message
                </p>
                <div>
                  <label className={labelClass}>Message shown to users</label>
                  <textarea
                    value={platform.maintenanceMessage}
                    onChange={e => setPlatform(p => ({ ...p, maintenanceMessage: e.target.value }))}
                    rows={3}
                    className={inputClass + ' resize-none'}
                    placeholder="We are currently performing scheduled maintenance..."
                  />
                </div>
              </div>
            )}

            {/* Withdrawal Limits */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Withdrawal Limits
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Minimum Amount ($)</label>
                  <input type="number" value={platform.withdrawalMinAmount} onChange={e => setPlatform(p => ({ ...p, withdrawalMinAmount: e.target.value }))} className={inputClass} placeholder="100" />
                </div>
                <div>
                  <label className={labelClass}>Maximum Per Request ($)</label>
                  <input type="number" value={platform.withdrawalMaxAmount} onChange={e => setPlatform(p => ({ ...p, withdrawalMaxAmount: e.target.value }))} className={inputClass} placeholder="50000" />
                </div>
                <div>
                  <label className={labelClass}>Daily Limit ($)</label>
                  <input type="number" value={platform.withdrawalDailyLimit} onChange={e => setPlatform(p => ({ ...p, withdrawalDailyLimit: e.target.value }))} className={inputClass} placeholder="100000" />
                </div>
              </div>
            </div>

            {/* Commission Rates */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Commission Rates
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Platform Commission Rate (%)</label>
                  <input type="number" step="0.1" value={platform.commissionRate} onChange={e => setPlatform(p => ({ ...p, commissionRate: e.target.value }))} className={inputClass} placeholder="2.5" />
                  <p className="text-[10px] text-[#444444] mt-1.5">Applied on each investment transaction</p>
                </div>
                <div>
                  <label className={labelClass}>Referral Commission (%)</label>
                  <input type="number" step="0.1" value={platform.referralCommission} onChange={e => setPlatform(p => ({ ...p, referralCommission: e.target.value }))} className={inputClass} placeholder="5" />
                  <p className="text-[10px] text-[#444444] mt-1.5">Paid to referrer on referred user's first investment</p>
                </div>
              </div>
            </div>

            {/* Investment Limits */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                Investment Limits
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Minimum Investment ($)</label>
                  <input type="number" value={platform.minInvestmentAmount} onChange={e => setPlatform(p => ({ ...p, minInvestmentAmount: e.target.value }))} className={inputClass} placeholder="500" />
                </div>
                <div>
                  <label className={labelClass}>Maximum Investment ($)</label>
                  <input type="number" value={platform.maxInvestmentAmount} onChange={e => setPlatform(p => ({ ...p, maxInvestmentAmount: e.target.value }))} className={inputClass} placeholder="500000" />
                </div>
              </div>
            </div>

            {/* KYC Requirements */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" aria-hidden="true"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                KYC Requirements
              </p>
              <div className="space-y-4">
                {[
                  { key: 'kycRequired' as keyof PlatformSettings, label: 'KYC Required for Account', desc: 'Users must complete KYC to access the platform' },
                  { key: 'kycRequiredForWithdrawal' as keyof PlatformSettings, label: 'KYC Required for Withdrawals', desc: 'Block withdrawals until KYC is approved' },
                  { key: 'kycRequiredForInvestment' as keyof PlatformSettings, label: 'KYC Required for Investments', desc: 'Block investments until KYC is approved' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-[#1A1A1A] last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-[11px] text-[#555555] mt-0.5">{desc}</p>
                    </div>
                    <button
                      onClick={() => setPlatform(p => ({ ...p, [key]: !p[key] }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${platform[key] ? 'bg-primary' : 'bg-[#2A2A2A]'}`}
                      role="switch"
                      aria-checked={!!platform[key]}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${platform[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => saveSettings('platform')} className="px-8 py-3 tesla-btn-primary rounded-lg text-sm font-semibold flex items-center gap-2">
                {saved === 'platform' ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>Saved!</>
                ) : 'Save Platform Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ── SECURITY TAB ── */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Security overview banner */}
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E31937" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-0.5">Admin Dashboard Security</p>
                <p className="text-xs text-[#555555]">Configure authentication requirements, session controls, and access restrictions for the admin panel.</p>
              </div>
            </div>

            {/* Authentication */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Authentication Controls
              </p>
              <div className="space-y-4">
                {[
                  { key: 'twoFactorRequired' as keyof SecuritySettings, label: 'Require 2FA for Admin Login', desc: 'Enforce two-factor authentication for all admin accounts' },
                  { key: 'requireStrongPassword' as keyof SecuritySettings, label: 'Require Strong Passwords', desc: 'Minimum 12 chars, uppercase, numbers, and symbols required' },
                  { key: 'auditLogEnabled' as keyof SecuritySettings, label: 'Enable Audit Logging', desc: 'Log all admin actions with timestamps and IP addresses' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-[#1A1A1A] last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-[11px] text-[#555555] mt-0.5">{desc}</p>
                    </div>
                    <button
                      onClick={() => setSecurity(s => ({ ...s, [key]: !s[key] }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${security[key] ? 'bg-primary' : 'bg-[#2A2A2A]'}`}
                      role="switch"
                      aria-checked={!!security[key]}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${security[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Session & Rate Limiting */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Session & Rate Limiting
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Session Timeout (minutes)</label>
                  <input type="number" value={security.sessionTimeoutMinutes} onChange={e => setSecurity(s => ({ ...s, sessionTimeoutMinutes: e.target.value }))} className={inputClass} placeholder="60" />
                  <p className="text-[10px] text-[#444444] mt-1.5">Auto-logout after inactivity</p>
                </div>
                <div>
                  <label className={labelClass}>Max Login Attempts</label>
                  <input type="number" value={security.maxLoginAttempts} onChange={e => setSecurity(s => ({ ...s, maxLoginAttempts: e.target.value }))} className={inputClass} placeholder="5" />
                  <p className="text-[10px] text-[#444444] mt-1.5">Account locked after this many failed attempts</p>
                </div>
              </div>
            </div>

            {/* IP Whitelist */}
            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-4">
                <p className={sectionTitleClass + ' mb-0'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  IP Whitelist
                </p>
                <button
                  onClick={() => setSecurity(s => ({ ...s, ipWhitelistEnabled: !s.ipWhitelistEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${security.ipWhitelistEnabled ? 'bg-primary' : 'bg-[#2A2A2A]'}`}
                  role="switch"
                  aria-checked={security.ipWhitelistEnabled}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${security.ipWhitelistEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {security.ipWhitelistEnabled && (
                <div>
                  <label className={labelClass}>Allowed IP Addresses (one per line)</label>
                  <textarea
                    value={security.ipWhitelist}
                    onChange={e => setSecurity(s => ({ ...s, ipWhitelist: e.target.value }))}
                    rows={4}
                    className={inputClass + ' resize-none font-mono text-xs'}
                    placeholder={'192.168.1.1\n10.0.0.0/24\n203.0.113.0'}
                  />
                  <p className="text-[10px] text-[#444444] mt-1.5">Only these IPs can access the admin panel. Supports CIDR notation.</p>
                </div>
              )}
              {!security.ipWhitelistEnabled && (
                <p className="text-xs text-[#444444]">Enable to restrict admin access to specific IP addresses only.</p>
              )}
            </div>

            {/* Password Change */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" aria-hidden="true"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                Change Admin Password
              </p>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {pwError && (
                  <div className="px-4 py-3 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary">{pwError}</div>
                )}
                {pwSuccess && (
                  <div className="px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400 flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                    Password updated successfully!
                  </div>
                )}
                <div>
                  <label className={labelClass}>Current Password</label>
                  <input
                    type="password"
                    value={pwForm.current}
                    onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                    className={inputClass}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>New Password</label>
                    <input
                      type="password"
                      value={pwForm.newPw}
                      onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                      className={inputClass}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Confirm New Password</label>
                    <input
                      type="password"
                      value={pwForm.confirm}
                      onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                      className={inputClass}
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-[#555555]">Last changed: {security.adminPasswordLastChanged}</p>
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="px-6 py-2.5 tesla-btn-primary rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {pwLoading ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        Updating...
                      </>
                    ) : 'Update Password'}
                  </button>
                </div>
              </form>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mt-2">
                <p className="text-xs text-[#888888] leading-relaxed">
                  <span className="text-primary font-semibold">Security Tip:</span> Use a unique password of at least 16 characters with mixed case, numbers, and symbols. Never reuse passwords across services.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => saveSettings('security')} className="px-8 py-3 tesla-btn-primary rounded-lg text-sm font-semibold flex items-center gap-2">
                {saved === 'security' ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>Saved!</>
                ) : 'Save Security Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ── CUSTOMER CARE TAB ── */}
        {activeTab === 'customercare' && (
          <div className="space-y-6">
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-400/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-0.5">Customer Care Channels</p>
                <p className="text-xs text-[#555555]">Configure WhatsApp and Telegram support contacts. Enabled channels appear as floating buttons on the platform.</p>
              </div>
            </div>

            {/* WhatsApp */}
            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Support
                </p>
                <button
                  onClick={() => setCustomerCare(c => ({ ...c, whatsappEnabled: !c.whatsappEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${customerCare.whatsappEnabled ? 'bg-[#25D366]' : 'bg-[#2A2A2A]'}`}
                  role="switch"
                  aria-checked={customerCare.whatsappEnabled}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${customerCare.whatsappEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>WhatsApp Number (with country code)</label>
                  <input
                    type="text"
                    value={customerCare.whatsappNumber}
                    onChange={e => setCustomerCare(c => ({ ...c, whatsappNumber: e.target.value }))}
                    className={inputClass}
                    placeholder="+1234567890"
                    disabled={!customerCare.whatsappEnabled}
                  />
                  <p className="text-[10px] text-[#444444] mt-1.5">Include country code without spaces or dashes (e.g. +14155552671)</p>
                </div>
                <div>
                  <label className={labelClass}>Pre-filled Message</label>
                  <textarea
                    value={customerCare.whatsappMessage}
                    onChange={e => setCustomerCare(c => ({ ...c, whatsappMessage: e.target.value }))}
                    rows={2}
                    className={inputClass + ' resize-none'}
                    placeholder="Hello! I need help with my Tesla Trade account."
                    disabled={!customerCare.whatsappEnabled}
                  />
                </div>
                {customerCare.whatsappEnabled && customerCare.whatsappNumber && (
                  <div className="p-3 bg-[#25D366]/5 border border-[#25D366]/20 rounded-lg">
                    <p className="text-[11px] text-[#888888]">
                      Preview link:{' '}
                      <span className="text-[#25D366] font-mono text-[10px] break-all">
                        https://wa.me/{customerCare.whatsappNumber.replace(/\D/g, '')}?text={encodeURIComponent(customerCare.whatsappMessage)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Telegram */}
            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#229ED9" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram Support
                </p>
                <button
                  onClick={() => setCustomerCare(c => ({ ...c, telegramEnabled: !c.telegramEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${customerCare.telegramEnabled ? 'bg-[#229ED9]' : 'bg-[#2A2A2A]'}`}
                  role="switch"
                  aria-checked={customerCare.telegramEnabled}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${customerCare.telegramEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Telegram Username (without @)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444] text-sm">@</span>
                    <input
                      type="text"
                      value={customerCare.telegramUsername}
                      onChange={e => setCustomerCare(c => ({ ...c, telegramUsername: e.target.value.replace('@', '') }))}
                      className={inputClass + ' pl-7'}
                      placeholder="teslatrade_support"
                      disabled={!customerCare.telegramEnabled}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Pre-filled Message</label>
                  <textarea
                    value={customerCare.telegramMessage}
                    onChange={e => setCustomerCare(c => ({ ...c, telegramMessage: e.target.value }))}
                    rows={2}
                    className={inputClass + ' resize-none'}
                    placeholder="Hello! I need support with Tesla Trade."
                    disabled={!customerCare.telegramEnabled}
                  />
                </div>
                {customerCare.telegramEnabled && customerCare.telegramUsername && (
                  <div className="p-3 bg-[#229ED9]/5 border border-[#229ED9]/20 rounded-lg">
                    <p className="text-[11px] text-[#888888]">
                      Preview link:{' '}
                      <span className="text-[#229ED9] font-mono text-[10px]">
                        https://t.me/{customerCare.telegramUsername}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* General Support */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                General Support Info
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Support Email</label>
                  <input type="email" value={customerCare.supportEmail} onChange={e => setCustomerCare(c => ({ ...c, supportEmail: e.target.value }))} className={inputClass} placeholder="support@teslatrade.com" />
                </div>
                <div>
                  <label className={labelClass}>Support Hours</label>
                  <input type="text" value={customerCare.supportHours} onChange={e => setCustomerCare(c => ({ ...c, supportHours: e.target.value }))} className={inputClass} placeholder="Mon–Fri, 9am–6pm UTC" />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => saveSettings('customercare')} className="px-8 py-3 tesla-btn-primary rounded-lg text-sm font-semibold flex items-center gap-2">
                {saved === 'customercare' ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>Saved!</>
                ) : 'Save Customer Care Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ── EMAIL TEMPLATES TAB ── */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-400/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-0.5">Email Templates</p>
                <p className="text-xs text-[#555555]">Customize automated emails sent to users. Use <code className="text-primary bg-primary/10 px-1 rounded text-[10px]">{'{{name}}'}</code>, <code className="text-primary bg-primary/10 px-1 rounded text-[10px]">{'{{amount}}'}</code> as dynamic placeholders.</p>
              </div>
            </div>

            {/* Sender Info */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Sender Configuration
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Sender Name</label>
                  <input type="text" value={emailTemplates.senderName} onChange={e => setEmailTemplates(t => ({ ...t, senderName: e.target.value }))} className={inputClass} placeholder="Tesla Trade Energy" />
                </div>
                <div>
                  <label className={labelClass}>Sender Email</label>
                  <input type="email" value={emailTemplates.senderEmail} onChange={e => setEmailTemplates(t => ({ ...t, senderEmail: e.target.value }))} className={inputClass} placeholder="noreply@teslatrade.com" />
                </div>
              </div>
            </div>

            {/* Welcome Email */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <span className="w-5 h-5 rounded bg-green-400/10 flex items-center justify-center text-[10px]">👋</span>
                Welcome Email
              </p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Subject Line</label>
                  <input type="text" value={emailTemplates.welcomeSubject} onChange={e => setEmailTemplates(t => ({ ...t, welcomeSubject: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email Body</label>
                  <textarea value={emailTemplates.welcomeBody} onChange={e => setEmailTemplates(t => ({ ...t, welcomeBody: e.target.value }))} rows={5} className={inputClass + ' resize-none font-mono text-xs leading-relaxed'} />
                </div>
              </div>
            </div>

            {/* KYC Approved Email */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <span className="w-5 h-5 rounded bg-yellow-400/10 flex items-center justify-center text-[10px]">✅</span>
                KYC Approved Email
              </p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Subject Line</label>
                  <input type="text" value={emailTemplates.kycApprovedSubject} onChange={e => setEmailTemplates(t => ({ ...t, kycApprovedSubject: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email Body</label>
                  <textarea value={emailTemplates.kycApprovedBody} onChange={e => setEmailTemplates(t => ({ ...t, kycApprovedBody: e.target.value }))} rows={5} className={inputClass + ' resize-none font-mono text-xs leading-relaxed'} />
                </div>
              </div>
            </div>

            {/* Withdrawal Email */}
            <div className={sectionClass}>
              <p className={sectionTitleClass}>
                <span className="w-5 h-5 rounded bg-blue-400/10 flex items-center justify-center text-[10px]">💸</span>
                Withdrawal Processed Email
              </p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Subject Line</label>
                  <input type="text" value={emailTemplates.withdrawalSubject} onChange={e => setEmailTemplates(t => ({ ...t, withdrawalSubject: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email Body</label>
                  <textarea value={emailTemplates.withdrawalBody} onChange={e => setEmailTemplates(t => ({ ...t, withdrawalBody: e.target.value }))} rows={5} className={inputClass + ' resize-none font-mono text-xs leading-relaxed'} />
                </div>
              </div>
            </div>

            {/* Test Email */}
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-5">
              <p className={sectionTitleClass}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
                Test Email Delivery
              </p>
              <p className="text-xs text-[#555555] mb-4">Send a test email to verify your Resend integration and sender configuration are working correctly.</p>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmailAddr}
                  onChange={e => setTestEmailAddr(e.target.value)}
                  placeholder="Enter recipient email..."
                  className={inputClass + ' flex-1'}
                />
                <button
                  onClick={sendTestEmail}
                  disabled={testEmailSending || !testEmailAddr}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 hover:border-blue-400/40 text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                  {testEmailSending ? (
                    <><div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />Sending…</>
                  ) : 'Send Test'}
                </button>
              </div>
              {testEmailResult === 'success' && (
                <p className="text-xs text-green-400 font-semibold mt-2">✓ Test email sent successfully! Check your inbox.</p>
              )}
              {testEmailResult === 'error' && (
                <p className="text-xs text-red-400 font-semibold mt-2">✗ Failed to send. Check your RESEND_API_KEY environment variable.</p>
              )}
            </div>

            <div className="flex justify-end">
              <button onClick={() => saveSettings('email')} className="px-8 py-3 tesla-btn-primary rounded-lg text-sm font-semibold flex items-center gap-2">
                {saved === 'email' ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>Saved!</>
                ) : 'Save Email Templates'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
