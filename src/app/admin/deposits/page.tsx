'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser, isAdmin } from '@/lib/portfolioStore';

interface DepositRecord {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  amount: number;
  package_name: string;
  payment_method: string;
  tx_ref: string;
  deposit_status: 'pending' | 'confirmed' | 'rejected' | 'processing';
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'processing' | 'rejected';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', dot: 'bg-yellow-400' },
  processing: { label: 'Processing', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', dot: 'bg-blue-400' },
  confirmed: { label: 'Confirmed', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', dot: 'bg-green-400' },
  rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', dot: 'bg-red-400' },
};

const PAYMENT_METHOD_ICONS: Record<string, string> = {
  bank_transfer: '🏦',
  crypto: '₿',
  card: '💳',
};

export default function AdminDepositsPage() {
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveIndicator, setLiveIndicator] = useState(false);
  const liveFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeChannel = useRef<any>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [userSearch, setUserSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selected, setSelected] = useState<DepositRecord | null>(null);
  const [actionStatus, setActionStatus] = useState<DepositRecord['deposit_status']>('pending');
  const [actionNotes, setActionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, confirmed: 0, rejected: 0, totalConfirmed: 0 });

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (currentUser && isAdmin(currentUser.id)) {
      setAuthorized(true);
      loadDeposits();
      subscribeToDeposits();
    }
    return () => {
      if (liveFlashTimer.current) clearTimeout(liveFlashTimer.current);
      if (realtimeChannel.current) {
        const supabase = createClient();
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

  function subscribeToDeposits() {
    const supabase = createClient();
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
      realtimeChannel.current = null;
    }
    const channel = supabase
      .channel('admin-deposits-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposit_records' }, (payload) => {
        flashLive();
        if (payload.eventType === 'INSERT') {
          const newRow = payload.new as DepositRecord;
          setDeposits((prev) => [newRow, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as DepositRecord;
          setDeposits((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
          setSelected((prev) => (prev?.id === updated.id ? updated : prev));
        } else if (payload.eventType === 'DELETE') {
          const deleted = payload.old as { id: string };
          setDeposits((prev) => prev.filter((d) => d.id !== deleted.id));
        }
      })
      .subscribe();
    realtimeChannel.current = channel;
  }

  function recomputeStats(rows: DepositRecord[]) {
    const s = { total: rows.length, pending: 0, processing: 0, confirmed: 0, rejected: 0, totalConfirmed: 0 };
    rows.forEach((r) => {
      if (r.deposit_status === 'pending') s.pending++;
      else if (r.deposit_status === 'processing') s.processing++;
      else if (r.deposit_status === 'confirmed') { s.confirmed++; s.totalConfirmed += Number(r.amount); }
      else if (r.deposit_status === 'rejected') s.rejected++;
    });
    return s;
  }

  const loadDeposits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('deposit_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      const rows = (data ?? []) as DepositRecord[];
      setDeposits(rows);
      setStats(recomputeStats(rows));
    } catch (err: unknown) {
      // Table may not exist yet — show empty state gracefully
      setError('');
      setDeposits([]);
    }
    setLoading(false);
  }, []);

  function openDetail(d: DepositRecord) {
    setSelected(d);
    setActionStatus(d.deposit_status);
    setActionNotes(d.notes ?? '');
    setSavedMsg('');
  }

  async function saveAction() {
    if (!selected) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const updateData: Record<string, any> = {
        deposit_status: actionStatus,
        notes: actionNotes || null,
        updated_at: new Date().toISOString(),
      };
      if (actionStatus === 'confirmed') updateData.confirmed_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('deposit_records')
        .update(updateData)
        .eq('id', selected.id);

      if (updateError) throw updateError;

      const updated = { ...selected, deposit_status: actionStatus, notes: actionNotes || null };
      setSelected(updated);
      setDeposits((prev) => prev.map((d) => (d.id === selected.id ? updated : d)));
      setStats(recomputeStats(deposits.map((d) => (d.id === selected.id ? updated : d))));
      setSavedMsg('Saved successfully');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (err) {
      setSavedMsg('Failed to save');
    }
    setSaving(false);
  }

  const filtered = deposits.filter((d) => {
    if (statusFilter !== 'all' && d.deposit_status !== statusFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      if (!d.user_email?.toLowerCase().includes(q) && !d.user_name?.toLowerCase().includes(q) && !d.tx_ref?.toLowerCase().includes(q)) return false;
    }
    if (dateFrom && new Date(d.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(d.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

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
          <Link href="/login" className="px-6 py-2.5 bg-primary text-white rounded text-sm font-semibold">Sign In as Admin</Link>
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
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${liveIndicator ? 'bg-green-400 animate-ping' : 'bg-green-400 animate-pulse'}`} />
              <span className="text-[10px] text-[#555555] uppercase tracking-widest hidden sm:block">Live</span>
            </div>
            <Link href="/admin" className="text-xs text-[#666666] hover:text-white transition-colors flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Dashboard
            </Link>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">A</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-400/10 border border-green-400/20 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Deposit Management</h1>
            </div>
            <p className="text-sm text-[#666666]">Track and manage all user deposit requests in real time.</p>
          </div>
          <button
            onClick={loadDeposits}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#111111] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] hover:text-white text-xs font-semibold rounded transition-all disabled:opacity-50 self-start sm:self-auto"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''} aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-white', accent: '#555555' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-400', accent: '#facc15' },
            { label: 'Processing', value: stats.processing, color: 'text-blue-400', accent: '#60a5fa' },
            { label: 'Confirmed', value: stats.confirmed, color: 'text-green-400', accent: '#4ade80' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-400', accent: '#f87171' },
            { label: 'Total Confirmed', value: `$${stats.totalConfirmed.toLocaleString()}`, color: 'text-green-400', accent: '#4ade80' },
          ].map((s) => (
            <div key={s.label} className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-4">
              <div className="text-[10px] font-bold text-[#555555] uppercase tracking-widest mb-2">{s.label}</div>
              <div className={`text-xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="mt-2 h-0.5 rounded-full" style={{ background: `${s.accent}33` }}>
                <div className="h-full rounded-full" style={{ width: stats.total > 0 ? `${Math.min(100, (Number(s.value) / stats.total) * 100)}%` : '0%', background: s.accent }} />
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'pending', 'processing', 'confirmed', 'rejected'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    statusFilter === s
                      ? s === 'all' ? 'bg-white/10 border-white/20 text-white' : `${STATUS_CONFIG[s]?.bg} ${STATUS_CONFIG[s]?.color}`
                      : 'bg-transparent border-[#2A2A2A] text-[#555555] hover:text-[#888888]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[180px]">
              <input
                type="text"
                placeholder="Search user, email, ref…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-1.5 text-xs text-white placeholder-[#444444] focus:outline-none focus:border-[#3A3A3A]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#888888] focus:outline-none focus:border-[#3A3A3A]" />
              <span className="text-[#444444] text-xs">–</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#888888] focus:outline-none focus:border-[#3A3A3A]" />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-400/10 border border-red-400/20 rounded-lg text-xs text-red-400">{error}</div>
        )}

        <div className="flex gap-6">
          {/* Deposit List */}
          <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block' : ''}`}>
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 bg-[#111111] border border-[#1A1A1A] rounded-xl">
                <div className="w-14 h-14 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#555555] mb-1">No deposits found</p>
                  <p className="text-xs text-[#3A3A3A]">
                    {deposits.length === 0
                      ? 'Deposit records will appear here once users submit deposits.' :'No deposits match your current filters.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1A1A1A] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#666666] uppercase tracking-widest">Deposits</span>
                  <span className="text-xs text-[#444444]">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-[#141414]">
                  {filtered.map((d) => {
                    const cfg = STATUS_CONFIG[d.deposit_status] || STATUS_CONFIG.pending;
                    const initials = (d.user_name || d.user_email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <button
                        key={d.id}
                        onClick={() => openDetail(d)}
                        className={`w-full text-left px-5 py-4 hover:bg-[#141414] transition-colors flex items-center gap-4 ${selected?.id === d.id ? 'bg-[#141414] border-l-2 border-primary' : ''}`}
                      >
                        <div className="w-9 h-9 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center text-xs font-bold text-green-400 shrink-0">{initials}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-white truncate">{d.user_name || d.user_email}</span>
                            <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.bg} ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-[#555555]">
                            <span>{d.package_name || 'Package'}</span>
                            <span>·</span>
                            <span>{PAYMENT_METHOD_ICONS[d.payment_method] || '💰'} {d.payment_method?.replace('_', ' ')}</span>
                            <span>·</span>
                            <span>{d.tx_ref}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-white">${Number(d.amount).toLocaleString()}</div>
                          <div className="text-[10px] text-[#444444]">{new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-full lg:w-96 shrink-0">
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl overflow-hidden sticky top-20">
                {/* Panel header */}
                <div className="px-5 py-4 border-b border-[#1A1A1A] flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-widest">Deposit Detail</span>
                  <button onClick={() => setSelected(null)} className="text-[#555555] hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* User info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center text-sm font-bold text-green-400">
                      {(selected.user_name || selected.user_email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{selected.user_name || 'Unknown'}</p>
                      <p className="text-xs text-[#555555]">{selected.user_email}</p>
                    </div>
                  </div>

                  {/* Amount + status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-3">
                      <div className="text-[10px] text-[#555555] uppercase tracking-widest mb-1">Amount</div>
                      <div className="text-lg font-extrabold text-white">${Number(selected.amount).toLocaleString()}</div>
                    </div>
                    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-3">
                      <div className="text-[10px] text-[#555555] uppercase tracking-widest mb-1">Status</div>
                      <div className={`text-sm font-bold ${STATUS_CONFIG[selected.deposit_status]?.color}`}>
                        {STATUS_CONFIG[selected.deposit_status]?.label}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5">
                    {[
                      { label: 'Package', value: selected.package_name || '—' },
                      { label: 'Payment Method', value: `${PAYMENT_METHOD_ICONS[selected.payment_method] || ''} ${selected.payment_method?.replace('_', ' ') || '—'}` },
                      { label: 'Tx Reference', value: selected.tx_ref || '—' },
                      { label: 'Submitted', value: new Date(selected.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                      ...(selected.confirmed_at ? [{ label: 'Confirmed', value: new Date(selected.confirmed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }] : []),
                    ].map((item) => (
                      <div key={item.label} className="flex items-start justify-between gap-3">
                        <span className="text-[10px] text-[#555555] uppercase tracking-widest shrink-0 mt-0.5">{item.label}</span>
                        <span className="text-xs text-[#AAAAAA] text-right font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#1A1A1A] pt-4 space-y-3">
                    <div>
                      <label className="text-[10px] text-[#555555] uppercase tracking-widest block mb-1.5">Update Status</label>
                      <select
                        value={actionStatus}
                        onChange={(e) => setActionStatus(e.target.value as DepositRecord['deposit_status'])}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3A3A3A]"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#555555] uppercase tracking-widest block mb-1.5">Admin Notes</label>
                      <textarea
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        rows={3}
                        placeholder="Add internal notes…"
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-xs text-white placeholder-[#444444] focus:outline-none focus:border-[#3A3A3A] resize-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={saveAction}
                        disabled={saving}
                        className="flex-1 py-2.5 bg-primary hover:bg-red-700 text-white text-xs font-bold rounded tracking-widest uppercase transition-all disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => { setActionStatus('confirmed'); saveAction(); }}
                        disabled={saving || selected.deposit_status === 'confirmed'}
                        className="px-3 py-2.5 bg-green-400/10 hover:bg-green-400/20 border border-green-400/20 text-green-400 text-xs font-bold rounded transition-all disabled:opacity-30"
                        title="Quick confirm"
                      >
                        ✓
                      </button>
                    </div>

                    {savedMsg && (
                      <p className={`text-xs text-center font-semibold ${savedMsg.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                        {savedMsg}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
