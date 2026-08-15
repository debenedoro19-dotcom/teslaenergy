'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser, isAdmin } from '@/lib/portfolioStore';
import { sendWithdrawalConfirmedEmail } from '@/lib/emailService';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  routing_number: string;
  payout_status: 'pending' | 'processing' | 'paid' | 'rejected';
  notes: string | null;
  requested_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DisbursementEvent {
  id: string;
  withdrawal_id: string;
  status: WithdrawalRequest['payout_status'];
  note: string;
  actor: string;
  timestamp: string;
}

type StatusFilter = 'all' | 'pending' | 'processing' | 'paid' | 'rejected';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
    dot: 'bg-yellow-400',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  processing: {
    label: 'Processing',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
    dot: 'bg-blue-400',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
      </svg>
    ),
  },
  paid: {
    label: 'Paid',
    color: 'text-green-400',
    bg: 'bg-green-400/10 border-green-400/20',
    dot: 'bg-green-400',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20',
    dot: 'bg-red-400',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    ),
  },
};

// In-memory disbursement log (per session — persisted per withdrawal id)
const disbursementLog: Record<string, DisbursementEvent[]> = {};

function addDisbursementEvent(
  withdrawalId: string,
  status: WithdrawalRequest['payout_status'],
  note: string,
  actor = 'Admin'
) {
  if (!disbursementLog[withdrawalId]) disbursementLog[withdrawalId] = [];
  disbursementLog[withdrawalId].unshift({
    id: `${Date.now()}-${Math.random()}`,
    withdrawal_id: withdrawalId,
    status,
    note,
    actor,
    timestamp: new Date().toISOString(),
  });
}

