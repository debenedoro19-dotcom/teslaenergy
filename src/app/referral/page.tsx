'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/portfolioStore';

const TIERS = [
  { name: 'Bronze', min: 1, max: 4, rewardPerReferral: 70, label: '1–4 referrals', reward: '$40–$100 / referral', color: '#CD7F32', bg: 'rgba(205,127,50,0.08)', border: 'rgba(205,127,50,0.25)' },
  { name: 'Silver', min: 5, max: 9, rewardPerReferral: 120, label: '5–9 referrals', reward: '$120 / referral', color: '#C0C0C0', bg: 'rgba(192,192,192,0.08)', border: 'rgba(192,192,192,0.25)' },
  { name: 'Gold', min: 10, max: 24, rewardPerReferral: 200, label: '10–24 referrals', reward: '$200 / referral', color: '#FFD700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.25)' },
  { name: 'Platinum', min: 25, max: Infinity, rewardPerReferral: 350, label: '25+ referrals', reward: '$350 + VIP access', color: '#E5E4E2', bg: 'rgba(229,228,226,0.08)', border: 'rgba(229,228,226,0.25)' },
];

function getTier(count: number) {
  return TIERS.find((t) => count >= t.min && count <= t.max) ?? null;
}

function calcEstimatedPayout(count: number): string {
  if (count === 0) return '$0';
  const tier = getTier(count);
  if (!tier) return '$0';
  const payout = count * tier.rewardPerReferral;
  return `$${payout.toLocaleString()}`;
}

interface ReferralHistory {
  name: string;
  date: string;
  status: string;
  reward: string;
  statusColor: string;
  invested?: boolean;
}

