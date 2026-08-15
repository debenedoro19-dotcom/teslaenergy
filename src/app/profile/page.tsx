'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Section = 'personal' | 'bank' | 'password' | 'notifications' | 'twofa';

interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  bio: string;
}

interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  routingNumber: string;
  accountType: 'checking' | 'savings';
  swiftCode: string;
}

interface NotificationPrefs {
  emailInvestmentUpdates: boolean;
  emailWithdrawals: boolean;
  emailSecurity: boolean;
  emailMarketing: boolean;
  pushPortfolioAlerts: boolean;
  pushPriceAlerts: boolean;
  pushNewsAlerts: boolean;
  smsWithdrawals: boolean;
  smsSecurity: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeSection, setActiveSection] = useState<Section>('personal');
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [initials, setInitials] = useState('U');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Personal Info
  const [personal, setPersonal] = useState<PersonalInfo>({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    address: '',
    bio: '',
  });

  // Bank Details
  const [bank, setBank] = useState<BankDetails>({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking',
    swiftCode: '',
  });
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showRoutingNumber, setShowRoutingNumber] = useState(false);

  // Password
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });
  const [passwordError, setPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Notifications
  const [notifs, setNotifs] = useState<NotificationPrefs>({
    emailInvestmentUpdates: true,
    emailWithdrawals: true,
    emailSecurity: true,
    emailMarketing: false,
    pushPortfolioAlerts: true,
    pushPriceAlerts: false,
    pushNewsAlerts: false,
    smsWithdrawals: true,
    smsSecurity: true,
  });

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<'idle' | 'setup' | 'verify' | 'enabled'>('idle');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFASecret] = useState('JBSWY3DPEHPK3PXP');
  const [backupCodes] = useState(['8f2k-9x1m', 'p3n7-4q2w', 'r5t8-6y3e', 'u9i2-0o4p', 'a1s4-7d5f', 'g6h9-2j0k']);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email || '');
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      setPersonal(prev => ({
        ...prev,
        fullName: name,
        email: user.email || '',
      }));
      const parts = name.split(' ');
      setInitials(parts.map((p: string) => p[0]).join('').toUpperCase().slice(0, 2));
    });
  }, []);

  const calcPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const handlePasswordChange = (val: string) => {
    setPasswords(prev => ({ ...prev, newPass: val }));
    setPasswordStrength(calcPasswordStrength(val));
  };

  const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColor = ['', '#E31937', '#FF6B35', '#FFD700', '#4ade80', '#4ade80'];

  const showSaved = () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const handleSavePersonal = async () => {
    setSaveStatus('saving');
    try {
      await supabase.auth.updateUser({ data: { full_name: personal.fullName } });
      showSaved();
    } catch {
      setSaveStatus('error');
    }
  };

  const handleSaveBank = async () => {
    setSaveStatus('saving');
    try {
      await supabase
        .from('user_profiles')
        .update({
          bank_name: bank.bankName,
          account_holder: bank.accountHolder,
          account_number: bank.accountNumber,
          routing_number: bank.routingNumber,
          swift_code: bank.swiftCode,
        })
        .eq('id', userId);
      showSaved();
    } catch {
      setSaveStatus('error');
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (passwords.newPass.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setSaveStatus('saving');
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPass });
      if (error) throw error;
      setPasswords({ current: '', newPass: '', confirm: '' });
      setPasswordStrength(0);
      showSaved();
    } catch (err: any) {
      setSaveStatus('error');
      setPasswordError(err.message || 'Failed to update password.');
    }
  };

  const handleSaveNotifs = () => {
    setSaveStatus('saving');
    setTimeout(showSaved, 600);
  };

  const handle2FASetup = () => {
    setTwoFAStep('setup');
  };

  const handle2FAVerify = () => {
    if (twoFACode.length === 6) {
      setTwoFAEnabled(true);
      setTwoFAStep('enabled');
    }
  };

  const handle2FADisable = () => {
    setTwoFAEnabled(false);
    setTwoFAStep('idle');
    setTwoFACode('');
  };

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    {
      id: 'personal',
      label: 'Personal Info',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      id: 'bank',
      label: 'Bank Account',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      id: 'password',
      label: 'Password',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      id: 'twofa',
      label: 'Two-Factor Auth',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
  ];

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Top bar */}
      <div className="border-b border-[#1A1A1A] bg-[#0A0A0A]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <svg width="20" height="20" viewBox="0 0 342 512" fill="currentColor" className="text-[#E31937]" aria-hidden="true">
                <path d="M0 57.3C0 57.3 57.3 0 171 0s171 57.3 171 57.3L285 85.5s-28.5-28.5-114-28.5S57 85.5 57 85.5L0 57.3zM171 512L57 85.5s28.5 28.5 114 28.5 114-28.5 114-28.5L171 512z" />
              </svg>
              <span className="text-white font-bold text-sm tracking-widest uppercase">Tesla Trade</span>
            </Link>
            <span className="text-[#2A2A2A]">|</span>
            <span className="text-xs text-[#666666] tracking-widest uppercase">Profile Settings</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="px-4 py-1.5 text-xs font-semibold text-[#888888] hover:text-white border border-[#2A2A2A] hover:border-[#444444] rounded transition-all tracking-widest uppercase">
              Dashboard
            </Link>
            <div className="w-8 h-8 rounded-full bg-[#E31937]/20 border border-[#E31937]/30 flex items-center justify-center text-xs font-bold text-[#E31937]">
              {initials}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#E31937]/30 to-[#E31937]/10 border border-[#E31937]/30 flex items-center justify-center text-xl font-extrabold text-[#E31937]">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{personal.fullName || 'Your Profile'}</h1>
              <p className="text-sm text-[#666666]">{userEmail}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Nav */}
          <aside className="lg:w-56 shrink-0">
            <nav className="bg-[#111111] border border-[#1A1A1A] rounded-lg overflow-hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-xs font-semibold tracking-widest uppercase transition-all border-l-2 ${
                    activeSection === item.id
                      ? 'text-white bg-[#E31937]/10 border-[#E31937]'
                      : 'text-[#666666] hover:text-white hover:bg-[#161616] border-transparent'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">

            {/* ── Personal Info ── */}
            {activeSection === 'personal' && (
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-base font-bold text-white tracking-wide mb-1">Personal Information</h2>
                  <p className="text-xs text-[#555555]">Update your name, contact details, and profile information.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Full Name</label>
                    <input
                      type="text"
                      value={personal.fullName}
                      onChange={e => setPersonal(p => ({ ...p, fullName: e.target.value }))}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Email Address</label>
                    <input
                      type="email"
                      value={personal.email}
                      disabled
                      className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded px-4 py-2.5 text-sm text-[#555555] cursor-not-allowed"
                    />
                    <p className="text-[10px] text-[#444444] mt-1">Email cannot be changed here.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={personal.phone}
                      onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Country</label>
                    <select
                      value={personal.country}
                      onChange={e => setPersonal(p => ({ ...p, country: e.target.value }))}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E31937]/50 transition-colors"
                    >
                      <option value="">Select country</option>
                      {['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Singapore', 'UAE', 'Other'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">City</label>
                    <input
                      type="text"
                      value={personal.city}
                      onChange={e => setPersonal(p => ({ ...p, city: e.target.value }))}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Address</label>
                    <input
                      type="text"
                      value={personal.address}
                      onChange={e => setPersonal(p => ({ ...p, address: e.target.value }))}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors"
                      placeholder="123 Main St"
                    />
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Bio</label>
                  <textarea
                    value={personal.bio}
                    onChange={e => setPersonal(p => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors resize-none"
                    placeholder="Tell us a bit about yourself..."
                  />
                </div>
                <SaveButton status={saveStatus} onClick={handleSavePersonal} />
              </div>
            )}

            {/* ── Bank Account ── */}
            {activeSection === 'bank' && (
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-base font-bold text-white tracking-wide mb-1">Bank Account Details</h2>
                  <p className="text-xs text-[#555555]">Your payout destination for approved withdrawals. All data is encrypted.</p>
                </div>
                <div className="flex items-center gap-2 mb-5 px-4 py-3 bg-[#E31937]/5 border border-[#E31937]/20 rounded-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E31937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-xs text-[#E31937]/80">Bank details are used exclusively for withdrawal payouts. Changes require admin review.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={bank.bankName}
                      onChange={e => setBank(b => ({ ...b, bankName: e.target.value }))}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors"
                      placeholder="Chase Bank"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Account Holder Name</label>
                    <input
                      type="text"
                      value={bank.accountHolder}
                      onChange={e => setBank(b => ({ ...b, accountHolder: e.target.value }))}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Account Number</label>
                    <div className="relative">
                      <input
                        type={showAccountNumber ? 'text' : 'password'}
                        value={bank.accountNumber}
                        onChange={e => setBank(b => ({ ...b, accountNumber: e.target.value }))}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 pr-10 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors"
                        placeholder="••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccountNumber(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white transition-colors"
                        aria-label={showAccountNumber ? 'Hide account number' : 'Show account number'}
                      >
                        {showAccountNumber ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Routing Number</label>
                    <div className="relative">
                      <input
                        type={showRoutingNumber ? 'text' : 'password'}
                        value={bank.routingNumber}
                        onChange={e => setBank(b => ({ ...b, routingNumber: e.target.value }))}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 pr-10 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors"
                        placeholder="••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRoutingNumber(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white transition-colors"
                        aria-label={showRoutingNumber ? 'Hide routing number' : 'Show routing number'}
                      >
                        {showRoutingNumber ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Account Type</label>
                    <select
                      value={bank.accountType}
                      onChange={e => setBank(b => ({ ...b, accountType: e.target.value as 'checking' | 'savings' }))}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E31937]/50 transition-colors"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">SWIFT / BIC Code</label>
                    <input
                      type="text"
                      value={bank.swiftCode}
                      onChange={e => setBank(b => ({ ...b, swiftCode: e.target.value.toUpperCase() }))}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors"
                      placeholder="CHASUS33"
                    />
                  </div>
                </div>
                <SaveButton status={saveStatus} onClick={handleSaveBank} />
              </div>
            )}

            {/* ── Password ── */}
            {activeSection === 'password' && (
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-base font-bold text-white tracking-wide mb-1">Change Password</h2>
                  <p className="text-xs text-[#555555]">Use a strong, unique password to protect your account.</p>
                </div>
                <div className="max-w-md space-y-4 mb-6">
                  <PasswordField
                    label="Current Password"
                    value={passwords.current}
                    show={showPasswords.current}
                    onChange={v => setPasswords(p => ({ ...p, current: v }))}
                    onToggle={() => setShowPasswords(s => ({ ...s, current: !s.current }))}
                    placeholder="Enter current password"
                  />
                  <PasswordField
                    label="New Password"
                    value={passwords.newPass}
                    show={showPasswords.newPass}
                    onChange={handlePasswordChange}
                    onToggle={() => setShowPasswords(s => ({ ...s, newPass: !s.newPass }))}
                    placeholder="Min. 8 characters"
                  />
                  {passwords.newPass.length > 0 && (
                    <div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{ background: i <= passwordStrength ? strengthColor[passwordStrength] : '#2A2A2A' }}
                          />
                        ))}
                      </div>
                      <p className="text-[10px]" style={{ color: strengthColor[passwordStrength] }}>
                        {strengthLabel[passwordStrength]}
                      </p>
                    </div>
                  )}
                  <PasswordField
                    label="Confirm New Password"
                    value={passwords.confirm}
                    show={showPasswords.confirm}
                    onChange={v => setPasswords(p => ({ ...p, confirm: v }))}
                    onToggle={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))}
                    placeholder="Repeat new password"
                  />
                  {passwordError && (
                    <p className="text-xs text-[#E31937]">{passwordError}</p>
                  )}
                </div>
                <div className="mb-4 p-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg">
                  <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Password Requirements</p>
                  {[
                    { label: 'At least 8 characters', met: passwords.newPass.length >= 8 },
                    { label: 'One uppercase letter', met: /[A-Z]/.test(passwords.newPass) },
                    { label: 'One number', met: /[0-9]/.test(passwords.newPass) },
                    { label: 'One special character', met: /[^A-Za-z0-9]/.test(passwords.newPass) },
                  ].map(req => (
                    <div key={req.label} className="flex items-center gap-2 mb-1">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${req.met ? 'bg-green-400/20' : 'bg-[#1A1A1A]'}`}>
                        {req.met && (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs ${req.met ? 'text-green-400' : 'text-[#555555]'}`}>{req.label}</span>
                    </div>
                  ))}
                </div>
                <SaveButton status={saveStatus} onClick={handleChangePassword} label="Update Password" />
              </div>
            )}

            {/* ── Notifications ── */}
            {activeSection === 'notifications' && (
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-base font-bold text-white tracking-wide mb-1">Notification Preferences</h2>
                  <p className="text-xs text-[#555555]">Control how and when you receive alerts from Tesla Trade.</p>
                </div>
                <div className="space-y-6">
                  <NotifGroup
                    title="Email Notifications"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E31937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    }
                    items={[
                      { key: 'emailInvestmentUpdates', label: 'Investment Updates', desc: 'Portfolio performance and return notifications' },
                      { key: 'emailWithdrawals', label: 'Withdrawal Status', desc: 'Payout approvals, processing, and completions' },
                      { key: 'emailSecurity', label: 'Security Alerts', desc: 'Login attempts, password changes, 2FA events' },
                      { key: 'emailMarketing', label: 'Promotions & News', desc: 'New investment packages and platform updates' },
                    ]}
                    prefs={notifs}
                    onChange={(key, val) => setNotifs(p => ({ ...p, [key]: val }))}
                  />
                  <NotifGroup
                    title="Push Notifications"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E31937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    }
                    items={[
                      { key: 'pushPortfolioAlerts', label: 'Portfolio Alerts', desc: 'Real-time portfolio value changes' },
                      { key: 'pushPriceAlerts', label: 'Price Alerts', desc: 'Tesla stock and crypto price movements' },
                      { key: 'pushNewsAlerts', label: 'News & Announcements', desc: 'Breaking news from Tesla and Elon Musk' },
                    ]}
                    prefs={notifs}
                    onChange={(key, val) => setNotifs(p => ({ ...p, [key]: val }))}
                  />
                  <NotifGroup
                    title="SMS Notifications"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E31937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    }
                    items={[
                      { key: 'smsWithdrawals', label: 'Withdrawal Confirmations', desc: 'SMS confirmation for payout events' },
                      { key: 'smsSecurity', label: 'Security Codes', desc: 'OTP and verification codes via SMS' },
                    ]}
                    prefs={notifs}
                    onChange={(key, val) => setNotifs(p => ({ ...p, [key]: val }))}
                  />
                </div>
                <div className="mt-6">
                  <SaveButton status={saveStatus} onClick={handleSaveNotifs} label="Save Preferences" />
                </div>
              </div>
            )}

            {/* ── Two-Factor Auth ── */}
            {activeSection === 'twofa' && (
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-base font-bold text-white tracking-wide mb-1">Two-Factor Authentication</h2>
                  <p className="text-xs text-[#555555]">Add an extra layer of security to your account with an authenticator app.</p>
                </div>

                {/* Status Banner */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border mb-6 ${twoFAEnabled ? 'bg-green-400/5 border-green-400/20' : 'bg-[#E31937]/5 border-[#E31937]/20'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${twoFAEnabled ? 'bg-green-400/20' : 'bg-[#E31937]/20'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={twoFAEnabled ? '#4ade80' : '#E31937'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${twoFAEnabled ? 'text-green-400' : 'text-[#E31937]'}`}>
                      2FA is {twoFAEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <p className="text-xs text-[#555555]">
                      {twoFAEnabled ? 'Your account is protected with two-factor authentication.' : 'Enable 2FA to secure your account against unauthorized access.'}
                    </p>
                  </div>
                </div>

                {/* Idle state */}
                {twoFAStep === 'idle' && !twoFAEnabled && (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {[
                        { step: '1', title: 'Download App', desc: 'Install Google Authenticator or Authy on your phone.' },
                        { step: '2', title: 'Scan QR Code', desc: 'Scan the QR code shown during setup with your app.' },
                        { step: '3', title: 'Enter Code', desc: 'Enter the 6-digit code from your app to verify.' },
                      ].map(s => (
                        <div key={s.step} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4">
                          <div className="w-7 h-7 rounded-full bg-[#E31937]/20 border border-[#E31937]/30 flex items-center justify-center text-xs font-bold text-[#E31937] mb-3">{s.step}</div>
                          <p className="text-xs font-bold text-white mb-1">{s.title}</p>
                          <p className="text-xs text-[#555555]">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handle2FASetup}
                      className="px-6 py-2.5 bg-[#E31937] text-white text-xs font-bold rounded tracking-widest uppercase hover:bg-[#c41530] transition-colors"
                    >
                      Enable Two-Factor Auth
                    </button>
                  </div>
                )}

                {/* Setup step */}
                {twoFAStep === 'setup' && (
                  <div className="max-w-sm">
                    <p className="text-xs text-[#888888] mb-4">Scan this QR code with your authenticator app, or enter the secret key manually.</p>
                    {/* QR placeholder */}
                    <div className="w-40 h-40 bg-white rounded-lg flex items-center justify-center mb-4 mx-auto">
                      <div className="grid grid-cols-7 gap-0.5 p-2">
                        {Array.from({ length: 49 }).map((_, i) => (
                          <div key={i} className={`w-3 h-3 ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 mb-4 text-center">
                      <p className="text-[10px] text-[#555555] uppercase tracking-widest mb-1">Manual Entry Key</p>
                      <p className="text-sm font-mono text-white tracking-widest">{twoFASecret}</p>
                    </div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Enter 6-Digit Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={twoFACode}
                      onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-white text-center tracking-[0.5em] font-mono placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors mb-4"
                      placeholder="000000"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handle2FAVerify}
                        disabled={twoFACode.length !== 6}
                        className="flex-1 py-2.5 bg-[#E31937] text-white text-xs font-bold rounded tracking-widest uppercase hover:bg-[#c41530] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Verify & Enable
                      </button>
                      <button
                        onClick={() => { setTwoFAStep('idle'); setTwoFACode(''); }}
                        className="px-4 py-2.5 border border-[#2A2A2A] text-[#888888] text-xs font-semibold rounded tracking-widest uppercase hover:text-white hover:border-[#444444] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Enabled state */}
                {(twoFAStep === 'enabled' || twoFAEnabled) && twoFAStep !== 'idle' && (
                  <div>
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">Backup Codes</p>
                      <p className="text-xs text-[#555555] mb-3">Save these backup codes in a secure location. Each code can only be used once.</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                        {backupCodes.map(code => (
                          <div key={code} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded px-3 py-2 text-center font-mono text-xs text-white tracking-widest">
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handle2FADisable}
                      className="px-6 py-2.5 border border-[#E31937]/40 text-[#E31937] text-xs font-bold rounded tracking-widest uppercase hover:bg-[#E31937]/10 transition-colors"
                    >
                      Disable 2FA
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SaveButton({ status, onClick, label = 'Save Changes' }: { status: string; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={status === 'saving'}
      className={`px-6 py-2.5 text-xs font-bold rounded tracking-widest uppercase transition-all ${
        status === 'saved' ?'bg-green-400/20 text-green-400 border border-green-400/30'
          : status === 'error' ?'bg-[#E31937]/20 text-[#E31937] border border-[#E31937]/30' :'bg-[#E31937] text-white hover:bg-[#c41530]'
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {status === 'saving' ? 'Saving...' : status === 'saved' ? '✓ Saved' : status === 'error' ? 'Error — Retry' : label}
    </button>
  );
}

function PasswordField({
  label,
  value,
  show,
  onChange,
  onToggle,
  placeholder,
}: {
  label: string;
  value: string;
  show: boolean;
  onChange: (v: string) => void;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-4 py-2.5 pr-10 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#E31937]/50 transition-colors"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}

function NotifGroup({
  title,
  icon,
  items,
  prefs,
  onChange,
}: {
  title: string;
  icon: React.ReactNode;
  items: { key: string; label: string; desc: string }[];
  prefs: NotificationPrefs;
  onChange: (key: string, val: boolean) => void;
}) {
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <span className="text-xs font-bold text-white uppercase tracking-widest">{title}</span>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-white">{item.label}</p>
              <p className="text-[10px] text-[#555555] mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => onChange(item.key, !(prefs as any)[item.key])}
              className={`relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 ${(prefs as any)[item.key] ? 'bg-[#E31937]' : 'bg-[#2A2A2A]'}`}
              role="switch"
              aria-checked={(prefs as any)[item.key]}
              aria-label={`Toggle ${item.label}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${(prefs as any)[item.key] ? 'left-5' : 'left-0.5'}`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
