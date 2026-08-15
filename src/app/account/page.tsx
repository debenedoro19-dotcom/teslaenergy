'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Tab = 'overview' | 'kyc' | 'portfolio' | 'balance' | 'withdrawals' | 'transactions' | 'referrals';

interface KYCData {
  kyc_status: 'pending' | 'under_review' | 'approved' | 'rejected' | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  country: string | null;
  id_type: string | null;
}

interface PortfolioData {
  stats: {
    totalPortfolio: string;
    activeInvestments: number;
    totalReturns: string;
    referralEarnings: string;
    portfolioChange: string;
    returnsChange: string;
  };
  investments: Array<{
    name: string;
    invested: string;
    current: string;
    return: string;
    status: string;
    type?: string;
  }>;
  allocation: Array<{ name: string; value: number; color: string }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: string;
    date: string;
    status: string;
    description?: string;
  }>;
  referrals: {
    total: number;
    pending: number;
    earnings: string;
    history: Array<{ name: string; date: string; status: string; reward: string }>;
  };
}

interface BalanceData {
  available_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  total_returns: number;
}

interface BalanceTx {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  payment_method: string | null;
  wallet_address: string | null;
  bank_name: string | null;
  account_number: string | null;
  created_at: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  payout_status: string;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
}

const KYC_STATUS_CONFIG = {
  approved: { label: 'Verified', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.25)', icon: '✓' },
  pending: { label: 'Pending Review', color: '#facc15', bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.25)', icon: '⏳' },
  under_review: { label: 'Under Review', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)', icon: '🔍' },
  rejected: { label: 'Rejected', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', icon: '✗' },
  none: { label: 'Not Submitted', color: '#888888', bg: 'rgba(136,136,136,0.1)', border: 'rgba(136,136,136,0.25)', icon: '○' },
};

const PAYOUT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#facc15' },
  processing: { label: 'Processing', color: '#60a5fa' },
  paid: { label: 'Paid', color: '#4ade80' },
  rejected: { label: 'Rejected', color: '#f87171' },
};

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [initials, setInitials] = useState('U');
  const [loading, setLoading] = useState(true);

  const [kyc, setKyc] = useState<KYCData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [balanceTxs, setBalanceTxs] = useState<BalanceTx[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [withdrawWallet, setWithdrawWallet] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');
  const [balanceActionMsg, setBalanceActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (cancelled) return;
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email || '');
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Investor';
      setUserName(name);
      const parts = name.split(' ');
      setInitials(parts.map((p: string) => p[0]).join('').toUpperCase().slice(0, 2));

      await loadAllData(user.id, user.email || '');
      if (cancelled) return;
      setLoading(false);

      // Real-time portfolio subscription
      const channel = supabase
        .channel(`account_portfolio_${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_portfolios',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            setPortfolio({
              stats: row.stats,
              investments: row.investments || [],
              allocation: row.allocation || [],
              transactions: row.transactions || [],
              referrals: row.referrals || { total: 0, pending: 0, earnings: '$0', history: [] },
            });
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'kyc_submissions',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          const row = payload.new as any;
          setKyc({
            kyc_status: row.kyc_status,
            submitted_at: row.submitted_at,
            reviewed_at: row.reviewed_at,
            admin_notes: row.admin_notes,
            country: row.country,
            id_type: row.id_type,
          });
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'withdrawal_requests',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          // Reload withdrawals on any change
          supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('requested_at', { ascending: false })
            .then(({ data }) => { if (data) setWithdrawals(data); });
        })
        .subscribe();
      channelRef.current = channel;
    });

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  async function loadAllData(uid: string, email: string) {
    try {
      // KYC
      const { data: kycData } = await supabase
        .from('kyc_submissions')
        .select('kyc_status, submitted_at, reviewed_at, admin_notes, country, id_type')
        .eq('user_id', uid)
        .maybeSingle();
      setKyc(kycData || null);

      // Portfolio
      const { data: portfolioRow } = await supabase
        .from('user_portfolios')
        .select('stats, investments, allocation, transactions, referrals')
        .eq('user_id', uid)
        .maybeSingle();

      if (portfolioRow) {
        setPortfolio({
          stats: portfolioRow.stats,
          investments: portfolioRow.investments || [],
          allocation: portfolioRow.allocation || [],
          transactions: portfolioRow.transactions || [],
          referrals: portfolioRow.referrals || { total: 0, pending: 0, earnings: '$0', history: [] },
        });
      }

      // Withdrawals
      const { data: withdrawalData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', uid)
        .order('requested_at', { ascending: false });
      setWithdrawals(withdrawalData || []);

      // Balance
      const { data: balanceRow } = await supabase
        .from('user_balance')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      setBalance(balanceRow || null);

      // Balance transactions
      const { data: balanceTxData } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50);
      setBalanceTxs(balanceTxData || []);
    } catch (err) {
      console.error('Account data load error:', err);
    }
  }

  async function handleDeposit() {
    if (!depositAmount || Number(depositAmount) <= 0 || !depositMethod) return;
    setBalanceLoading(true);
    setBalanceActionMsg(null);
    try {
      const { error } = await supabase.from('balance_transactions').insert({
        user_id: userId,
        type: 'deposit',
        amount: Number(depositAmount),
        status: 'pending',
        description: 'Manual deposit',
        payment_method: depositMethod,
      });
      if (error) throw error;
      setBalanceActionMsg({ type: 'success', text: 'Deposit request submitted. Funds will be credited after admin confirmation.' });
      setDepositAmount('');
      setDepositMethod('');
      // Refresh balance txs
      const { data } = await supabase.from('balance_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      setBalanceTxs(data || []);
    } catch (err: any) {
      setBalanceActionMsg({ type: 'error', text: err.message || 'Failed to submit deposit.' });
    } finally {
      setBalanceLoading(false);
    }
  }

  async function handleWithdraw() {
    const avail = balance?.available_balance || 0;
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return;
    if (Number(withdrawAmount) > avail) {
      setBalanceActionMsg({ type: 'error', text: 'Withdrawal amount exceeds available balance.' });
      return;
    }
    if (!withdrawMethod) {
      setBalanceActionMsg({ type: 'error', text: 'Please select a withdrawal method.' });
      return;
    }
    setBalanceLoading(true);
    setBalanceActionMsg(null);
    try {
      const { error } = await supabase.from('balance_transactions').insert({
        user_id: userId,
        type: 'withdrawal',
        amount: Number(withdrawAmount),
        status: 'pending',
        description: 'Balance withdrawal',
        payment_method: withdrawMethod,
        wallet_address: withdrawMethod === 'crypto' ? withdrawWallet : null,
        bank_name: withdrawMethod === 'bank' ? withdrawBank : null,
        account_number: withdrawMethod === 'bank' ? withdrawAccount : null,
        account_name: withdrawMethod === 'bank' ? withdrawAccountName : null,
      });
      if (error) throw error;
      setBalanceActionMsg({ type: 'success', text: 'Withdrawal request submitted. Processing within 1–3 business days.' });
      setWithdrawAmount('');
      setWithdrawWallet('');
      setWithdrawBank('');
      setWithdrawAccount('');
      setWithdrawAccountName('');
      const { data } = await supabase.from('balance_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      setBalanceTxs(data || []);
    } catch (err: any) {
      setBalanceActionMsg({ type: 'error', text: err.message || 'Failed to submit withdrawal.' });
    } finally {
      setBalanceLoading(false);
    }
  }

  const kycStatus = kyc?.kyc_status || 'none';
  const kycConfig = KYC_STATUS_CONFIG[kycStatus as keyof typeof KYC_STATUS_CONFIG] || KYC_STATUS_CONFIG.none;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'kyc', label: 'KYC Status' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'balance', label: 'Balance' },
    { id: 'withdrawals', label: 'Withdrawals' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'referrals', label: 'Referrals' },
  ];

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Top bar */}
      <div className="border-b border-[#1A1A1A] bg-[#0A0A0A]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <svg width="20" height="20" viewBox="0 0 342 512" fill="currentColor" className="text-primary" aria-hidden="true">
                <path d="M0 57.3C0 57.3 57.3 0 171 0s171 57.3 171 57.3L285 85.5s-28.5-28.5-114-28.5S57 85.5 57 85.5L0 57.3zM171 512L57 85.5s28.5 28.5 114 28.5 114-28.5 114-28.5L171 512z" />
              </svg>
              <span className="text-white font-bold text-sm tracking-widest uppercase">Tesla Trade</span>
            </Link>
            <span className="text-[#2A2A2A]">|</span>
            <span className="text-xs text-[#666666] tracking-widest uppercase">My Account</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/account/deposit" className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase rounded text-white transition-all duration-300" style={{ background: '#E31937', boxShadow: '0 0 16px rgba(227,25,55,0.35)' }}>+ Deposit</Link>
            <Link href="/dashboard" className="text-xs text-[#666666] hover:text-white transition-colors tracking-widest uppercase">Dashboard</Link>
            <Link href="/profile" className="text-xs text-[#666666] hover:text-white transition-colors tracking-widest uppercase">Settings</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Profile header */}
        <div className="flex items-start gap-5 mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center text-lg font-bold text-primary shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{userName}</h1>
            <p className="text-sm text-[#666666] truncate">{userEmail}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold"
                style={{ color: kycConfig.color, background: kycConfig.bg, border: `1px solid ${kycConfig.border}` }}
              >
                <span>{kycConfig.icon}</span>
                KYC {kycConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold tracking-widest uppercase rounded transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-white' :'text-[#666666] hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Portfolio', value: portfolio?.stats?.totalPortfolio || '$0', sub: portfolio?.stats?.portfolioChange || '—', color: '#4ade80' },
                    { label: 'Total Returns', value: portfolio?.stats?.totalReturns || '$0', sub: portfolio?.stats?.returnsChange || '—', color: '#60a5fa' },
                    { label: 'Active Investments', value: String(portfolio?.stats?.activeInvestments ?? 0), sub: 'positions', color: '#facc15' },
                    { label: 'Referral Earnings', value: portfolio?.stats?.referralEarnings || '$0', sub: `${portfolio?.referrals?.total ?? 0} referrals`, color: '#c084fc' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5">
                      <p className="text-[11px] text-[#555555] tracking-widest uppercase mb-2">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs mt-1" style={{ color: stat.color }}>{stat.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Quick status cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* KYC quick */}
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-[#555555] tracking-widest uppercase">KYC Status</p>
                      <button onClick={() => setActiveTab('kyc')} className="text-[10px] text-primary hover:underline tracking-widest uppercase">View</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{kycConfig.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: kycConfig.color }}>{kycConfig.label}</span>
                    </div>
                    {kyc?.submitted_at && (
                      <p className="text-[11px] text-[#555555] mt-2">Submitted {new Date(kyc.submitted_at).toLocaleDateString()}</p>
                    )}
                    {!kyc && (
                      <Link href="/kyc" className="mt-3 inline-block text-[11px] text-primary hover:underline">Complete KYC →</Link>
                    )}
                  </div>

                  {/* Pending withdrawals quick */}
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-[#555555] tracking-widest uppercase">Pending Withdrawals</p>
                      <button onClick={() => setActiveTab('withdrawals')} className="text-[10px] text-primary hover:underline tracking-widest uppercase">View</button>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {withdrawals.filter(w => w.payout_status === 'pending' || w.payout_status === 'processing').length}
                    </p>
                    <p className="text-xs text-[#555555] mt-1">
                      ${withdrawals.filter(w => w.payout_status === 'pending' || w.payout_status === 'processing').reduce((s, w) => s + Number(w.amount), 0).toLocaleString()} pending
                    </p>
                  </div>

                  {/* Recent transactions quick */}
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-[#555555] tracking-widest uppercase">Transactions</p>
                      <button onClick={() => setActiveTab('transactions')} className="text-[10px] text-primary hover:underline tracking-widest uppercase">View All</button>
                    </div>
                    <p className="text-2xl font-bold text-white">{portfolio?.transactions?.length ?? 0}</p>
                    <p className="text-xs text-[#555555] mt-1">total records</p>
                  </div>
                </div>

                {/* Recent holdings */}
                {portfolio?.investments && portfolio.investments.length > 0 && (
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A]">
                      <p className="text-xs font-semibold text-white tracking-widest uppercase">Portfolio Holdings</p>
                      <button onClick={() => setActiveTab('portfolio')} className="text-[10px] text-primary hover:underline tracking-widest uppercase">View All</button>
                    </div>
                    <div className="divide-y divide-[#1A1A1A]">
                      {portfolio.investments.slice(0, 3).map((inv, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-white">{inv.name}</p>
                            <p className="text-[11px] text-[#555555] mt-0.5">{inv.type || 'Investment'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{inv.current}</p>
                            <p className={`text-[11px] mt-0.5 ${inv.return?.startsWith('-') ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>{inv.return}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* KYC TAB */}
            {activeTab === 'kyc' && (
              <div className="space-y-5">
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-6">
                  <h2 className="text-sm font-semibold text-white tracking-widest uppercase mb-5">KYC Verification Status</h2>

                  {/* Status banner */}
                  <div
                    className="flex items-center gap-4 p-4 rounded-lg mb-6"
                    style={{ background: kycConfig.bg, border: `1px solid ${kycConfig.border}` }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style={{ background: kycConfig.bg }}>
                      {kycConfig.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: kycConfig.color }}>{kycConfig.label}</p>
                      <p className="text-xs text-[#888888] mt-0.5">
                        {kycStatus === 'approved' && 'Your identity has been verified. You have full access to all platform features.'}
                        {kycStatus === 'pending' && 'Your documents are queued for review. This typically takes 1–3 business days.'}
                        {kycStatus === 'under_review' && 'Our compliance team is actively reviewing your submission.'}
                        {kycStatus === 'rejected' && 'Your submission was not approved. Please review the notes below and resubmit.'}
                        {kycStatus === 'none' && 'You have not submitted KYC documents yet. Complete verification to unlock full features.'}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  {kyc && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                      {[
                        { label: 'Submission Date', value: kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                        { label: 'Review Date', value: kyc.reviewed_at ? new Date(kyc.reviewed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Pending' },
                        { label: 'Country', value: kyc.country || '—' },
                        { label: 'ID Type', value: kyc.id_type ? kyc.id_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—' },
                      ].map((item) => (
                        <div key={item.label} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg p-4">
                          <p className="text-[10px] text-[#555555] tracking-widest uppercase mb-1">{item.label}</p>
                          <p className="text-sm text-white font-medium">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Admin notes */}
                  {kyc?.admin_notes && (
                    <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg p-4 mb-5">
                      <p className="text-[10px] text-[#555555] tracking-widest uppercase mb-2">Admin Notes</p>
                      <p className="text-sm text-[#CCCCCC] leading-relaxed">{kyc.admin_notes}</p>
                    </div>
                  )}

                  {/* CTA */}
                  {(!kyc || kycStatus === 'rejected') && (
                    <Link
                      href="/kyc"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded tracking-widest uppercase hover:bg-accent transition-colors"
                      style={{ boxShadow: '0 0 20px rgba(227,25,55,0.3)' }}
                    >
                      {kycStatus === 'rejected' ? 'Resubmit KYC' : 'Start KYC Verification'}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  )}
                </div>

                {/* KYC steps */}
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-6">
                  <h3 className="text-xs font-semibold text-[#555555] tracking-widest uppercase mb-4">Verification Steps</h3>
                  <div className="space-y-3">
                    {[
                      { step: 'Personal Information', done: !!kyc },
                      { step: 'Identity Document Upload', done: !!kyc },
                      { step: 'Address Verification', done: !!kyc },
                      { step: 'Compliance Review', done: kycStatus === 'approved' || kycStatus === 'under_review' },
                      { step: 'Account Verified', done: kycStatus === 'approved' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${item.done ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30' : 'bg-[#1A1A1A] text-[#555555] border border-[#2A2A2A]'}`}>
                          {item.done ? '✓' : i + 1}
                        </div>
                        <p className={`text-sm ${item.done ? 'text-white' : 'text-[#555555]'}`}>{item.step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PORTFOLIO TAB */}
            {activeTab === 'portfolio' && (
              <div className="space-y-5">
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Value', value: portfolio?.stats?.totalPortfolio || '$0' },
                    { label: 'Total Returns', value: portfolio?.stats?.totalReturns || '$0' },
                    { label: 'Active Positions', value: String(portfolio?.stats?.activeInvestments ?? 0) },
                    { label: 'Change', value: portfolio?.stats?.portfolioChange || '—' },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-4">
                      <p className="text-[10px] text-[#555555] tracking-widest uppercase mb-1.5">{s.label}</p>
                      <p className="text-lg font-bold text-white">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Holdings table */}
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1A1A1A]">
                    <p className="text-xs font-semibold text-white tracking-widest uppercase">Holdings</p>
                  </div>
                  {portfolio?.investments && portfolio.investments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#1A1A1A]">
                            {['Asset', 'Invested', 'Current Value', 'Return', 'Status'].map((h) => (
                              <th key={h} className="px-5 py-3 text-left text-[10px] text-[#555555] tracking-widest uppercase font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]">
                          {portfolio.investments.map((inv, i) => (
                            <tr key={i} className="hover:bg-[#0D0D0D] transition-colors">
                              <td className="px-5 py-4">
                                <p className="text-sm font-medium text-white">{inv.name}</p>
                                {inv.type && <p className="text-[11px] text-[#555555] mt-0.5">{inv.type}</p>}
                              </td>
                              <td className="px-5 py-4 text-sm text-[#AAAAAA]">{inv.invested}</td>
                              <td className="px-5 py-4 text-sm font-semibold text-white">{inv.current}</td>
                              <td className="px-5 py-4">
                                <span className={`text-sm font-semibold ${inv.return?.startsWith('-') ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>{inv.return}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-semibold tracking-wide ${inv.status === 'active' ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#555555]/10 text-[#888888]'}`}>
                                  {inv.status || 'Active'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <p className="text-[#555555] text-sm">No portfolio holdings yet.</p>
                      <p className="text-[#444444] text-xs mt-1">Your investments will appear here once assigned by the admin.</p>
                    </div>
                  )}
                </div>

                {/* Allocation */}
                {portfolio?.allocation && portfolio.allocation.length > 0 && (
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5">
                    <p className="text-xs font-semibold text-white tracking-widest uppercase mb-4">Allocation Breakdown</p>
                    <div className="space-y-3">
                      {portfolio.allocation.map((item, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[#AAAAAA]">{item.name}</span>
                            <span className="text-xs font-semibold text-white">{item.value}%</span>
                          </div>
                          <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${item.value}%`, background: item.color || '#E31937' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WITHDRAWALS TAB */}
            {activeTab === 'withdrawals' && (
              <div className="space-y-5">
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A]">
                    <p className="text-xs font-semibold text-white tracking-widest uppercase">Withdrawal Requests</p>
                    <Link href="/profile" className="text-[10px] text-primary hover:underline tracking-widest uppercase">Request Withdrawal</Link>
                  </div>
                  {withdrawals.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#1A1A1A]">
                            {['Date', 'Amount', 'Bank', 'Account', 'Status', 'Processed'].map((h) => (
                              <th key={h} className="px-5 py-3 text-left text-[10px] text-[#555555] tracking-widest uppercase font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]">
                          {withdrawals.map((w) => {
                            const sc = PAYOUT_STATUS_CONFIG[w.payout_status] || { label: w.payout_status, color: '#888888' };
                            return (
                              <tr key={w.id} className="hover:bg-[#0D0D0D] transition-colors">
                                <td className="px-5 py-4 text-sm text-[#AAAAAA]">{new Date(w.requested_at).toLocaleDateString()}</td>
                                <td className="px-5 py-4 text-sm font-semibold text-white">${Number(w.amount).toLocaleString()}</td>
                                <td className="px-5 py-4 text-sm text-[#AAAAAA]">{w.bank_name}</td>
                                <td className="px-5 py-4 text-sm text-[#AAAAAA]">****{w.account_number?.slice(-4)}</td>
                                <td className="px-5 py-4">
                                  <span className="px-2 py-1 rounded text-[10px] font-semibold" style={{ color: sc.color, background: `${sc.color}18` }}>
                                    {sc.label}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-sm text-[#555555]">
                                  {w.processed_at ? new Date(w.processed_at).toLocaleDateString() : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <p className="text-[#555555] text-sm">No withdrawal requests found.</p>
                      <p className="text-[#444444] text-xs mt-1">Withdrawal requests submitted through the platform will appear here.</p>
                    </div>
                  )}
                </div>

                {/* Withdrawal status legend */}
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5">
                  <p className="text-[10px] text-[#555555] tracking-widest uppercase mb-3">Status Guide</p>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(PAYOUT_STATUS_CONFIG).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: val.color }} />
                        <span className="text-xs text-[#888888]">{val.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1A1A1A]">
                  <p className="text-xs font-semibold text-white tracking-widest uppercase">Transaction History</p>
                </div>
                {portfolio?.transactions && portfolio.transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1A1A1A]">
                          {['Date', 'Type', 'Description', 'Amount', 'Status'].map((h) => (
                            <th key={h} className="px-5 py-3 text-left text-[10px] text-[#555555] tracking-widest uppercase font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A1A1A]">
                        {portfolio.transactions.map((tx, i) => {
                          const isCredit = tx.type === 'credit' || tx.type === 'deposit' || tx.type === 'return';
                          return (
                            <tr key={tx.id || i} className="hover:bg-[#0D0D0D] transition-colors">
                              <td className="px-5 py-4 text-sm text-[#AAAAAA] whitespace-nowrap">{tx.date}</td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-semibold capitalize ${isCredit ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f87171]/10 text-[#f87171]'}`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm text-[#AAAAAA]">{tx.description || '—'}</td>
                              <td className="px-5 py-4">
                                <span className={`text-sm font-semibold ${isCredit ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                                  {isCredit ? '+' : '-'}{tx.amount}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-semibold ${tx.status === 'completed' ? 'bg-[#4ade80]/10 text-[#4ade80]' : tx.status === 'pending' ? 'bg-[#facc15]/10 text-[#facc15]' : 'bg-[#555555]/10 text-[#888888]'}`}>
                                  {tx.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-[#555555] text-sm">No transactions recorded yet.</p>
                    <p className="text-[#444444] text-xs mt-1">Your transaction history will appear here once activity is recorded.</p>
                  </div>
                )}
              </div>
            )}

            {/* BALANCE TAB */}
            {activeTab === 'balance' && (
              <div className="space-y-6">
                {/* Balance summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Available Balance', value: `$${(balance?.available_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#4ade80' },
                    { label: 'Total Deposited', value: `$${(balance?.total_deposited || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#60a5fa' },
                    { label: 'Investment Returns', value: `$${(balance?.total_returns || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#facc15' },
                    { label: 'Total Withdrawn', value: `$${(balance?.total_withdrawn || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#f87171' },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5">
                      <p className="text-[11px] text-[#555555] tracking-widest uppercase mb-2">{s.label}</p>
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Action message */}
                {balanceActionMsg && (
                  <div className={`p-4 rounded-lg border text-xs font-medium ${balanceActionMsg.type === 'success' ? 'bg-green-400/5 border-green-400/20 text-green-400' : 'bg-red-400/5 border-red-400/20 text-red-400'}`}>
                    {balanceActionMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Deposit */}
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-widest uppercase mb-1">Deposit Funds</h3>
                      <p className="text-xs text-[#555555]">Add funds to your balance freely — no plan required</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555555] font-bold text-sm">$</span>
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0.00"
                          min="1"
                          className="w-full pl-8 pr-4 py-3 rounded text-sm input-tesla"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Payment Method</label>
                      <div className="space-y-2">
                        {[
                          { id: 'crypto', label: 'Cryptocurrency', icon: '₿' },
                          { id: 'wire', label: 'Bank Wire', icon: '🏦' },
                          { id: 'card', label: 'Card', icon: '💳' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setDepositMethod(m.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-xs ${depositMethod === m.id ? 'border-primary bg-primary/5 text-white' : 'border-[#1A1A1A] text-[#888888] hover:border-[#2A2A2A]'}`}
                          >
                            <span>{m.icon}</span>
                            <span className="font-semibold">{m.label}</span>
                            {depositMethod === m.id && <span className="ml-auto text-primary">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleDeposit}
                      disabled={balanceLoading || !depositAmount || Number(depositAmount) <= 0 || !depositMethod}
                      className="w-full py-3 tesla-btn-primary rounded text-xs font-bold tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {balanceLoading ? 'Processing...' : 'Submit Deposit Request'}
                    </button>
                  </div>

                  {/* Withdraw */}
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-widest uppercase mb-1">Withdraw Funds</h3>
                      <p className="text-xs text-[#555555]">Withdraw from your available balance to wallet or bank</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555555] font-bold text-sm">$</span>
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          min="1"
                          max={balance?.available_balance || 0}
                          className="w-full pl-8 pr-4 py-3 rounded text-sm input-tesla"
                        />
                      </div>
                      <p className="text-[11px] text-[#555555] mt-1">Available: <span className="text-white font-semibold">${(balance?.available_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Withdrawal Method</label>
                      <div className="space-y-2">
                        {[
                          { id: 'crypto', label: 'Crypto Wallet', icon: '₿' },
                          { id: 'bank', label: 'Bank Account', icon: '🏦' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setWithdrawMethod(m.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-xs ${withdrawMethod === m.id ? 'border-primary bg-primary/5 text-white' : 'border-[#1A1A1A] text-[#888888] hover:border-[#2A2A2A]'}`}
                          >
                            <span>{m.icon}</span>
                            <span className="font-semibold">{m.label}</span>
                            {withdrawMethod === m.id && <span className="ml-auto text-primary">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                    {withdrawMethod === 'crypto' && (
                      <div>
                        <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Wallet Address</label>
                        <input
                          type="text"
                          value={withdrawWallet}
                          onChange={(e) => setWithdrawWallet(e.target.value)}
                          placeholder="0x... or bc1..."
                          className="w-full px-4 py-3 rounded text-sm input-tesla font-mono"
                        />
                      </div>
                    )}
                    {withdrawMethod === 'bank' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Bank Name</label>
                          <input type="text" value={withdrawBank} onChange={(e) => setWithdrawBank(e.target.value)} placeholder="Bank name" className="w-full px-4 py-3 rounded text-sm input-tesla" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Account Number</label>
                          <input type="text" value={withdrawAccount} onChange={(e) => setWithdrawAccount(e.target.value)} placeholder="Account number" className="w-full px-4 py-3 rounded text-sm input-tesla" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Account Name</label>
                          <input type="text" value={withdrawAccountName} onChange={(e) => setWithdrawAccountName(e.target.value)} placeholder="Account holder name" className="w-full px-4 py-3 rounded text-sm input-tesla" />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleWithdraw}
                      disabled={balanceLoading || !withdrawAmount || Number(withdrawAmount) <= 0 || !withdrawMethod}
                      className="w-full py-3 rounded text-xs font-bold tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed border border-[#2A2A2A] text-white hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      {balanceLoading ? 'Processing...' : 'Submit Withdrawal Request'}
                    </button>
                  </div>
                </div>

                {/* Balance transaction history */}
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1A1A1A]">
                    <p className="text-xs font-semibold text-white tracking-widest uppercase">Balance History</p>
                  </div>
                  {balanceTxs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#1A1A1A]">
                            {['Date', 'Type', 'Description', 'Amount', 'Status'].map((h) => (
                              <th key={h} className="px-5 py-3 text-left text-[10px] text-[#555555] tracking-widest uppercase font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]">
                          {balanceTxs.map((tx) => {
                            const isCredit = tx.type === 'deposit' || tx.type === 'investment_return';
                            const typeLabels: Record<string, string> = {
                              deposit: 'Deposit',
                              withdrawal: 'Withdrawal',
                              investment_return: 'Investment Return',
                              investment_debit: 'Investment',
                            };
                            const statusColors: Record<string, string> = {
                              pending: '#facc15',
                              processing: '#60a5fa',
                              completed: '#4ade80',
                              rejected: '#f87171',
                            };
                            return (
                              <tr key={tx.id} className="hover:bg-[#0D0D0D] transition-colors">
                                <td className="px-5 py-4 text-sm text-[#AAAAAA] whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</td>
                                <td className="px-5 py-4">
                                  <span className={`px-2 py-1 rounded text-[10px] font-semibold ${isCredit ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f87171]/10 text-[#f87171]'}`}>
                                    {typeLabels[tx.type] || tx.type}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-sm text-[#AAAAAA]">{tx.description || '—'}</td>
                                <td className="px-5 py-4">
                                  <span className={`text-sm font-semibold ${isCredit ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                                    {isCredit ? '+' : '-'}${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <span className="px-2 py-1 rounded text-[10px] font-semibold" style={{ color: statusColors[tx.status] || '#888', background: `${statusColors[tx.status] || '#888'}18` }}>
                                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <p className="text-[#555555] text-sm">No balance transactions yet.</p>
                      <p className="text-[#444444] text-xs mt-1">Deposits, withdrawals, and investment returns will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REFERRALS TAB */}
            {activeTab === 'referrals' && (
              <div className="space-y-5">
                {/* Referral stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Referrals', value: String(portfolio?.referrals?.total ?? 0), color: '#c084fc' },
                    { label: 'Pending Rewards', value: String(portfolio?.referrals?.pending ?? 0), color: '#facc15' },
                    { label: 'Total Earnings', value: portfolio?.referrals?.earnings || '$0', color: '#4ade80' },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5">
                      <p className="text-[10px] text-[#555555] tracking-widest uppercase mb-2">{s.label}</p>
                      <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Referral link */}
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5">
                  <p className="text-xs font-semibold text-white tracking-widest uppercase mb-3">Your Referral Link</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-[#0D0D0D] border border-[#2A2A2A] rounded px-4 py-2.5 text-sm text-[#888888] font-mono truncate">
                      {`https://teslaenerg6773.builtwithrocket.new/register?ref=${userId.slice(0, 8)}`}
                    </div>
                    <Link href="/referral" className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded tracking-widest uppercase hover:bg-accent transition-colors whitespace-nowrap">
                      Referral Page
                    </Link>
                  </div>
                </div>

                {/* Referral history */}
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1A1A1A]">
                    <p className="text-xs font-semibold text-white tracking-widest uppercase">Referral History</p>
                  </div>
                  {portfolio?.referrals?.history && portfolio.referrals.history.length > 0 ? (
                    <div className="divide-y divide-[#1A1A1A]">
                      {portfolio.referrals.history.map((ref, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-4">
                          <div>
                            <p className="text-sm font-medium text-white">{ref.name}</p>
                            <p className="text-[11px] text-[#555555] mt-0.5">{ref.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#4ade80]">{ref.reward}</p>
                            <span className={`text-[10px] font-semibold ${ref.status === 'paid' ? 'text-[#4ade80]' : 'text-[#facc15]'}`}>
                              {ref.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <p className="text-[#555555] text-sm">No referral history yet.</p>
                      <p className="text-[#444444] text-xs mt-1">Share your referral link to start earning rewards.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
