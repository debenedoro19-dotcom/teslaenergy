'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase/client';

const packages = [
  {
    id: 0,
    name: 'Micro Entry',
    min: 100,
    return: '4–6% p.a.',
    duration: '3 months',
    description: 'Perfect first step into the Tesla ecosystem with minimal commitment.',
    includes: ['Monthly reports', 'Email support', 'Community access'],
    featured: false,
    color: 'border-[#2A2A2A]',
    badge: 'New',
  },
  {
    id: 1,
    name: 'Seed Plan',
    min: 500,
    return: '6–9% p.a.',
    duration: '6 months',
    description: 'Build early exposure to Tesla energy and vehicle asset pools.',
    includes: ['Bi-monthly reports', 'Email support', 'Community access', 'Referral bonus eligible'],
    featured: false,
    color: 'border-[#2A2A2A]',
    badge: 'New',
  },
  {
    id: 2,
    name: 'Starter Energy',
    min: 5000,
    return: '8–12% p.a.',
    duration: '12 months',
    description: 'Entry-level package focused on Tesla energy products and Powerwall allocations.',
    includes: ['Powerwall priority access', 'Quarterly reports', 'Email support'],
    featured: false,
    color: 'border-[#2A2A2A]',
  },
  {
    id: 3,
    name: 'Growth Portfolio',
    min: 25000,
    return: '12–18% p.a.',
    duration: '24 months',
    description: 'Balanced exposure across vehicles, energy systems and early robotics.',
    includes: ['Mixed asset allocation', 'Monthly performance reports', 'Priority support', 'VIP webinar access'],
    featured: true,
    color: 'border-primary/40',
  },
  {
    id: 4,
    name: 'Private Elite',
    min: 100000,
    return: 'Custom',
    duration: '36+ months',
    description: 'Bespoke high-net-worth package with private session eligibility and Optimus early access.',
    includes: ['Dedicated account manager', 'Private Elon session eligibility', 'Optimus allocation priority', 'Custom reporting'],
    featured: false,
    color: 'border-[#2A2A2A]',
  },
];

// KYC tier requirements: packages with min >= $5000 require approved KYC
const KYC_REQUIRED_MIN = 5000;

