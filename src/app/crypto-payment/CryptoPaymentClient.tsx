'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CRYPTO_OPTIONS = [
  {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    network: 'Bitcoin Network',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf6',
    icon: '₿',
    color: '#F7931A',
    bgColor: 'rgba(247,147,26,0.08)',
    borderColor: 'rgba(247,147,26,0.25)',
    confirmations: '2 confirmations (~20 min)',
  },
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    network: 'ERC-20 Network',
    address: '0x742d35Cc6634C0532925a3b8D4C9C4e8b1e2F3A4',
    icon: 'Ξ',
    color: '#627EEA',
    bgColor: 'rgba(98,126,234,0.08)',
    borderColor: 'rgba(98,126,234,0.25)',
    confirmations: '12 confirmations (~3 min)',
  },
  {
    id: 'usdt',
    name: 'Tether USDT',
    symbol: 'USDT',
    network: 'TRC-20 (Tron)',
    address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    icon: '₮',
    color: '#26A17B',
    bgColor: 'rgba(38,161,123,0.08)',
    borderColor: 'rgba(38,161,123,0.25)',
    confirmations: '20 confirmations (~1 min)',
  },
];

function generateTxRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefix = 'TE';
  let ref = prefix + '-';
  for (let i = 0; i < 4; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  ref += '-';
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  ref += '-';
  for (let i = 0; i < 4; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

type Step = 'select' | 'send' | 'confirm' | 'success';

export default function CryptoPaymentClient() {
  const searchParams = useSearchParams();
  const packageName = searchParams.get('package') || 'Investment Package';
  const amount = searchParams.get('amount') || '0';

  const [step, setStep] = useState<Step>('select');
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [txRef] = useState(() => generateTxRef());
  const [txHash, setTxHash] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60);

  const crypto = CRYPTO_OPTIONS.find((c) => c.id === selectedCrypto);

  useEffect(() => {
    if (step !== 'send') return;
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const copyAddress = useCallback(() => {
    if (!crypto) return;
    navigator.clipboard.writeText(crypto.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [crypto]);

  const handleConfirmPayment = () => {
    setConfirming(true);
    setTimeout(() => {
      setConfirming(false);
      setStep('success');
    }, 2000);
  };

  const steps: Step[] = ['select', 'send', 'confirm', 'success'];
  const stepLabels = ['Choose Coin', 'Send Funds', 'Confirm', 'Complete'];

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <div className="pt-24 pb-20 px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">

          {/* Page Header */}
          <div className="mb-10">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase mb-3 block">Crypto Payment</span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
              Pay with <span className="gradient-text-primary">Cryptocurrency</span>
            </h1>
            <p className="text-[#666666] text-sm">
              Send directly to our wallet address. Your investment is processed after network confirmation.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-10">
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s
                      ? 'bg-primary text-white shadow-[0_0_12px_rgba(227,25,55,0.4)]'
                      : steps.indexOf(step) > i
                      ? 'bg-primary/20 text-primary border border-primary/40' :'bg-[#1A1A1A] text-[#444444] border border-[#2A2A2A]'
                  }`}>
                    {steps.indexOf(step) > i ? '✓' : i + 1}
                  </div>
                  <span className={`text-[10px] font-semibold tracking-wider uppercase hidden sm:block ${step === s ? 'text-white' : 'text-[#444444]'}`}>
                    {stepLabels[i]}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px transition-all ${steps.indexOf(step) > i ? 'bg-primary' : 'bg-[#2A2A2A]'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Investment Summary Bar */}
          {step !== 'success' && (
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg px-5 py-3 flex items-center justify-between mb-8">
              <div>
                <div className="text-[10px] text-[#555555] uppercase tracking-widest">Package</div>
                <div className="text-sm font-bold text-white">{packageName}</div>
              </div>
              <div className="h-8 w-px bg-[#1A1A1A]" />
              <div>
                <div className="text-[10px] text-[#555555] uppercase tracking-widest">Amount</div>
                <div className="text-sm font-bold text-primary">${Number(amount).toLocaleString()}</div>
              </div>
              <div className="h-8 w-px bg-[#1A1A1A]" />
              <div>
                <div className="text-[10px] text-[#555555] uppercase tracking-widest">Ref</div>
                <div className="text-xs font-mono font-bold text-[#888888]">{txRef}</div>
              </div>
            </div>
          )}

          {/* ── STEP 1: Select Crypto ── */}
          {step === 'select' && (
            <div>
              <p className="text-xs text-[#666666] uppercase tracking-widest mb-5">Select your preferred cryptocurrency</p>
              <div className="space-y-3 mb-8">
                {CRYPTO_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCrypto(c.id)}
                    className={`w-full flex items-center gap-4 p-5 rounded-lg border text-left transition-all duration-300 ${
                      selectedCrypto === c.id
                        ? 'border-primary bg-primary/5' :'border-[#1A1A1A] bg-[#111111] hover:border-[#2A2A2A]'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                      style={{ background: c.bgColor, border: `1px solid ${c.borderColor}`, color: c.color }}
                    >
                      {c.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{c.name}</div>
                      <div className="text-xs text-[#555555]">{c.network}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold" style={{ color: c.color }}>{c.symbol}</div>
                      <div className="text-[10px] text-[#444444]">{c.confirmations}</div>
                    </div>
                    {selectedCrypto === c.id && (
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Link href="/invest" className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px] flex items-center justify-center text-xs font-bold tracking-widest uppercase">
                  ← Back
                </Link>
                <button
                  onClick={() => selectedCrypto && setStep('send')}
                  disabled={!selectedCrypto}
                  className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Send Funds ── */}
          {step === 'send' && crypto && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-xs text-[#666666] uppercase tracking-widest">Send exact amount to wallet below</p>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${timeLeft < 300 ? 'border-red-500/30 bg-red-500/5' : 'border-[#2A2A2A] bg-[#111111]'}`}>
                  <svg className={`w-3 h-3 ${timeLeft < 300 ? 'text-red-400' : 'text-[#555555]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  <span className={`text-xs font-mono font-bold ${timeLeft < 300 ? 'text-red-400' : 'text-[#888888]'}`}>{formatTime(timeLeft)}</span>
                </div>
              </div>

              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 mb-4">
                <div className="flex items-center gap-4 mb-6 pb-5 border-b border-[#1A1A1A]">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
                    style={{ background: crypto.bgColor, border: `1px solid ${crypto.borderColor}`, color: crypto.color }}
                  >
                    {crypto.icon}
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-white">{crypto.name}</div>
                    <div className="text-xs text-[#555555]">{crypto.network}</div>
                  </div>
                  <button onClick={() => setStep('select')} className="ml-auto text-xs text-[#555555] hover:text-primary transition-colors">
                    Change
                  </button>
                </div>

                <div className="mb-5">
                  <div className="text-[10px] text-[#555555] uppercase tracking-widest mb-2">Amount to Send (USD equivalent)</div>
                  <div className="text-3xl font-extrabold text-white">${Number(amount).toLocaleString()}</div>
                  <div className="text-xs text-[#555555] mt-1">Use current exchange rate at time of transfer</div>
                </div>

                <div>
                  <div className="text-[10px] text-[#555555] uppercase tracking-widest mb-2">Wallet Address</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2.5 font-mono text-xs text-[#CCCCCC] break-all leading-relaxed">
                      {crypto.address}
                    </div>
                    <button
                      onClick={copyAddress}
                      className={`shrink-0 px-3 py-2.5 rounded border text-xs font-bold transition-all duration-200 ${
                        copied
                          ? 'border-green-500/40 bg-green-500/10 text-green-400' :'border-[#2A2A2A] bg-[#111111] text-[#888888] hover:border-primary/40 hover:text-primary'
                      }`}
                      aria-label="Copy wallet address"
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Visual */}
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5 mb-4 flex items-center gap-5">
                <div
                  className="w-20 h-20 rounded shrink-0 flex items-center justify-center"
                  style={{ background: crypto.bgColor, border: `1px solid ${crypto.borderColor}` }}
                  aria-label={`QR code visual for ${crypto.name} wallet`}
                >
                  <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: crypto.color }} aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
                    <rect x="16" y="5" width="3" height="3" fill="currentColor"/>
                    <rect x="5" y="16" width="3" height="3" fill="currentColor"/>
                    <path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-white mb-1">Scan QR Code</div>
                  <div className="text-xs text-[#555555] leading-relaxed">
                    Scan with your crypto wallet app to auto-fill the address. Always verify the address before sending.
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <p className="text-xs text-amber-300/80 leading-relaxed">
                    Send <strong className="text-amber-300">only {crypto.symbol}</strong> on the <strong className="text-amber-300">{crypto.network}</strong>. Sending other assets or using a different network will result in permanent loss of funds.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('select')} className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px]">← Back</button>
                <button onClick={() => setStep('confirm')} className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px]">
                  I&apos;ve Sent the Payment →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirm Transaction ── */}
          {step === 'confirm' && crypto && (
            <div>
              <p className="text-xs text-[#666666] uppercase tracking-widest mb-6">Provide your transaction hash for verification</p>

              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 mb-5">
                <div className="space-y-3 mb-6 pb-5 border-b border-[#1A1A1A]">
                  {[
                    { label: 'Cryptocurrency', value: `${crypto.name} (${crypto.symbol})` },
                    { label: 'Network', value: crypto.network },
                    { label: 'Amount (USD)', value: `$${Number(amount).toLocaleString()}` },
                    { label: 'Wallet Address', value: `${crypto.address.slice(0, 12)}...${crypto.address.slice(-8)}` },
                    { label: 'Transaction Ref', value: txRef },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-[10px] text-[#555555] uppercase tracking-wider">{item.label}</span>
                      <span className="text-xs font-bold text-white font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
                    Transaction Hash / TXID <span className="text-[#444444] normal-case tracking-normal font-normal">(optional but recommended)</span>
                  </label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="e.g. 0x4a3b2c1d..."
                    className="w-full px-4 py-3 rounded text-sm input-tesla font-mono"
                  />
                  <p className="text-xs text-[#444444] mt-2">
                    Find this in your wallet&apos;s transaction history after sending. Speeds up verification.
                  </p>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                <p className="text-xs text-[#888888] leading-relaxed">
                  After confirming, our team will verify your transaction on-chain. You&apos;ll receive an email once your investment is activated. Keep your reference <span className="text-primary font-bold">{txRef}</span> for support inquiries.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('send')} className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px]">← Back</button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={confirming}
                  className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px] disabled:opacity-60"
                >
                  {confirming ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                      Confirming...
                    </span>
                  ) : 'Confirm Payment ✓'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Success ── */}
          {step === 'success' && crypto && (
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center mb-8">
                <div className="absolute w-28 h-28 rounded-full bg-green-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="relative w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-3">Payment Submitted!</h2>
              <p className="text-[#666666] text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                Your {crypto.name} payment has been received and is pending on-chain confirmation. We&apos;ll activate your investment once verified.
              </p>

              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 mb-6 text-left">
                <div className="text-[10px] text-[#555555] uppercase tracking-widest mb-4">Payment Summary</div>
                <div className="space-y-3">
                  {[
                    { label: 'Transaction Reference', value: txRef, highlight: true },
                    { label: 'Package', value: packageName },
                    { label: 'Amount', value: `$${Number(amount).toLocaleString()}` },
                    { label: 'Cryptocurrency', value: `${crypto.name} (${crypto.symbol})` },
                    { label: 'Network', value: crypto.network },
                    { label: 'Status', value: 'Pending Confirmation' },
                    ...(txHash ? [{ label: 'TX Hash', value: `${txHash.slice(0, 16)}...`, highlight: false }] : []),
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-[#1A1A1A] last:border-0">
                      <span className="text-[10px] text-[#555555] uppercase tracking-wider">{item.label}</span>
                      <span className={`text-xs font-bold font-mono ${item.highlight ? 'text-primary' : 'text-white'}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5 mb-8 text-left">
                <div className="text-[10px] text-[#555555] uppercase tracking-widest mb-4">What Happens Next</div>
                <div className="space-y-3">
                  {[
                    'Network confirms your transaction',
                    'Our team verifies the payment on-chain',
                    'Investment activated in your dashboard',
                    'Confirmation email sent to your address',
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[10px] font-bold text-[#555555] shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-xs text-[#666666]">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/dashboard" className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px] flex items-center justify-center text-xs font-bold tracking-widest uppercase">
                  Go to Dashboard →
                </Link>
                <Link href="/" className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px] flex items-center justify-center text-xs font-bold tracking-widest uppercase">
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
