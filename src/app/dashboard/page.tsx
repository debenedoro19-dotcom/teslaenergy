'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Line, Legend,  } from 'recharts';
import {
  getCurrentUser,
  getUserPortfolio,
  createEmptyPortfolio,
  saveUserPortfolio,
  registerUser,
  type UserPortfolio,
  type Alert,
} from '@/lib/portfolioStore';
import { createClient } from '@/lib/supabase/client';

// ── Analytics helpers ──────────────────────────────────────────────────────────
function buildMonthlyReturns(chartData: { month: string; value: number }[]) {
  if (!chartData || chartData.length < 2) return [];
  return chartData.slice(1).map((d, i) => ({
    month: d.month,
    return: d.value - chartData[i].value,
    value: d.value,
  }));
}

const RISK_COLORS = ['#E31937', '#FF6B35', '#FFD700', '#4ade80', '#60a5fa'];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'analytics' | 'transactions' | 'alerts'>('overview');
  const [portfolio, setPortfolio] = useState<UserPortfolio | null>(null);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<'3m' | '6m' | '12m'>('12m');
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  // Merge a Supabase row into a UserPortfolio shape
  function rowToPortfolio(row: any, fallback: UserPortfolio): UserPortfolio {
    return {
      ...fallback,
      stats: row.stats ?? fallback.stats,
      chartData: row.chart_data ?? fallback.chartData,
      allocation: row.allocation ?? fallback.allocation,
      investments: row.investments ?? fallback.investments,
      transactions: row.transactions ?? fallback.transactions,
      alerts: row.alerts ?? fallback.alerts,
      referrals: row.referrals ?? fallback.referrals,
    };
  }

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    setUser(currentUser);
    registerUser({
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      joinedAt: new Date().toISOString(),
    });

    // Seed localStorage portfolio if empty
    let localPortfolio = getUserPortfolio(currentUser.id);
    if (!localPortfolio) {
      localPortfolio = createEmptyPortfolio(currentUser.id, currentUser.name, currentUser.email);
      saveUserPortfolio(localPortfolio);
    }
    setPortfolio(localPortfolio);

    // ── Supabase: initial fetch + real-time subscription ──────────────────────
    const supabase = createClient();

    // ── Email verification gate ───────────────────────────────────────────────
    if (currentUser.email !== 'admin@teslatrade.com') {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user && !user.email_confirmed_at) {
          window.location.href = '/verify-pending';
        }
      });
    }

    async function fetchPortfolioFromSupabase() {
      try {
        // Use Supabase auth user id directly — no email lookup needed
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) return;

        const supabaseUserId = authUser.id;

        const { data: portfolioRow } = await supabase
          .from('user_portfolios')
          .select('*')
          .eq('user_id', supabaseUserId)
          .maybeSingle();

        if (portfolioRow) {
          const merged = rowToPortfolio(portfolioRow, localPortfolio!);
          setPortfolio(merged);
          saveUserPortfolio(merged);
        }

        // Subscribe to real-time changes for this user's portfolio row
        const channel = supabase
          .channel(`portfolio_${supabaseUserId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_portfolios',
              filter: `user_id=eq.${supabaseUserId}`,
            },
            (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const updated = rowToPortfolio(payload.new, localPortfolio!);
                setPortfolio(updated);
                saveUserPortfolio(updated);
              }
            }
          )
          .subscribe((status) => {
            setRealtimeConnected(status === 'SUBSCRIBED');
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('Portfolio real-time setup error:', err);
      }
    }

    fetchPortfolioFromSupabase();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const markAllRead = () => {
    if (!portfolio) return;
    const updated: UserPortfolio = {
      ...portfolio,
      alerts: portfolio.alerts.map((a) => ({ ...a, unread: false })),
    };
    setPortfolio(updated);
    saveUserPortfolio(updated);
  };

  if (!mounted) return null;

  const displayName = user?.name || 'Investor';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hasPortfolioData =
    portfolio &&
    (portfolio.investments.length > 0 ||
      portfolio.transactions.length > 0 ||
      portfolio.stats.totalPortfolio !== '$0');

  const unreadAlerts = portfolio?.alerts.filter((a) => a.unread).length || 0;
  const alerts: Alert[] = portfolio?.alerts || [];

  // Analytics data
  const chartData = portfolio?.chartData || [];
  const rangeMap = { '3m': 3, '6m': 6, '12m': 12 };
  const slicedChart = chartData.slice(-rangeMap[analyticsRange]);
  const monthlyReturns = buildMonthlyReturns(slicedChart);

  const totalInvested = portfolio?.investments.reduce((acc, inv) => {
    const n = parseFloat(inv.invested?.replace(/[^0-9.]/g, '') || '0');
    return acc + n;
  }, 0) || 0;

  const totalCurrent = portfolio?.investments.reduce((acc, inv) => {
    const n = parseFloat(inv.current?.replace(/[^0-9.]/g, '') || '0');
    return acc + n;
  }, 0) || 0;

  const overallReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

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
            <span className="text-xs text-[#666666] tracking-widest uppercase">Investor Dashboard</span>
          </div>
          <div className="flex items-center gap-4" ref={notifRef}>
            {/* Real-time indicator */}
            <div className="flex items-center gap-1.5" title={realtimeConnected ? 'Live updates active' : 'Connecting...'}>
              <div className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? 'bg-green-400 animate-pulse' : 'bg-[#444444]'}`} />
              <span className="text-[10px] text-[#555555] uppercase tracking-widest hidden sm:block">
                {realtimeConnected ? 'Live' : 'Syncing'}
              </span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative w-8 h-8 flex items-center justify-center text-[#666666] hover:text-white transition-colors"
                aria-label="Notifications"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadAlerts > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadAlerts}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-10 w-80 bg-[#111111] border border-[#1A1A1A] rounded-lg shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1A]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-widest">Notifications</span>
                      {unreadAlerts > 0 && (
                        <span className="px-1.5 py-0.5 bg-primary text-white text-[9px] font-bold rounded-full">{unreadAlerts}</span>
                      )}
                    </div>
                    {unreadAlerts > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[10px] text-primary hover:text-red-400 transition-colors font-semibold tracking-wider uppercase"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length > 0 ? (
                      <div className="divide-y divide-[#141414]">
                        {alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                              alert.unread ? 'bg-[#111111]' : 'bg-[#0D0D0D]'
                            }`}
                          >
                            <span className="text-base shrink-0 mt-0.5">{alert.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-relaxed ${alert.unread ? 'text-white font-medium' : 'text-[#666666]'}`}>
                                {alert.text}
                              </p>
                              <p className="text-[10px] text-[#444444] mt-1">{alert.time}</p>
                            </div>
                            {alert.unread && <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0 mt-1.5" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 py-10">
                        <div className="w-10 h-10 rounded-full bg-[#0D0D0D] border border-[#1A1A1A] flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                        </div>
                        <p className="text-xs text-[#444444] text-center">No notifications yet</p>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-t border-[#1A1A1A]">
                    <button
                      onClick={() => { setActiveTab('alerts'); setNotifOpen(false); }}
                      className="w-full text-center text-[10px] text-[#555555] hover:text-white transition-colors tracking-wider uppercase"
                    >
                      View all in Alerts tab →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Link href="/profile" className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
              {initials}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
            Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-[#666666]">
            {hasPortfolioData
              ? 'Your portfolio is active. Here\u2019s your overview.' :'Your portfolio is empty. Investments will appear here once activated by an admin.'}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total Portfolio',
              value: portfolio?.stats.totalPortfolio || '$0',
              change: portfolio?.stats.portfolioChange || '$0 (0%)',
              up: hasPortfolioData ? true : null,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              ),
              accent: '#E31937',
            },
            {
              label: 'Active Investments',
              value: String(portfolio?.stats.activeInvestments || 0),
              change: portfolio?.stats.activeInvestments ? `${portfolio.stats.activeInvestments} package${portfolio.stats.activeInvestments !== 1 ? 's' : ''} active` : 'No active packages',
              up: null,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              ),
              accent: '#60a5fa',
            },
            {
              label: 'Total Returns',
              value: portfolio?.stats.totalReturns || '$0',
              change: portfolio?.stats.returnsChange || '$0 this month',
              up: hasPortfolioData ? true : null,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              ),
              accent: '#4ade80',
            },
            {
              label: 'Referral Earnings',
              value: portfolio?.stats.referralEarnings || '$0',
              change: '0 referrals',
              up: null,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              ),
              accent: '#facc15',
            },
          ].map((stat) => (
            <div key={stat.label} className="relative bg-[#111111] border border-[#1A1A1A] rounded-xl p-5 overflow-hidden group hover:border-[#2A2A2A] transition-all duration-300">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(ellipse at top right, ${stat.accent}08 0%, transparent 70%)` }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-[#555555] uppercase tracking-widest">{stat.label}</div>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${stat.accent}15`, color: stat.accent }}>
                    {stat.icon}
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-white mb-1.5 tracking-tight">{stat.value}</div>
                <div className="flex items-center gap-1.5">
                  {stat.up === true && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
                  )}
                  <div className={`text-xs font-medium ${stat.up === true ? 'text-green-400' : stat.up === false ? 'text-primary' : 'text-[#444444]'}`}>
                    {stat.change}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b border-[#1A1A1A] overflow-x-auto">
          {(['overview', 'portfolio', 'analytics', 'transactions', 'alerts'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all border-b-2 -mb-px whitespace-nowrap relative ${
                activeTab === tab ? 'text-white border-primary' : 'text-[#444444] border-transparent hover:text-[#777777]'
              }`}
            >
              {tab}
              {tab === 'alerts' && unreadAlerts > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-white text-[9px] rounded-full">{unreadAlerts}</span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Portfolio Performance</h3>
                  <p className="text-xs text-[#555555] mt-0.5">Growth trajectory</p>
                </div>
                {hasPortfolioData && portfolio?.chartData && portfolio.chartData.length > 0 && (
                  <span className="px-2.5 py-1 bg-green-400/10 text-green-400 text-xs font-bold rounded border border-green-400/20">
                    Active
                  </span>
                )}
              </div>
              {portfolio?.chartData && portfolio.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={portfolio.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E31937" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#E31937" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                    <XAxis dataKey="month" tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#555555', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#E31937" strokeWidth={2} fill="url(#portfolioGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                      <polyline points="16 7 22 7 22 13" />
                    </svg>
                  </div>
                  <p className="text-xs text-[#444444] text-center">No chart data yet.<br />Portfolio activity will appear here.</p>
                </div>
              )}
            </div>

            {/* Allocation */}
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
              <h3 className="text-sm font-bold text-white tracking-wide mb-1">Allocation</h3>
              <p className="text-xs text-[#555555] mb-6">Current portfolio breakdown</p>
              {portfolio?.allocation && portfolio.allocation.length > 0 ? (
                <>
                  <div className="flex justify-center mb-6">
                    <PieChart width={160} height={160}>
                      <Pie data={portfolio.allocation} cx={75} cy={75} innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                        {portfolio.allocation.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </div>
                  <div className="space-y-2.5">
                    {portfolio.allocation.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                          <span className="text-xs text-[#888888]">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-white">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a10 10 0 0 1 7.07 17.07" />
                    </svg>
                  </div>
                  <p className="text-xs text-[#444444] text-center">No allocation data yet.</p>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'New Investment', icon: '💼', href: '/invest', desc: 'Browse packages', accent: '#E31937' },
                { label: 'Market News', icon: '📰', href: '/news', desc: 'Latest updates', accent: '#60a5fa' },
                { label: 'Refer a Friend', icon: '🎁', href: '/referral', desc: 'Earn rewards', accent: '#facc15' },
                { label: 'KYC Status', icon: '✅', href: '/kyc', desc: 'Verify identity', accent: '#4ade80' },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="relative bg-[#111111] border border-[#1A1A1A] hover:border-[#2A2A2A] rounded-xl p-5 flex flex-col gap-3 transition-all duration-300 hover:bg-[#141414] group overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(ellipse at bottom left, ${action.accent}08 0%, transparent 70%)` }} />
                  <span className="text-2xl relative">{action.icon}</span>
                  <div className="relative">
                    <div className="text-xs font-bold text-white tracking-wide mb-0.5">{action.label}</div>
                    <div className="text-[10px] text-[#444444]">{action.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-4">
            {portfolio?.investments && portfolio.investments.length > 0 ? (
              portfolio.investments.map((inv) => (
                <div key={inv.id} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">{inv.name}</h3>
                      <span className="text-xs text-[#555555]">{inv.duration} term</span>
                    </div>
                    <span className="px-3 py-1 bg-green-400/10 text-green-400 text-xs font-bold rounded border border-green-400/20 self-start sm:self-auto">
                      {inv.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-[10px] text-[#555555] uppercase tracking-widest mb-1">Invested</div>
                      <div className="text-sm font-bold text-white">{inv.invested}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#555555] uppercase tracking-widest mb-1">Current Value</div>
                      <div className="text-sm font-bold text-white">{inv.current}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#555555] uppercase tracking-widest mb-1">Return</div>
                      <div className="text-sm font-bold text-green-400">{inv.returnPct}</div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-[#555555] mb-1.5">
                      <span>Term Progress</span>
                      <span>{inv.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${inv.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                  </svg>
                }
                title="No active investments"
                description="Your investment packages will appear here once assigned by an admin."
              />
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Invested', value: totalInvested > 0 ? `$${totalInvested.toLocaleString()}` : '$0', color: 'text-white' },
                { label: 'Current Value', value: totalCurrent > 0 ? `$${totalCurrent.toLocaleString()}` : '$0', color: 'text-white' },
                { label: 'Overall Return', value: `${overallReturn >= 0 ? '+' : ''}${overallReturn.toFixed(2)}%`, color: overallReturn >= 0 ? 'text-green-400' : 'text-primary' },
                { label: 'Active Packages', value: String(portfolio?.investments.length || 0), color: 'text-white' },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                  <div className="text-[10px] font-bold text-[#555555] uppercase tracking-widest mb-2">{kpi.label}</div>
                  <div className={`text-xl font-extrabold ${kpi.color}`}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Range selector + Growth chart */}
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-bold text-white">Portfolio Growth</h3>
                  <p className="text-xs text-[#555555] mt-0.5">Value over time</p>
                </div>
                <div className="flex gap-1">
                  {(['3m', '6m', '12m'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setAnalyticsRange(r)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                        analyticsRange === r ? 'bg-primary text-white' : 'bg-[#1A1A1A] text-[#555555] hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {slicedChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={slicedChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E31937" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#E31937" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                    <XAxis dataKey="month" tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#E31937" strokeWidth={2} fill="url(#analyticsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <AnalyticsEmpty label="No growth data available for this range." />
              )}
            </div>

            {/* Monthly Returns Bar + Allocation side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Returns */}
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                <h3 className="text-sm font-bold text-white mb-1">Monthly Returns</h3>
                <p className="text-xs text-[#555555] mb-5">Month-over-month gain/loss</p>
                {monthlyReturns.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyReturns} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                      <XAxis dataKey="month" tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 0 ? '' : '-'}${Math.abs(v / 1000).toFixed(1)}k`} />
                      <Tooltip
                        contentStyle={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Monthly Return']}
                      />
                      <Bar dataKey="return" radius={[3, 3, 0, 0]}>
                        {monthlyReturns.map((entry, index) => (
                          <Cell key={index} fill={entry.return >= 0 ? '#4ade80' : '#E31937'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmpty label="No monthly return data yet." />
                )}
              </div>

              {/* Allocation Donut */}
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                <h3 className="text-sm font-bold text-white mb-1">Asset Allocation</h3>
                <p className="text-xs text-[#555555] mb-5">Portfolio distribution by asset class</p>
                {portfolio?.allocation && portfolio.allocation.length > 0 ? (
                  <div className="flex flex-col items-center gap-4">
                    <PieChart width={180} height={180}>
                      <Pie data={portfolio.allocation} cx={85} cy={85} innerRadius={55} outerRadius={85} dataKey="value" strokeWidth={0}>
                        {portfolio.allocation.map((entry, index) => (
                          <Cell key={index} fill={entry.color || RISK_COLORS[index % RISK_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        formatter={(value: number) => [`${value}%`, 'Allocation']}
                      />
                    </PieChart>
                    <div className="w-full space-y-2">
                      {portfolio.allocation.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color || RISK_COLORS[index % RISK_COLORS.length] }} />
                            <span className="text-xs text-[#888888]">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color || RISK_COLORS[index % RISK_COLORS.length] }} />
                            </div>
                            <span className="text-xs font-bold text-white w-8 text-right">{item.value}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <AnalyticsEmpty label="No allocation data yet." />
                )}
              </div>
            </div>

            {/* Performance Trend Line */}
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
              <h3 className="text-sm font-bold text-white mb-1">Invested vs Current Value</h3>
              <p className="text-xs text-[#555555] mb-5">Compare cost basis against current portfolio value</p>
              {portfolio?.investments && portfolio.investments.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={portfolio.investments.map((inv) => ({
                      name: inv.name.split(' ')[0],
                      invested: parseFloat(inv.invested?.replace(/[^0-9.]/g, '') || '0'),
                      current: parseFloat(inv.current?.replace(/[^0-9.]/g, '') || '0'),
                    }))}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                    <XAxis dataKey="name" tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#666' }} />
                    <Bar dataKey="invested" name="Invested" fill="#2A2A2A" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="current" name="Current Value" fill="#E31937" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <AnalyticsEmpty label="No investment data to compare yet." />
              )}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg overflow-hidden">
            <div className="p-5 border-b border-[#1A1A1A]">
              <h3 className="text-sm font-bold text-white">Transaction History</h3>
            </div>
            {portfolio?.transactions && portfolio.transactions.length > 0 ? (
              <div className="divide-y divide-[#1A1A1A]">
                {portfolio.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#141414] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${tx.type === 'Withdrawal' ? 'bg-[#1A1A1A] text-[#888888]' : 'bg-primary/10 text-primary'}`}>
                        {tx.type === 'Investment' ? '↑' : tx.type === 'Return' ? '↓' : '←'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{tx.asset}</div>
                        <div className="text-xs text-[#555555]">{tx.type} · {tx.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${tx.type === 'Withdrawal' ? 'text-[#888888]' : 'text-white'}`}>{tx.amount}</div>
                      <div className={`text-xs font-medium ${tx.statusColor}`}>{tx.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10">
                <EmptyState
                  icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  }
                  title="No transactions yet"
                  description="Your transaction history will appear here once activity is recorded."
                />
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {alerts.length > 0 ? (
              <>
                {unreadAlerts > 0 && (
                  <div className="flex justify-end mb-2">
                    <button onClick={markAllRead} className="text-xs text-primary hover:text-red-400 transition-colors font-semibold tracking-wider uppercase">
                      Mark all as read
                    </button>
                  </div>
                )}
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${alert.unread ? 'bg-[#111111] border-[#1A1A1A]' : 'bg-[#0D0D0D] border-[#141414]'}`}
                  >
                    <span className="text-xl shrink-0">{alert.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${alert.unread ? 'text-white font-medium' : 'text-[#666666]'}`}>{alert.text}</p>
                      <p className="text-xs text-[#444444] mt-1">{alert.time}</p>
                    </div>
                    {alert.unread && <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />}
                  </div>
                ))}
              </>
            ) : (
              <EmptyState
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                }
                title="No alerts"
                description="Notifications and alerts will appear here once admin sends them."
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-14 h-14 rounded-full bg-[#111111] border border-[#1A1A1A] flex items-center justify-center">{icon}</div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[#555555] mb-1">{title}</p>
        <p className="text-xs text-[#3A3A3A] max-w-xs">{description}</p>
      </div>
    </div>
  );
}

function AnalyticsEmpty({ label }: { label: string }) {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      </div>
      <p className="text-xs text-[#444444] text-center">{label}</p>
    </div>
  );
}