export default function AdminWithdrawalsPage() {
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveIndicator, setLiveIndicator] = useState(false);
  const liveFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realtimeChannel = useRef<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [userSearch, setUserSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail panel
  const [selected, setSelected] = useState<WithdrawalRequest | null>(null);
  const [actionStatus, setActionStatus] = useState<WithdrawalRequest['payout_status']>('pending');
  const [actionNotes, setActionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logEvents, setLogEvents] = useState<DisbursementEvent[]>([]);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'update';
    withdrawal: WithdrawalRequest | null;
    targetStatus: WithdrawalRequest['payout_status'];
    notes: string;
  }>({ open: false, type: 'update', withdrawal: null, targetStatus: 'pending', notes: '' });

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, paid: 0, rejected: 0, totalPaid: 0 });

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (currentUser && isAdmin(currentUser.id)) {
      setAuthorized(true);
      loadWithdrawals();
      subscribeToWithdrawals();
    }
    return () => {
      if (liveFlashTimer.current) clearTimeout(liveFlashTimer.current);
      if (realtimeChannel.current) {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.removeChannel(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  }, []);

  function flashLive() {
    setLiveIndicator(true);
    if (liveFlashTimer.current) clearTimeout(liveFlashTimer.current);
    liveFlashTimer.current = setTimeout(() => setLiveIndicator(false), 2000);
  }

  function subscribeToWithdrawals() {
    const supabase = createClient();
    // Remove any existing channel before creating a new one
    if (realtimeChannel.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.removeChannel(realtimeChannel.current);
      realtimeChannel.current = null;
    }
    const channel = supabase
      .channel('admin-withdrawals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawal_requests' },
        (payload) => {
          flashLive();
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as WithdrawalRequest;
            setWithdrawals((prev) => [newRow, ...prev]);
            setStats((s) => {
              const ns = { ...s, total: s.total + 1 };
              if (newRow.payout_status === 'pending') ns.pending++;
              return ns;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as WithdrawalRequest;
            setWithdrawals((prev) =>
              prev.map((w) => (w.id === updated.id ? updated : w))
            );
            setSelected((prev) => (prev?.id === updated.id ? updated : prev));
            setStats((s) => recomputeStats([...s as unknown as WithdrawalRequest[]]));
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setWithdrawals((prev) => prev.filter((w) => w.id !== deleted.id));
          }
        }
      )
      .subscribe();
    realtimeChannel.current = channel;
  }

  function recomputeStats(rows: WithdrawalRequest[]) {
    const s = { total: rows.length, pending: 0, processing: 0, paid: 0, rejected: 0, totalPaid: 0 };
    rows.forEach((r) => {
      if (r.payout_status === 'pending') s.pending++;
      else if (r.payout_status === 'processing') s.processing++;
      else if (r.payout_status === 'paid') { s.paid++; s.totalPaid += Number(r.amount); }
      else if (r.payout_status === 'rejected') s.rejected++;
    });
    return s;
  }

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (fetchError) throw fetchError;
      const rows = (data ?? []) as WithdrawalRequest[];
      setWithdrawals(rows);
      setStats(recomputeStats(rows));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load withdrawals');
    }
    setLoading(false);
  }, []);

  function openDetail(w: WithdrawalRequest) {
    setSelected(w);
    setActionStatus(w.payout_status);
    setActionNotes(w.notes ?? '');
    setSaved(false);
    setLogEvents(disbursementLog[w.id] ?? []);
  }

  function openConfirm(
    type: 'approve' | 'reject' | 'update',
    targetStatus: WithdrawalRequest['payout_status'],
    notes: string
  ) {
    if (!selected) return;
    setConfirmModal({ open: true, type, withdrawal: selected, targetStatus, notes });
  }

  async function executeStatusUpdate() {
    const { withdrawal, targetStatus, notes } = confirmModal;
    if (!withdrawal) return;
    setSaving(true);
    setConfirmModal((prev) => ({ ...prev, open: false }));
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          payout_status: targetStatus,
          notes,
          processed_at: ['paid', 'rejected'].includes(targetStatus) ? new Date().toISOString() : null,
        })
        .eq('id', withdrawal.id);

      if (updateError) throw updateError;

      // Update local state
      const updatedWithdrawal = {
        ...withdrawal,
        payout_status: targetStatus,
        notes,
        processed_at: ['paid', 'rejected'].includes(targetStatus) ? new Date().toISOString() : withdrawal.processed_at,
      };
      setWithdrawals((prev) => prev.map((w) => (w.id === withdrawal.id ? updatedWithdrawal : w)));
      setSelected(updatedWithdrawal);
      setActionStatus(targetStatus);
      setActionNotes(notes);

      // Log disbursement event
      const eventNote =
        targetStatus === 'paid'
          ? `Payout confirmed — ${formatAmount(withdrawal.amount)} disbursed to ${withdrawal.bank_name}`
          : targetStatus === 'rejected'
          ? `Withdrawal rejected${notes ? ` — ${notes}` : ''}`
          : targetStatus === 'processing' ?'Marked as processing — payout initiated'
          : `Status updated to ${targetStatus}`;
      addDisbursementEvent(withdrawal.id, targetStatus, eventNote);
      setLogEvents([...(disbursementLog[withdrawal.id] ?? [])]);

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      // Recompute stats
      setWithdrawals((prev) => {
        setStats(recomputeStats(prev));
        return prev;
      });

      // Send email when paid
      if (targetStatus === 'paid' && withdrawal.user_email) {
        sendWithdrawalConfirmedEmail(
          withdrawal.user_email,
          withdrawal.user_name || 'Investor',
          formatAmount(withdrawal.amount),
          notes || undefined
        ).catch(console.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
    setSaving(false);
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function formatAmount(n: number) {
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const filtered = withdrawals.filter((w) => {
    if (statusFilter !== 'all' && w.payout_status !== statusFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      if (!w.user_email.toLowerCase().includes(q) && !w.user_name.toLowerCase().includes(q)) return false;
    }
    if (dateFrom && new Date(w.requested_at) < new Date(dateFrom)) return false;
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(w.requested_at) > to) return false;
    }
    return true;
  });

  if (!mounted) return null;

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E31937" strokeWidth="1.5" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <p className="text-[#666666] text-sm mb-4">Admin access required</p>
          <Link href="/login" className="text-primary text-sm hover:underline">Return to Login</Link>
        </div>
      </main>
    );
  }

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
            <span className="text-xs text-primary tracking-widest uppercase font-semibold">Admin Panel</span>
            <span className="text-[#2A2A2A]">|</span>
            <span className="text-xs text-[#666666] tracking-widest uppercase">Withdrawals</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${liveIndicator ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-green-500/40'}`} />
              <span className="text-[10px] text-[#555] uppercase tracking-widest">Live</span>
            </div>
            <Link
              href="/admin"
              className="text-xs text-[#666666] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Admin Home
            </Link>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">A</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">Withdrawals Management</h1>
            <p className="text-sm text-[#666666]">Review pending requests, approve or reject payouts, and track disbursement status in real time.</p>
          </div>
          <button
            onClick={loadWithdrawals}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] text-[#AAAAAA] hover:text-white text-xs font-bold rounded tracking-widest uppercase transition-all disabled:opacity-50 self-start sm:self-auto"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''} aria-hidden="true">
              <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Total Requests', value: stats.total, color: 'text-white' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
            { label: 'Processing', value: stats.processing, color: 'text-blue-400' },
            { label: 'Paid', value: stats.paid, color: 'text-green-400' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-400' },
            { label: 'Total Paid Out', value: formatAmount(stats.totalPaid), color: 'text-green-400' },
          ].map((card) => (
            <div key={card.label} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-4">
              <p className="text-[10px] text-[#666666] uppercase tracking-widest mb-1.5">{card.label}</p>
              <p className={`text-xl font-extrabold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] text-[#666666] uppercase tracking-widest mb-1.5">Search User</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Name or email…"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded pl-8 pr-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-[10px] text-[#666666] uppercase tracking-widest mb-1.5">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-[10px] text-[#666666] uppercase tracking-widest mb-1.5">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="min-w-[140px]">
              <label className="block text-[10px] text-[#666666] uppercase tracking-widest mb-1.5">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]"
              />
            </div>
            {(statusFilter !== 'all' || userSearch || dateFrom || dateTo) && (
              <button
                onClick={() => { setStatusFilter('all'); setUserSearch(''); setDateFrom(''); setDateTo(''); }}
                className="px-4 py-2 text-xs text-[#666666] hover:text-white border border-[#2A2A2A] hover:border-[#3A3A3A] rounded transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#444] mt-3">
            Showing <span className="text-[#AAAAAA] font-semibold">{filtered.length}</span> of <span className="text-[#AAAAAA] font-semibold">{withdrawals.length}</span> requests
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">{error}</div>
        )}

        <div className="flex gap-6">
          {/* Table */}
          <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block' : ''}`}>
            {loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 bg-[#111111] border border-[#1A1A1A] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 bg-[#111111] border border-[#1A1A1A] rounded-lg">
                <div className="w-12 h-12 rounded-full bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <p className="text-[#666666] text-sm">No withdrawal requests found</p>
              </div>
            ) : (
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#1A1A1A] text-[10px] text-[#555] uppercase tracking-widest">
                  <span>User</span>
                  <span className="text-right">Amount</span>
                  <span className="text-center">Status</span>
                  <span className="text-right">Date</span>
                </div>
                <div className="divide-y divide-[#1A1A1A]">
                  {filtered.map((w) => {
                    const sc = STATUS_CONFIG[w.payout_status];
                    const isActive = selected?.id === w.id;
                    return (
                      <button
                        key={w.id}
                        onClick={() => openDetail(w)}
                        className={`w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 text-left hover:bg-[#161616] transition-colors ${isActive ? 'bg-[#161616] border-l-2 border-primary' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{w.user_name || '—'}</p>
                          <p className="text-xs text-[#555] truncate">{w.user_email}</p>
                        </div>
                        <div className="text-right self-center">
                          <p className="text-sm font-bold text-white">{formatAmount(w.amount)}</p>
                        </div>
                        <div className="self-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${sc.bg} ${sc.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </div>
                        <div className="text-right self-center">
                          <p className="text-xs text-[#555]">{formatDate(w.requested_at)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-full lg:w-[400px] flex-shrink-0">
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg overflow-hidden sticky top-20">
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A]">
                  <h2 className="text-sm font-bold text-white">Withdrawal Detail</h2>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#1A1A1A] text-[#666] hover:text-white transition-colors"
                    aria-label="Close detail panel"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-5 space-y-5 max-h-[calc(100vh-140px)] overflow-y-auto">
                  {/* Amount */}
                  <div className="text-center py-4 bg-[#0A0A0A] rounded-lg border border-[#1A1A1A]">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest mb-1">Requested Amount</p>
                    <p className="text-3xl font-extrabold text-white">{formatAmount(selected.amount)}</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[selected.payout_status].bg} ${STATUS_CONFIG[selected.payout_status].color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[selected.payout_status].dot}`} />
                        {STATUS_CONFIG[selected.payout_status].label}
                      </span>
                    </div>
                  </div>

                  {/* User info */}
                  <div>
                    <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2">User</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Name', value: selected.user_name || '—' },
                        { label: 'Email', value: selected.user_email },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between text-sm">
                          <span className="text-[#666]">{row.label}</span>
                          <span className="text-white font-medium truncate max-w-[220px]">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bank info */}
                  <div>
                    <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2">Bank Details</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Bank', value: selected.bank_name },
                        { label: 'Account Name', value: selected.account_name },
                        { label: 'Account No.', value: selected.account_number },
                        { label: 'Routing No.', value: selected.routing_number },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between text-sm">
                          <span className="text-[#666]">{row.label}</span>
                          <span className="text-white font-medium">{row.value || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2">Timeline</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#666]">Requested</span>
                        <span className="text-white">{formatDate(selected.requested_at)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#666]">Processed</span>
                        <span className="text-white">{formatDate(selected.processed_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick action buttons for pending */}
                  {selected.payout_status === 'pending' && (
                    <div className="border-t border-[#1A1A1A] pt-4">
                      <p className="text-[10px] text-[#555] uppercase tracking-widest mb-3">Quick Actions</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openConfirm('approve', 'paid', actionNotes)}
                          className="flex items-center justify-center gap-2 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 text-xs font-bold rounded tracking-widest uppercase transition-all"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Approve
                        </button>
                        <button
                          onClick={() => openConfirm('reject', 'rejected', actionNotes)}
                          className="flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-xs font-bold rounded tracking-widest uppercase transition-all"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status update */}
                  <div className="border-t border-[#1A1A1A] pt-4">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest mb-3">Update Status</p>
                    <div className="space-y-3">
                      <select
                        value={actionStatus}
                        onChange={(e) => setActionStatus(e.target.value as WithdrawalRequest['payout_status'])}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="paid">Paid</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <textarea
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder="Admin notes (optional)…"
                        rows={3}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-primary/50 transition-colors resize-none"
                      />
                      <button
                        onClick={() => openConfirm('update', actionStatus, actionNotes)}
                        disabled={saving}
                        className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded tracking-widest uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden="true">
                              <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                            </svg>
                            Saving…
                          </>
                        ) : saved ? (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            Saved
                          </>
                        ) : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                  {/* Disbursement Activity Log */}
                  <div className="border-t border-[#1A1A1A] pt-4">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest mb-3">Disbursement Activity</p>
                    {logEvents.length === 0 ? (
                      <p className="text-xs text-[#444] italic">No activity recorded yet for this request.</p>
                    ) : (
                      <div className="space-y-3">
                        {logEvents.map((ev, idx) => {
                          const sc = STATUS_CONFIG[ev.status];
                          return (
                            <div key={ev.id} className="flex gap-3">
                              {/* Timeline line */}
                              <div className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border ${sc.bg} ${sc.color}`}>
                                  {sc.icon}
                                </div>
                                {idx < logEvents.length - 1 && (
                                  <div className="w-px flex-1 bg-[#1A1A1A] mt-1" />
                                )}
                              </div>
                              <div className="pb-3 min-w-0">
                                <p className={`text-xs font-semibold ${sc.color}`}>{sc.label}</p>
                                <p className="text-xs text-[#AAAAAA] mt-0.5 leading-relaxed">{ev.note}</p>
                                <p className="text-[10px] text-[#444] mt-1">{formatDateTime(ev.timestamp)} · {ev.actor}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Existing notes */}
                  {selected.notes && (
                    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded p-3">
                      <p className="text-[10px] text-[#555] uppercase tracking-widest mb-1">Admin Notes</p>
                      <p className="text-sm text-[#AAAAAA]">{selected.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && confirmModal.withdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
          />
          <div className="relative bg-[#111111] border border-[#2A2A2A] rounded-xl w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]">
              <div className="flex items-center gap-3">
                {confirmModal.type === 'approve' ? (
                  <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                ) : confirmModal.type === 'reject' ? (
                  <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" aria-hidden="true">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E31937" strokeWidth="2" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                )}
                <h3 className="text-sm font-bold text-white">
                  {confirmModal.type === 'approve' ?'Confirm Payout Approval'
                    : confirmModal.type === 'reject' ?'Confirm Rejection' :'Confirm Status Update'}
                </h3>
              </div>
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#1A1A1A] text-[#666] hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Payout summary */}
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#666]">User</span>
                  <span className="text-sm font-semibold text-white">{confirmModal.withdrawal.user_name || confirmModal.withdrawal.user_email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#666]">Amount</span>
                  <span className="text-lg font-extrabold text-white">{formatAmount(confirmModal.withdrawal.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#666]">Bank</span>
                  <span className="text-sm text-white">{confirmModal.withdrawal.bank_name || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#666]">Account No.</span>
                  <span className="text-sm text-white font-mono">{confirmModal.withdrawal.account_number || '—'}</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#1A1A1A] pt-3">
                  <span className="text-xs text-[#666]">New Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[confirmModal.targetStatus].bg} ${STATUS_CONFIG[confirmModal.targetStatus].color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[confirmModal.targetStatus].dot}`} />
                    {STATUS_CONFIG[confirmModal.targetStatus].label}
                  </span>
                </div>
              </div>

              {confirmModal.type === 'approve' && (
                <div className="flex items-start gap-2 p-3 bg-green-500/5 border border-green-500/15 rounded-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" className="flex-shrink-0 mt-0.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                  </svg>
                  <p className="text-xs text-green-400/80">
                    Approving this payout will mark it as <strong>Paid</strong> and send a confirmation email to the user.
                  </p>
                </div>
              )}

              {confirmModal.type === 'reject' && (
                <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/15 rounded-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="flex-shrink-0 mt-0.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                  </svg>
                  <p className="text-xs text-red-400/80">
                    This action will reject the withdrawal request. The user will not receive a payout.
                  </p>
                </div>
              )}

              {confirmModal.notes && (
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-widest mb-1.5">Notes</p>
                  <p className="text-xs text-[#AAAAAA] bg-[#0A0A0A] border border-[#1A1A1A] rounded p-3">{confirmModal.notes}</p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="flex-1 py-2.5 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] text-[#AAAAAA] hover:text-white text-xs font-bold rounded tracking-widest uppercase transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeStatusUpdate}
                className={`flex-1 py-2.5 text-white text-xs font-bold rounded tracking-widest uppercase transition-all ${
                  confirmModal.type === 'approve' ?'bg-green-600 hover:bg-green-500'
                    : confirmModal.type === 'reject' ?'bg-red-600 hover:bg-red-500' :'bg-primary hover:bg-primary/90'
                }`}
              >
                {confirmModal.type === 'approve' ?'Confirm Payout'
                  : confirmModal.type === 'reject' ?'Confirm Rejection' :'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
