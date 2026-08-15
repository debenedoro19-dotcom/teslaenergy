'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { createEmptyPortfolio, getCurrentUser, isAdmin, type UserPortfolio, type Investment, type Transaction, type Alert, type ChartPoint, type AllocationItem,  } from '@/lib/portfolioStore';
import { sendKYCApprovedEmail, sendPortfolioModifiedEmail, sendReturnsUpdatedEmail, sendSupportTicketUpdatedEmail } from '@/lib/emailService';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';

type AdminView = 'users' | 'edit' | 'kyc' | 'analytics' | 'support' | 'storage' | 'userdata' | 'inventory' | 'giveaways';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketCategory = 'account' | 'investment' | 'withdrawal' | 'kyc' | 'technical' | 'other';

interface SupportTicket {
  id: string;
  user_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: TicketCategory;
  ticket_status: TicketStatus;
  priority: string;
  admin_reply: string | null;
  admin_notes: string | null;
  user_email: string;
  user_name: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  user_profiles?: { email: string; full_name: string } | null;
}

const TICKET_STATUS_CONFIG: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: '#facc15' },
  in_progress: { label: 'In Progress', color: '#60a5fa' },
  resolved: { label: 'Resolved', color: '#4ade80' },
  closed: { label: 'Closed', color: '#888888' },
};

const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  account: 'Account & Profile',
  investment: 'Investment & Portfolio',
  withdrawal: 'Withdrawals & Payouts',
  kyc: 'KYC Verification',
  technical: 'Technical Issue',
  other: 'Other',
};

interface KYCSubmission {
  id: string;
  user_id: string;
  date_of_birth: string | null;
  country: string | null;
  street_address: string | null;
  city: string | null;
  zip_code: string | null;
  id_type: string | null;
  id_number: string | null;
  id_document_url: string | null;
  id_document_back_url: string | null;
  address_proof_url: string | null;
  investor_type: string | null;
  annual_income: string | null;
  investment_experience: string | null;
  income_document_url: string | null;
  kyc_status: 'pending' | 'under_review' | 'approved' | 'rejected';
  admin_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  user_profiles?: { email: string; full_name: string } | null;
}

interface AnalyticsData {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  kycBreakdown: { name: string; value: number; color: string }[];
  countryBreakdown: { country: string; count: number }[];
  investorTypeBreakdown: { name: string; value: number }[];
  incomeBreakdown: { name: string; value: number }[];
  signupsOverTime: { month: string; signups: number }[];
  activeUsers: number;
  portfolioUsers: number;
}

// ── Inventory types ──────────────────────────────────────────────────────────
type InventoryCategory = 'Vehicles' | 'Energy' | 'Robotics';
interface InventoryItem {
  id: string;
  name: string;
  price: string;
  category: InventoryCategory;
  badge: string;
  image: string;
  description: string;
  available: boolean;
}

// ── Giveaway types ───────────────────────────────────────────────────────────
interface GiveawayItem {
  id: string;
  title: string;
  prize: string;
  ends: string;
  entryFee: string;
  entries: number;
  maxEntries: number;
  badge: string;
  active: boolean;
}

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: '1', name: '2025 Tesla Cybertruck AWD', price: '$79,990', category: 'Vehicles', badge: 'NEW', image: '', description: 'Stainless steel body, 340mi range', available: true },
  { id: '2', name: '2025 Model S Plaid', price: '$89,990', category: 'Vehicles', badge: 'NEW', image: '', description: 'Tri-motor, 0-60 in 1.99s', available: true },
  { id: '3', name: 'Powerwall 3 – 13.5 kWh', price: '$11,500', category: 'Energy', badge: 'ENERGY', image: '', description: 'Home battery storage system', available: true },
  { id: '4', name: 'Tesla Solar Roof V3 – 10 kW', price: '$35,000', category: 'Energy', badge: 'ENERGY', image: '', description: 'Integrated solar tile system', available: true },
  { id: '5', name: 'Optimus Gen 2 – Production Allocation', price: '$25,000', category: 'Robotics', badge: 'ROBOTICS', image: '', description: 'Humanoid robot allocation', available: true },
];

