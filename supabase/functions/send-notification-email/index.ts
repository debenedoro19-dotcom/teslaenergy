declare const Deno;

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  // ✅ CORS preflight
  if (req?.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { type, to, name, message, subject, portfolioData, returnsData } = await req?.json();

    const RESEND_API_KEY = Deno?.env?.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    if (!to) {
      throw new Error("Recipient email (to) is required");
    }

    let emailSubject = subject || "Notification from Tesla Trade";
    let htmlBody = "";

    if (type === "support_ticket_received") {
      emailSubject = `🎫 Support Ticket Received — ${subject || 'Tesla Trade'}`;
      htmlBody = `
        <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #E31937; font-size: 28px; margin: 0;">Tesla Trade</h1>
            <p style="color: #666666; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;">Support Center</p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #0A1A2A; border: 1px solid #1A3A5C; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 32px;">🎫</div>
          </div>
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 8px; text-align: center;">We've Received Your Request</h2>
          <p style="color: #888888; font-size: 14px; line-height: 1.7; text-align: center; margin-bottom: 24px;">
            Hi <strong style="color: #ffffff;">${name || 'Investor'}</strong>, your support ticket has been submitted successfully. Our team will review it and respond as soon as possible.
          </p>
          <div style="background: #111111; border: 1px solid #1A1A1A; border-radius: 6px; padding: 20px; margin: 0 0 24px;">
            <p style="color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px;">Ticket Details</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="color: #666666; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">Ticket Number</td><td style="color: #00D4FF; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">${subject || 'N/A'}</td></tr>
              <tr><td style="color: #666666; font-size: 13px; padding: 8px 0;">Status</td><td style="color: #facc15; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">Open</td></tr>
            </table>
          </div>
          <div style="background: #111111; border: 1px solid #1A1A1A; border-left: 3px solid #00D4FF; border-radius: 6px; padding: 16px; margin: 0 0 24px;">
            <p style="color: #888888; font-size: 13px; margin: 0; line-height: 1.6;">${message || 'Your request has been received.'}</p>
          </div>
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://teslaenerg6773.builtwithrocket.new/support" style="background: #E31937; color: #ffffff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Track Your Ticket</a>
          </div>
          <p style="color: #333333; font-size: 11px; text-align: center; margin-top: 32px;">© 2026 Tesla Trade. All rights reserved.</p>
        </div>
      `;
    } else if (type === "support_ticket_updated") {
      const statusColors: Record<string, string> = { open: '#facc15', in_progress: '#60a5fa', resolved: '#4ade80', closed: '#888888' };
      const statusLabels: Record<string, string> = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };
      const ticketStatus = (subject || 'open').toLowerCase().replace(' ', '_');
      const statusColor = statusColors[ticketStatus] || '#facc15';
      const statusLabel = statusLabels[ticketStatus] || subject || 'Updated';
      emailSubject = `📋 Support Ticket Update — Tesla Trade`;
      htmlBody = `
        <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #E31937; font-size: 28px; margin: 0;">Tesla Trade</h1>
            <p style="color: #666666; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;">Support Center</p>
          </div>
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 8px; text-align: center;">Ticket Status Updated</h2>
          <p style="color: #888888; font-size: 14px; line-height: 1.7; text-align: center; margin-bottom: 24px;">
            Hi <strong style="color: #ffffff;">${name || 'Investor'}</strong>, there's an update on your support ticket.
          </p>
          <div style="background: #111111; border: 1px solid #1A1A1A; border-radius: 6px; padding: 20px; margin: 0 0 24px;">
            <p style="color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px;">Status Update</p>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="color: #666666; font-size: 13px;">New Status</span>
              <span style="color: ${statusColor}; font-size: 14px; font-weight: bold; background: ${statusColor}22; padding: 4px 12px; border-radius: 20px; border: 1px solid ${statusColor}44;">${statusLabel}</span>
            </div>
          </div>
          ${message ? `
          <div style="background: #111111; border: 1px solid #1A1A1A; border-left: 3px solid #E31937; border-radius: 6px; padding: 16px; margin: 0 0 24px;">
            <p style="color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Response from Support</p>
            <p style="color: #cccccc; font-size: 14px; line-height: 1.7; margin: 0;">${message}</p>
          </div>
          ` : ''}
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://teslaenerg6773.builtwithrocket.new/support" style="background: #E31937; color: #ffffff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">View Ticket</a>
          </div>
          <p style="color: #333333; font-size: 11px; text-align: center; margin-top: 32px;">© 2026 Tesla Trade. All rights reserved.</p>
        </div>
      `;
    } else if (type === "welcome") {
      emailSubject = "Welcome to Tesla Trade — Your Account is Ready";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #E31937; font-size: 28px; margin: 0;">Tesla Trade</h1>
            <p style="color: #666666; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;">Investment Platform</p>
          </div>
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 12px;">Welcome, ${name || "Investor"}!</h2>
          <p style="color: #888888; font-size: 14px; line-height: 1.6;">
            Your Tesla Trade account has been successfully created. You now have access to your personal investor dashboard.
          </p>
          <div style="background: #111111; border: 1px solid #1A1A1A; border-radius: 6px; padding: 20px; margin: 24px 0;">
            <p style="color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Next Steps</p>
            <ul style="color: #888888; font-size: 14px; line-height: 2; margin: 0; padding-left: 20px;">
              <li>Complete your KYC verification</li>
              <li>Explore investment packages</li>
              <li>Share your referral link to earn rewards</li>
            </ul>
          </div>
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://teslaenerg6773.builtwithrocket.new/dashboard" style="background: #E31937; color: #ffffff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Go to Dashboard</a>
          </div>
          <p style="color: #333333; font-size: 11px; text-align: center; margin-top: 32px;">© 2026 Tesla Trade. All rights reserved.</p>
        </div>
      `;
    } else if (type === "email_verification") {
      emailSubject = "Verify Your Email — Tesla Trade";
      const verifyUrl = message; // message field carries the verification URL
      htmlBody = `
        <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #E31937; font-size: 28px; margin: 0;">Tesla Trade</h1>
            <p style="color: #666666; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;">Investment Platform</p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #1A0A0A; border: 1px solid #E31937; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 32px;">✉️</div>
          </div>
          <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 12px; text-align: center;">Confirm Your Email</h2>
          <p style="color: #888888; font-size: 14px; line-height: 1.7; text-align: center; margin-bottom: 24px;">
            Hi <strong style="color: #ffffff;">${name || "Investor"}</strong>, thanks for signing up! Please verify your email address to activate your Tesla Trade account and access your dashboard.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="background: #E31937; color: #ffffff; padding: 14px 40px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; display: inline-block;">Verify Email Address</a>
          </div>
          <div style="background: #111111; border: 1px solid #1A1A1A; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <p style="color: #555555; font-size: 12px; margin: 0; line-height: 1.6;">If the button above doesn't work, copy and paste this link into your browser:<br/><span style="color: #E31937; word-break: break-all;">${verifyUrl}</span></p>
          </div>
          <p style="color: #444444; font-size: 12px; text-align: center; margin-top: 16px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
          <p style="color: #333333; font-size: 11px; text-align: center; margin-top: 32px;">© 2026 Tesla Trade. All rights reserved.</p>
        </div>
      `;
    } else if (type === "kyc_approved") {
      emailSubject = "🎉 KYC Approved — You're Verified on Tesla Trade";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #E31937; font-size: 28px; margin: 0;">Tesla Trade</h1>
            <p style="color: #666666; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;">Investment Platform</p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #0D2B1A; border: 1px solid #1A5C35; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 32px;">✅</div>
          </div>
          <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 12px; text-align: center;">Identity Verified!</h2>
          <p style="color: #888888; font-size: 14px; line-height: 1.7; text-align: center;">
            Hi <strong style="color: #ffffff;">${name || "Investor"}</strong>, your KYC verification has been <strong style="color: #22C55E;">approved</strong>. You now have full access to all investment tiers on Tesla Trade.
          </p>
          <div style="background: #111111; border: 1px solid #1A5C35; border-radius: 6px; padding: 20px; margin: 24px 0;">
            <p style="color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px;">What's Unlocked</p>
            <ul style="color: #888888; font-size: 14px; line-height: 2; margin: 0; padding-left: 20px;">
              <li>Premium investment packages ($5,000+)</li>
              <li>Higher-yield portfolio allocations</li>
              <li>Priority support access</li>
            </ul>
          </div>
          ${message ? `<div style="background: #111111; border: 1px solid #1A1A1A; border-left: 3px solid #22C55E; border-radius: 6px; padding: 16px; margin: 16px 0;"><p style="color: #888888; font-size: 13px; margin: 0;"><strong style="color: #666666;">Admin Note:</strong> ${message}</p></div>` : ''}
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://teslaenerg6773.builtwithrocket.new/invest" style="background: #E31937; color: #ffffff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Explore Investments</a>
          </div>
          <p style="color: #333333; font-size: 11px; text-align: center; margin-top: 32px;">© 2026 Tesla Trade. All rights reserved.</p>
        </div>
      `;
    } else if (type === "portfolio_modified") {
      const stats = portfolioData?.stats || {};
      emailSubject = "📊 Your Portfolio Has Been Updated — Tesla Trade";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #E31937; font-size: 28px; margin: 0;">Tesla Trade</h1>
            <p style="color: #666666; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;">Investment Platform</p>
          </div>
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 8px;">Portfolio Updated</h2>
          <p style="color: #888888; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Hi <strong style="color: #ffffff;">${name || "Investor"}</strong>, your investment portfolio has been updated by our team.
          </p>
          ${stats.totalPortfolio ? `
          <div style="background: #111111; border: 1px solid #1A1A1A; border-radius: 6px; padding: 20px; margin: 0 0 24px;">
            <p style="color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px;">Portfolio Summary</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #666666; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">Total Portfolio Value</td>
                <td style="color: #ffffff; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">${stats.totalPortfolio}</td>
              </tr>
              ${stats.activeInvestments !== undefined ? `<tr><td style="color: #666666; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">Active Investments</td><td style="color: #ffffff; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">${stats.activeInvestments}</td></tr>` : ''}
              ${stats.totalReturns ? `<tr><td style="color: #666666; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">Total Returns</td><td style="color: #22C55E; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">${stats.totalReturns}</td></tr>` : ''}
              ${stats.portfolioChange ? `<tr><td style="color: #666666; font-size: 13px; padding: 8px 0;">Portfolio Change</td><td style="color: #22C55E; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${stats.portfolioChange}</td></tr>` : ''}
            </table>
          </div>
          ` : ''}
          ${message ? `<div style="background: #111111; border: 1px solid #1A1A1A; border-left: 3px solid #E31937; border-radius: 6px; padding: 16px; margin: 0 0 24px;"><p style="color: #cccccc; font-size: 14px; line-height: 1.7; margin: 0;">${message}</p></div>` : ''}
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://teslaenerg6773.builtwithrocket.new/dashboard" style="background: #E31937; color: #ffffff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">View Portfolio</a>
          </div>
          <p style="color: #333333; font-size: 11px; text-align: center; margin-top: 32px;">© 2026 Tesla Trade. All rights reserved.</p>
        </div>
      `;
    } else if (type === "returns_updated") {
      const returns = returnsData || {};
      emailSubject = "💰 Your Investment Returns Have Been Updated — Tesla Trade";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #E31937; font-size: 28px; margin: 0;">Tesla Trade</h1>
            <p style="color: #666666; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;">Investment Platform</p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #0D2B1A; border: 1px solid #1A5C35; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 32px;">📈</div>
          </div>
          <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 8px; text-align: center;">Returns Updated</h2>
          <p style="color: #888888; font-size: 14px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
            Hi <strong style="color: #ffffff;">${name || "Investor"}</strong>, your investment returns have been updated.
          </p>
          <div style="background: #111111; border: 1px solid #1A1A1A; border-radius: 6px; padding: 20px; margin: 0 0 24px;">
            <p style="color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px;">Returns Summary</p>
            <table style="width: 100%; border-collapse: collapse;">
              ${returns.totalReturns ? `<tr><td style="color: #666666; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">Total Returns</td><td style="color: #22C55E; font-size: 16px; font-weight: bold; text-align: right; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">${returns.totalReturns}</td></tr>` : ''}
              ${returns.returnsChange ? `<tr><td style="color: #666666; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">Change</td><td style="color: #22C55E; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">${returns.returnsChange}</td></tr>` : ''}
              ${returns.totalPortfolio ? `<tr><td style="color: #666666; font-size: 13px; padding: 8px 0;">Portfolio Value</td><td style="color: #ffffff; font-size: 14px; font-weight: bold; text-align: right; padding: 8px 0;">${returns.totalPortfolio}</td></tr>` : ''}
            </table>
          </div>
          ${message ? `<div style="background: #111111; border: 1px solid #1A1A1A; border-left: 3px solid #22C55E; border-radius: 6px; padding: 16px; margin: 0 0 24px;"><p style="color: #cccccc; font-size: 14px; line-height: 1.7; margin: 0;">${message}</p></div>` : ''}
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://teslaenerg6773.builtwithrocket.new/dashboard" style="background: #E31937; color: #ffffff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">View Dashboard</a>
          </div>
          <p style="color: #333333; font-size: 11px; text-align: center; margin-top: 32px;">© 2026 Tesla Trade. All rights reserved.</p>
        </div>
      `;
    } else if (type === "notification") {
      emailSubject = subject || "New Notification — Tesla Trade";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #E31937; font-size: 28px; margin: 0;">Tesla Trade</h1>
            <p style="color: #666666; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;">Investment Platform</p>
          </div>
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 12px;">Hi ${name || "Investor"},</h2>
          <div style="background: #111111; border: 1px solid #1A1A1A; border-left: 3px solid #E31937; border-radius: 6px; padding: 20px; margin: 16px 0;">
            <p style="color: #cccccc; font-size: 14px; line-height: 1.7; margin: 0;">${message || "You have a new notification from Tesla Trade."}</p>
          </div>
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://teslaenerg6773.builtwithrocket.new/dashboard" style="background: #E31937; color: #ffffff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">View Dashboard</a>
          </div>
          <p style="color: #333333; font-size: 11px; text-align: center; margin-top: 32px;">© 2026 Tesla Trade. All rights reserved.</p>
        </div>
      `;
    } else if (type === "investment") {
      emailSubject = subject || "Investment Confirmed — Tesla Trade";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #E31937; font-size: 28px; margin: 0;">Tesla Trade</h1>
            <p style="color: #666666; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;">Investment Platform</p>
          </div>
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 12px;">Investment Update, ${name || "Investor"}</h2>
          <div style="background: #111111; border: 1px solid #1A1A1A; border-left: 3px solid #E31937; border-radius: 6px; padding: 20px; margin: 16px 0;">
            <p style="color: #cccccc; font-size: 14px; line-height: 1.7; margin: 0;">${message || "Your investment portfolio has been updated."}</p>
          </div>
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://teslaenerg6773.builtwithrocket.new/dashboard" style="background: #E31937; color: #ffffff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">View Portfolio</a>
          </div>
          <p style="color: #333333; font-size: 11px; text-align: center; margin-top: 32px;">© 2026 Tesla Trade. All rights reserved.</p>
        </div>
      `;
    } else {
      htmlBody = `
        <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E31937;">Tesla Trade</h2>
          <p style="color: #cccccc;">${message || "You have a new message from Tesla Trade."}</p>
        </div>
      `;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [to],
        subject: emailSubject,
        html: htmlBody,
      }),
    });

    const data = await res?.json();

    if (!res?.ok) {
      throw new Error(data?.message || "Failed to send email via Resend");
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
