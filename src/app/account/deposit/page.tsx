'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase/client';

const PACKAGES = [
  {
    id: 0,
    name: 'Micro Entry',
    min: 100,
    max: 499,
    return: '4–6% p.a.',
    duration: '3 months',
    description: 'Perfect first step into the Tesla ecosystem with minimal commitment.',
    color: '#888888',
    kycRequired: false,
    badge: null,
  },
  {
    id: 1,
    name: 'Seed Plan',
    min: 500,
    max: 4999,
    return: '6–9% p.a.',
    duration: '6 months',
    description: 'Build early exposure to Tesla energy and vehicle asset pools.',
    color: '#60a5fa',
    kycRequired: false,
    badge: null,
  },
  {
    id: 2,
    name: 'Starter Energy',
    min: 5000,
    max: 24999,
    return: '8–12% p.a.',
    duration: '12 months',
    description: 'Entry-level package focused on Tesla energy products and Powerwall allocations.',
    color: '#4ade80',
    kycRequired: true,
    badge: null,
  },
  {
    id: 3,
    name: 'Growth Portfolio',
    min: 25000,
    max: 99999,
    return: '12–18% p.a.',
    duration: '24 months',
    description: 'Balanced exposure across vehicles, energy systems and early robotics.',
    color: '#E31937',
    kycRequired: true,
    badge: 'Popular',
  },
  {
    id: 4,
    name: 'Private Elite',
    min: 100000,
    max: null,
    return: 'Custom',
    duration: '36+ months',
    description: 'Bespoke high-net-worth package with private session eligibility and Optimus early access.',
    color: '#facc15',
    kycRequired: true,
    badge: 'Elite',
  },
];

