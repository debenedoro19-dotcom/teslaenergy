import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://teslaenerg6773.builtwithrocket.new';

function applyPlaceholders(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (str, [key, val]) => str.replace(new RegExp(`{{${key}}}`, 'g'), val),
    template
  );
}

function wrapInBrandedHtml(body: string, ctaUrl?: string, ctaLabel?: string): string {
  const ctaBlock = ctaUrl
    ? `<div style="text-align:center;margin-top:32px;"><a href="${ctaUrl}" style="background:#E31937;color:#ffffff;padding:12px 32px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${ctaLabel || 'Go to Dashboard'}</a></div>`
    : '';
  return `
    <div style="font-family:Arial,sans-serif;background:#0A0A0A;color:#ffffff;padding:40px;max-width:600px;margin:0 auto;border-radius:8px;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="color:#E31937;font-size:28px;margin:0;">Tesla Trade</h1>
        <p style="color:#666666;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Investment Platform</p>
      </div>
      <div style="background:#111111;border:1px solid #1A1A1A;border-left:3px solid #E31937;border-radius:6px;padding:20px;margin:16px 0;">
        <p style="color:#cccccc;font-size:14px;line-height:1.8;margin:0;white-space:pre-line;">${body}</p>
      </div>
      ${ctaBlock}
      <p style="color:#333333;font-size:11px;text-align:center;margin-top:32px;">© 2026 Tesla Trade. All rights reserved.</p>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  if (!RESEND_API_KEY || RESEND_API_KEY === 'your-resend-api-key-here') {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const {
      type,
      to,
      name,
      amount,
      message,
      subject: customSubject,
      // Admin template overrides (from localStorage settings)
      templateSubject,
      templateBody,
      senderName,
      senderEmail,
    } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    const fromName = senderName || 'Tesla Trade Energy';
    const fromEmail = senderEmail || 'onboarding@resend.dev';
    const from = `${fromName} <${fromEmail}>`;

    const placeholders: Record<string, string> = {
      name: name || 'Investor',
      amount: amount || '',
      email: to,
    };

    let emailSubject = '';
    let htmlBody = '';

    // ── KYC Approved ────────────────────────────────────────────────────────
    if (type === 'kyc_approved') {
      if (templateSubject && templateBody) {
        emailSubject = applyPlaceholders(templateSubject, placeholders);
        const bodyText = applyPlaceholders(templateBody, placeholders);
        htmlBody = wrapInBrandedHtml(bodyText, `${SITE_URL}/invest`, 'Explore Investments');
      } else {
        emailSubject = '🎉 KYC Approved — You\'re Verified on Tesla Trade';
        htmlBody = `
          <div style="font-family:Arial,sans-serif;background:#0A0A0A;color:#ffffff;padding:40px;max-width:600px;margin:0 auto;border-radius:8px;">
            <div style="text-align:center;margin-bottom:32px;">
              <h1 style="color:#E31937;font-size:28px;margin:0;">Tesla Trade</h1>
              <p style="color:#666666;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Investment Platform</p>
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <div style="display:inline-block;background:#0D2B1A;border:1px solid #1A5C35;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">✅</div>
            </div>
            <h2 style="color:#ffffff;font-size:22px;margin-bottom:12px;text-align:center;">Identity Verified!</h2>
            <p style="color:#888888;font-size:14px;line-height:1.7;text-align:center;">
              Hi <strong style="color:#ffffff;">${name || 'Investor'}</strong>, your KYC verification has been <strong style="color:#22C55E;">approved</strong>. You now have full access to all investment tiers.
            </p>
            <div style="background:#111111;border:1px solid #1A5C35;border-radius:6px;padding:20px;margin:24px 0;">
              <p style="color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">What's Unlocked</p>
              <ul style="color:#888888;font-size:14px;line-height:2;margin:0;padding-left:20px;">
                <li>Premium investment packages ($5,000+)</li>
                <li>Higher-yield portfolio allocations</li>
                <li>Priority support access</li>
              </ul>
            </div>
            ${message ? `<div style="background:#111111;border:1px solid #1A1A1A;border-left:3px solid #22C55E;border-radius:6px;padding:16px;margin:16px 0;"><p style="color:#888888;font-size:13px;margin:0;"><strong style="color:#666666;">Admin Note:</strong> ${message}</p></div>` : ''}
            <div style="text-align:center;margin-top:32px;">
              <a href="${SITE_URL}/invest" style="background:#E31937;color:#ffffff;padding:12px 32px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Explore Investments</a>
            </div>
            <p style="color:#333333;font-size:11px;text-align:center;margin-top:32px;">© 2026 Tesla Trade. All rights reserved.</p>
          </div>
        `;
      }
    }

    // ── Withdrawal Confirmed ─────────────────────────────────────────────────
    else if (type === 'withdrawal_confirmed') {
      if (templateSubject && templateBody) {
        emailSubject = applyPlaceholders(templateSubject, placeholders);
        const bodyText = applyPlaceholders(templateBody, placeholders);
        htmlBody = wrapInBrandedHtml(bodyText, `${SITE_URL}/dashboard`, 'View Dashboard');
      } else {
        emailSubject = '💸 Withdrawal Processed — Tesla Trade';
        htmlBody = `
          <div style="font-family:Arial,sans-serif;background:#0A0A0A;color:#ffffff;padding:40px;max-width:600px;margin:0 auto;border-radius:8px;">
            <div style="text-align:center;margin-bottom:32px;">
              <h1 style="color:#E31937;font-size:28px;margin:0;">Tesla Trade</h1>
              <p style="color:#666666;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Investment Platform</p>
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <div style="display:inline-block;background:#0A1A2A;border:1px solid #1A3A5C;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">💸</div>
            </div>
            <h2 style="color:#ffffff;font-size:22px;margin-bottom:12px;text-align:center;">Withdrawal Processed</h2>
            <p style="color:#888888;font-size:14px;line-height:1.7;text-align:center;margin-bottom:24px;">
              Hi <strong style="color:#ffffff;">${name || 'Investor'}</strong>, your withdrawal request has been processed.
            </p>
            <div style="background:#111111;border:1px solid #1A1A1A;border-radius:6px;padding:20px;margin:0 0 24px;">
              <p style="color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Transaction Details</p>
              <table style="width:100%;border-collapse:collapse;">
                ${amount ? `<tr><td style="color:#666666;font-size:13px;padding:8px 0;border-bottom:1px solid #1A1A1A;">Amount</td><td style="color:#22C55E;font-size:16px;font-weight:bold;text-align:right;padding:8px 0;border-bottom:1px solid #1A1A1A;">${amount}</td></tr>` : ''}
                <tr><td style="color:#666666;font-size:13px;padding:8px 0;border-bottom:1px solid #1A1A1A;">Status</td><td style="color:#22C55E;font-size:14px;font-weight:bold;text-align:right;padding:8px 0;border-bottom:1px solid #1A1A1A;">Paid</td></tr>
                <tr><td style="color:#666666;font-size:13px;padding:8px 0;">Estimated Arrival</td><td style="color:#ffffff;font-size:13px;text-align:right;padding:8px 0;">3–5 business days</td></tr>
              </table>
            </div>
            ${message ? `<div style="background:#111111;border:1px solid #1A1A1A;border-left:3px solid #60a5fa;border-radius:6px;padding:16px;margin:0 0 24px;"><p style="color:#cccccc;font-size:14px;line-height:1.7;margin:0;">${message}</p></div>` : ''}
            <div style="text-align:center;margin-top:32px;">
              <a href="${SITE_URL}/dashboard" style="background:#E31937;color:#ffffff;padding:12px 32px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">View Dashboard</a>
            </div>
            <p style="color:#333333;font-size:11px;text-align:center;margin-top:32px;">© 2026 Tesla Trade. All rights reserved.</p>
          </div>
        `;
      }
    }

    // ── Password Reset ───────────────────────────────────────────────────────
    else if (type === 'password_reset') {
      emailSubject = customSubject || 'Password Reset Request — Tesla Trade';
      const resetCode = message || '';
      htmlBody = `
        <div style="font-family:Arial,sans-serif;background:#0A0A0A;color:#ffffff;padding:40px;max-width:600px;margin:0 auto;border-radius:8px;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="color:#E31937;font-size:28px;margin:0;">Tesla Trade</h1>
            <p style="color:#666666;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Investment Platform</p>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#1A0A0A;border:1px solid #E31937;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">🔐</div>
          </div>
          <h2 style="color:#ffffff;font-size:22px;margin-bottom:12px;text-align:center;">Password Reset Request</h2>
          <p style="color:#888888;font-size:14px;line-height:1.7;text-align:center;margin-bottom:24px;">
            Hi <strong style="color:#ffffff;">${name || 'Investor'}</strong>, we received a request to reset your Tesla Trade password.
          </p>
          <div style="background:#111111;border:1px solid #1A1A1A;border-radius:6px;padding:24px;margin:0 0 24px;text-align:center;">
            <p style="color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Your Reset Code</p>
            <div style="background:#0A0A0A;border:1px solid #E31937;border-radius:6px;padding:16px;display:inline-block;">
              <span style="color:#E31937;font-size:28px;font-weight:bold;letter-spacing:8px;font-family:monospace;">${resetCode}</span>
            </div>
            <p style="color:#555555;font-size:12px;margin:12px 0 0;">This code expires in 30 minutes.</p>
          </div>
          <div style="text-align:center;margin-top:24px;">
            <a href="${SITE_URL}/reset-password" style="background:#E31937;color:#ffffff;padding:12px 32px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Reset My Password</a>
          </div>
          <p style="color:#444444;font-size:12px;text-align:center;margin-top:24px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
          <p style="color:#333333;font-size:11px;text-align:center;margin-top:32px;">© 2026 Tesla Trade. All rights reserved.</p>
        </div>
      `;
    }

    // ── Account Notification ─────────────────────────────────────────────────
    else if (type === 'notification') {
      emailSubject = customSubject || 'Account Notification — Tesla Trade';
      htmlBody = wrapInBrandedHtml(message || 'You have a new notification from Tesla Trade.', `${SITE_URL}/dashboard`, 'View Dashboard');
    }

    // ── Welcome ──────────────────────────────────────────────────────────────
    else if (type === 'welcome') {
      if (templateSubject && templateBody) {
        emailSubject = applyPlaceholders(templateSubject, placeholders);
        const bodyText = applyPlaceholders(templateBody, placeholders);
        htmlBody = wrapInBrandedHtml(bodyText, `${SITE_URL}/dashboard`, 'Go to Dashboard');
      } else {
        emailSubject = 'Welcome to Tesla Trade — Your Account is Ready';
        htmlBody = wrapInBrandedHtml(
          `Welcome, ${name || 'Investor'}!\n\nYour Tesla Trade account has been successfully created. You can now log in and start exploring our investment packages.\n\nBest regards,\nThe Tesla Trade Team`,
          `${SITE_URL}/dashboard`,
          'Go to Dashboard'
        );
      }
    }

    // ── Fallback ─────────────────────────────────────────────────────────────
    else {
      emailSubject = customSubject || 'Notification — Tesla Trade';
      htmlBody = wrapInBrandedHtml(message || 'You have a new message from Tesla Trade.', `${SITE_URL}/dashboard`);
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: emailSubject,
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend error:', resendData);
      return NextResponse.json({ error: resendData?.message || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: resendData.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Email API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
