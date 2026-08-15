'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase/client';

type Step = 'details' | 'payment' | 'confirm';

export default function BookSessionPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    sessionType: 'virtual',
    preferredDate: '',
    preferredTime: '',
    topics: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cryptoTxHash, setCryptoTxHash] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      setForm((f) => ({
        ...f,
        fullName: user.user_metadata?.full_name || '',
        email: user.email || '',
      }));
    });
  }, []);

  function validateDetails() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.preferredDate) e.preferredDate = 'Preferred date is required';
    if (!form.preferredTime) e.preferredTime = 'Preferred time is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validatePayment() {
    const e: Record<string, string> = {};
    if (!paymentMethod) e.paymentMethod = 'Please select a payment method';
    if (paymentMethod === 'crypto' && !cryptoTxHash.trim()) {
      e.cryptoTxHash = 'Transaction hash is required for crypto payment';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validatePayment()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('session_bookings').insert({
        user_id: userId,
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        session_type: form.sessionType,
        preferred_date: form.preferredDate,
        preferred_time: form.preferredTime,
        topics: form.topics,
        payment_method: paymentMethod,
        payment_status: 'pending',
        amount: 50000,
        crypto_tx_hash: cryptoTxHash || null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to submit booking. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <Header />
        <div className="pt-24 pb-20 px-6 flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-green-400/10 border border-green-400/30 flex items-center justify-center mx-auto mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-3">Booking Submitted!</h1>
            <p className="text-[#888888] text-sm mb-2 leading-relaxed">
              Your session request with Elon Musk has been received. Our team will review your payment and confirm your appointment within 24–48 hours.
            </p>
            <p className="text-[#555555] text-xs mb-8">A confirmation will be sent to <span className="text-white">{form.email}</span></p>
            <div className="flex flex-col gap-3">
              <Link href="/dashboard" className="w-full py-3 tesla-btn-primary rounded text-xs font-bold tracking-widest uppercase text-center">
                Go to Dashboard
              </Link>
              <Link href="/" className="w-full py-3 tesla-btn-outline rounded text-xs font-bold tracking-widest uppercase text-center">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <div className="pt-24 pb-20 px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase mb-3 block">VIP Access</span>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">
              Book a Session with <span className="gradient-text-primary">Elon Musk</span>
            </h1>
            <p className="text-[#666666] text-sm">
              Private 30-minute session — In-Person or Virtual. Appointment fee: <span className="text-white font-bold">$50,000</span>
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-10">
            {(['details', 'payment', 'confirm'] as const).map((s, i) => {
              const steps = ['details', 'payment', 'confirm'];
              const currentIdx = steps.indexOf(step);
              return (
                <React.Fragment key={s}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s ? 'step-active' : currentIdx > i ? 'step-done' : 'step-pending'
                    }`}>
                      {currentIdx > i ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wider uppercase hidden sm:block ${step === s ? 'text-white' : 'text-[#444444]'}`}>
                      {s === 'details' ? 'Your Details' : s === 'payment' ? 'Payment' : 'Confirm'}
                    </span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-px ${currentIdx > i ? 'bg-primary' : 'bg-[#2A2A2A]'}`} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Step 1: Details */}
          {step === 'details' && (
            <div className="space-y-5">
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 space-y-5">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">Personal Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="w-full px-4 py-3 rounded text-sm input-tesla"
                      placeholder="Your full name"
                    />
                    {errors.fullName && <p className="text-xs text-red-400 mt-1">{errors.fullName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded text-sm input-tesla"
                      placeholder="your@email.com"
                    />
                    {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded text-sm input-tesla"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Session Format *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'virtual', label: 'Virtual', icon: '💻', detail: 'Video call via secure platform' },
                      { id: 'in_person', label: 'In-Person', icon: '🤝', detail: 'Location TBD upon confirmation' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setForm({ ...form, sessionType: opt.id })}
                        className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all ${
                          form.sessionType === opt.id ? 'border-primary bg-primary/5' : 'border-[#1A1A1A] bg-[#0D0D0D] hover:border-[#2A2A2A]'
                        }`}
                      >
                        <span className="text-xl">{opt.icon}</span>
                        <div>
                          <div className="text-sm font-bold text-white">{opt.label}</div>
                          <div className="text-[10px] text-[#555555]">{opt.detail}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Preferred Date *</label>
                    <input
                      type="date"
                      value={form.preferredDate}
                      onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                      className="w-full px-4 py-3 rounded text-sm input-tesla"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.preferredDate && <p className="text-xs text-red-400 mt-1">{errors.preferredDate}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Preferred Time *</label>
                    <select
                      value={form.preferredTime}
                      onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                      className="w-full px-4 py-3 rounded text-sm input-tesla"
                    >
                      <option value="">Select time slot</option>
                      {['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'].map((t) => (
                        <option key={t} value={t}>{t} (EST)</option>
                      ))}
                    </select>
                    {errors.preferredTime && <p className="text-xs text-red-400 mt-1">{errors.preferredTime}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Topics to Discuss (Optional)</label>
                  <textarea
                    value={form.topics}
                    onChange={(e) => setForm({ ...form, topics: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded text-sm input-tesla resize-none"
                    placeholder="e.g. Tesla energy investments, SpaceX opportunities, AI and robotics..."
                  />
                </div>
              </div>

              <button
                onClick={() => { if (validateDetails()) setStep('payment'); }}
                className="w-full py-3.5 tesla-btn-primary rounded min-h-[48px] text-xs font-bold tracking-widest uppercase"
              >
                Continue to Payment →
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 'payment' && (
            <div className="space-y-5">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-sm font-bold text-white">Appointment Fee: $50,000 USD</p>
                  <p className="text-xs text-[#888888]">Payment is required to confirm your booking</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'crypto', icon: '₿', name: 'Cryptocurrency', detail: 'BTC · ETH · USDT — Fastest confirmation' },
                  { id: 'wire', icon: '🏦', name: 'Bank Wire Transfer', detail: 'USD · SWIFT · 1–3 business days' },
                  { id: 'card', icon: '💳', name: 'Credit / Debit Card', detail: 'Visa · Mastercard · Instant' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${
                      paymentMethod === method.id ? 'border-primary bg-primary/5' : 'border-[#1A1A1A] bg-[#111111] hover:border-[#2A2A2A]'
                    }`}
                  >
                    <span className="text-2xl">{method.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{method.name}</div>
                      <div className="text-xs text-[#555555]">{method.detail}</div>
                    </div>
                    {paymentMethod === method.id && (
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                      </div>
                    )}
                  </button>
                ))}
                {errors.paymentMethod && <p className="text-xs text-red-400">{errors.paymentMethod}</p>}
              </div>

              {paymentMethod === 'crypto' && (
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5 space-y-4">
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Crypto Payment Instructions</p>
                  <p className="text-xs text-[#888888]">Send exactly <span className="text-white font-bold">$50,000 USD equivalent</span> to the wallet address below, then paste your transaction hash.</p>
                  <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded p-3">
                    <p className="text-[10px] text-[#555555] uppercase tracking-widest mb-1">BTC / ETH / USDT Wallet</p>
                    <p className="text-xs text-white font-mono break-all">Contact support for wallet address after submitting your booking</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Transaction Hash *</label>
                    <input
                      type="text"
                      value={cryptoTxHash}
                      onChange={(e) => setCryptoTxHash(e.target.value)}
                      className="w-full px-4 py-3 rounded text-sm input-tesla font-mono"
                      placeholder="0x..."
                    />
                    {errors.cryptoTxHash && <p className="text-xs text-red-400 mt-1">{errors.cryptoTxHash}</p>}
                  </div>
                </div>
              )}

              {paymentMethod === 'wire' && (
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                  <p className="text-xs font-bold text-white uppercase tracking-widest mb-3">Wire Transfer Instructions</p>
                  <p className="text-xs text-[#888888] leading-relaxed">After submitting your booking, our team will send wire transfer details to your email within 2 business hours. Payment must be received within 48 hours to hold your appointment slot.</p>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-5">
                  <p className="text-xs font-bold text-white uppercase tracking-widest mb-3">Card Payment</p>
                  <p className="text-xs text-[#888888] leading-relaxed">A secure payment link will be sent to your email after booking submission. Complete payment within 24 hours to confirm your slot.</p>
                </div>
              )}

              {errors.submit && (
                <div className="p-4 bg-red-400/5 border border-red-400/20 rounded-lg">
                  <p className="text-xs text-red-400">{errors.submit}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('details')} className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px] text-xs font-bold tracking-widest uppercase">← Back</button>
                <button
                  onClick={() => { if (validatePayment()) setStep('confirm'); }}
                  disabled={!paymentMethod}
                  className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px] text-xs font-bold tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Review Booking →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Booking Summary</h3>
                {[
                  { label: 'Name', value: form.fullName },
                  { label: 'Email', value: form.email },
                  { label: 'Session Type', value: form.sessionType === 'virtual' ? 'Virtual (Video Call)' : 'In-Person' },
                  { label: 'Preferred Date', value: form.preferredDate },
                  { label: 'Preferred Time', value: form.preferredTime },
                  { label: 'Payment Method', value: paymentMethod === 'crypto' ? 'Cryptocurrency' : paymentMethod === 'wire' ? 'Bank Wire Transfer' : 'Credit / Debit Card' },
                  { label: 'Appointment Fee', value: '$50,000 USD' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-[#1A1A1A]">
                    <span className="text-xs text-[#555555] uppercase tracking-wider">{item.label}</span>
                    <span className="text-xs font-bold text-white text-right max-w-[60%]">{item.value}</span>
                  </div>
                ))}
                {form.topics && (
                  <div className="py-2">
                    <span className="text-xs text-[#555555] uppercase tracking-wider block mb-1">Topics</span>
                    <span className="text-xs text-white">{form.topics}</span>
                  </div>
                )}
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xs text-[#888888] leading-relaxed">
                  By confirming, you acknowledge the $50,000 appointment fee and agree to our{' '}
                  <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
                  Bookings are subject to availability and admin confirmation.
                </p>
              </div>

              {errors.submit && (
                <div className="p-4 bg-red-400/5 border border-red-400/20 rounded-lg">
                  <p className="text-xs text-red-400">{errors.submit}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('payment')} className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px] text-xs font-bold tracking-widest uppercase">← Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px] text-xs font-bold tracking-widest uppercase disabled:opacity-60"
                >
                  {loading ? 'Submitting...' : 'Confirm Booking ✓'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