const DEFAULT_GIVEAWAYS: GiveawayItem[] = [
  { id: '1', title: 'Win a 2025 Model 3 Long Range', prize: '2025 Tesla Model 3 Long Range AWD', ends: '2026-12-31', entryFee: 'Free with any inventory inquiry', entries: 1247, maxEntries: 5000, badge: 'FREE ENTRY', active: true },
  { id: '2', title: 'Cybertruck Experience Weekend', prize: 'Cybertruck Foundation Series + $2,000 credit', ends: '2026-10-15', entryFee: '$25 entry', entries: 683, maxEntries: 2000, badge: '$25 ENTRY', active: true },
];

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [view, setView] = useState<AdminView>('users');
  const [users, setUsers] = useState<UserPortfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<UserPortfolio | null>(null);
  const [activeSection, setActiveSection] = useState<'stats' | 'investments' | 'transactions' | 'alerts' | 'chart' | 'allocation'>('stats');
  const [saved, setSaved] = useState(false);

  // KYC state
  const [kycList, setKycList] = useState<KYCSubmission[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState<KYCSubmission | null>(null);
  const [kycNotes, setKycNotes] = useState('');
  const [kycSaving, setKycSaving] = useState(false);
  const [kycSaved, setKycSaved] = useState(false);
  const [kycFilter, setKycFilter] = useState<'all' | 'pending' | 'under_review' | 'approved' | 'rejected'>('all');

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Support tickets state
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReply, setTicketReply] = useState('');
  const [ticketStatusUpdate, setTicketStatusUpdate] = useState<TicketStatus>('open');
  const [ticketSaving, setTicketSaving] = useState(false);
  const [ticketSaved, setTicketSaved] = useState(false);
  const [supportFilter, setSupportFilter] = useState<'all' | TicketStatus>('all');

  // Storage bucket state
  const [storageFiles, setStorageFiles] = useState<any[]>([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageBucket, setStorageBucket] = useState('kyc-documents');
  const [storagePrefix, setStoragePrefix] = useState('');
  const [storageBuckets, setStorageBuckets] = useState<string[]>(['kyc-documents', 'user-uploads', 'avatars']);

  // User data state
  const [userData, setUserData] = useState<any[]>([]);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [userDataTable, setUserDataTable] = useState<'user_profiles' | 'kyc_submissions' | 'user_portfolios'>('user_profiles');
  const [userDataSearch, setUserDataSearch] = useState('');

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(DEFAULT_INVENTORY);
  const [inventoryFilter, setInventoryFilter] = useState<'All' | InventoryCategory>('All');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({ category: 'Vehicles', available: true, badge: 'NEW' });

  // Giveaway state
  const [giveawayItems, setGiveawayItems] = useState<GiveawayItem[]>(DEFAULT_GIVEAWAYS);
  const [editingGiveaway, setEditingGiveaway] = useState<GiveawayItem | null>(null);
  const [showAddGiveaway, setShowAddGiveaway] = useState(false);
  const [newGiveaway, setNewGiveaway] = useState<Partial<GiveawayItem>>({ active: true, entries: 0, maxEntries: 1000 });

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (currentUser && isAdmin(currentUser.id)) {
      setAuthorized(true);
      loadUsers();
    }
  }, []);

  async function loadUsers() {
    try {
      const supabase = createClient();
      const [profilesRes, portfoliosRes] = await Promise.all([
        supabase.from('user_profiles').select('id, email, full_name, role, created_at').order('created_at', { ascending: false }),
        supabase.from('user_portfolios').select('*'),
      ]);

      const profiles = profilesRes.data ?? [];
      const portfolioRows = portfoliosRes.data ?? [];

      const merged: UserPortfolio[] = profiles
        .filter((p) => p.role !== 'admin')
        .map((p) => {
          const row = portfolioRows.find((r) => r.user_id === p.id);
          if (row) {
            return {
              userId: p.id,
              userName: row.user_name || p.full_name || p.email,
              userEmail: p.email,
              stats: row.stats ?? createEmptyPortfolio(p.id, '', '').stats,
              chartData: row.chart_data ?? [],
              allocation: row.allocation ?? [],
              investments: row.investments ?? [],
              transactions: row.transactions ?? [],
              alerts: row.alerts ?? [],
              referrals: row.referrals ?? { total: 0, pending: 0, earnings: '$0', history: [] },
            };
          }
          return createEmptyPortfolio(p.id, p.full_name || p.email, p.email);
        });

      setUsers(merged);
    } catch (err) {
      console.error('Failed to load users from Supabase:', err);
    }
  }

  async function loadKYCSubmissions() {
    setKycLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('kyc_submissions')
        .select('*, user_profiles(email, full_name)')
        .order('submitted_at', { ascending: false });
      if (!error && data) setKycList(data as KYCSubmission[]);
    } catch (err) {
      console.error('Failed to load KYC submissions:', err);
    }
    setKycLoading(false);
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    try {
      const supabase = createClient();
      const { data: profiles } = await supabase.from('user_profiles').select('id, email, full_name, role, created_at');
      const { data: kyc } = await supabase.from('kyc_submissions').select('user_id, kyc_status, country, investor_type, annual_income, submitted_at');
      const { data: portfolios } = await supabase.from('user_portfolios').select('user_id, stats');
      const totalUsers = profiles?.length ?? 0;
      const kycStatusMap: Record<string, number> = { pending: 0, under_review: 0, approved: 0, rejected: 0, none: 0 };
      const kycUserIds = new Set((kyc ?? []).map((k) => k.user_id));
      (profiles ?? []).forEach((p) => { if (!kycUserIds.has(p.id)) kycStatusMap['none']++; });
      (kyc ?? []).forEach((k) => { kycStatusMap[k.kyc_status] = (kycStatusMap[k.kyc_status] ?? 0) + 1; });
      const kycBreakdown = [
        { name: 'Approved', value: kycStatusMap['approved'], color: '#4ade80' },
        { name: 'Pending', value: kycStatusMap['pending'], color: '#facc15' },
        { name: 'Under Review', value: kycStatusMap['under_review'], color: '#60a5fa' },
        { name: 'Rejected', value: kycStatusMap['rejected'], color: '#f87171' },
        { name: 'No KYC', value: kycStatusMap['none'], color: '#3A3A3A' },
      ].filter((d) => d.value > 0);
      const countryMap: Record<string, number> = {};
      (kyc ?? []).forEach((k) => { if (k.country) countryMap[k.country] = (countryMap[k.country] ?? 0) + 1; });
      const countryBreakdown = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([country, count]) => ({ country, count }));
      const investorMap: Record<string, number> = {};
      (kyc ?? []).forEach((k) => { const t = k.investor_type || 'Unknown'; investorMap[t] = (investorMap[t] ?? 0) + 1; });
      const investorTypeBreakdown = Object.entries(investorMap).map(([name, value]) => ({ name, value }));
      const incomeMap: Record<string, number> = {};
      (kyc ?? []).forEach((k) => { const inc = k.annual_income || 'Not specified'; incomeMap[inc] = (incomeMap[inc] ?? 0) + 1; });
      const incomeBreakdown = Object.entries(incomeMap).map(([name, value]) => ({ name, value }));
      const monthMap: Record<string, number> = {};
      (profiles ?? []).forEach((p) => {
        if (p.created_at) {
          const d = new Date(p.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap[key] = (monthMap[key] ?? 0) + 1;
        }
      });
      const signupsOverTime = Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-8).map(([key, signups]) => {
        const [year, month] = key.split('-');
        const label = new Date(Number(year), Number(month) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
        return { month: label, signups };
      });
      const portfolioUsers = portfolios?.length ?? 0;
      const activeUsers = (portfolios ?? []).filter((p) => {
        const stats = p.stats as { totalPortfolio?: string };
        return stats?.totalPortfolio && stats.totalPortfolio !== '$0';
      }).length;
      const verifiedUsers = kycStatusMap['approved'];
      const unverifiedUsers = totalUsers - verifiedUsers;
      setAnalyticsData({ totalUsers, verifiedUsers, unverifiedUsers, kycBreakdown, countryBreakdown, investorTypeBreakdown, incomeBreakdown, signupsOverTime, activeUsers, portfolioUsers });
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
    setAnalyticsLoading(false);
  }

  function openAnalyticsView() { setView('analytics'); loadAnalytics(); }
  function openKYCView() { setView('kyc'); setSelectedKyc(null); loadKYCSubmissions(); }
  function openSupportView() { setView('support'); setSelectedTicket(null); loadSupportTickets(); }

  async function loadSupportTickets() {
    setSupportLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('support_tickets').select('*, user_profiles(email, full_name)').order('created_at', { ascending: false });
      if (!error && data) setSupportTickets(data as SupportTicket[]);
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    }
    setSupportLoading(false);
  }

  // ── Storage Bucket ────────────────────────────────────────────────────────
  async function loadStorageFiles() {
    setStorageLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from(storageBucket).list(storagePrefix || undefined, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      if (!error && data) setStorageFiles(data);
      else setStorageFiles([]);
    } catch (err) {
      console.error('Storage load error:', err);
      setStorageFiles([]);
    }
    setStorageLoading(false);
  }

  async function getStorageUrl(path: string) {
    const supabase = createClient();
    const { data } = await supabase.storage.from(storageBucket).createSignedUrl(
      storagePrefix ? `${storagePrefix}/${path}` : path, 3600
    );
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  async function deleteStorageFile(path: string) {
    if (!confirm(`Delete "${path}"? This cannot be undone.`)) return;
    const supabase = createClient();
    const fullPath = storagePrefix ? `${storagePrefix}/${path}` : path;
    await supabase.storage.from(storageBucket).remove([fullPath]);
    loadStorageFiles();
  }

  // ── User Data ─────────────────────────────────────────────────────────────
  async function loadUserData() {
    setUserDataLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from(userDataTable).select('*').order('created_at', { ascending: false }).limit(200);
      if (!error && data) setUserData(data);
      else setUserData([]);
    } catch (err) {
      console.error('User data load error:', err);
      setUserData([]);
    }
    setUserDataLoading(false);
  }

  async function deleteUserRow(id: string) {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    const supabase = createClient();
    await supabase.from(userDataTable).delete().eq('id', id);
    loadUserData();
  }

  // ── Inventory ─────────────────────────────────────────────────────────────
  function saveInventoryItem() {
    if (!editingItem) return;
    setInventoryItems(prev => prev.map(i => i.id === editingItem.id ? editingItem : i));
    setEditingItem(null);
  }

  function deleteInventoryItem(id: string) {
    if (!confirm('Remove this inventory item?')) return;
    setInventoryItems(prev => prev.filter(i => i.id !== id));
  }

  function addInventoryItem() {
    if (!newItem.name || !newItem.price) return;
    const item: InventoryItem = {
      id: Date.now().toString(),
      name: newItem.name || '',
      price: newItem.price || '',
      category: newItem.category as InventoryCategory || 'Vehicles',
      badge: newItem.badge || 'NEW',
      image: newItem.image || '',
      description: newItem.description || '',
      available: newItem.available ?? true,
    };
    setInventoryItems(prev => [...prev, item]);
    setNewItem({ category: 'Vehicles', available: true, badge: 'NEW' });
    setShowAddItem(false);
  }

  // ── Giveaways ─────────────────────────────────────────────────────────────
  function saveGiveawayItem() {
    if (!editingGiveaway) return;
    setGiveawayItems(prev => prev.map(g => g.id === editingGiveaway.id ? editingGiveaway : g));
    setEditingGiveaway(null);
  }

  function deleteGiveawayItem(id: string) {
    if (!confirm('Remove this giveaway?')) return;
    setGiveawayItems(prev => prev.filter(g => g.id !== id));
  }

  function addGiveawayItem() {
    if (!newGiveaway.title || !newGiveaway.prize) return;
    const item: GiveawayItem = {
      id: Date.now().toString(),
      title: newGiveaway.title || '',
      prize: newGiveaway.prize || '',
      ends: newGiveaway.ends || '2026-12-31',
      entryFee: newGiveaway.entryFee || 'Free',
      entries: newGiveaway.entries ?? 0,
      maxEntries: newGiveaway.maxEntries ?? 1000,
      badge: newGiveaway.badge || 'FREE ENTRY',
      active: newGiveaway.active ?? true,
    };
    setGiveawayItems(prev => [...prev, item]);
    setNewGiveaway({ active: true, entries: 0, maxEntries: 1000 });
    setShowAddGiveaway(false);
  }

  function openKYCDetail(kyc: KYCSubmission) {
    setSelectedKyc(kyc);
    setKycNotes(kyc.admin_notes || '');
    setKycSaved(false);
  }

  async function updateKYCStatus(status: KYCSubmission['kyc_status']) {
    if (!selectedKyc) return;
    setKycSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('kyc_submissions').update({ kyc_status: status, admin_notes: kycNotes, reviewed_at: new Date().toISOString() }).eq('id', selectedKyc.id);
      if (!error) {
        setSelectedKyc((prev) => prev ? { ...prev, kyc_status: status, admin_notes: kycNotes } : prev);
        setKycList((prev) => prev.map((k) => k.id === selectedKyc.id ? { ...k, kyc_status: status, admin_notes: kycNotes } : k));
        setKycSaved(true);
        setTimeout(() => setKycSaved(false), 2500);
        if (status === 'approved' && selectedKyc.user_profiles?.email) {
          sendKYCApprovedEmail(selectedKyc.user_profiles.email, selectedKyc.user_profiles.full_name || 'Investor', kycNotes || undefined).catch(console.error);
        }
      }
    } catch (err) { console.error('Failed to update KYC:', err); }
    setKycSaving(false);
  }

  async function updateTicketStatus() {
    if (!selectedTicket) return;
    setTicketSaving(true);
    try {
      const supabase = createClient();
      const updateData: Record<string, any> = { ticket_status: ticketStatusUpdate, updated_at: new Date().toISOString() };
      if (ticketReply.trim()) updateData.admin_reply = ticketReply.trim();
      if (['resolved', 'closed'].includes(ticketStatusUpdate)) updateData.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('support_tickets').update(updateData).eq('id', selectedTicket.id);
      if (!error) {
        const updated = { ...selectedTicket, ticket_status: ticketStatusUpdate, admin_reply: ticketReply.trim() || selectedTicket.admin_reply };
        setSelectedTicket(updated);
        setSupportTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t));
        setTicketSaved(true);
        setTimeout(() => setTicketSaved(false), 2500);
        sendSupportTicketUpdatedEmail(selectedTicket.user_email, selectedTicket.user_name || selectedTicket.user_email, ticketStatusUpdate, ticketReply.trim() || undefined).catch(console.error);
      }
    } catch (err) { console.error('Failed to update ticket:', err); }
    setTicketSaving(false);
  }

  function openEdit(portfolio: UserPortfolio) {
    setSelectedPortfolio(JSON.parse(JSON.stringify(portfolio)));
    setView('edit');
    setActiveSection('stats');
    setSaved(false);
  }

  async function handleSave() {
    if (!selectedPortfolio) return;
    try {
      const supabase = createClient();
      const { error: upsertError } = await supabase.from('user_portfolios').upsert(
        {
          user_id: selectedPortfolio.userId,
          user_email: selectedPortfolio.userEmail,
          user_name: selectedPortfolio.userName,
          stats: selectedPortfolio.stats,
          chart_data: selectedPortfolio.chartData,
          allocation: selectedPortfolio.allocation,
          investments: selectedPortfolio.investments,
          transactions: selectedPortfolio.transactions,
          alerts: selectedPortfolio.alerts,
          referrals: selectedPortfolio.referrals,
        },
        { onConflict: 'user_id' }
      );
      if (upsertError) throw upsertError;

      // Update local list
      setUsers((prev) =>
        prev.map((u) => (u.userId === selectedPortfolio.userId ? { ...selectedPortfolio } : u))
      );

      sendPortfolioModifiedEmail(selectedPortfolio.userEmail, selectedPortfolio.userName, { stats: selectedPortfolio.stats }).catch(console.error);
      if (selectedPortfolio.stats?.totalReturns) {
        sendReturnsUpdatedEmail(selectedPortfolio.userEmail, selectedPortfolio.userName, { totalReturns: selectedPortfolio.stats.totalReturns, returnsChange: selectedPortfolio.stats.returnsChange, totalPortfolio: selectedPortfolio.stats.totalPortfolio }).catch(console.error);
      }
    } catch (err) {
      console.error('Supabase portfolio sync error:', err);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function updateStats(key: keyof UserPortfolio['stats'], value: string | number) {
    if (!selectedPortfolio) return;
    setSelectedPortfolio((prev) => prev ? { ...prev, stats: { ...prev.stats, [key]: value } } : prev);
  }

  function addInvestment() {
    if (!selectedPortfolio) return;
    const newInv: Investment = { id: Date.now().toString(), name: 'New Package', invested: '$0', current: '$0', returnPct: '0%', status: 'Active', duration: '12 months', progress: 0 };
    setSelectedPortfolio((prev) => prev ? { ...prev, investments: [...prev.investments, newInv] } : prev);
  }

  function updateInvestment(id: string, key: keyof Investment, value: string | number) {
    if (!selectedPortfolio) return;
    setSelectedPortfolio((prev) => prev ? { ...prev, investments: prev.investments.map((inv) => inv.id === id ? { ...inv, [key]: value } : inv) } : prev);
  }

  function removeInvestment(id: string) {
    if (!selectedPortfolio) return;
    setSelectedPortfolio((prev) => prev ? { ...prev, investments: prev.investments.filter((inv) => inv.id !== id) } : prev);
  }

  function addTransaction() {
    if (!selectedPortfolio) return;
    const newTx: Transaction = { id: Date.now().toString(), type: 'Investment', asset: 'New Asset', amount: '+$0', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), status: 'Active', statusColor: 'text-green-400' };
    setSelectedPortfolio((prev) => prev ? { ...prev, transactions: [...prev.transactions, newTx] } : prev);
  }

  function updateTransaction(id: string, key: keyof Transaction, value: string) {
    if (!selectedPortfolio) return;
    setSelectedPortfolio((prev) => prev ? { ...prev, transactions: prev.transactions.map((tx) => tx.id === id ? { ...tx, [key]: value } : tx) } : prev);
  }

  function removeTransaction(id: string) {
    if (!selectedPortfolio) return;
    setSelectedPortfolio((prev) => prev ? { ...prev, transactions: prev.transactions.filter((tx) => tx.id !== id) } : prev);
  }

  function addAlert() {
    if (!selectedPortfolio) return;
    const newAlert: Alert = { id: Date.now().toString(), icon: '🔔', text: 'New notification message', time: 'Just now', unread: true };
    setSelectedPortfolio((prev) => prev ? { ...prev, alerts: [...prev.alerts, newAlert] } : prev);
  }

  function updateAlert(id: string, key: keyof Alert, value: string | boolean) {
    if (!selectedPortfolio) return;
    setSelectedPortfolio((prev) => prev ? { ...prev, alerts: prev.alerts.map((a) => (a.id === id ? { ...a, [key]: value } : a)) } : prev);
  }

  function removeAlert(id: string) {
    if (!selectedPortfolio) return;
    setSelectedPortfolio((prev) => prev ? { ...prev, alerts: prev.alerts.filter((a) => a.id !== id) } : prev);
  }

  function addChartPoint() {
    if (!selectedPortfolio) return;
    const newPoint: ChartPoint = { month: 'New', value: 0 };
    setSelectedPortfolio((prev) => prev ? { ...prev, chartData: [...prev.chartData, newPoint] } : prev);
  }

  function updateChartPoint(index: number, key: keyof ChartPoint, value: string | number) {
    if (!selectedPortfolio) return;
    setSelectedPortfolio((prev) => prev ? { ...prev, chartData: prev.chartData.map((pt, i) => i === index ? { ...pt, [key]: key === 'value' ? Number(value) : value } : pt) } : prev);
  }

  function removeChartPoint(index: number) {
    if (!selectedPortfolio) return;
    setSelectedPortfolio((prev) => prev ? { ...prev, chartData: prev.chartData.filter((_, i) => i !== index) } : prev);
  }

  const ALLOC_COLORS = ['#E31937', '#FF6B6B', '#CC0000', '#2A2A2A', '#FF4444', '#991111'];

  function addAllocation() {
    if (!selectedPortfolio) return;
    const newItem: AllocationItem = { name: 'New Asset', value: 0, color: ALLOC_COLORS[selectedPortfolio.allocation.length % ALLOC_COLORS.length] };
    setSelectedPortfolio((prev) => prev ? { ...prev, allocation: [...prev.allocation, newItem] } : prev);
  }

  function updateAllocation(index: number, key: keyof AllocationItem, value: string | number) {
    if (!selectedPortfolio) return;
    setSelectedPortfolio((prev) => prev ? { ...prev, allocation: prev.allocation.map((item, i) => i === index ? { ...item, [key]: key === 'value' ? Number(value) : value } : item) } : prev);
  }

  function removeAllocation(index: number) {
    if (!selectedPortfolio) return;
    setSelectedPortfolio((prev) => prev ? { ...prev, allocation: prev.allocation.filter((_, i) => i !== index) } : prev);
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

  const kycStatusConfig = {
    pending: { label: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
    under_review: { label: 'Under Review', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
    approved: { label: 'Approved', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
    rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  };

  const filteredKyc = kycFilter === 'all' ? kycList : kycList.filter((k) => k.kyc_status === kycFilter);

  const sections = [
    { id: 'stats', label: 'Stats' },
    { id: 'investments', label: 'Investments' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'chart', label: 'Chart Data' },
    { id: 'allocation', label: 'Allocation' },
  ] as const;

  const PIE_COLORS = ['#E31937', '#FF6B6B', '#facc15', '#60a5fa', '#4ade80', '#f87171', '#a78bfa', '#fb923c'];

  const navBtnClass = (v: AdminView) =>
    `flex items-center gap-2 px-4 py-2 border text-xs font-bold rounded tracking-widest uppercase transition-all ${
      view === v
        ? 'bg-primary/20 border-primary/40 text-primary' :'bg-[#111111] hover:bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A] text-[#AAAAAA] hover:text-white'
    }`;

  const filteredInventory = inventoryFilter === 'All' ? inventoryItems : inventoryItems.filter(i => i.category === inventoryFilter);
  const filteredUserData = userDataSearch
    ? userData.filter(row => JSON.stringify(row).toLowerCase().includes(userDataSearch.toLowerCase()))
    : userData;

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
            {(view === 'edit' || view === 'kyc' || view === 'analytics' || view === 'support' || view === 'storage' || view === 'userdata' || view === 'inventory' || view === 'giveaways') && (
              <button
                onClick={() => { setView('users'); setSelectedKyc(null); setSelectedTicket(null); }}
                className="text-xs text-[#666666] hover:text-white transition-colors flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                Dashboard
              </button>
            )}
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">A</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Users List View */}
        {view === 'users' && (
          <>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E31937" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  </div>
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Dashboard</h1>
                </div>
                <p className="text-sm text-[#555555]">{users.length} registered user{users.length !== 1 ? 's' : ''}. Full platform control below.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] border border-[#1A1A1A] rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-[#555555] uppercase tracking-widest font-semibold">Live</span>
                </div>
              </div>
            </div>

            {/* ── Platform KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Total Users', value: users.length, icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>, accent: '#60a5fa', sub: 'Registered accounts' },
                { label: 'Active Portfolios', value: users.filter(u => u.stats.totalPortfolio !== '$0').length, icon: <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>, accent: '#4ade80', sub: 'With portfolio data' },
                { label: 'KYC Pending', value: kycList.filter(k => k.kyc_status === 'pending').length, icon: <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>, accent: '#facc15', sub: 'Awaiting review' },
                { label: 'Open Tickets', value: supportTickets.filter(t => t.ticket_status === 'open').length, icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>, accent: '#f87171', sub: 'Support requests' },
              ].map((kpi) => (
                <div key={kpi.label} className="relative bg-[#111111] border border-[#1A1A1A] rounded-xl p-5 overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5" style={{ background: kpi.accent, transform: 'translate(30%, -30%)' }} />
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-[10px] font-bold text-[#555555] uppercase tracking-widest">{kpi.label}</div>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${kpi.accent}15` }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={kpi.accent} strokeWidth="2" aria-hidden="true">{kpi.icon}</svg>
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-white mb-1" style={{ color: kpi.value > 0 && (kpi.label === 'KYC Pending' || kpi.label === 'Open Tickets') ? kpi.accent : undefined }}>{kpi.value}</div>
                  <div className="text-[10px] text-[#444444]">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Control Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              {[
                { view: 'analytics' as AdminView, label: 'Analytics', icon: <path d="M18 20V10M12 20V4M6 20v-6" />, color: 'text-blue-400', desc: 'User demographics & signups' },
                { view: 'kyc' as AdminView, label: 'KYC Review', icon: <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />, color: 'text-yellow-400', desc: 'Verify identity documents', badge: kycList.filter(k => k.kyc_status === 'pending').length },
                { view: 'support' as AdminView, label: 'Support', icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>, color: 'text-green-400', desc: 'Manage support tickets', badge: supportTickets.filter(t => t.ticket_status === 'open').length },
                { view: 'storage' as AdminView, label: 'Storage Bucket', icon: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>, color: 'text-purple-400', desc: 'View & manage uploaded files' },
                { view: 'userdata' as AdminView, label: 'User Data', icon: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>, color: 'text-cyan-400', desc: 'Browse & manage database records' },
                { view: 'inventory' as AdminView, label: 'Inventory', icon: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>, color: 'text-orange-400', desc: 'Add/edit vehicles, energy, robotics' },
                { view: 'giveaways' as AdminView, label: 'Giveaways', icon: <><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></>, color: 'text-pink-400', desc: 'Manage active giveaway campaigns' },
              ].map(({ view: v, label, icon, color, desc, badge }) => (
                <button
                  key={v}
                  onClick={() => {
                    setView(v);
                    if (v === 'analytics') loadAnalytics();
                    if (v === 'kyc') { setSelectedKyc(null); loadKYCSubmissions(); }
                    if (v === 'support') { setSelectedTicket(null); loadSupportTickets(); }
                    if (v === 'storage') loadStorageFiles();
                    if (v === 'userdata') loadUserData();
                  }}
                  className="relative bg-[#111111] border border-[#1A1A1A] hover:border-[#2A2A2A] rounded-xl p-5 text-left transition-all hover:bg-[#141414] group"
                >
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute top-3 right-3 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`${color} mb-3`} aria-hidden="true">{icon}</svg>
                  <p className="text-sm font-bold text-white mb-1">{label}</p>
                  <p className="text-[10px] text-[#555555] leading-relaxed">{desc}</p>
                </button>
              ))}
              <Link
                href="/admin/users"
                className="bg-[#111111] border border-[#1A1A1A] hover:border-[#2A2A2A] rounded-xl p-5 text-left transition-all hover:bg-[#141414]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-indigo-400 mb-3" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                <p className="text-sm font-bold text-white mb-1">User Management</p>
                <p className="text-[10px] text-[#555555] leading-relaxed">View users, review KYC & adjust balances</p>
              </Link>
              <Link
                href="/admin/withdrawals"
                className="bg-[#111111] border border-[#1A1A1A] hover:border-[#2A2A2A] rounded-xl p-5 text-left transition-all hover:bg-[#141414]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-red-400 mb-3" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                <p className="text-sm font-bold text-white mb-1">Withdrawals</p>
                <p className="text-[10px] text-[#555555] leading-relaxed">Review & approve withdrawal requests</p>
              </Link>
              <Link
                href="/admin/deposits"
                className="bg-[#111111] border border-[#1A1A1A] hover:border-green-400/20 rounded-xl p-5 text-left transition-all hover:bg-[#141414] group"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-green-400 mb-3" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <p className="text-sm font-bold text-white mb-1">Deposits</p>
                <p className="text-[10px] text-[#555555] leading-relaxed">Track & confirm user deposit requests</p>
              </Link>
              <Link
                href="/admin/settings"
                className="bg-[#111111] border border-[#1A1A1A] hover:border-[#2A2A2A] rounded-xl p-5 text-left transition-all hover:bg-[#141414]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-teal-400 mb-3" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                <p className="text-sm font-bold text-white mb-1">Settings</p>
                <p className="text-[10px] text-[#555555] leading-relaxed">Limits, commissions, KYC, security & care</p>
              </Link>
            </div>

            {/* ── User list ── */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#666666] uppercase tracking-widest">Registered Users</h2>
              <span className="text-xs text-[#444444]">{users.length} total</span>
            </div>
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24">
                <div className="w-16 h-16 rounded-full bg-[#111111] border border-[#1A1A1A] flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
                <p className="text-sm text-[#555555]">No users registered yet.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {users.map((u) => {
                  const hasData = u.investments.length > 0 || u.transactions.length > 0 || u.stats.totalPortfolio !== '$0';
                  const initials = u.userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={u.userId} className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#2A2A2A] hover:bg-[#131313] transition-all duration-200 group">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">{initials}</div>
                          {hasData && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#111111]" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{u.userName}</p>
                          <p className="text-xs text-[#555555]">{u.userEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-8">
                        <div className="text-center">
                          <p className="text-[10px] text-[#444444] uppercase tracking-widest mb-0.5">Portfolio</p>
                          <p className="text-sm font-bold text-white">{u.stats.totalPortfolio}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#444444] uppercase tracking-widest mb-0.5">Returns</p>
                          <p className="text-sm font-bold text-green-400">{u.stats.totalReturns || '$0'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#444444] uppercase tracking-widest mb-0.5">Packages</p>
                          <p className="text-sm font-bold text-white">{u.investments.length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#444444] uppercase tracking-widest mb-0.5">Status</p>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${hasData ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'bg-[#1A1A1A] text-[#555555] border border-[#2A2A2A]'}`}>{hasData ? 'Active' : 'Empty'}</span>
                        </div>
                        <button onClick={() => openEdit(u)} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-xs font-bold rounded-lg transition-all tracking-widest uppercase">Manage</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Analytics View ─────────────────────────────────────────────── */}
        {view === 'analytics' && (
          <>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">User Analytics</h1>
                <p className="text-sm text-[#666666]">Demographics, geography, and platform activity — live from Supabase.</p>
              </div>
              <button onClick={loadAnalytics} disabled={analyticsLoading} className="flex items-center gap-2 px-4 py-2 bg-[#111111] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] hover:text-white text-xs font-semibold rounded transition-all disabled:opacity-50 self-start sm:self-auto">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={analyticsLoading ? 'animate-spin' : ''} aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                Refresh
              </button>
            </div>
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-32"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : !analyticsData ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24"><p className="text-sm text-[#555555]">No data available yet.</p></div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Users', value: analyticsData.totalUsers, icon: '👥', color: 'text-white' },
                    { label: 'KYC Approved', value: analyticsData.verifiedUsers, icon: '✅', color: 'text-green-400' },
                    { label: 'Active Portfolios', value: analyticsData.activeUsers, icon: '📈', color: 'text-primary' },
                    { label: 'Portfolio Rows', value: analyticsData.portfolioUsers, icon: '🗂️', color: 'text-blue-400' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3"><span className="text-xs text-[#555555] uppercase tracking-widest font-semibold">{kpi.label}</span><span className="text-lg">{kpi.icon}</span></div>
                      <p className={`text-3xl font-extrabold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                  <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-5">Signups Over Time</h3>
                  {analyticsData.signupsOverTime.length === 0 ? <p className="text-xs text-[#444444] text-center py-8">No signup data available.</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={analyticsData.signupsOverTime} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                        <XAxis dataKey="month" tick={{ fill: '#555555', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#555555', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: 6, fontSize: 11 }} labelStyle={{ color: '#AAAAAA' }} itemStyle={{ color: '#E31937' }} />
                        <Line type="monotone" dataKey="signups" stroke="#E31937" strokeWidth={2} dot={{ fill: '#E31937', r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                    <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-5">KYC Status Breakdown</h3>
                    {analyticsData.kycBreakdown.length === 0 ? <p className="text-xs text-[#444444] text-center py-8">No KYC data yet.</p> : (
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width={140} height={140}>
                          <PieChart>
                            <Pie data={analyticsData.kycBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                              {analyticsData.kycBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: 6, fontSize: 11 }} itemStyle={{ color: '#FFFFFF' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2">
                          {analyticsData.kycBreakdown.map((item) => (
                            <div key={item.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} /><span className="text-xs text-[#888888]">{item.name}</span></div>
                              <span className="text-xs font-bold text-white">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                    <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-5">Top Countries (KYC)</h3>
                    {analyticsData.countryBreakdown.length === 0 ? <p className="text-xs text-[#444444] text-center py-8">No country data yet.</p> : (
                      <div className="space-y-3">
                        {analyticsData.countryBreakdown.map((item, i) => {
                          const maxCount = analyticsData.countryBreakdown[0]?.count ?? 1;
                          const pct = Math.round((item.count / maxCount) * 100);
                          return (
                            <div key={item.country}>
                              <div className="flex items-center justify-between mb-1"><span className="text-xs text-[#AAAAAA] font-semibold">{item.country}</span><span className="text-xs font-bold text-white">{item.count}</span></div>
                              <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} /></div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                    <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-5">Investor Type</h3>
                    {analyticsData.investorTypeBreakdown.length === 0 ? <p className="text-xs text-[#444444] text-center py-8">No investor type data yet.</p> : (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={analyticsData.investorTypeBreakdown} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: '#555555', fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#555555', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: 6, fontSize: 11 }} labelStyle={{ color: '#AAAAAA' }} itemStyle={{ color: '#E31937' }} />
                          <Bar dataKey="value" fill="#E31937" radius={[3, 3, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                    <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-5">Annual Income Range</h3>
                    {analyticsData.incomeBreakdown.length === 0 ? <p className="text-xs text-[#444444] text-center py-8">No income data yet.</p> : (
                      <div className="space-y-3">
                        {analyticsData.incomeBreakdown.map((item, i) => {
                          const total = analyticsData.incomeBreakdown.reduce((s, d) => s + d.value, 0);
                          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                          return (
                            <div key={item.name}>
                              <div className="flex items-center justify-between mb-1"><span className="text-xs text-[#AAAAAA] font-semibold truncate max-w-[60%]">{item.name}</span><span className="text-xs font-bold text-white">{item.value} <span className="text-[#555555] font-normal">({pct}%)</span></span></div>
                              <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} /></div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                  <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-5">Platform Activity Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Verification Rate', value: analyticsData.totalUsers > 0 ? `${Math.round((analyticsData.verifiedUsers / analyticsData.totalUsers) * 100)}%` : '0%', sub: `${analyticsData.verifiedUsers} of ${analyticsData.totalUsers} users`, color: 'text-green-400' },
                      { label: 'Portfolio Adoption', value: analyticsData.totalUsers > 0 ? `${Math.round((analyticsData.portfolioUsers / analyticsData.totalUsers) * 100)}%` : '0%', sub: `${analyticsData.portfolioUsers} have portfolios`, color: 'text-blue-400' },
                      { label: 'Active Investors', value: analyticsData.totalUsers > 0 ? `${Math.round((analyticsData.activeUsers / analyticsData.totalUsers) * 100)}%` : '0%', sub: `${analyticsData.activeUsers} with funded portfolios`, color: 'text-primary' },
                      { label: 'Unverified Users', value: analyticsData.unverifiedUsers, sub: 'awaiting KYC approval', color: 'text-yellow-400' },
                    ].map((stat) => (
                      <div key={stat.label} className="border border-[#1A1A1A] rounded-lg p-4">
                        <p className="text-[10px] text-[#555555] uppercase tracking-widest mb-2">{stat.label}</p>
                        <p className={`text-2xl font-extrabold mb-1 ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] text-[#444444]">{stat.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Storage Bucket View ─────────────────────────────────────────── */}
        {view === 'storage' && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">Storage Bucket</h1>
                <p className="text-sm text-[#666666]">Browse and manage uploaded user documents and files from Supabase Storage.</p>
              </div>
              <button onClick={loadStorageFiles} disabled={storageLoading} className="flex items-center gap-2 px-4 py-2 bg-[#111111] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] hover:text-white text-xs font-semibold rounded transition-all disabled:opacity-50 self-start sm:self-auto">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={storageLoading ? 'animate-spin' : ''} aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                Refresh
              </button>
            </div>

            {/* Bucket selector + prefix */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#555555] uppercase tracking-widest">Bucket</label>
                <select value={storageBucket} onChange={e => setStorageBucket(e.target.value)} className="bg-[#111111] border border-[#2A2A2A] text-white text-xs rounded px-3 py-2 focus:outline-none focus:border-[#3A3A3A]">
                  {storageBuckets.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#555555] uppercase tracking-widest">Folder Prefix (optional)</label>
                <input value={storagePrefix} onChange={e => setStoragePrefix(e.target.value)} placeholder="e.g. user-id/kyc" className="bg-[#111111] border border-[#2A2A2A] text-white text-xs rounded px-3 py-2 focus:outline-none focus:border-[#3A3A3A] w-56" />
              </div>
              <div className="flex flex-col justify-end">
                <button onClick={loadStorageFiles} className="px-5 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-bold rounded transition-all">Browse</button>
              </div>
            </div>

            {storageLoading ? (
              <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : storageFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 bg-[#111111] border border-[#1A1A1A] rounded-xl">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p className="text-sm text-[#555555]">No files found in <span className="text-white font-semibold">{storageBucket}</span>{storagePrefix ? `/${storagePrefix}` : ''}.</p>
                <p className="text-xs text-[#444444]">Try a different bucket name or leave prefix empty to list root.</p>
              </div>
            ) : (
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[#1A1A1A] text-[10px] text-[#555555] uppercase tracking-widest font-bold">
                  <div className="col-span-5">Name</div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-3">Last Modified</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {storageFiles.map((file) => (
                  <div key={file.name} className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-[#1A1A1A] last:border-0 hover:bg-[#141414] transition-colors items-center">
                    <div className="col-span-5 flex items-center gap-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" aria-hidden="true">
                        {file.metadata ? <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></> : <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>}
                      </svg>
                      <span className="text-xs text-white font-medium truncate">{file.name}</span>
                    </div>
                    <div className="col-span-2 text-xs text-[#666666]">
                      {file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(1)} KB` : '—'}
                    </div>
                    <div className="col-span-3 text-xs text-[#666666]">
                      {file.updated_at ? new Date(file.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      {file.metadata && (
                        <button onClick={() => getStorageUrl(file.name)} className="text-[10px] text-primary hover:underline font-semibold">View</button>
                      )}
                      <button onClick={() => deleteStorageFile(file.name)} className="text-[10px] text-red-400 hover:underline font-semibold">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── User Data View ──────────────────────────────────────────────── */}
        {view === 'userdata' && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">User Data</h1>
                <p className="text-sm text-[#666666]">Browse and manage collected user records from the database.</p>
              </div>
              <button onClick={loadUserData} disabled={userDataLoading} className="flex items-center gap-2 px-4 py-2 bg-[#111111] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] hover:text-white text-xs font-semibold rounded transition-all disabled:opacity-50 self-start sm:self-auto">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={userDataLoading ? 'animate-spin' : ''} aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                Refresh
              </button>
            </div>

            {/* Table selector + search */}
            <div className="flex flex-wrap gap-3 mb-6 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#555555] uppercase tracking-widest">Table</label>
                <select value={userDataTable} onChange={e => { setUserDataTable(e.target.value as any); setUserData([]); }} className="bg-[#111111] border border-[#2A2A2A] text-white text-xs rounded px-3 py-2 focus:outline-none focus:border-[#3A3A3A]">
                  <option value="user_profiles">user_profiles</option>
                  <option value="kyc_submissions">kyc_submissions</option>
                  <option value="user_portfolios">user_portfolios</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-[10px] text-[#555555] uppercase tracking-widest">Search</label>
                <input value={userDataSearch} onChange={e => setUserDataSearch(e.target.value)} placeholder="Filter by any field…" className="bg-[#111111] border border-[#2A2A2A] text-white text-xs rounded px-3 py-2 focus:outline-none focus:border-[#3A3A3A]" />
              </div>
              <button onClick={loadUserData} className="px-5 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-bold rounded transition-all">Load</button>
            </div>

            {userDataLoading ? (
              <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : userData.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 bg-[#111111] border border-[#1A1A1A] rounded-xl">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                <p className="text-sm text-[#555555]">Click <span className="text-white font-semibold">Load</span> to fetch records from <span className="text-white font-semibold">{userDataTable}</span>.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#555555]">{filteredUserData.length} record{filteredUserData.length !== 1 ? 's' : ''} in <span className="text-white">{userDataTable}</span></p>
                {filteredUserData.map((row) => (
                  <div key={row.id} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-4 hover:border-[#2A2A2A] transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {(row.full_name || row.email || row.user_email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{row.full_name || row.user_name || row.email || row.user_email || row.id}</p>
                          <p className="text-xs text-[#555555]">{row.email || row.user_email || `ID: ${row.id?.slice(0, 8)}…`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {row.kyc_status && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${kycStatusConfig[row.kyc_status as keyof typeof kycStatusConfig]?.bg} ${kycStatusConfig[row.kyc_status as keyof typeof kycStatusConfig]?.color}`}>
                            {kycStatusConfig[row.kyc_status as keyof typeof kycStatusConfig]?.label}
                          </span>
                        )}
                        {row.role && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">{row.role}</span>}
                        <button onClick={() => deleteUserRow(row.id)} className="text-[10px] text-red-400 hover:text-red-300 font-semibold transition-colors">Delete</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {Object.entries(row)
                        .filter(([k]) => !['id', 'full_name', 'email', 'user_email', 'user_name', 'role', 'kyc_status', 'stats', 'investments', 'transactions', 'alerts', 'chart_data', 'allocation', 'referrals'].includes(k))
                        .slice(0, 8)
                        .map(([k, v]) => (
                          <div key={k} className="bg-[#0A0A0A] rounded p-2">
                            <p className="text-[9px] text-[#444444] uppercase tracking-widest mb-0.5">{k.replace(/_/g, ' ')}</p>
                            <p className="text-[10px] text-[#AAAAAA] truncate">{v === null || v === undefined ? '—' : String(v).slice(0, 40)}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Inventory Management View ───────────────────────────────────── */}
        {view === 'inventory' && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">Inventory Management</h1>
                <p className="text-sm text-[#666666]">Add, edit, or remove vehicles, energy products, and robotics from the live inventory.</p>
              </div>
              <button onClick={() => setShowAddItem(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-xs font-bold rounded tracking-widest uppercase transition-all self-start sm:self-auto">
                <span>+</span> Add Item
              </button>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {(['All', 'Vehicles', 'Energy', 'Robotics'] as const).map(cat => (
                <button key={cat} onClick={() => setInventoryFilter(cat)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${inventoryFilter === cat ? 'bg-primary text-white' : 'bg-[#111111] border border-[#2A2A2A] text-[#888888] hover:text-white'}`}>{cat}</button>
              ))}
            </div>

            {/* Add Item Form */}
            {showAddItem && (
              <div className="bg-[#111111] border border-primary/20 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-bold text-white mb-4">New Inventory Item</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {[
                    { key: 'name', label: 'Product Name', placeholder: '2025 Tesla Model Y' },
                    { key: 'price', label: 'Price', placeholder: '$44,990' },
                    { key: 'badge', label: 'Badge', placeholder: 'NEW' },
                    { key: 'image', label: 'Image URL', placeholder: 'https://…' },
                    { key: 'description', label: 'Description', placeholder: 'Short description…' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] text-[#555555] uppercase tracking-widest mb-1.5">{f.label}</label>
                      <input value={(newItem as any)[f.key] || ''} onChange={e => setNewItem(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2 rounded text-sm input-tesla" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] text-[#555555] uppercase tracking-widest mb-1.5">Category</label>
                    <select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value as InventoryCategory }))} className="w-full px-3 py-2 rounded text-sm input-tesla">
                      <option value="Vehicles">Vehicles</option>
                      <option value="Energy">Energy</option>
                      <option value="Robotics">Robotics</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <label className="text-[10px] text-[#555555] uppercase tracking-widest">Available</label>
                    <button onClick={() => setNewItem(p => ({ ...p, available: !p.available }))} className={`relative w-10 h-5 rounded-full transition-colors ${newItem.available ? 'bg-primary' : 'bg-[#2A2A2A]'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${newItem.available ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={addInventoryItem} className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded tracking-widest uppercase transition-all hover:bg-primary/90">Add Item</button>
                  <button onClick={() => setShowAddItem(false)} className="px-5 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] text-xs font-bold rounded tracking-widest uppercase transition-all hover:text-white">Cancel</button>
                </div>
              </div>
            )}

            {/* Edit Item Form */}
            {editingItem && (
              <div className="bg-[#111111] border border-blue-400/20 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-bold text-white mb-4">Edit: {editingItem.name}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {[
                    { key: 'name', label: 'Product Name' },
                    { key: 'price', label: 'Price' },
                    { key: 'badge', label: 'Badge' },
                    { key: 'image', label: 'Image URL' },
                    { key: 'description', label: 'Description' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] text-[#555555] uppercase tracking-widest mb-1.5">{f.label}</label>
                      <input value={(editingItem as any)[f.key] || ''} onChange={e => setEditingItem(p => p ? { ...p, [f.key]: e.target.value } : p)} className="w-full px-3 py-2 rounded text-sm input-tesla" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] text-[#555555] uppercase tracking-widest mb-1.5">Category</label>
                    <select value={editingItem.category} onChange={e => setEditingItem(p => p ? { ...p, category: e.target.value as InventoryCategory } : p)} className="w-full px-3 py-2 rounded text-sm input-tesla">
                      <option value="Vehicles">Vehicles</option>
                      <option value="Energy">Energy</option>
                      <option value="Robotics">Robotics</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <label className="text-[10px] text-[#555555] uppercase tracking-widest">Available</label>
                    <button onClick={() => setEditingItem(p => p ? { ...p, available: !p.available } : p)} className={`relative w-10 h-5 rounded-full transition-colors ${editingItem.available ? 'bg-primary' : 'bg-[#2A2A2A]'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${editingItem.available ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={saveInventoryItem} className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded tracking-widest uppercase transition-all hover:bg-primary/90">Save Changes</button>
                  <button onClick={() => setEditingItem(null)} className="px-5 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] text-xs font-bold rounded tracking-widest uppercase transition-all hover:text-white">Cancel</button>
                </div>
              </div>
            )}

            {/* Inventory list */}
            <div className="grid gap-3">
              {filteredInventory.map(item => (
                <div key={item.id} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#2A2A2A] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-lg shrink-0">
                      {item.category === 'Vehicles' ? '🚗' : item.category === 'Energy' ? '⚡' : '🤖'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <p className="text-xs text-[#555555]">{item.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
                    <div className="text-center"><p className="text-xs text-[#444444] uppercase tracking-widest mb-0.5">Price</p><p className="text-sm font-bold text-primary">{item.price}</p></div>
                    <div className="text-center"><p className="text-xs text-[#444444] uppercase tracking-widest mb-0.5">Category</p><p className="text-xs font-semibold text-white">{item.category}</p></div>
                    <div className="text-center"><p className="text-xs text-[#444444] uppercase tracking-widest mb-0.5">Badge</p><p className="text-xs font-bold text-[#888888]">{item.badge}</p></div>
                    <div className="text-center">
                      <p className="text-xs text-[#444444] uppercase tracking-widest mb-0.5">Status</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${item.available ? 'bg-green-400/10 text-green-400 border-green-400/20' : 'bg-[#1A1A1A] text-[#555555] border-[#2A2A2A]'}`}>{item.available ? 'Available' : 'Unavailable'}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingItem({ ...item })} className="px-3 py-1.5 bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 text-blue-400 text-xs font-semibold rounded transition-all">Edit</button>
                      <button onClick={() => deleteInventoryItem(item.id)} className="px-3 py-1.5 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 text-red-400 text-xs font-semibold rounded transition-all">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredInventory.length === 0 && (
                <div className="text-center py-16 text-[#444444] text-sm">No items in this category.</div>
              )}
            </div>
          </>
        )}

        {/* ── Giveaway Management View ────────────────────────────────────── */}
        {view === 'giveaways' && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">Giveaway Management</h1>
                <p className="text-sm text-[#666666]">Create, edit, and manage active giveaway campaigns shown on the website.</p>
              </div>
              <button onClick={() => setShowAddGiveaway(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-xs font-bold rounded tracking-widest uppercase transition-all self-start sm:self-auto">
                <span>+</span> New Giveaway
              </button>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Giveaways', value: giveawayItems.length, color: 'text-white' },
                { label: 'Active', value: giveawayItems.filter(g => g.active).length, color: 'text-green-400' },
                { label: 'Total Entries', value: giveawayItems.reduce((s, g) => s + g.entries, 0).toLocaleString(), color: 'text-primary' },
                { label: 'Max Capacity', value: giveawayItems.reduce((s, g) => s + g.maxEntries, 0).toLocaleString(), color: 'text-blue-400' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-4">
                  <p className="text-xs text-[#555555] uppercase tracking-widest mb-2">{kpi.label}</p>
                  <p className={`text-2xl font-extrabold ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Add Giveaway Form */}
            {showAddGiveaway && (
              <div className="bg-[#111111] border border-primary/20 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-bold text-white mb-4">New Giveaway Campaign</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {[
                    { key: 'title', label: 'Title', placeholder: 'Win a Tesla Model Y' },
                    { key: 'prize', label: 'Prize', placeholder: '2025 Tesla Model Y RWD' },
                    { key: 'ends', label: 'End Date', placeholder: '2026-12-31' },
                    { key: 'entryFee', label: 'Entry Fee', placeholder: 'Free / $25 entry' },
                    { key: 'badge', label: 'Badge Text', placeholder: 'FREE ENTRY' },
                    { key: 'maxEntries', label: 'Max Entries', placeholder: '5000' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] text-[#555555] uppercase tracking-widest mb-1.5">{f.label}</label>
                      <input type={f.key === 'maxEntries' ? 'number' : 'text'} value={(newGiveaway as any)[f.key] || ''} onChange={e => setNewGiveaway(p => ({ ...p, [f.key]: f.key === 'maxEntries' ? Number(e.target.value) : e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2 rounded text-sm input-tesla" />
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-5">
                    <label className="text-[10px] text-[#555555] uppercase tracking-widest">Active</label>
                    <button onClick={() => setNewGiveaway(p => ({ ...p, active: !p.active }))} className={`relative w-10 h-5 rounded-full transition-colors ${newGiveaway.active ? 'bg-primary' : 'bg-[#2A2A2A]'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${newGiveaway.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={addGiveawayItem} className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded tracking-widest uppercase transition-all hover:bg-primary/90">Create Giveaway</button>
                  <button onClick={() => setShowAddGiveaway(false)} className="px-5 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] text-xs font-bold rounded tracking-widest uppercase transition-all hover:text-white">Cancel</button>
                </div>
              </div>
            )}

            {/* Edit Giveaway Form */}
            {editingGiveaway && (
              <div className="bg-[#111111] border border-blue-400/20 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-bold text-white mb-4">Edit: {editingGiveaway.title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {[
                    { key: 'title', label: 'Title' },
                    { key: 'prize', label: 'Prize' },
                    { key: 'ends', label: 'End Date' },
                    { key: 'entryFee', label: 'Entry Fee' },
                    { key: 'badge', label: 'Badge Text' },
                    { key: 'entries', label: 'Current Entries' },
                    { key: 'maxEntries', label: 'Max Entries' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] text-[#555555] uppercase tracking-widest mb-1.5">{f.label}</label>
                      <input type={['entries', 'maxEntries'].includes(f.key) ? 'number' : 'text'} value={(editingGiveaway as any)[f.key] || ''} onChange={e => setEditingGiveaway(p => p ? { ...p, [f.key]: ['entries', 'maxEntries'].includes(f.key) ? Number(e.target.value) : e.target.value } : p)} className="w-full px-3 py-2 rounded text-sm input-tesla" />
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-5">
                    <label className="text-[10px] text-[#555555] uppercase tracking-widest">Active</label>
                    <button onClick={() => setEditingGiveaway(p => p ? { ...p, active: !p.active } : p)} className={`relative w-10 h-5 rounded-full transition-colors ${editingGiveaway.active ? 'bg-primary' : 'bg-[#2A2A2A]'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${editingGiveaway.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={saveGiveawayItem} className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded tracking-widest uppercase transition-all hover:bg-primary/90">Save Changes</button>
                  <button onClick={() => setEditingGiveaway(null)} className="px-5 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] text-xs font-bold rounded tracking-widest uppercase transition-all hover:text-white">Cancel</button>
                </div>
              </div>
            )}

            {/* Giveaway list */}
            <div className="grid gap-4">
              {giveawayItems.map(g => {
                const pct = Math.round((g.entries / g.maxEntries) * 100);
                return (
                  <div key={g.id} className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-6 hover:border-[#2A2A2A] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-sm font-bold text-white">{g.title}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${g.active ? 'bg-green-400/10 text-green-400 border-green-400/20' : 'bg-[#1A1A1A] text-[#555555] border-[#2A2A2A]'}`}>{g.active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <p className="text-xs text-[#666666]">Prize: <span className="text-[#AAAAAA]">{g.prize}</span></p>
                        <p className="text-xs text-[#666666] mt-0.5">Ends: <span className="text-[#AAAAAA]">{g.ends}</span> · Entry: <span className="text-[#AAAAAA]">{g.entryFee}</span></p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setEditingGiveaway({ ...g })} className="px-3 py-1.5 bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 text-blue-400 text-xs font-semibold rounded transition-all">Edit</button>
                        <button onClick={() => deleteGiveawayItem(g.id)} className="px-3 py-1.5 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 text-red-400 text-xs font-semibold rounded transition-all">Remove</button>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-[#666666] mb-1.5">
                        <span>{g.entries.toLocaleString()} entries</span>
                        <span>{pct}% of {g.maxEntries.toLocaleString()} max</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {giveawayItems.length === 0 && (
                <div className="text-center py-16 text-[#444444] text-sm">No giveaways yet. Click &quot;New Giveaway&quot; to create one.</div>
              )}
            </div>
          </>
        )}

        {/* KYC Review View */}
        {view === 'kyc' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">KYC Review</h1>
              <p className="text-sm text-[#666666]">Review and approve identity verification submissions.</p>
            </div>
            {selectedKyc ? (
              <div>
                <button onClick={() => setSelectedKyc(null)} className="flex items-center gap-1.5 text-xs text-[#666666] hover:text-white transition-colors mb-6">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  Back to KYC List
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                      <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-4">Applicant</h3>
                      <p className="text-sm font-bold text-white mb-1">{selectedKyc.user_profiles?.full_name || 'Unknown User'}</p>
                      <p className="text-xs text-[#555555] mb-4">{selectedKyc.user_profiles?.email}</p>
                      <div className="space-y-2">
                        {[
                          { label: 'Submitted', value: selectedKyc.submitted_at ? new Date(selectedKyc.submitted_at).toLocaleDateString() : '—' },
                          { label: 'Country', value: selectedKyc.country || '—' },
                          { label: 'Investor Type', value: selectedKyc.investor_type || '—' },
                          { label: 'Income', value: selectedKyc.annual_income || '—' },
                          { label: 'Experience', value: selectedKyc.investment_experience || '—' },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between py-1.5 border-b border-[#1A1A1A]">
                            <span className="text-[10px] text-[#555555] uppercase tracking-widest">{item.label}</span>
                            <span className="text-xs font-semibold text-white">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                      <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-3">Current Status</h3>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-widest ${kycStatusConfig[selectedKyc.kyc_status]?.bg} ${kycStatusConfig[selectedKyc.kyc_status]?.color}`}>{kycStatusConfig[selectedKyc.kyc_status]?.label}</span>
                    </div>
                    <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                      <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-3">Admin Notes</h3>
                      <textarea value={kycNotes} onChange={(e) => setKycNotes(e.target.value)} placeholder="Add notes for the applicant (optional)..." rows={3} className="w-full px-3 py-2.5 rounded text-sm input-tesla resize-none" />
                    </div>
                    <div className="space-y-2">
                      <button onClick={() => updateKYCStatus('approved')} disabled={kycSaving || selectedKyc.kyc_status === 'approved'} className="w-full py-3 rounded text-xs font-bold uppercase tracking-widest transition-all bg-green-400/10 hover:bg-green-400/20 border border-green-400/20 hover:border-green-400/40 text-green-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {kycSaving ? <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" /> : '✓'} Approve KYC
                      </button>
                      <button onClick={() => updateKYCStatus('under_review')} disabled={kycSaving || selectedKyc.kyc_status === 'under_review'} className="w-full py-3 rounded text-xs font-bold uppercase tracking-widest transition-all bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 hover:border-blue-400/40 text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed">Mark Under Review</button>
                      <button onClick={() => updateKYCStatus('rejected')} disabled={kycSaving || selectedKyc.kyc_status === 'rejected'} className="w-full py-3 rounded text-xs font-bold uppercase tracking-widest transition-all bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 hover:border-red-400/40 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed">Reject KYC</button>
                      {kycSaved && <p className="text-center text-xs text-green-400 font-semibold">✓ Status updated</p>}
                    </div>
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                      <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-4">Identity Documents</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: 'Government ID (Front)', url: selectedKyc.id_document_url, detail: `${selectedKyc.id_type?.replace('_', ' ')} · ${selectedKyc.id_number}` },
                          { label: 'Government ID (Back)', url: selectedKyc.id_document_back_url, detail: 'Back side' },
                          { label: 'Proof of Address', url: selectedKyc.address_proof_url, detail: `${selectedKyc.street_address}, ${selectedKyc.city}` },
                          { label: 'Income Verification', url: selectedKyc.income_document_url, detail: selectedKyc.annual_income || '' },
                        ].map((doc) => (
                          <div key={doc.label} className="border border-[#1A1A1A] rounded-lg overflow-hidden">
                            <div className="p-3 border-b border-[#1A1A1A]">
                              <p className="text-[10px] font-bold text-[#666666] uppercase tracking-widest">{doc.label}</p>
                              {doc.detail && <p className="text-[10px] text-[#444444] mt-0.5 capitalize">{doc.detail}</p>}
                            </div>
                            {doc.url ? (
                              <div className="p-3">
                                {doc.url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                  <img src={doc.url} alt={`${doc.label} document`} className="w-full h-32 object-cover rounded" />
                                ) : (
                                  <div className="h-32 flex flex-col items-center justify-center gap-2 bg-[#0A0A0A] rounded">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                    <span className="text-[10px] text-[#555555]">PDF Document</span>
                                  </div>
                                )}
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-primary hover:underline">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                  View Full Document
                                </a>
                              </div>
                            ) : (
                              <div className="p-3 h-32 flex items-center justify-center"><p className="text-[10px] text-[#333333]">Not uploaded</p></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                      <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-4">Residential Address</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Street', value: selectedKyc.street_address },
                          { label: 'City', value: selectedKyc.city },
                          { label: 'ZIP / Postal', value: selectedKyc.zip_code },
                          { label: 'Country', value: selectedKyc.country },
                          { label: 'Date of Birth', value: selectedKyc.date_of_birth },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className="text-[10px] text-[#444444] uppercase tracking-widest mb-1">{item.label}</p>
                            <p className="text-xs font-semibold text-white">{item.value || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex gap-1 mb-6 border-b border-[#1A1A1A] overflow-x-auto">
                  {(['all', 'pending', 'under_review', 'approved', 'rejected'] as const).map((f) => {
                    const count = f === 'all' ? kycList.length : kycList.filter((k) => k.kyc_status === f).length;
                    return (
                      <button key={f} onClick={() => setKycFilter(f)} className={`px-4 py-3 text-xs font-semibold tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 ${kycFilter === f ? 'text-white border-primary' : 'text-[#555555] border-transparent hover:text-[#888888]'}`}>
                        {f === 'under_review' ? 'Under Review' : f.charAt(0).toUpperCase() + f.slice(1)}
                        {count > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${kycFilter === f ? 'bg-primary text-white' : 'bg-[#1A1A1A] text-[#555555]'}`}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
                {kycLoading ? (
                  <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                ) : filteredKyc.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-24">
                    <p className="text-sm text-[#555555]">No KYC submissions found.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredKyc.map((kyc) => {
                      const cfg = kycStatusConfig[kyc.kyc_status];
                      return (
                        <div key={kyc.id} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#2A2A2A] transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">{(kyc.user_profiles?.full_name || 'U').charAt(0).toUpperCase()}</div>
                            <div>
                              <p className="text-sm font-bold text-white">{kyc.user_profiles?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-[#555555]">{kyc.user_profiles?.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 sm:gap-8">
                            <div className="text-center"><p className="text-xs text-[#444444] uppercase tracking-widest mb-0.5">Country</p><p className="text-sm font-bold text-white">{kyc.country || '—'}</p></div>
                            <div className="text-center"><p className="text-xs text-[#444444] uppercase tracking-widest mb-0.5">Submitted</p><p className="text-xs font-semibold text-white">{kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString() : '—'}</p></div>
                            <div className="text-center"><p className="text-xs text-[#444444] uppercase tracking-widest mb-0.5">Status</p><span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg?.bg} ${cfg?.color}`}>{cfg?.label}</span></div>
                            <button onClick={() => openKYCDetail(kyc)} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-xs font-semibold rounded transition-all">Review</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Support Tickets View ─────────────────────────────────────── */}
        {view === 'support' && (
          <>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">Support Tickets</h1>
                <p className="text-sm text-[#666666]">Manage user support requests and send email updates.</p>
              </div>
              <div className="flex items-center gap-3">
                <select value={supportFilter} onChange={e => setSupportFilter(e.target.value as any)} className="bg-[#111111] border border-[#2A2A2A] text-[#AAAAAA] text-xs rounded px-3 py-2 focus:outline-none focus:border-[#3A3A3A]">
                  <option value="all">All Tickets</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <button onClick={loadSupportTickets} disabled={supportLoading} className="flex items-center gap-2 px-4 py-2 bg-[#111111] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] hover:text-white text-xs font-semibold rounded transition-all disabled:opacity-50">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={supportLoading ? 'animate-spin' : ''} aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                  Refresh
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {(['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map(s => (
                <div key={s} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-4">
                  <p className="text-2xl font-bold" style={{ color: TICKET_STATUS_CONFIG[s].color }}>{supportTickets.filter(t => t.ticket_status === s).length}</p>
                  <p className="text-xs text-[#555555] uppercase tracking-widest mt-1">{TICKET_STATUS_CONFIG[s].label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 space-y-2">
                {supportLoading ? (
                  <div className="flex items-center justify-center py-16"><div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                  (supportFilter === 'all' ? supportTickets : supportTickets.filter(t => t.ticket_status === supportFilter)).map(ticket => (
                    <button key={ticket.id} onClick={() => { setSelectedTicket(ticket); setTicketReply(ticket.admin_reply || ''); setTicketStatusUpdate(ticket.ticket_status); setTicketSaved(false); }} className={`w-full text-left p-4 rounded-lg border transition-all ${selectedTicket?.id === ticket.id ? 'bg-[#1A1A1A] border-primary/40' : 'bg-[#111111] border-[#1A1A1A] hover:border-[#2A2A2A]'}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[#555555]">{ticket.ticket_number}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: TICKET_STATUS_CONFIG[ticket.ticket_status].color, background: `${TICKET_STATUS_CONFIG[ticket.ticket_status].color}15` }}>{TICKET_STATUS_CONFIG[ticket.ticket_status].label}</span>
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
                      <p className="text-xs text-[#666666] mt-0.5 truncate">{ticket.user_profiles?.email || ticket.user_email}</p>
                      <p className="text-xs text-[#444444] mt-1">{new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </button>
                  ))
                )}
                {!supportLoading && supportTickets.length === 0 && <div className="text-center py-16 text-[#444444] text-sm">No support tickets yet.</div>}
              </div>
              <div className="lg:col-span-3">
                {!selectedTicket ? (
                  <div className="flex flex-col items-center justify-center h-64 bg-[#111111] border border-[#1A1A1A] rounded-lg">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <p className="text-[#444444] text-sm mt-3">Select a ticket to review</p>
                  </div>
                ) : (
                  <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-[#555555]">{selectedTicket.ticket_number}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize" style={{ color: TICKET_STATUS_CONFIG[selectedTicket.ticket_status].color, background: `${TICKET_STATUS_CONFIG[selectedTicket.ticket_status].color}15` }}>{TICKET_STATUS_CONFIG[selectedTicket.ticket_status].label}</span>
                        <span className="text-xs text-[#555555] capitalize">{selectedTicket.priority} priority</span>
                      </div>
                      <h2 className="text-lg font-bold text-white">{selectedTicket.subject}</h2>
                      <p className="text-xs text-[#666666] mt-1">{selectedTicket.user_profiles?.full_name || selectedTicket.user_name || 'Unknown'} · {selectedTicket.user_profiles?.email || selectedTicket.user_email} · {TICKET_CATEGORY_LABELS[selectedTicket.category]}</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4">
                      <p className="text-xs text-[#555555] uppercase tracking-widest mb-2">User Request</p>
                      <p className="text-sm text-[#CCCCCC] leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                    {selectedTicket.admin_reply && (
                      <div className="bg-[#0A0A0A] border border-primary/20 rounded-lg p-4">
                        <p className="text-xs text-primary uppercase tracking-widest mb-2">Previous Response</p>
                        <p className="text-sm text-[#CCCCCC] leading-relaxed whitespace-pre-wrap">{selectedTicket.admin_reply}</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-[#555555] uppercase tracking-widest mb-2">Update Status</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map(s => (
                            <button key={s} type="button" onClick={() => setTicketStatusUpdate(s)} className={`py-2 rounded text-xs font-bold capitalize border transition-all ${ticketStatusUpdate === s ? 'border-current' : 'border-[#2A2A2A] text-[#555555] hover:border-[#3A3A3A]'}`} style={ticketStatusUpdate === s ? { color: TICKET_STATUS_CONFIG[s].color, background: `${TICKET_STATUS_CONFIG[s].color}15` } : {}}>{TICKET_STATUS_CONFIG[s].label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#555555] uppercase tracking-widest mb-2">Reply to User (optional)</label>
                        <textarea rows={4} value={ticketReply} onChange={e => setTicketReply(e.target.value)} placeholder="Write a response that will be sent to the user via email and shown in their ticket…" className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#444444] focus:outline-none focus:border-[#3A3A3A] resize-none" />
                      </div>
                      <button onClick={updateTicketStatus} disabled={ticketSaving} className="w-full py-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-xs font-bold rounded tracking-widest uppercase transition-all disabled:opacity-50">
                        {ticketSaving ? 'Saving…' : ticketSaved ? '✓ Saved & Email Sent' : 'Update Ticket & Notify User'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Edit User Portfolio View */}
        {view === 'edit' && selectedPortfolio && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight mb-0.5">{selectedPortfolio.userName}</h1>
                <p className="text-xs text-[#555555]">{selectedPortfolio.userEmail}</p>
              </div>
              <button onClick={handleSave} className="px-6 py-2.5 tesla-btn-primary rounded text-sm font-semibold flex items-center gap-2 self-start sm:self-auto">
                {saved ? (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>Saved!</>) : 'Save Changes'}
              </button>
            </div>
            <div className="flex gap-1 mb-6 border-b border-[#1A1A1A] overflow-x-auto">
              {sections.map((s) => (
                <button key={s.id} onClick={() => setActiveSection(s.id)} className={`px-4 py-3 text-xs font-semibold tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap ${activeSection === s.id ? 'text-white border-primary' : 'text-[#555555] border-transparent hover:text-[#888888]'}`}>{s.label}</button>
              ))}
            </div>
            {activeSection === 'stats' && (
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                <h3 className="text-sm font-bold text-white mb-5">Portfolio Statistics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'totalPortfolio', label: 'Total Portfolio Value', placeholder: '$84,500' },
                    { key: 'activeInvestments', label: 'Active Investments Count', placeholder: '2' },
                    { key: 'totalReturns', label: 'Total Returns', placeholder: '$9,500' },
                    { key: 'referralEarnings', label: 'Referral Earnings', placeholder: '$320' },
                    { key: 'portfolioChange', label: 'Portfolio Change Label', placeholder: '+$12,500 (17.4%)' },
                    { key: 'returnsChange', label: 'Returns Change Label', placeholder: '+$1,240 this month' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold text-[#666666] uppercase tracking-widest mb-2">{field.label}</label>
                      <input type="text" value={String(selectedPortfolio.stats[field.key as keyof typeof selectedPortfolio.stats])} onChange={(e) => updateStats(field.key as keyof UserPortfolio['stats'], e.target.value)} placeholder={field.placeholder} className="w-full px-4 py-2.5 rounded text-sm input-tesla" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeSection === 'investments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#555555]">{selectedPortfolio.investments.length} investment(s)</p>
                  <button onClick={addInvestment} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-semibold rounded transition-all flex items-center gap-1.5"><span>+</span> Add Investment</button>
                </div>
                {selectedPortfolio.investments.length === 0 && <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-8 text-center"><p className="text-xs text-[#444444]">No investments yet. Click &quot;Add Investment&quot; to create one.</p></div>}
                {selectedPortfolio.investments.map((inv) => (
                  <div key={inv.id} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4"><span className="text-xs font-semibold text-[#666666] uppercase tracking-widest">Investment</span><button onClick={() => removeInvestment(inv.id)} className="text-xs text-[#444444] hover:text-primary transition-colors">Remove</button></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: 'name', label: 'Package Name', placeholder: 'Growth Portfolio' },
                        { key: 'invested', label: 'Amount Invested', placeholder: '$25,000' },
                        { key: 'current', label: 'Current Value', placeholder: '$28,500' },
                        { key: 'returnPct', label: 'Return %', placeholder: '+14.0%' },
                        { key: 'status', label: 'Status', placeholder: 'Active' },
                        { key: 'duration', label: 'Duration', placeholder: '24 months' },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="block text-[10px] font-semibold text-[#555555] uppercase tracking-widest mb-1.5">{f.label}</label>
                          <input type="text" value={String(inv[f.key as keyof Investment])} onChange={(e) => updateInvestment(inv.id, f.key as keyof Investment, e.target.value)} placeholder={f.placeholder} className="w-full px-3 py-2 rounded text-sm input-tesla" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-[10px] font-semibold text-[#555555] uppercase tracking-widest mb-1.5">Progress (0-100)</label>
                        <input type="number" min="0" max="100" value={inv.progress} onChange={(e) => updateInvestment(inv.id, 'progress', Number(e.target.value))} className="w-full px-3 py-2 rounded text-sm input-tesla" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeSection === 'transactions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#555555]">{selectedPortfolio.transactions.length} transaction(s)</p>
                  <button onClick={addTransaction} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-semibold rounded transition-all flex items-center gap-1.5"><span>+</span> Add Transaction</button>
                </div>
                {selectedPortfolio.transactions.length === 0 && <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-8 text-center"><p className="text-xs text-[#444444]">No transactions yet.</p></div>}
                {selectedPortfolio.transactions.map((tx) => (
                  <div key={tx.id} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4"><span className="text-xs font-semibold text-[#666666] uppercase tracking-widest">Transaction</span><button onClick={() => removeTransaction(tx.id)} className="text-xs text-[#444444] hover:text-primary transition-colors">Remove</button></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#555555] uppercase tracking-widest mb-1.5">Type</label>
                        <select value={tx.type} onChange={(e) => updateTransaction(tx.id, 'type', e.target.value)} className="w-full px-3 py-2 rounded text-sm input-tesla">
                          <option value="Investment">Investment</option>
                          <option value="Return">Return</option>
                          <option value="Withdrawal">Withdrawal</option>
                        </select>
                      </div>
                      {[
                        { key: 'asset', label: 'Asset / Package', placeholder: 'Growth Portfolio' },
                        { key: 'amount', label: 'Amount', placeholder: '+$25,000' },
                        { key: 'date', label: 'Date', placeholder: 'Aug 10, 2026' },
                        { key: 'status', label: 'Status', placeholder: 'Active' },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="block text-[10px] font-semibold text-[#555555] uppercase tracking-widest mb-1.5">{f.label}</label>
                          <input type="text" value={String(tx[f.key as keyof Transaction])} onChange={(e) => updateTransaction(tx.id, f.key as keyof Transaction, e.target.value)} placeholder={f.placeholder} className="w-full px-3 py-2 rounded text-sm input-tesla" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeSection === 'alerts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#555555]">{selectedPortfolio.alerts.length} alert(s)</p>
                  <button onClick={addAlert} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-semibold rounded transition-all flex items-center gap-1.5"><span>+</span> Add Alert</button>
                </div>
                {selectedPortfolio.alerts.length === 0 && <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-8 text-center"><p className="text-xs text-[#444444]">No alerts yet.</p></div>}
                {selectedPortfolio.alerts.map((alert) => (
                  <div key={alert.id} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4"><span className="text-xs font-semibold text-[#666666] uppercase tracking-widest">Alert</span><button onClick={() => removeAlert(alert.id)} className="text-xs text-[#444444] hover:text-primary transition-colors">Remove</button></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: 'icon', label: 'Icon (emoji)', placeholder: '📈' },
                        { key: 'text', label: 'Message', placeholder: 'Portfolio gained $1,840 today' },
                        { key: 'time', label: 'Time Label', placeholder: '2h ago' },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="block text-[10px] font-semibold text-[#555555] uppercase tracking-widest mb-1.5">{f.label}</label>
                          <input type="text" value={String(alert[f.key as keyof Alert])} onChange={(e) => updateAlert(alert.id, f.key as keyof Alert, e.target.value)} placeholder={f.placeholder} className="w-full px-3 py-2 rounded text-sm input-tesla" />
                        </div>
                      ))}
                      <div className="flex items-center gap-3 pt-4">
                        <label className="text-[10px] font-semibold text-[#555555] uppercase tracking-widest">Unread</label>
                        <button onClick={() => updateAlert(alert.id, 'unread', !alert.unread)} className={`relative w-10 h-5 rounded-full transition-colors ${alert.unread ? 'bg-primary' : 'bg-[#2A2A2A]'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${alert.unread ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeSection === 'chart' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#555555]">{selectedPortfolio.chartData.length} data point(s)</p>
                  <button onClick={addChartPoint} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-semibold rounded transition-all flex items-center gap-1.5"><span>+</span> Add Point</button>
                </div>
                {selectedPortfolio.chartData.length === 0 && <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-8 text-center"><p className="text-xs text-[#444444]">No chart data yet.</p></div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedPortfolio.chartData.map((pt, i) => (
                    <div key={i} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3"><span className="text-[10px] text-[#444444] uppercase tracking-widest">Point {i + 1}</span><button onClick={() => removeChartPoint(i)} className="text-[10px] text-[#444444] hover:text-primary transition-colors">Remove</button></div>
                      <div className="space-y-2">
                        <div><label className="block text-[10px] font-semibold text-[#555555] uppercase tracking-widest mb-1">Month</label><input type="text" value={pt.month} onChange={(e) => updateChartPoint(i, 'month', e.target.value)} placeholder="Jan" className="w-full px-3 py-2 rounded text-sm input-tesla" /></div>
                        <div><label className="block text-[10px] font-semibold text-[#555555] uppercase tracking-widest mb-1">Value ($)</label><input type="number" value={pt.value} onChange={(e) => updateChartPoint(i, 'value', e.target.value)} placeholder="50000" className="w-full px-3 py-2 rounded text-sm input-tesla" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeSection === 'allocation' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#555555]">{selectedPortfolio.allocation.length} allocation(s) — values should sum to 100%</p>
                  <button onClick={addAllocation} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-semibold rounded transition-all flex items-center gap-1.5"><span>+</span> Add Allocation</button>
                </div>
                {selectedPortfolio.allocation.length === 0 && <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-8 text-center"><p className="text-xs text-[#444444]">No allocation data yet.</p></div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedPortfolio.allocation.map((item, i) => (
                    <div key={i} className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: item.color }} /><span className="text-[10px] text-[#444444] uppercase tracking-widest">Slice {i + 1}</span></div>
                        <button onClick={() => removeAllocation(i)} className="text-[10px] text-[#444444] hover:text-primary transition-colors">Remove</button>
                      </div>
                      <div className="space-y-2">
                        <div><label className="block text-[10px] font-semibold text-[#555555] uppercase tracking-widest mb-1">Name</label><input type="text" value={item.name} onChange={(e) => updateAllocation(i, 'name', e.target.value)} placeholder="Vehicles" className="w-full px-3 py-2 rounded text-sm input-tesla" /></div>
                        <div><label className="block text-[10px] font-semibold text-[#555555] uppercase tracking-widest mb-1">Value (%)</label><input type="number" min="0" max="100" value={item.value} onChange={(e) => updateAllocation(i, 'value', e.target.value)} placeholder="45" className="w-full px-3 py-2 rounded text-sm input-tesla" /></div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#555555] uppercase tracking-widest mb-1">Color</label>
                          <select value={item.color} onChange={(e) => updateAllocation(i, 'color', e.target.value)} className="w-full px-3 py-2 rounded text-sm input-tesla">
                            {ALLOC_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-8 pt-6 border-t border-[#1A1A1A] flex justify-end">
              <button onClick={handleSave} className="px-8 py-3 tesla-btn-primary rounded text-sm font-semibold flex items-center gap-2">
                {saved ? (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>Saved!</>) : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
