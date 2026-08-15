'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Step = 1 | 2 | 3 | 4;

interface UploadedFile {
  file: File;
  preview: string;
  name: string;
}

interface KYCForm {
  dob: string;
  country: string;
  address: string;
  city: string;
  zip: string;
  idType: 'passport' | 'drivers_license' | 'national_id';
  idNumber: string;
  investorType: string;
  income: string;
  experience: string;
  agreed: boolean;
}

function FileUploadZone({
  label,
  hint,
  file,
  onFileSelect,
  accept,
}: {
  label: string;
  hint: string;
  file: UploadedFile | null;
  onFileSelect: (f: UploadedFile) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const preview = selected.type.startsWith('image/')
      ? URL.createObjectURL(selected)
      : '';
    onFileSelect({ file: selected, preview, name: selected.name });
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          file
            ? 'border-primary/50 bg-primary/5' :'border-[#2A2A2A] hover:border-primary/30'
        }`}
      >
        {file ? (
          <div className="flex flex-col items-center gap-2">
            {file.preview ? (
              <img
                src={file.preview}
                alt={`Preview of ${file.name}`}
                className="h-20 w-auto rounded object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E31937" strokeWidth="1.5" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            )}
            <p className="text-xs font-semibold text-primary truncate max-w-[200px]">{file.name}</p>
            <p className="text-[10px] text-[#555555]">Click to replace</p>
          </div>
        ) : (
          <>
            <div className="text-2xl mb-2">📄</div>
            <p className="text-sm font-semibold text-[#666666] mb-1">{hint}</p>
            <p className="text-xs text-[#444444]">JPG, PNG or PDF · Max 10MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept || 'image/jpeg,image/png,image/webp,application/pdf'}
        onChange={handleChange}
        className="hidden"
        aria-label={label}
      />
    </div>
  );
}

export default function KYCPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [existingKyc, setExistingKyc] = useState<any>(null);

  const [form, setForm] = useState<KYCForm>({
    dob: '',
    country: '',
    address: '',
    city: '',
    zip: '',
    idType: 'passport',
    idNumber: '',
    investorType: '',
    income: '',
    experience: '',
    agreed: false,
  });

  const [idFrontFile, setIdFrontFile] = useState<UploadedFile | null>(null);
  const [idBackFile, setIdBackFile] = useState<UploadedFile | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<UploadedFile | null>(null);
  const [incomeDocFile, setIncomeDocFile] = useState<UploadedFile | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);

      // Ensure user_profiles row exists
      await supabase.from('user_profiles').upsert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      }, { onConflict: 'id' });

      // Check existing KYC
      const { data: kyc } = await supabase
        .from('kyc_submissions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (kyc) {
        setExistingKyc(kyc);
        // Pre-fill form with existing data
        setForm({
          dob: kyc.date_of_birth || '',
          country: kyc.country || '',
          address: kyc.street_address || '',
          city: kyc.city || '',
          zip: kyc.zip_code || '',
          idType: kyc.id_type || 'passport',
          idNumber: kyc.id_number || '',
          investorType: kyc.investor_type || '',
          income: kyc.annual_income || '',
          experience: kyc.investment_experience || '',
          agreed: false,
        });
      }
      setLoading(false);
    };
    init();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [target.name]: target.type === 'checkbox' ? target.checked : target.value,
    }));
  };

  const uploadFile = async (
    supabase: ReturnType<typeof createClient>,
    file: File,
    path: string
  ): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .upload(path, file, { upsert: true });
    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(data.path);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!userId || !form.agreed) return;
    setSubmitting(true);
    setError('');

    try {
      const supabase = createClient();
      const ts = Date.now();

      // Upload files
      let idFrontUrl: string | null = existingKyc?.id_document_url || null;
      let idBackUrl: string | null = existingKyc?.id_document_back_url || null;
      let addressProofUrl: string | null = existingKyc?.address_proof_url || null;
      let incomeDocUrl: string | null = existingKyc?.income_document_url || null;

      if (idFrontFile) {
        idFrontUrl = await uploadFile(supabase, idFrontFile.file, `${userId}/id_front_${ts}`);
      }
      if (idBackFile) {
        idBackUrl = await uploadFile(supabase, idBackFile.file, `${userId}/id_back_${ts}`);
      }
      if (addressProofFile) {
        addressProofUrl = await uploadFile(supabase, addressProofFile.file, `${userId}/address_proof_${ts}`);
      }
      if (incomeDocFile) {
        incomeDocUrl = await uploadFile(supabase, incomeDocFile.file, `${userId}/income_doc_${ts}`);
      }

      const payload = {
        user_id: userId,
        date_of_birth: form.dob || null,
        country: form.country,
        street_address: form.address,
        city: form.city,
        zip_code: form.zip,
        id_type: form.idType as 'passport' | 'drivers_license' | 'national_id',
        id_number: form.idNumber,
        id_document_url: idFrontUrl,
        id_document_back_url: idBackUrl,
        address_proof_url: addressProofUrl,
        investor_type: form.investorType,
        annual_income: form.income,
        investment_experience: form.experience,
        income_document_url: incomeDocUrl,
        kyc_status: 'pending' as const,
        submitted_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('kyc_submissions')
        .upsert(payload, { onConflict: 'user_id' });

      if (upsertError) {
        setError(upsertError.message);
        setSubmitting(false);
        return;
      }

      router.push('/dashboard?kyc=submitted');
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Personal Info' },
    { num: 2, label: 'Identity' },
    { num: 3, label: 'Income' },
    { num: 4, label: 'Review' },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white px-4 py-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/4 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <svg width="24" height="24" viewBox="0 0 342 512" fill="currentColor" className="text-primary" aria-hidden="true">
              <path d="M0 57.3C0 57.3 57.3 0 171 0s171 57.3 171 57.3L285 85.5s-28.5-28.5-114-28.5S57 85.5 57 85.5L0 57.3zM171 512L57 85.5s28.5 28.5 114 28.5 114-28.5 114-28.5L171 512z"/>
            </svg>
            <span className="text-white font-bold text-sm tracking-widest uppercase">Tesla Trade</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">Identity Verification</h1>
          <p className="text-sm text-[#666666]">Complete KYC to unlock full investment access</p>
        </div>

        {/* Existing KYC status banner */}
        {existingKyc && (
          <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
            existingKyc.kyc_status === 'approved' ?'bg-green-400/10 border-green-400/20'
              : existingKyc.kyc_status === 'rejected' ?'bg-red-400/10 border-red-400/20' :'bg-yellow-400/10 border-yellow-400/20'
          }`}>
            <span className="text-lg">
              {existingKyc.kyc_status === 'approved' ? '✅' : existingKyc.kyc_status === 'rejected' ? '❌' : '⏳'}
            </span>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${
                existingKyc.kyc_status === 'approved' ? 'text-green-400' : existingKyc.kyc_status === 'rejected' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                KYC {existingKyc.kyc_status === 'under_review' ? 'Under Review' : existingKyc.kyc_status?.charAt(0).toUpperCase() + existingKyc.kyc_status?.slice(1)}
              </p>
              {existingKyc.admin_notes && (
                <p className="text-xs text-[#888888] mt-0.5">{existingKyc.admin_notes}</p>
              )}
              {existingKyc.kyc_status === 'pending' || existingKyc.kyc_status === 'rejected' ? (
                <p className="text-xs text-[#666666] mt-0.5">You can update and resubmit your information below.</p>
              ) : null}
            </div>
          </div>
        )}

        {/* Step indicators */}
        <div className="flex items-center mb-10">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s.num ? 'step-done' : step === s.num ? 'step-active' : 'step-pending'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={`text-[9px] font-semibold tracking-wider uppercase hidden sm:block ${step >= s.num ? 'text-white' : 'text-[#444444]'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-2 transition-all ${step > s.num ? 'bg-primary' : 'bg-[#2A2A2A]'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-white mb-4">Personal Information</h2>
            <div>
              <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Date of Birth</label>
              <input name="dob" type="date" value={form.dob} onChange={handleChange} className="w-full px-4 py-3 rounded text-sm input-tesla" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Country of Residence</label>
              <select name="country" value={form.country} onChange={handleChange} className="w-full px-4 py-3 rounded text-sm input-tesla bg-[#111111]">
                <option value="">Select country</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="NG">Nigeria</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="SG">Singapore</option>
                <option value="AE">UAE</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Street Address</label>
              <input name="address" type="text" value={form.address} onChange={handleChange} placeholder="123 Main Street" className="w-full px-4 py-3 rounded text-sm input-tesla" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">City</label>
                <input name="city" type="text" value={form.city} onChange={handleChange} placeholder="New York" className="w-full px-4 py-3 rounded text-sm input-tesla" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">ZIP / Postal</label>
                <input name="zip" type="text" value={form.zip} onChange={handleChange} placeholder="10001" className="w-full px-4 py-3 rounded text-sm input-tesla" />
              </div>
            </div>

            {/* Address proof upload */}
            <FileUploadZone
              label="Proof of Address"
              hint="Upload utility bill or bank statement"
              file={addressProofFile}
              onFileSelect={setAddressProofFile}
            />
            <p className="text-[10px] text-[#444444]">Accepted: recent utility bill, bank statement, or government letter (within 3 months)</p>

            <button
              onClick={() => setStep(2)}
              disabled={!form.country || !form.address}
              className="w-full py-3.5 tesla-btn-primary rounded mt-2 min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Identity */}
        {step === 2 && (
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-white mb-4">Government ID</h2>
            <div>
              <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Document Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(['passport', 'drivers_license', 'national_id'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, idType: type }))}
                    className={`py-3 px-2 rounded border text-xs font-semibold tracking-wider uppercase transition-all ${
                      form.idType === type ? 'border-primary bg-primary/10 text-white' : 'border-[#2A2A2A] text-[#555555] hover:border-[#3A3A3A]'
                    }`}
                  >
                    {type === 'passport' ? 'Passport' : type === 'drivers_license' ? "Driver's" : 'National ID'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Document Number</label>
              <input name="idNumber" type="text" value={form.idNumber} onChange={handleChange} placeholder="e.g. A12345678" className="w-full px-4 py-3 rounded text-sm input-tesla" />
            </div>

            <FileUploadZone
              label="Document Front"
              hint="Upload front of your ID document"
              file={idFrontFile}
              onFileSelect={setIdFrontFile}
            />

            <FileUploadZone
              label="Document Back (if applicable)"
              hint="Upload back of your ID document"
              file={idBackFile}
              onFileSelect={setIdBackFile}
            />

            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded p-3">
              <p className="text-[10px] text-[#555555] leading-relaxed">
                📋 <strong className="text-[#666666]">Requirements:</strong> Document must be valid (not expired), clearly legible, and show your full name and photo. All four corners must be visible.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px]">← Back</button>
              <button
                onClick={() => setStep(3)}
                disabled={!form.idNumber || !idFrontFile}
                className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Income Verification */}
        {step === 3 && (
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-white mb-4">Investor Profile & Income</h2>
            <div>
              <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Investor Type</label>
              <div className="grid grid-cols-2 gap-3">
                {['Retail Investor', 'Accredited Investor', 'Institutional', 'High Net Worth'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, investorType: type }))}
                    className={`py-3 px-3 rounded border text-xs font-semibold tracking-wider transition-all text-left ${
                      form.investorType === type ? 'border-primary bg-primary/10 text-white' : 'border-[#2A2A2A] text-[#555555] hover:border-[#3A3A3A]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Annual Income Range</label>
              <select name="income" value={form.income} onChange={handleChange} className="w-full px-4 py-3 rounded text-sm input-tesla bg-[#111111]">
                <option value="">Select range</option>
                <option value="under50k">Under $50,000</option>
                <option value="50k-100k">$50,000 – $100,000</option>
                <option value="100k-250k">$100,000 – $250,000</option>
                <option value="250k-500k">$250,000 – $500,000</option>
                <option value="over500k">Over $500,000</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#888888] uppercase tracking-widest mb-2">Investment Experience</label>
              <select name="experience" value={form.experience} onChange={handleChange} className="w-full px-4 py-3 rounded text-sm input-tesla bg-[#111111]">
                <option value="">Select experience level</option>
                <option value="beginner">Beginner (0–2 years)</option>
                <option value="intermediate">Intermediate (2–5 years)</option>
                <option value="experienced">Experienced (5–10 years)</option>
                <option value="expert">Expert (10+ years)</option>
              </select>
            </div>

            <FileUploadZone
              label="Income Verification Document"
              hint="Upload pay stub, bank statement, or tax return"
              file={incomeDocFile}
              onFileSelect={setIncomeDocFile}
            />
            <p className="text-[10px] text-[#444444]">Accepted: recent pay stub, bank statement (3 months), tax return, or employment letter</p>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px]">← Back</button>
              <button
                onClick={() => setStep(4)}
                disabled={!form.investorType || !form.income}
                className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-white mb-4">Review & Submit</h2>

            {/* Summary sections */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Personal Information</p>
              {[
                { label: 'Country', value: form.country || '—' },
                { label: 'Address', value: form.address ? `${form.address}, ${form.city} ${form.zip}` : '—' },
                { label: 'Address Proof', value: addressProofFile ? `✓ ${addressProofFile.name}` : existingKyc?.address_proof_url ? '✓ Previously uploaded' : '— Not uploaded' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-2 border-b border-[#1A1A1A]">
                  <span className="text-xs text-[#666666] uppercase tracking-wider">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.value.startsWith('✓') ? 'text-green-400' : item.value.startsWith('—') ? 'text-[#444444]' : 'text-white'}`}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 mt-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Identity Document</p>
              {[
                { label: 'ID Type', value: form.idType === 'drivers_license' ? "Driver's License" : form.idType === 'national_id' ? 'National ID' : 'Passport' },
                { label: 'ID Number', value: form.idNumber || '—' },
                { label: 'Front', value: idFrontFile ? `✓ ${idFrontFile.name}` : existingKyc?.id_document_url ? '✓ Previously uploaded' : '— Not uploaded' },
                { label: 'Back', value: idBackFile ? `✓ ${idBackFile.name}` : existingKyc?.id_document_back_url ? '✓ Previously uploaded' : 'Not required' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-2 border-b border-[#1A1A1A]">
                  <span className="text-xs text-[#666666] uppercase tracking-wider">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.value.startsWith('✓') ? 'text-green-400' : item.value.startsWith('—') ? 'text-[#444444]' : 'text-white'}`}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 mt-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Investor Profile</p>
              {[
                { label: 'Investor Type', value: form.investorType || '—' },
                { label: 'Income Range', value: form.income || '—' },
                { label: 'Experience', value: form.experience || '—' },
                { label: 'Income Doc', value: incomeDocFile ? `✓ ${incomeDocFile.name}` : existingKyc?.income_document_url ? '✓ Previously uploaded' : '— Not uploaded' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-2 border-b border-[#1A1A1A]">
                  <span className="text-xs text-[#666666] uppercase tracking-wider">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.value.startsWith('✓') ? 'text-green-400' : item.value.startsWith('—') ? 'text-[#444444]' : 'text-white'}`}>{item.value}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-400/10 border border-red-400/20 rounded text-xs text-red-400">
                {error}
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer mt-4">
              <input
                type="checkbox"
                name="agreed"
                checked={form.agreed}
                onChange={handleChange}
                className="mt-0.5 accent-primary"
              />
              <span className="text-xs text-[#666666] leading-relaxed">
                I confirm that all information and documents provided are accurate and authentic. I agree to the{' '}
                <a href="#" className="text-primary hover:underline">Terms of Service</a> and{' '}
                <a href="#" className="text-primary hover:underline">KYC Policy</a>.
              </span>
            </label>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 py-3.5 tesla-btn-outline rounded min-h-[48px]">← Back</button>
              <button
                onClick={handleSubmit}
                disabled={!form.agreed || submitting}
                className="flex-1 py-3.5 tesla-btn-primary rounded min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit KYC ✓'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
