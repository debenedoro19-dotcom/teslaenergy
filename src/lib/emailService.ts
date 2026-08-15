// Email service — routes through /api/send-email which calls Resend directly.
// Admin-configured templates (from /admin/settings Email tab) are read from
// localStorage and forwarded so the API can apply them.

const EMAIL_API = '/api/send-email';
const SETTINGS_KEY = 'admin_settings_email';

interface AdminEmailTemplates {
  welcomeSubject?: string;
  welcomeBody?: string;
  kycApprovedSubject?: string;
  kycApprovedBody?: string;
  withdrawalSubject?: string;
  withdrawalBody?: string;
  senderName?: string;
  senderEmail?: string;
}

function getAdminTemplates(): AdminEmailTemplates {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

interface SendEmailPayload {
  type: string;
  to: string;
  name?: string;
  amount?: string;
  message?: string;
  subject?: string;
  templateSubject?: string;
  templateBody?: string;
  senderName?: string;
  senderEmail?: string;
  portfolioData?: object;
  returnsData?: object;
}

async function callEmailAPI(payload: SendEmailPayload): Promise<boolean> {
  try {
    const res = await fetch(EMAIL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('Email send failed:', data?.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Email service error:', err);
    return false;
  }
}

// ── Public helpers ────────────────────────────────────────────────────────────

export async function sendKYCApprovedEmail(
  to: string,
  name: string,
  adminNote?: string
): Promise<boolean> {
  const t = getAdminTemplates();
  return callEmailAPI({
    type: 'kyc_approved',
    to,
    name,
    message: adminNote,
    templateSubject: t.kycApprovedSubject,
    templateBody: t.kycApprovedBody,
    senderName: t.senderName,
    senderEmail: t.senderEmail,
  });
}

export async function sendWithdrawalConfirmedEmail(
  to: string,
  name: string,
  amount: string,
  notes?: string
): Promise<boolean> {
  const t = getAdminTemplates();
  return callEmailAPI({
    type: 'withdrawal_confirmed',
    to,
    name,
    amount,
    message: notes,
    templateSubject: t.withdrawalSubject,
    templateBody: t.withdrawalBody,
    senderName: t.senderName,
    senderEmail: t.senderEmail,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetCode: string
): Promise<boolean> {
  const t = getAdminTemplates();
  return callEmailAPI({
    type: 'password_reset',
    to,
    name,
    message: resetCode,
    senderName: t.senderName,
    senderEmail: t.senderEmail,
  });
}

export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<boolean> {
  const t = getAdminTemplates();
  return callEmailAPI({
    type: 'welcome',
    to,
    name,
    templateSubject: t.welcomeSubject,
    templateBody: t.welcomeBody,
    senderName: t.senderName,
    senderEmail: t.senderEmail,
  });
}

export async function sendAccountNotificationEmail(
  to: string,
  name: string,
  subject: string,
  message: string
): Promise<boolean> {
  const t = getAdminTemplates();
  return callEmailAPI({
    type: 'notification',
    to,
    name,
    subject,
    message,
    senderName: t.senderName,
    senderEmail: t.senderEmail,
  });
}

// ── Legacy helpers (kept for backward compatibility) ──────────────────────────

export async function sendPortfolioModifiedEmail(
  to: string,
  name: string,
  stats?: object
): Promise<boolean> {
  return callEmailAPI({ type: 'portfolio_modified', to, name, portfolioData: stats });
}

export async function sendReturnsUpdatedEmail(
  to: string,
  name: string,
  returnsData?: object
): Promise<boolean> {
  return callEmailAPI({ type: 'returns_updated', to, name, returnsData });
}

export async function sendSupportTicketReceivedEmail(
  to: string,
  name: string,
  ticketNumber: string,
  description: string
): Promise<boolean> {
  return callEmailAPI({ type: 'support_ticket_received', to, name, subject: ticketNumber, message: description });
}

export async function sendSupportTicketUpdatedEmail(
  to: string,
  name: string,
  newStatus: string,
  adminReply?: string
): Promise<boolean> {
  return callEmailAPI({ type: 'support_ticket_updated', to, name, subject: newStatus, message: adminReply });
}

// Keep old sendAutomatedEmail for any direct callers
export async function sendAutomatedEmail(options: {
  type: string;
  to: string;
  name?: string;
  message?: string;
  subject?: string;
  portfolioData?: object;
  returnsData?: object;
}): Promise<boolean> {
  return callEmailAPI(options);
}
