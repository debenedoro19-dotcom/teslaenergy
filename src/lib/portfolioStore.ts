// Portfolio data store using localStorage
// Admin manages user portfolios; users see their own data (empty by default)

export interface Transaction {
  id: string;
  type: 'Investment' | 'Return' | 'Withdrawal';
  asset: string;
  amount: string;
  date: string;
  status: string;
  statusColor: string;
}

export interface Investment {
  id: string;
  name: string;
  invested: string;
  current: string;
  returnPct: string;
  status: string;
  duration: string;
  progress: number;
}

export interface PortfolioStats {
  totalPortfolio: string;
  activeInvestments: number;
  totalReturns: string;
  referralEarnings: string;
  portfolioChange: string;
  returnsChange: string;
}

export interface ChartPoint {
  month: string;
  value: number;
}

export interface AllocationItem {
  name: string;
  value: number;
  color: string;
}

export interface Alert {
  id: string;
  icon: string;
  text: string;
  time: string;
  unread: boolean;
}

export interface ReferralEntry {
  name: string;
  date: string;
  status: string;
  reward: string;
  statusColor: string;
}

export interface ReferralData {
  total: number;
  pending: number;
  earnings: string;
  history: ReferralEntry[];
}

export interface UserPortfolio {
  userId: string;
  userName: string;
  userEmail: string;
  stats: PortfolioStats;
  chartData: ChartPoint[];
  allocation: AllocationItem[];
  investments: Investment[];
  transactions: Transaction[];
  alerts: Alert[];
  referrals: ReferralData;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
}

const STORE_KEY = 'tesla_trade_portfolios';
const USERS_KEY = 'tesla_trade_users';

function getStore(): Record<string, UserPortfolio> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, UserPortfolio>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function getUserPortfolio(userId: string): UserPortfolio | null {
  const store = getStore();
  return store[userId] || null;
}

export function saveUserPortfolio(portfolio: UserPortfolio) {
  const store = getStore();
  store[portfolio.userId] = portfolio;
  saveStore(store);
}

export function getAllPortfolios(): UserPortfolio[] {
  return Object.values(getStore());
}

export function createEmptyPortfolio(userId: string, userName: string, userEmail: string): UserPortfolio {
  return {
    userId,
    userName,
    userEmail,
    stats: {
      totalPortfolio: '$0',
      activeInvestments: 0,
      totalReturns: '$0',
      referralEarnings: '$0',
      portfolioChange: '$0 (0%)',
      returnsChange: '$0 this month',
    },
    chartData: [],
    allocation: [],
    investments: [],
    transactions: [],
    alerts: [],
    referrals: {
      total: 0,
      pending: 0,
      earnings: '$0',
      history: [],
    },
  };
}

// User registry
export function getRegisteredUsers(): UserRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function registerUser(user: UserRecord) {
  const users = getRegisteredUsers();
  const exists = users.find((u) => u.id === user.id);
  if (!exists) {
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

export function getCurrentUser(): { id: string; name: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('tesla_trade_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: { id: string; name: string; email: string }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tesla_trade_current_user', JSON.stringify(user));
}

export function clearCurrentUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('tesla_trade_current_user');
}

export function isAdmin(userId: string): boolean {
  return userId === 'admin_tesla_trade';
}
