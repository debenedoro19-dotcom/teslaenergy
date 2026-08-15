'use client';
import React, { useState } from 'react';
import Link from 'next/link';

const LAST_UPDATED = 'August 14, 2026';
const EFFECTIVE_DATE = 'August 14, 2026';
const COMPANY_NAME = 'Tesla Trade Energy';
const SITE_URL = 'https://teslaenerg6773.builtwithrocket.new';

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using the ${COMPANY_NAME} platform ("Platform"), you ("User") agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and all applicable laws and regulations. If you do not agree to these Terms, you must immediately cease use of the Platform. These Terms constitute a legally binding agreement between you and ${COMPANY_NAME} ("Company," "we," "us," or "our").`,
  },
  {
    id: 'eligibility',
    title: '2. Eligibility & Account Registration',
    content: `To use the Platform you must: (a) be at least 18 years of age; (b) have the legal capacity to enter into binding contracts; (c) not be a person barred from receiving services under applicable law; and (d) complete identity verification (KYC) as required by applicable anti-money laundering ("AML") regulations. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.`,
  },
  {
    id: 'investment-risk',
    title: '3. Investment Risk Disclosure',
    content: `IMPORTANT: All investments carry risk, including the possible loss of principal. Past performance is not indicative of future results. The value of investments and the income derived from them can go down as well as up. You may not get back the amount you originally invested. ${COMPANY_NAME} does not guarantee any specific investment return or outcome. Before making any investment decision, you should carefully consider your investment objectives, level of experience, and risk appetite. You should seek independent financial advice if you are unsure about any investment. Nothing on this Platform constitutes financial, investment, legal, or tax advice.`,
  },
  {
    id: 'platform-use',
    title: '4. Permitted Use of the Platform',
    content: `You may use the Platform solely for lawful purposes and in accordance with these Terms. You agree not to: (a) use the Platform for any fraudulent, unlawful, or unauthorized purpose; (b) attempt to gain unauthorized access to any portion of the Platform; (c) transmit any malicious code, viruses, or harmful data; (d) engage in market manipulation, wash trading, or any deceptive trading practices; (e) use automated systems or bots to access the Platform without our prior written consent; (f) circumvent any security or access control measures; or (g) violate any applicable local, national, or international law or regulation.`,
  },
  {
    id: 'kyc-aml',
    title: '5. KYC / AML Compliance',
    content: `In compliance with applicable anti-money laundering (AML) and know-your-customer (KYC) regulations, we are required to verify the identity of all users before permitting investment activity. You agree to provide all documentation requested for identity verification, including but not limited to government-issued photo identification and proof of address. We reserve the right to suspend or terminate your account if you fail to complete verification or if we have reasonable grounds to suspect fraudulent or illegal activity. We may report suspicious activity to relevant regulatory authorities as required by law.`,
  },
  {
    id: 'fees',
    title: '6. Fees & Charges',
    content: `We may charge fees for certain services offered on the Platform. All applicable fees will be disclosed to you prior to completing any transaction. Fees are non-refundable except as expressly stated in these Terms or required by applicable law. We reserve the right to modify our fee structure at any time upon reasonable notice. Continued use of the Platform following notice of fee changes constitutes your acceptance of the revised fees.`,
  },
  {
    id: 'withdrawals',
    title: '7. Withdrawals & Payouts',
    content: `Withdrawal requests are subject to verification, compliance review, and processing times. We reserve the right to delay or refuse withdrawals where we have reasonable grounds to suspect fraud, money laundering, or violation of these Terms. Referral earnings and bonuses are only payable when the referred user completes a qualifying investment or purchase as defined by our Referral Program terms. We are not liable for delays caused by third-party payment processors, banking institutions, or regulatory holds.`,
  },
  {
    id: 'intellectual-property',
    title: '8. Intellectual Property',
    content: `All content, trademarks, logos, and intellectual property on the Platform are owned by or licensed to ${COMPANY_NAME}. You are granted a limited, non-exclusive, non-transferable license to access and use the Platform for personal, non-commercial purposes. You may not reproduce, distribute, modify, create derivative works of, publicly display, or otherwise exploit any content from the Platform without our prior written consent. ${COMPANY_NAME} is not affiliated with Tesla, Inc. Use of the Tesla name is for descriptive purposes only.`,
  },
  {
    id: 'privacy',
    title: '9. Privacy & Data Protection',
    content: `Your use of the Platform is also governed by our Privacy Policy, which is incorporated into these Terms by reference. We collect, process, and store your personal data in accordance with applicable data protection laws, including the General Data Protection Regulation (GDPR) where applicable. By using the Platform, you consent to the collection and use of your information as described in our Privacy Policy.`,
  },
  {
    id: 'disclaimers',
    title: '10. Disclaimers & Limitation of Liability',
    content: `THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, ${COMPANY_NAME?.toUpperCase()} DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL ${COMPANY_NAME?.toUpperCase()} BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.`,
  },
  {
    id: 'indemnification',
    title: '11. Indemnification',
    content: `You agree to indemnify, defend, and hold harmless ${COMPANY_NAME} and its officers, directors, employees, agents, and successors from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with: (a) your use of the Platform; (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) any content you submit to the Platform.`,
  },
  {
    id: 'termination',
    title: '12. Termination',
    content: `We reserve the right to suspend or terminate your account and access to the Platform at any time, with or without notice, for any reason, including but not limited to breach of these Terms, suspected fraudulent activity, or regulatory requirements. Upon termination, your right to use the Platform will immediately cease. Provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.`,
  },
  {
    id: 'governing-law',
    title: '13. Governing Law & Dispute Resolution',
    content: `These Terms shall be governed by and construed in accordance with applicable law. Any dispute arising out of or relating to these Terms or the Platform shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be submitted to binding arbitration. You waive any right to participate in a class action lawsuit or class-wide arbitration. Nothing in this section prevents either party from seeking injunctive or other equitable relief in a court of competent jurisdiction.`,
  },
  {
    id: 'changes',
    title: '14. Changes to Terms',
    content: `We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on the Platform and updating the "Last Updated" date. Your continued use of the Platform after such changes constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically.`,
  },
  {
    id: 'contact',
    title: '15. Contact Information',
    content: `If you have any questions about these Terms, please contact us through our support portal at ${SITE_URL}/support. We will endeavor to respond to all inquiries within 5 business days.`,
  },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[#0A0A0A] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/4 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px]" />
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
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Terms of Service</h1>
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
              <span className="text-primary font-semibold">Please read carefully.</span> These Terms of Service govern your use of the {COMPANY_NAME} investment platform. By creating an account or using our services, you agree to be legally bound by these terms.
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
            <Link href="/privacy" className="text-xs text-[#555555] hover:text-primary transition-colors uppercase tracking-widest font-semibold">
              Privacy Policy
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