interface ReferralData {
  total: number;
  pending: number;
  earnings: string;
  history: ReferralHistory[];
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  routing_number: string;
  payout_status: 'pending' | 'processing' | 'paid' | 'rejected';
  notes: string;
  requested_at: string;
  processed_at: string | null;
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:    { label: 'Pending',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  processing: { label: 'Processing', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)' },
  paid:       { label: 'Paid',       color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
  rejected:   { label: 'Rejected',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
};

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [referralData, setReferralData] = useState<ReferralData>({ total: 0, pending: 0, earnings: '$0', history: [] });
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  // Withdrawal state
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: '',
    routing_number: '',
  });

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      setLoading(false);
      setWithdrawalsLoading(false);
      return;
    }
    setUser(currentUser);

    const supabase = createClient();

    let cancelled = false;

    async function fetchReferralData() {
      try {
        const { data: profileRow } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', currentUser!.email)
          .maybeSingle();

        if (!profileRow?.id) {
          setLoading(false);
          setWithdrawalsLoading(false);
          return;
        }

        const { data: portfolioRow } = await supabase
          .from('user_portfolios')
          .select('referrals')
          .eq('user_id', profileRow.id)
          .maybeSingle();

        if (cancelled) return;

        if (portfolioRow?.referrals) {
          setReferralData(portfolioRow.referrals as ReferralData);
        }
        setLoading(false);

        // Fetch withdrawal requests
        const { data: wdRows } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('user_id', profileRow.id)
          .order('requested_at', { ascending: false });

        if (cancelled) return;

        setWithdrawals((wdRows as WithdrawalRequest[]) || []);
        setWithdrawalsLoading(false);

        // Guard: do not create channel if effect was already cleaned up
        if (cancelled) return;

        // Real-time subscription for portfolio
        const channel = supabase
          .channel(`referral_${profileRow.id}_${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_portfolios',
              filter: `user_id=eq.${profileRow.id}`,
            },
            (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const newReferrals = (payload.new as any)?.referrals;
                if (newReferrals) {
                  setReferralData(newReferrals as ReferralData);
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'withdrawal_requests',
              filter: `user_id=eq.${profileRow.id}`,
            },
            async () => {
              const { data: updated } = await supabase
                .from('withdrawal_requests')
                .select('*')
                .eq('user_id', profileRow.id)
                .order('requested_at', { ascending: false });
              setWithdrawals((updated as WithdrawalRequest[]) || []);
            }
          )
          .subscribe((status) => {
            if (!cancelled) {
              setRealtimeConnected(status === 'SUBSCRIBED');
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('Referral data fetch error:', err);
        setLoading(false);
        setWithdrawalsLoading(false);
      }
    }

    fetchReferralData();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  if (!mounted) return null;

  const totalReferrals = referralData.total || 0;
  const activeReferrals = Math.max(0, totalReferrals - (referralData.pending || 0));
  const pendingInvites = referralData.pending || 0;
  const earnings = referralData.earnings || '$0';
  const history: ReferralHistory[] = referralData.history || [];

  // Only count referrals who have actually invested/purchased
  const investedReferrals = history.filter((r) => r.invested === true);
  const investedCount = investedReferrals.length;
  const currentTier = getTier(investedCount);
  const estimatedPayout = calcEstimatedPayout(investedCount);

  const referralCode = user
    ? 'TESLA-' + user.name.split(' ').map((n) => n[0]).join('').toUpperCase() + '-' + user.id.slice(-4).toUpperCase()
    : 'TESLA-XXXX';
  const referralLink = `https://teslaenerg6773.builtwithrocket.new/register?ref=${referralCode}`;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(referralLink)?.then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const handleWithdrawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWithdrawForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    if (!user) return;

    const amount = parseFloat(withdrawForm.amount);
    if (!amount || amount <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount.');
      return;
    }
    if (!withdrawForm.bank_name.trim() || !withdrawForm.account_number.trim() || !withdrawForm.account_name.trim()) {
      setWithdrawError('Please fill in all required bank details.');
      return;
    }

    setWithdrawSubmitting(true);
    try {
      const supabase = createClient();
      const { data: profileRow } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (!profileRow?.id) {
        setWithdrawError('User profile not found. Please try again.');
        setWithdrawSubmitting(false);
        return;
      }

      const { error } = await supabase.from('withdrawal_requests').insert({
        user_id: profileRow.id,
        user_email: user.email,
        user_name: user.name,
        amount,
        bank_name: withdrawForm.bank_name.trim(),
        account_number: withdrawForm.account_number.trim(),
        account_name: withdrawForm.account_name.trim(),
        routing_number: withdrawForm.routing_number.trim(),
        payout_status: 'pending',
      });

      if (error) {
        setWithdrawError('Failed to submit request. Please try again.');
      } else {
        setWithdrawSuccess(true);
        setWithdrawForm({ amount: '', bank_name: '', account_number: '', account_name: '', routing_number: '' });
        setShowWithdrawForm(false);
        setTimeout(() => setWithdrawSuccess(false), 4000);
      }
    } catch {
      setWithdrawError('An unexpected error occurred. Please try again.');
    }
    setWithdrawSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <div className="pt-24 pb-20 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">

          {/* Page header */}
          <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
            <div>
              <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase mb-3 block">Referral Program</span>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">
                Earn by <span className="gradient-text-primary">Referring</span>
              </h1>
              <p className="text-[#666666] text-sm max-w-xl">
                Invite friends to invest in the Tesla ecosystem. Earnings are credited only when your referee makes an actual investment, stock purchase, or inventory buy.
              </p>
            </div>
            {/* Live indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-wider uppercase transition-all ${
              realtimeConnected
                ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-[#2A2A2A] bg-[#111111] text-[#555555]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? 'bg-green-400 animate-pulse' : 'bg-[#444444]'}`} />
              {realtimeConnected ? 'Live' : 'Connecting…'}
            </div>
          </div>

          {/* Earnings notice */}
          <div className="mb-8 flex items-start gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              <span className="font-bold text-amber-400">Earnings Policy:</span> Referral rewards are only credited when your referred user completes an actual investment, purchases a stock, or buys inventory — not on signup alone.
            </p>
          </div>

          {/* Stats grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5 text-center animate-pulse">
                  <div className="h-7 w-16 bg-[#1A1A1A] rounded mx-auto mb-2" />
                  <div className="h-3 w-20 bg-[#1A1A1A] rounded mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {[
                { label: 'Total Referrals', value: String(totalReferrals) },
                { label: 'Active Referrals', value: String(activeReferrals) },
                { label: 'Invested Referrals', value: String(investedCount) },
                { label: 'Total Earnings', value: earnings },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5 text-center">
                  <div className="text-2xl font-extrabold text-white mb-1">{stat.value}</div>
                  <div className="text-[10px] text-[#555555] uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Referral link */}
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 mb-6">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Your Referral Link</h2>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-sm text-[#888888] font-mono truncate select-all">
                {referralLink}
              </div>
              <button
                onClick={handleCopy}
                className={`px-5 py-3 rounded text-xs font-bold tracking-widest uppercase transition-all min-w-[90px] ${
                  copied ? 'bg-green-500 text-white' : 'tesla-btn-primary'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#555555]">Your code:</span>
              <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded text-xs font-bold text-primary tracking-widest">
                {referralCode}
              </span>
            </div>
          </div>

          {/* Tier system + Estimated payout side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Tiers — spans 2 cols */}
            <div className="lg:col-span-2 bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
              <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-5">Earnings Per Tier</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TIERS.map((tier) => {
                  const isCurrent = currentTier?.name === tier.name;
                  return (
                    <div
                      key={tier.name}
                      className="p-4 rounded-lg border text-center transition-all"
                      style={{
                        background: isCurrent ? tier.bg : '#0D0D0D',
                        borderColor: isCurrent ? tier.border : '#1A1A1A',
                      }}
                    >
                      <div className="text-2xl mb-2" style={{ color: tier.color }}>◆</div>
                      <div className="text-sm font-bold text-white mb-1">{tier.name}</div>
                      <div className="text-[10px] text-[#555555] mb-2 uppercase tracking-wider">{tier.label}</div>
                      <div className="text-xs text-[#888888] leading-tight">{tier.reward}</div>
                      {isCurrent && (
                        <div className="mt-2 px-2 py-0.5 bg-primary text-white text-[9px] font-bold rounded tracking-wider uppercase">
                          Current
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Estimated payout */}
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-2">Estimated Payout</h2>
                <p className="text-[#555555] text-xs mb-6 leading-relaxed">
                  Based on invested referrals × tier rate. Only referees who made a purchase count.
                </p>
              </div>
              <div>
                {loading ? (
                  <div className="h-12 w-32 bg-[#1A1A1A] rounded animate-pulse mb-3" />
                ) : (
                  <div className="text-5xl font-extrabold text-white mb-1 tracking-tight">{estimatedPayout}</div>
                )}
                <div className="text-xs text-[#555555] mb-4">
                  {currentTier
                    ? `${currentTier.name} tier · $${currentTier.rewardPerReferral}/referral`
                    : 'No qualifying referrals yet'}
                </div>
                {currentTier && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: currentTier.color }} />
                    <span className="text-xs font-semibold" style={{ color: currentTier.color }}>
                      {currentTier.name} Tier Active
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── WITHDRAWAL SECTION ── */}
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg mb-6 overflow-hidden">
            <div className="p-5 border-b border-[#1A1A1A] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-widest">Withdrawal Requests</h2>
                <p className="text-[10px] text-[#555555] mt-1">Request a payout to your verified bank account</p>
              </div>
              <button
                onClick={() => { setShowWithdrawForm((v) => !v); setWithdrawError(''); }}
                className="tesla-btn-primary px-4 py-2 text-xs font-bold tracking-widest uppercase rounded"
              >
                {showWithdrawForm ? 'Cancel' : '+ Request Payout'}
              </button>
            </div>

            {/* Success banner */}
            {withdrawSuccess && (
              <div className="mx-5 mt-4 flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/25 rounded text-xs text-green-400 font-semibold">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Withdrawal request submitted successfully. We will process it within 3–5 business days.
              </div>
            )}

            {/* Withdrawal form */}
            {showWithdrawForm && (
              <form onSubmit={handleWithdrawSubmit} className="p-5 border-b border-[#1A1A1A] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-[#555555] uppercase tracking-widest mb-1.5">Amount (USD) *</label>
                    <input
                      type="number"
                      name="amount"
                      value={withdrawForm.amount}
                      onChange={handleWithdrawChange}
                      placeholder="0.00"
                      min="1"
                      step="0.01"
                      required
                      className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-sm text-white placeholder-[#444444] focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#555555] uppercase tracking-widest mb-1.5">Bank Name *</label>
                    <input
                      type="text"
                      name="bank_name"
                      value={withdrawForm.bank_name}
                      onChange={handleWithdrawChange}
                      placeholder="e.g. Chase Bank"
                      required
                      className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-sm text-white placeholder-[#444444] focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#555555] uppercase tracking-widest mb-1.5">Account Holder Name *</label>
                    <input
                      type="text"
                      name="account_name"
                      value={withdrawForm.account_name}
                      onChange={handleWithdrawChange}
                      placeholder="Full name on account"
                      required
                      className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-sm text-white placeholder-[#444444] focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#555555] uppercase tracking-widest mb-1.5">Account Number *</label>
                    <input
                      type="text"
                      name="account_number"
                      value={withdrawForm.account_number}
                      onChange={handleWithdrawChange}
                      placeholder="••••••••••"
                      required
                      className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-sm text-white placeholder-[#444444] focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-[#555555] uppercase tracking-widest mb-1.5">Routing Number</label>
                    <input
                      type="text"
                      name="routing_number"
                      value={withdrawForm.routing_number}
                      onChange={handleWithdrawChange}
                      placeholder="9-digit routing number (optional)"
                      className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-sm text-white placeholder-[#444444] focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                {withdrawError && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded">{withdrawError}</p>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={withdrawSubmitting}
                    className="tesla-btn-primary px-6 py-2.5 text-xs font-bold tracking-widest uppercase rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawSubmitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                  <p className="text-[10px] text-[#444444]">Payouts processed within 3–5 business days after admin approval.</p>
                </div>
              </form>
            )}

            {/* Withdrawal history */}
            {withdrawalsLoading ? (
              <div className="divide-y divide-[#1A1A1A]">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-4 animate-pulse">
                    <div className="h-3 w-32 bg-[#1A1A1A] rounded" />
                    <div className="h-5 w-20 bg-[#1A1A1A] rounded-full" />
                  </div>
                ))}
              </div>
            ) : withdrawals.length > 0 ? (
              <div className="divide-y divide-[#1A1A1A]">
                {withdrawals.map((wd) => {
                  const s = STATUS_STYLES[wd.payout_status] ?? STATUS_STYLES.pending;
                  const dateStr = wd.requested_at ? new Date(wd.requested_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
                  return (
                    <div key={wd.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-[#141414] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-[#0D0D0D] border border-[#1A1A1A] flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-[#555555]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">${wd.amount.toLocaleString()}</div>
                          <div className="text-xs text-[#444444]">{wd.bank_name} · {dateStr}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {wd.processed_at && (
                          <span className="text-[10px] text-[#444444]">
                            Processed {new Date(wd.processed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        <span
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                          style={{ color: s.color, background: s.bg, borderColor: s.border }}
                        >
                          {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div className="w-12 h-12 rounded-full bg-[#0D0D0D] border border-[#1A1A1A] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#444444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-[#555555]">No withdrawal requests yet</p>
                <p className="text-xs text-[#3A3A3A] max-w-xs text-center">
                  Once you have qualifying earnings, click &quot;Request Payout&quot; to submit a withdrawal.
                </p>
              </div>
            )}
          </div>

          {/* Referral history */}
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg overflow-hidden">
            <div className="p-5 border-b border-[#1A1A1A] flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-widest">Active Referrals</h2>
              {history.length > 0 && (
                <span className="text-[10px] text-[#555555] uppercase tracking-widest">{history.length} total</span>
              )}
            </div>

            {loading ? (
              <div className="divide-y divide-[#1A1A1A]">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1A1A1A]" />
                      <div>
                        <div className="h-3 w-28 bg-[#1A1A1A] rounded mb-1.5" />
                        <div className="h-2.5 w-20 bg-[#1A1A1A] rounded" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-3 w-16 bg-[#1A1A1A] rounded mb-1.5 ml-auto" />
                      <div className="h-2.5 w-12 bg-[#1A1A1A] rounded ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : history.length > 0 ? (
              <div className="divide-y divide-[#1A1A1A]">
                {history.map((ref, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-[#141414] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-xs font-bold text-[#666666]">
                        {ref.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{ref.name}</span>
                          {ref.invested ? (
                            <span className="px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[9px] font-bold text-green-400 uppercase tracking-wider">Invested</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-[9px] font-bold text-[#555555] uppercase tracking-wider">Signed Up</span>
                          )}
                        </div>
                        <div className="text-xs text-[#444444]">{ref.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${ref.invested ? (ref.statusColor || 'text-white') : 'text-[#444444]'}`}>
                        {ref.invested ? ref.reward : 'Pending investment'}
                      </div>
                      <div className={`text-xs ${ref.statusColor || 'text-[#555555]'}`}>{ref.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <div className="w-14 h-14 rounded-full bg-[#0D0D0D] border border-[#1A1A1A] flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#555555] mb-1">No referrals yet</p>
                  <p className="text-xs text-[#3A3A3A] max-w-xs">
                    Share your referral link to start earning. Your referral history will appear here in real time.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link href="/dashboard" className="text-xs text-[#555555] hover:text-white transition-colors tracking-wider uppercase">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