export default function InvestPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'select' | 'amount' | 'payment' | 'confirm'>('select');
  const [paymentMethod, setPaymentMethod] = useState('');
  const router = useRouter();

  // KYC state
  const [kycStatus, setKycStatus] = useState<'loading' | 'none' | 'pending' | 'under_review' | 'approved' | 'rejected'>('loading');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkKYC = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setKycStatus('none');
        setIsLoggedIn(false);
        return;
      }
      setIsLoggedIn(true);
      const { data: kyc } = await supabase
        .from('kyc_submissions')
        .select('kyc_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!kyc) {
        setKycStatus('none');
      } else {
        setKycStatus(kyc.kyc_status as typeof kycStatus);
      }
    };
    checkKYC();
  }, []);

  const selectedPkg = packages.find((p) => p.id === selected);

  // Check if selected package requires KYC
  const requiresKYC = selectedPkg && selectedPkg.min >= KYC_REQUIRED_MIN;
  const kycBlocked = requiresKYC && kycStatus !== 'approved';

  const kycBannerConfig = {
    none: {
      icon: '🔒',
      title: 'KYC Required for This Tier',
      message: 'Investment tiers of $5,000+ require identity verification. Complete your KYC to unlock access.',
      cta: 'Complete KYC',
      href: '/kyc',
      color: 'border-yellow-400/20 bg-yellow-400/5',
      titleColor: 'text-yellow-400',
    },
    pending: {
      icon: '⏳',
      title: 'KYC Submitted — Awaiting Review',
      message: 'Your verification is pending admin review. You can invest in $100–$500 tiers while you wait.',
      cta: 'View KYC Status',
      href: '/kyc',
      color: 'border-blue-400/20 bg-blue-400/5',
      titleColor: 'text-blue-400',
    },
    under_review: {
      icon: '🔍',
      title: 'KYC Under Review',
      message: 'Our team is reviewing your documents. You will be notified once approved.',
      cta: 'View KYC Status',
      href: '/kyc',
      color: 'border-blue-400/20 bg-blue-400/5',
      titleColor: 'text-blue-400',
    },
    rejected: {
      icon: '❌',
      title: 'KYC Rejected',
      message: 'Your verification was not approved. Please resubmit with correct documents.',
      cta: 'Resubmit KYC',
      href: '/kyc',
      color: 'border-red-400/20 bg-red-400/5',
      titleColor: 'text-red-400',
    },
    approved: null,
    loading: null,
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <div className="pt-24 pb-20 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase mb-3 block">Investment Application</span>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
              Start <span className="gradient-text-primary">Investing</span>
            </h1>
            <p className="text-[#666666] text-base max-w-xl">
              Choose your investment package and begin your journey in the Tesla ecosystem.
            </p>
          </div>

          {/* KYC status banner (shown when a KYC-required package is selected and KYC not approved) */}
          {kycBlocked && kycStatus !== 'loading' && kycBannerConfig[kycStatus] && (
            <div className={`mb-8 p-5 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-4 ${kycBannerConfig[kycStatus]!.color}`}>
              <span className="text-2xl shrink-0">{kycBannerConfig[kycStatus]!.icon}</span>
              <div className="flex-1">
                <p className={`text-sm font-bold mb-1 ${kycBannerConfig[kycStatus]!.titleColor}`}>
                  {kycBannerConfig[kycStatus]!.title}
                </p>
                <p className="text-xs text-[#666666]">{kycBannerConfig[kycStatus]!.message}</p>
              </div>
              <Link
                href={kycBannerConfig[kycStatus]!.href}
                className="shrink-0 px-4 py-2 tesla-btn-primary rounded text-xs font-bold tracking-widest uppercase"
              >
                {kycBannerConfig[kycStatus]!.cta}
              </Link>
            </div>
          )}

          {/* KYC approved badge */}
          {kycStatus === 'approved' && (
            <div className="mb-8 p-4 rounded-lg border border-green-400/20 bg-green-400/5 flex items-center gap-3">
              <span className="text-lg">✅</span>
              <p className="text-xs font-semibold text-green-400">KYC Verified — All investment tiers unlocked</p>
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-2 mb-10">
            {(['select', 'amount', 'payment', 'confirm'] as const).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 ${i > 0 ? '' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s ? 'step-active' : ['select', 'amount', 'payment', 'confirm'].indexOf(step) > i ? 'step-done' : 'step-pending'
                  }`}>
                    {['select', 'amount', 'payment', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
                  </div>
                  <span className={`text-[10px] font-semibold tracking-wider uppercase hidden sm:block ${step === s ? 'text-white' : 'text-[#444444]'}`}>
                    {s === 'select' ? 'Package' : s === 'amount' ? 'Amount' : s === 'payment' ? 'Payment' : 'Confirm'}
                  </span>
                </div>
                {i < 3 && <div className={`flex-1 h-px ${['select', 'amount', 'payment', 'confirm'].indexOf(step) > i ? 'bg-primary' : 'bg-[#2A2A2A]'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Select Package */}
          {step === 'select' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                {packages.map((pkg) => {
                  const pkgRequiresKYC = pkg.min >= KYC_REQUIRED_MIN;
                  const pkgLocked = pkgRequiresKYC && kycStatus !== 'approved' && kycStatus !== 'loading';
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => !pkgLocked && setSelected(pkg.id)}
                      className={`relative text-left bg-[#111111] rounded-lg p-6 border transition-all duration-300 ${
                        pkgLocked
                          ? 'opacity-60 cursor-not-allowed border-[#1A1A1A]'
                          : selected === pkg.id
                          ? 'border-primary bg-primary/5'
                          : `${pkg.color} hover:border-primary/30`
                      }`}
                    >
                      {pkg.featured && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 bg-primary text-white text-[9px] font-bold rounded tracking-widest uppercase">
                          Popular
                        </div>
                      )}
                      {pkg.badge && !pkgLocked && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 bg-[#1A1A1A] text-[#888888] text-[9px] font-bold rounded tracking-widest uppercase">
                          {pkg.badge}
                        </div>
                      )}
                      {pkgLocked && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" aria-hidden="true">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span className="text-[9px] text-[#555555] font-bold uppercase tracking-widest">KYC Required</span>
                        </div>
                      )}
                      {selected === pkg.id && !pkgLocked && (
                        <div className="absolute top-3 left-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                      )}
                      <h3 className="text-base font-extrabold text-white mb-1 mt-2">{pkg.name}</h3>
                      <p className="text-xs text-[#666666] mb-4 leading-relaxed">{pkg.description}</p>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-[10px] text-[#555555] uppercase tracking-widest">Min. Investment</span>
                          <span className="text-sm font-bold text-primary">${pkg.min.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-[#555555] uppercase tracking-widest">Return</span>
                          <span className="text-sm font-bold text-white">{pkg.return}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-[#555555] uppercase tracking-widest">Duration</span>
                          <span className="text-sm font-semibold text-white">{pkg.duration}</span>
                        </div>
                      </div>
                      <ul className="space-y-1.5">
                        {pkg.includes.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-xs text-[#666666]">
                            <svg className="w-3 h-3 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                      {pkgLocked ? (
                        <div className="mt-2 pt-3 border-t border-[#1A1A1A]">
                          <Link
                            href="/kyc"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-primary hover:underline font-semibold"
                          >
                            Complete KYC to unlock →
                          </Link>
                        </div>
                      ) : (
                        <div
                          className={`mt-2 pt-3 border-t border-[#1A1A1A] flex items-center justify-center py-2 rounded text-[10px] font-bold tracking-widest uppercase transition-all ${
                            selected === pkg.id
                              ? 'bg-primary text-white' :'bg-[#1A1A1A] text-[#888888] group-hover:bg-primary/10 group-hover:text-primary'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!pkgLocked) {
                              setSelected(pkg.id);
                              setStep('amount');
                            }
                          }}
                        >
                          {selected === pkg.id ? '✓ Selected — Continue' : 'Invest Now →'}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => selected !== null && !kycBlocked && setStep('amount')}
                disabled={selected === null || kycBlocked === true}
                className="w-full sm:w-auto px-10 py-3.5 tesla-btn-primary rounded min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {kycBlocked ? '🔒 KYC Required to Continue' : `Continue with ${selectedPkg?.name || 'Selected Package'} →`}
              </button>
            </div>
          )}

          {/* Step 2: Amount */}
          {step === 'amount' && selectedPkg && (
            <div className="max-w-md">
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#1A1A1A]">
                  <span className="text-sm font-bold text-white">{selectedPkg.name}</span>
                  <button onClick={() => setStep('select')} className="text-xs text-[#555555] hover:text-primary transition-colors">Change</button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
                    Investment Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555555] font-bold">$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={selectedPkg.min.toString()}
                      min={selectedPkg.min}
                      className="w-full pl-8 pr-4 py-3 rounded text-sm input-tesla"
                    />
                  </div>
                  <p className="text-xs text-[#555555] mt-2">
                    Minimum: <span className="text-primary font-semibold">${selectedPkg.min.toLocaleString()}</span>
                  </p>
                </div>
                {amount && Number(amount) >= selectedPkg.min && (
                  <div className="mt-4 p-4 bg-[#0A0A0A] rounded border border-[#2A2A2A]">
                    <div className="text-xs text-[#555555] uppercase tracking-widest mb-2">Projected Returns</div>
                    <div className="text-lg font-extrabold text-green-400">
                      +${Math.round(Number(amount) * 0.12).toLocaleString()} – ${Math.round(Number(amount) * 0.18).toLocaleString()}
                    </div>
                    <div className="text-xs text-[#555555] mt-1">Estimated over {selectedPkg.duration}</div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('select')} className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px]">← Back</button>
                <button
                  onClick={() => amount && Number(amount) >= selectedPkg.min && setStep('payment')}
                  disabled={!amount || Number(amount) < selectedPkg.min}
                  className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 'payment' && (
            <div className="max-w-md">
              <div className="space-y-3 mb-6">
                {[
                  { id: 'wire', icon: '🏦', name: 'Bank Wire Transfer', detail: 'USD · SWIFT available · 1–3 business days' },
                  { id: 'crypto', icon: '₿', name: 'Cryptocurrency', detail: 'BTC · ETH · USDT (TRC20/ERC20) · Instant' },
                  { id: 'card', icon: '💳', name: 'Credit / Debit Card', detail: 'Visa · Mastercard · Instant' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${
                      paymentMethod === method.id
                        ? 'border-primary bg-primary/5' :'border-[#1A1A1A] bg-[#111111] hover:border-[#2A2A2A]'
                    }`}
                  >
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-white">{method.name}</div>
                      <div className="text-xs text-[#555555]">{method.detail}</div>
                    </div>
                    {paymentMethod === method.id && (
                      <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('amount')} className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px]">← Back</button>
                <button
                  onClick={() => {
                    if (!paymentMethod) return;
                    if (paymentMethod === 'crypto') {
                      router.push(`/crypto-payment?package=${encodeURIComponent(selectedPkg?.name || '')}&amount=${amount}`);
                    } else {
                      setStep('confirm');
                    }
                  }}
                  disabled={!paymentMethod}
                  className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {paymentMethod === 'crypto' ? 'Pay with Crypto →' : 'Review Order →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && selectedPkg && (
            <div className="max-w-md">
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 mb-6 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Order Summary</h3>
                {[
                  { label: 'Package', value: selectedPkg.name },
                  { label: 'Amount', value: `$${Number(amount).toLocaleString()}` },
                  { label: 'Expected Return', value: selectedPkg.return },
                  { label: 'Duration', value: selectedPkg.duration },
                  { label: 'Payment Method', value: paymentMethod === 'wire' ? 'Bank Wire' : paymentMethod === 'crypto' ? 'Cryptocurrency' : 'Card' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-[#1A1A1A]">
                    <span className="text-xs text-[#555555] uppercase tracking-wider">{item.label}</span>
                    <span className="text-xs font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                <p className="text-xs text-[#888888] leading-relaxed">
                  By confirming, you acknowledge this is an investment with associated risks. Returns are not guaranteed. Please review our{' '}
                  <a href="#" className="text-primary hover:underline">Investment Terms</a>.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('payment')} className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px]">← Back</button>
                <Link href="/dashboard" className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px] flex items-center justify-center text-xs font-bold tracking-widest uppercase">
                  Confirm Investment ✓
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
