'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketCategory = 'account' | 'investment' | 'withdrawal' | 'kyc' | 'technical' | 'other';

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: TicketCategory;
  ticket_status: TicketStatus;
  priority: string;
  admin_reply: string | null;
  user_email: string;
  user_name: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; border: string }> = {
  open: { label: 'Open', color: '#facc15', bg: '#1a1500', border: '#3a3000' },
  in_progress: { label: 'In Progress', color: '#60a5fa', bg: '#0a1525', border: '#1a3050' },
  resolved: { label: 'Resolved', color: '#4ade80', bg: '#0a1a0a', border: '#1a4020' },
  closed: { label: 'Closed', color: '#888888', bg: '#111111', border: '#2a2a2a' },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  account: 'Account & Profile',
  investment: 'Investment & Portfolio',
  withdrawal: 'Withdrawals & Payouts',
  kyc: 'KYC Verification',
  technical: 'Technical Issue',
  other: 'Other',
};

export default function SupportPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'other' as TicketCategory,
    priority: 'normal',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      loadTickets();
    } else if (mounted && !user) {
      setLoading(false);
    }
  }, [mounted, user]);

  async function loadTickets() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (!err && data) setTickets(data as SupportTicket[]);
    } catch (e) {
      console.error('Failed to load tickets:', e);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      const ticketNumber = 'TT-' + Date.now().toString().slice(-8);
      const { data, error: insertErr } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          ticket_number: ticketNumber,
          subject: form.subject,
          description: form.description,
          category: form.category,
          priority: form.priority,
          ticket_status: 'open',
          user_email: user.email || '',
          user_name: user.user_metadata?.full_name || user.email || '',
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Send confirmation email
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notification-email`;
      await fetch(edgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({
          type: 'support_ticket_received',
          to: user.email,
          name: user.user_metadata?.full_name || user.email,
          subject: ticketNumber,
          message: form.description,
        }),
      });

      setSubmitSuccess(true);
      setForm({ subject: '', description: '', category: 'other', priority: 'normal' });
      await loadTickets();
      setTimeout(() => {
        setSubmitSuccess(false);
        setView('list');
      }, 2500);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit ticket. Please try again.');
    }
    setSubmitting(false);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Support Center</h1>
              <p className="text-xs text-muted-foreground">Submit and track your support requests</p>
            </div>
          </div>
          {user && view === 'list' && (
            <button
              onClick={() => setView('new')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              New Ticket
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Not logged in */}
        {!user && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Sign In to Access Support</h2>
            <p className="text-muted-foreground mb-6 text-sm">You need to be logged in to submit and track support tickets.</p>
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
              Sign In
            </Link>
          </div>
        )}

        {/* New Ticket Form */}
        {user && view === 'new' && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setView('list')} className="text-muted-foreground hover:text-foreground transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              </button>
              <h2 className="text-xl font-bold">Submit a Support Request</h2>
            </div>

            {submitSuccess ? (
              <div className="glass-card rounded-2xl p-8 text-center border border-green-500/30">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <h3 className="text-lg font-bold text-green-400 mb-2">Ticket Submitted!</h3>
                <p className="text-muted-foreground text-sm">We've received your request and sent a confirmation to your email. Redirecting to your tickets…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 border border-border space-y-5">
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as TicketCategory }))}
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Priority</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['low', 'normal', 'high', 'urgent'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, priority: p }))}
                        className={`py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                          form.priority === p
                            ? p === 'urgent' ? 'bg-red-500/20 border-red-500/50 text-red-400'
                            : p === 'high' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                            : p === 'normal'? 'bg-primary/20 border-primary/50 text-primary' :'bg-muted/20 border-muted/50 text-muted-foreground' :'bg-background border-border text-muted-foreground hover:border-muted'
                        }`}
                      >{p}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subject <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Brief summary of your issue"
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description <span className="text-red-400">*</span></label>
                  <textarea
                    required
                    rows={5}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Please describe your issue in detail. Include any relevant transaction IDs, dates, or error messages."
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className="flex-1 py-3 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-muted transition-colors"
                  >Cancel</button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting…' : 'Submit Ticket'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Ticket Detail */}
        {user && view === 'detail' && selectedTicket && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setView('list'); setSelectedTicket(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              </button>
              <div>
                <h2 className="text-lg font-bold">{selectedTicket.subject}</h2>
                <p className="text-xs text-muted-foreground font-mono">{selectedTicket.ticket_number}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Status & Meta */}
              <div className="glass-card rounded-2xl p-5 border border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        color: STATUS_CONFIG[selectedTicket.ticket_status].color,
                        background: STATUS_CONFIG[selectedTicket.ticket_status].bg,
                        border: `1px solid ${STATUS_CONFIG[selectedTicket.ticket_status].border}`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_CONFIG[selectedTicket.ticket_status].color }} />
                      {STATUS_CONFIG[selectedTicket.ticket_status].label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                    <p className="text-sm font-medium">{CATEGORY_LABELS[selectedTicket.category]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
                    <p className="text-sm font-medium capitalize">{selectedTicket.priority}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Submitted</p>
                    <p className="text-sm font-medium">{formatDate(selectedTicket.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="glass-card rounded-2xl p-5 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Your Request</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {/* Admin Reply */}
              {selectedTicket.admin_reply ? (
                <div className="glass-card rounded-2xl p-5 border border-primary/30" style={{ background: 'rgba(0,212,255,0.03)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">Support Team Response</p>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selectedTicket.admin_reply}</p>
                  {selectedTicket.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-3">Resolved on {formatDate(selectedTicket.resolved_at)}</p>
                  )}
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-5 border border-border text-center">
                  <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Our support team is reviewing your request. You'll receive an email update when there's a response.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ticket List */}
        {user && view === 'list' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {(['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map(s => {
                const count = tickets.filter(t => t.ticket_status === s).length;
                return (
                  <div key={s} className="glass-card rounded-xl p-4 border border-border">
                    <p className="text-2xl font-bold" style={{ color: STATUS_CONFIG[s].color }}>{count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{STATUS_CONFIG[s].label}</p>
                  </div>
                );
              })}
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Loading tickets…</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <h3 className="text-lg font-bold mb-2">No Support Tickets Yet</h3>
                <p className="text-muted-foreground text-sm mb-6">Have an issue? Submit a ticket and our team will help you.</p>
                <button
                  onClick={() => setView('new')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  Submit Your First Ticket
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => { setSelectedTicket(ticket); setView('detail'); }}
                    className="w-full glass-card rounded-xl p-4 border border-border hover:border-primary/40 transition-all text-left group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              color: STATUS_CONFIG[ticket.ticket_status].color,
                              background: STATUS_CONFIG[ticket.ticket_status].bg,
                              border: `1px solid ${STATUS_CONFIG[ticket.ticket_status].border}`,
                            }}
                          >
                            {STATUS_CONFIG[ticket.ticket_status].label}
                          </span>
                          {ticket.admin_reply && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-primary bg-primary/10 border border-primary/20">
                              Response
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{formatDate(ticket.created_at)}</p>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">{CATEGORY_LABELS[ticket.category]}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