const PAYMENT_METHODS = [
  { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', desc: 'Wire transfer from your bank account' },
  { id: 'crypto', label: 'Cryptocurrency', icon: '₿', desc: 'BTC, ETH, USDT accepted' },
  { id: 'card', label: 'Debit / Credit Card', icon: '💳', desc: 'Visa, Mastercard, Amex' },
];

type Step = 'package' | 'amount' | 'payment' | 'confirm' | 'success';

interface PortfolioStats {
  totalPortfolio: string;
  activeInvestments: number;
  totalReturns: string;
  referralEarnings: string;
  portfolioChange: string;
  returnsChange: string;
}

export default function DepositPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('package');
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [txRef] = useState(() => `TT-${Date.now().toString(36).toUpperCase()}`);

  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [kycStatus, setKycStatus] = useState<'loading' | 'none' | 'pending' | 'under_review' | 'approved' | 'rejected'>('loading');
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      setUserId(user.id);
      setUserEmail(user.email || '');
      setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Investor');

      // KYC status
      const { data: kyc } = await supabase
        .from('kyc_submissions')
        .select('kyc_status')
        .eq('user_id', user.id)
        .maybeSingle();
      setKycStatus(kyc?.kyc_status ?? 'none');

      // Portfolio stats
      const { data: portfolio } = await supabase
        .from('user_portfolios')
        .select('stats')
        .eq('user_id', user.id)
        .maybeSingle();
      if (portfolio?.stats) setPortfolioStats(portfolio.stats);

      // Real-time portfolio subscription
      const channel = supabase
        .channel(`deposit_portfolio_${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_portfolios',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            if (row.stats) setPortfolioStats(row.stats);
          }
        })
        .subscribe();
      channelRef.current = channel;
    };
    init();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const pkg = selectedPkg !== null ? PACKAGES.find(p => p.id === selectedPkg) : null;
  const numAmount = parseFloat(amount.replace(/,/g, '')) || 0;

  function validateAmount() {
    if (!pkg) return false;
    if (!amount || numAmount <= 0) { setAmountError('Please enter a valid amount.'); return false; }
    if (numAmount < pkg.min) { setAmountError(`Minimum for ${pkg.name} is $${pkg.min.toLocaleString()}.`); return false; }
    if (pkg.max && numAmount > pkg.max) { setAmountError(`Maximum for ${pkg.name} is $${pkg.max.toLocaleString()}.`); return false; }
    setAmountError('');
    return true;
  }

  async function handleConfirmDeposit() {
    if (!pkg || !userId) return;
    setSubmitting(true);
    try {
      // Fetch current portfolio
      const { data: portfolioRow } = await supabase
        .from('user_portfolios')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const now = new Date().toISOString();
      const depositAmt = numAmount;

      // Build updated stats
      const currentStats: PortfolioStats = portfolioRow?.stats || {
        totalPortfolio: '$0', activeInvestments: 0, totalReturns: '$0',
        referralEarnings: '$0', portfolioChange: '$0 (0%)', returnsChange: '$0 this month',
      };

      const currentTotal = parseFloat(currentStats.totalPortfolio.replace(/[$,]/g, '')) || 0;
      const newTotal = currentTotal + depositAmt;
      const currentActive = currentStats.activeInvestments || 0;

      const updatedStats = {
        ...currentStats,
        totalPortfolio: `$${newTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        activeInvestments: currentActive + 1,
        portfolioChange: `+$${depositAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (deposit)`,
      };

      // Build new transaction entry
      const newTx = {
        id: txRef,
        type: 'deposit',
        amount: `+$${depositAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        date: now,
        status: 'pending',
        description: `Deposit — ${pkg.name} via ${PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label || paymentMethod}`,
      };

      // Build new investment entry
      const newInvestment = {
        name: pkg.name,
        invested: `$${depositAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        current: `$${depositAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        return: '0.00%',
        status: 'Active',
        type: pkg.return,
      };

      const existingTransactions = portfolioRow?.transactions || [];
      const existingInvestments = portfolioRow?.investments || [];

      const upsertData = {
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        stats: updatedStats,
        transactions: [newTx, ...existingTransactions],
        investments: [...existingInvestments, newInvestment],
        chart_data: portfolioRow?.chart_data || [],
        allocation: portfolioRow?.allocation || [],
        alerts: portfolioRow?.alerts || [],
        referrals: portfolioRow?.referrals || { total: 0, history: [], pending: 0, earnings: '$0' },
        updated_at: now,
      };

      await supabase
        .from('user_portfolios')
        .upsert(upsertData, { onConflict: 'user_id' });

      setPortfolioStats(updatedStats);
      setStep('success');
    } catch {
      // silently handle
    } finally {
      setSubmitting(false);
    }
  }

  const stepIndex = (['package', 'amount', 'payment', 'confirm'] as Step[]).indexOf(step);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <div className="pt-24 pb-20 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8 text-xs text-[#555555]">
            <Link href="/account" className="hover:text-white transition-colors">Account</Link>
            <span>/</span>
            <span className="text-[#888888]">Deposit</span>
          </div>

          {/* Page header */}
          <div className="mb-8">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase mb-3 block">Fund Your Portfolio</span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
              Make a <span className="text-primary" style={{ textShadow: '0 0 20px rgba(227,25,55,0.4)' }}>Deposit</span>
            </h1>
            <p className="text-[#666666] text-sm max-w-lg">
              Select an investment package, enter your amount, and complete payment to fund your portfolio.
            </p>
          </div>

          {/* Live balance strip */}
          {portfolioStats && (
            <div className="mb-8 p-4 rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] flex flex-wrap gap-6">
              <div>
                <p className="text-[10px] text-[#555555] uppercase tracking-widest mb-1">Portfolio Balance</p>
                <p className="text-lg font-bold text-white">{portfolioStats.totalPortfolio}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#555555] uppercase tracking-widest mb-1">Active Investments</p>
                <p className="text-lg font-bold text-white">{portfolioStats.activeInvestments}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#555555] uppercase tracking-widest mb-1">Total Returns</p>
                <p className="text-lg font-bold text-[#4ade80]">{portfolioStats.totalReturns}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                <span className="text-[10px] text-[#4ade80] font-semibold tracking-widest uppercase">Live</span>
              </div>
            </div>
          )}

          {/* Progress steps (hidden on success) */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 mb-10">
              {(['package', 'amount', 'payment', 'confirm'] as const).map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s
                        ? 'bg-primary text-white shadow-[0_0_12px_rgba(227,25,55,0.5)]'
                        : stepIndex > i
                        ? 'bg-primary/20 text-primary border border-primary/40' :'bg-[#1A1A1A] text-[#444444] border border-[#2A2A2A]'
                    }`}>
                      {stepIndex > i ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wider uppercase hidden sm:block ${step === s ? 'text-white' : 'text-[#444444]'}`}>
                      {s === 'package' ? 'Package' : s === 'amount' ? 'Amount' : s === 'payment' ? 'Payment' : 'Confirm'}
                    </span>
                  </div>
                  {i < 3 && <div className={`flex-1 h-px ${stepIndex > i ? 'bg-primary/50' : 'bg-[#1A1A1A]'}`} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ── STEP 1: Package Selection ── */}
          {step === 'package' && (
            <div>
              <h2 className="text-sm font-bold text-[#888888] uppercase tracking-widest mb-5">Choose Investment Package</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {PACKAGES.map((p) => {
                  const locked = p.kycRequired && kycStatus !== 'approved' && kycStatus !== 'loading';
                  return (
                    <button
                      key={p.id}
                      onClick={() => !locked && setSelectedPkg(p.id)}
                      disabled={locked}
                      className={`relative text-left rounded-lg p-5 border transition-all duration-300 ${
                        locked
                          ? 'opacity-50 cursor-not-allowed bg-[#0D0D0D] border-[#1A1A1A]'
                          : selectedPkg === p.id
                          ? 'bg-[#111111] border-primary shadow-[0_0_20px_rgba(227,25,55,0.15)]'
                          : 'bg-[#0D0D0D] border-[#1A1A1A] hover:border-[#2A2A2A]'
                      }`}
                    >
                      {p.badge && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-bold rounded tracking-widest uppercase"
                          style={{ background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}44` }}>
                          {p.badge}
                        </span>
                      )}
                      {locked && (
                        <span className="absolute top-3 right-3 text-[#444444]">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </span>
                      )}
                      <div className="w-2 h-2 rounded-full mb-3" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}66` }} />
                      <p className="text-sm font-bold text-white mb-1">{p.name}</p>
                      <p className="text-[10px] text-[#555555] mb-3 leading-relaxed">{p.description}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-[#444444] uppercase tracking-widest">Min. Deposit</p>
                          <p className="text-xs font-bold" style={{ color: p.color }}>${p.min.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-[#444444] uppercase tracking-widest">Returns</p>
                          <p className="text-xs font-semibold text-white">{p.return}</p>
                        </div>
                      </div>
                      <p className="text-[9px] text-[#444444] mt-2">Duration: {p.duration}</p>
                      {selectedPkg === p.id && (
                        <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ boxShadow: `inset 0 0 0 1px ${p.color}` }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* KYC notice */}
              {kycStatus !== 'approved' && kycStatus !== 'loading' && (
                <div className="mb-6 p-4 rounded-lg border border-yellow-400/20 bg-yellow-400/5 flex items-start gap-3">
                  <span className="text-lg shrink-0">🔒</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-yellow-400 mb-1">KYC Required for $5,000+ Tiers</p>
                    <p className="text-[11px] text-[#666666]">
                      {kycStatus === 'none' ?'Complete identity verification to unlock Starter Energy, Growth Portfolio, and Private Elite tiers.'
                        : kycStatus === 'pending'|| kycStatus === 'under_review' ?'Your KYC is under review. Higher tiers will unlock once approved.' :'Your KYC was rejected. Please resubmit to unlock higher tiers.'}
                    </p>
                  </div>
                  <Link href="/kyc" className="shrink-0 px-3 py-1.5 text-[10px] font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded tracking-widest uppercase hover:bg-yellow-400/20 transition-colors">
                    {kycStatus === 'none' ? 'Start KYC' : 'View Status'}
                  </Link>
                </div>
              )}

              <button
                onClick={() => selectedPkg !== null && setStep('amount')}
                disabled={selectedPkg === null}
                className="px-8 py-3 text-xs font-bold tracking-widest uppercase rounded transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                style={selectedPkg !== null ? { background: '#E31937', color: '#fff', boxShadow: '0 0 20px rgba(227,25,55,0.4)' } : { background: '#1A1A1A', color: '#555' }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 2: Amount ── */}
          {step === 'amount' && pkg && (
            <div className="max-w-md">
              <button onClick={() => setStep('package')} className="flex items-center gap-2 text-xs text-[#555555] hover:text-white transition-colors mb-6">
                ← Back
              </button>
              <h2 className="text-sm font-bold text-[#888888] uppercase tracking-widest mb-5">Enter Deposit Amount</h2>

              <div className="p-5 rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: pkg.color, boxShadow: `0 0 8px ${pkg.color}66` }} />
                  <div>
                    <p className="text-sm font-bold text-white">{pkg.name}</p>
                    <p className="text-[10px] text-[#555555]">{pkg.return} · {pkg.duration}</p>
                  </div>
                </div>
                <p className="text-[11px] text-[#555555]">
                  Min: <span className="text-white font-semibold">${pkg.min.toLocaleString()}</span>
                  {pkg.max && <> · Max: <span className="text-white font-semibold">${pkg.max.toLocaleString()}</span></>}
                </p>
              </div>

              <div className="mb-2">
                <label className="text-[10px] text-[#555555] uppercase tracking-widest block mb-2">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555555] font-bold text-sm">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
                    placeholder={pkg.min.toString()}
                    min={pkg.min}
                    className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg pl-8 pr-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                {amountError && <p className="text-xs text-red-400 mt-2">{amountError}</p>}
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2 mb-6 mt-3">
                {[pkg.min, pkg.min * 2, pkg.min * 5].filter(v => !pkg.max || v <= pkg.max).map((v) => (
                  <button
                    key={v}
                    onClick={() => { setAmount(v.toString()); setAmountError(''); }}
                    className="px-3 py-1.5 text-[10px] font-semibold rounded border border-[#2A2A2A] text-[#888888] hover:border-primary/40 hover:text-white transition-colors"
                  >
                    ${v.toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                onClick={() => validateAmount() && setStep('payment')}
                className="px-8 py-3 text-xs font-bold tracking-widest uppercase rounded transition-all duration-300"
                style={{ background: '#E31937', color: '#fff', boxShadow: '0 0 20px rgba(227,25,55,0.4)' }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 3: Payment Method ── */}
          {step === 'payment' && pkg && (
            <div className="max-w-md">
              <button onClick={() => setStep('amount')} className="flex items-center gap-2 text-xs text-[#555555] hover:text-white transition-colors mb-6">
                ← Back
              </button>
              <h2 className="text-sm font-bold text-[#888888] uppercase tracking-widest mb-5">Select Payment Method</h2>

              <div className="flex flex-col gap-3 mb-8">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 text-left ${
                      paymentMethod === m.id
                        ? 'border-primary bg-primary/5' :'border-[#1A1A1A] bg-[#0D0D0D] hover:border-[#2A2A2A]'
                    }`}
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{m.label}</p>
                      <p className="text-[11px] text-[#555555]">{m.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      paymentMethod === m.id ? 'border-primary' : 'border-[#333333]'
                    }`}>
                      {paymentMethod === m.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => paymentMethod && setStep('confirm')}
                disabled={!paymentMethod}
                className="px-8 py-3 text-xs font-bold tracking-widest uppercase rounded transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                style={paymentMethod ? { background: '#E31937', color: '#fff', boxShadow: '0 0 20px rgba(227,25,55,0.4)' } : { background: '#1A1A1A', color: '#555' }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 4: Confirm ── */}
          {step === 'confirm' && pkg && (
            <div className="max-w-md">
              <button onClick={() => setStep('payment')} className="flex items-center gap-2 text-xs text-[#555555] hover:text-white transition-colors mb-6">
                ← Back
              </button>
              <h2 className="text-sm font-bold text-[#888888] uppercase tracking-widest mb-5">Review & Confirm</h2>

              <div className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] overflow-hidden mb-6">
                <div className="px-5 py-3 border-b border-[#1A1A1A]">
                  <p className="text-[10px] text-[#555555] uppercase tracking-widest">Transaction Reference</p>
                  <p className="text-xs font-mono font-bold text-primary mt-0.5">{txRef}</p>
                </div>
                {[
                  { label: 'Package', value: pkg.name },
                  { label: 'Deposit Amount', value: `$${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                  { label: 'Payment Method', value: PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label || '' },
                  { label: 'Expected Return', value: pkg.return },
                  { label: 'Lock-in Duration', value: pkg.duration },
                  { label: 'Account', value: userEmail },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3 border-b border-[#1A1A1A] last:border-0">
                    <p className="text-[11px] text-[#555555]">{row.label}</p>
                    <p className="text-xs font-semibold text-white">{row.value}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg border border-[#2A2A2A] bg-[#111111] mb-6">
                <p className="text-[11px] text-[#666666] leading-relaxed">
                  By confirming, your deposit will be recorded and your portfolio balance updated immediately. 
                  Funds are subject to the selected package terms and lock-in period.
                </p>
              </div>

              <button
                onClick={handleConfirmDeposit}
                disabled={submitting}
                className="w-full py-3.5 text-xs font-bold tracking-widest uppercase rounded transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ background: '#E31937', color: '#fff', boxShadow: '0 0 24px rgba(227,25,55,0.5)' }}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Processing…
                  </>
                ) : 'Confirm Deposit'}
              </button>
            </div>
          )}

          {/* ── STEP 5: Success ── */}
          {step === 'success' && pkg && (
            <div className="max-w-md mx-auto text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 flex items-center justify-center mx-auto mb-6"
                style={{ boxShadow: '0 0 32px rgba(74,222,128,0.2)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-2">Deposit Confirmed!</h2>
              <p className="text-[#666666] text-sm mb-6">
                Your deposit has been recorded and your portfolio balance updated.
              </p>

              <div className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-5 mb-6 text-left">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-[#555555] uppercase tracking-widest">Reference</p>
                  <p className="text-xs font-mono font-bold text-primary">{txRef}</p>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-[#555555] uppercase tracking-widest">Amount</p>
                  <p className="text-sm font-bold text-[#4ade80]">
                    +${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-[#555555] uppercase tracking-widest">Package</p>
                  <p className="text-xs font-semibold text-white">{pkg.name}</p>
                </div>
                {portfolioStats && (
                  <div className="flex items-center justify-between pt-3 border-t border-[#1A1A1A]">
                    <p className="text-[10px] text-[#555555] uppercase tracking-widest">New Balance</p>
                    <p className="text-sm font-bold text-white">{portfolioStats.totalPortfolio}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/account"
                  className="flex-1 py-3 text-xs font-bold tracking-widest uppercase rounded border border-[#2A2A2A] text-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 text-center"
                >
                  View Account
                </Link>
                <Link
                  href="/dashboard"
                  className="flex-1 py-3 text-xs font-bold tracking-widest uppercase rounded text-white text-center transition-all duration-300"
                  style={{ background: '#E31937', boxShadow: '0 0 20px rgba(227,25,55,0.4)' }}
                >
                  Go to Dashboard
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
