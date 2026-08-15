'use client';
import React, { useState } from 'react';
import Link from 'next/link';

const LAST_UPDATED = 'August 14, 2026';
const EFFECTIVE_DATE = 'August 14, 2026';
const COMPANY_NAME = 'Tesla Trade Energy';
const SITE_URL = 'https://teslaenerg6773.builtwithrocket.new';

const sections = [
  {
    id: 'overview',
    title: '1. Overview & Scope',
    content: `${COMPANY_NAME} ("we," "us," or "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our investment platform ("Platform"). This policy applies to all users of the Platform and covers data collected through our website, mobile applications, and any related services. By using the Platform, you consent to the practices described in this Privacy Policy.`,
  },
  {
    id: 'data-collected',
    title: '2. Information We Collect',
    content: `We collect the following categories of personal information: (a) Identity Data — full name, date of birth, government-issued ID number, nationality; (b) Contact Data — email address, phone number, mailing address; (c) Financial Data — bank account details, payment card information, transaction history, portfolio holdings; (d) KYC/AML Data — identity verification documents, proof of address, source of funds declarations; (e) Technical Data — IP address, browser type and version, device identifiers, operating system, access logs, cookies; (f) Usage Data — pages visited, features used, time spent on Platform, referral sources; (g) Communications Data — support tickets, messages, and correspondence with our team.`,
  },
  {
    id: 'how-we-use',
    title: '3. How We Use Your Information',
    content: `We use your personal information for the following purposes: (a) Account Management — to create, maintain, and secure your account; (b) Identity Verification — to comply with KYC/AML regulatory requirements; (c) Transaction Processing — to execute investment orders, process deposits, and facilitate withdrawals; (d) Regulatory Compliance — to meet our legal obligations under applicable financial services laws; (e) Fraud Prevention — to detect, investigate, and prevent fraudulent transactions and abuse; (f) Customer Support — to respond to your inquiries and resolve disputes; (g) Communications — to send account notifications, security alerts, and service updates; (h) Analytics — to understand how users interact with the Platform and improve our services; (i) Marketing — to send promotional communications where you have given consent (you may opt out at any time).`,
  },
  {
    id: 'legal-basis',
    title: '4. Legal Basis for Processing',
    content: `We process your personal data on the following legal bases: (a) Contract Performance — processing necessary to provide the services you have requested; (b) Legal Obligation — processing required to comply with applicable laws, including AML, KYC, and financial reporting regulations; (c) Legitimate Interests — processing for fraud prevention, security, and improving our services, where such interests are not overridden by your rights; (d) Consent — where you have given explicit consent, such as for marketing communications. You may withdraw consent at any time without affecting the lawfulness of prior processing.`,
  },
  {
    id: 'data-sharing',
    title: '5. Data Sharing & Disclosure',
    content: `We do not sell your personal information. We may share your data with: (a) Identity Verification Providers — third-party KYC/AML service providers to verify your identity; (b) Payment Processors — to facilitate deposits, withdrawals, and payment processing; (c) Regulatory Authorities — law enforcement, financial regulators, and government agencies as required by law or legal process; (d) Professional Advisors — lawyers, auditors, and accountants under confidentiality obligations; (e) Service Providers — cloud hosting, email delivery, analytics, and customer support platforms that process data on our behalf under data processing agreements; (f) Business Transfers — in connection with a merger, acquisition, or sale of assets, subject to confidentiality obligations.`,
  },
  {
    id: 'data-security',
    title: '6. Data Security',
    content: `We implement industry-standard technical and organizational security measures to protect your personal information, including: AES-256 encryption for data at rest; TLS 1.3 encryption for data in transit; multi-factor authentication for account access; role-based access controls limiting employee access to personal data; regular security audits and penetration testing; incident response procedures for data breaches. Despite these measures, no security system is impenetrable. In the event of a data breach that poses a risk to your rights, we will notify you and relevant authorities as required by applicable law.`,
  },
  {
    id: 'data-retention',
    title: '7. Data Retention',
    content: `We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy and to comply with our legal obligations. Specifically: account data is retained for the duration of your account plus 7 years after closure to comply with financial record-keeping requirements; KYC/AML documentation is retained for a minimum of 5 years after the end of the business relationship as required by anti-money laundering regulations; transaction records are retained for 7 years; marketing data is retained until you withdraw consent or opt out. After the applicable retention period, data is securely deleted or anonymized.`,
  },
  {
    id: 'your-rights',
    title: '8. Your Privacy Rights',
    content: `Depending on your jurisdiction, you may have the following rights regarding your personal data: (a) Right of Access — to request a copy of the personal data we hold about you; (b) Right to Rectification — to request correction of inaccurate or incomplete data; (c) Right to Erasure — to request deletion of your data, subject to legal retention obligations; (d) Right to Restriction — to request that we limit processing of your data in certain circumstances; (e) Right to Data Portability — to receive your data in a structured, machine-readable format; (f) Right to Object — to object to processing based on legitimate interests or for direct marketing; (g) Right to Withdraw Consent — to withdraw consent for consent-based processing at any time. To exercise any of these rights, please contact us through our support portal. We will respond within 30 days.`,
  },
  {
    id: 'cookies',
    title: '9. Cookies & Tracking Technologies',
    content: `We use cookies and similar tracking technologies to enhance your experience on the Platform. Types of cookies we use: (a) Essential Cookies — necessary for the Platform to function, including authentication and security cookies; (b) Analytics Cookies — to understand how users interact with the Platform (e.g., Google Analytics); (c) Preference Cookies — to remember your settings and preferences. You can control cookie settings through your browser. Disabling certain cookies may affect Platform functionality. We do not use cookies for cross-site behavioral advertising without your explicit consent.`,
  },
  {
    id: 'international',
    title: '10. International Data Transfers',
    content: `Your personal information may be transferred to and processed in countries other than your country of residence. Where we transfer data outside your jurisdiction, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses approved by relevant data protection authorities, or transfers to countries with an adequacy decision. By using the Platform, you consent to such transfers subject to these safeguards.`,
  },
  {
    id: 'minors',
    title: '11. Children\'s Privacy',
    content: `The Platform is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe we have inadvertently collected information from a minor, please contact us immediately and we will take steps to delete such information promptly.`,
  },
  {
    id: 'third-party',
    title: '12. Third-Party Links',
    content: `The Platform may contain links to third-party websites or services. We are not responsible for the privacy practices of such third parties. We encourage you to review the privacy policies of any third-party sites you visit. Our Privacy Policy applies solely to information collected through our Platform.`,
  },
  {
    id: 'changes',
    title: '13. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law. We will notify you of material changes by posting the updated policy on the Platform and updating the "Last Updated" date. For significant changes, we may also notify you by email. Your continued use of the Platform after such changes constitutes your acceptance of the revised policy.`,
  },
  {
    id: 'contact',
    title: '14. Contact & Data Controller',
    content: `${COMPANY_NAME} is the data controller responsible for your personal information. If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our Data Protection team through our support portal at ${SITE_URL}/support. For GDPR-related inquiries, you also have the right to lodge a complaint with your local data protection supervisory authority.`,
  },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[#0A0A0A] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/4 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-3 mb-10 group">
            <svg width="22" height="22" viewBox="0 0 342 512" fill="currentColor" className="text-primary" aria-hidden="true">
              <path d="M0 57.3C0 57.3 57.3 0 171 0s171 57.3 171 57.3L285 85.5s-28.5-28.5-114-28.5S57 85.5 57 85.5L0 57.3zM171 512L57 85.5s28.5 28.5 114 28.5 114-28.5 114-28.5L171 512z" />
            </svg>
            <span className="text-white font-bold text-sm tracking-widest uppercase group-hover:text-primary transition-colors">Tesla Trade</span>
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-10 bg-primary rounded-full" />
            <div>
              <p className="text-xs text-[#555555] uppercase tracking-widest font-semibold mb-1">Legal Document</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-6 ml-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#555555] uppercase tracking-widest">Effective:</span>
              <span className="text-xs text-[#888888] font-semibold">{EFFECTIVE_DATE}</span>
            </div>
            <div className="w-px h-4 bg-[#2A2A2A] self-center" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#555555] uppercase tracking-widest">Last Updated:</span>
              <span className="text-xs text-[#888888] font-semibold">{LAST_UPDATED}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-primary/8 border border-primary/20 rounded-lg">
            <p className="text-sm text-[#CCCCCC] leading-relaxed">
              <span className="text-primary font-semibold">Your privacy matters.</span> This policy explains how {COMPANY_NAME} collects, uses, and protects your personal information in compliance with applicable data protection laws, including GDPR and financial services regulations.
            </p>
          </div>
        </div>

        <div className="tesla-divider mb-10" />

        {/* Table of Contents */}
        <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 mb-10">
          <h2 className="text-xs font-bold text-[#555555] uppercase tracking-widest mb-4">Table of Contents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sections?.map((s) => (
              <a
                key={s?.id}
                href={`#${s?.id}`}
                className="text-xs text-[#666666] hover:text-primary transition-colors py-1 flex items-center gap-2"
              >
                <span className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                {s?.title}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections?.map((section) => (
            <div
              key={section?.id}
              id={section?.id}
              className={`bg-[#111111] border rounded-lg transition-all duration-200 ${
                activeSection === section?.id ? 'border-primary/30' : 'border-[#1A1A1A]'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === section?.id ? null : section?.id)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <h2 className="text-sm font-bold text-white tracking-tight">{section?.title}</h2>
                <svg
                  className={`w-4 h-4 text-[#555555] shrink-0 transition-transform duration-200 ${activeSection === section?.id ? 'rotate-180 text-primary' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {activeSection === section?.id && (
                <div className="px-6 pb-5">
                  <div className="h-px bg-[#1A1A1A] mb-4" />
                  <p className="text-sm text-[#888888] leading-relaxed">{section?.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="mt-12 tesla-divider mb-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#444444]">
            © 2026 {COMPANY_NAME}. Not affiliated with Tesla, Inc.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-xs text-[#555555] hover:text-primary transition-colors uppercase tracking-widest font-semibold">
              Terms of Service
            </Link>
            <span className="text-[#2A2A2A]">|</span>
            <Link href="/register" className="text-xs text-primary hover:text-red-400 transition-colors uppercase tracking-widest font-semibold">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
