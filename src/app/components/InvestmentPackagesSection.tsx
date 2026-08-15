import React from 'react';
import Link from 'next/link';

interface Package {
  id: number;
  name: string;
  min: string;
  return: string;
  duration: string;
  description: string;
  includes: string[];
  featured: boolean;
  color: string;
  badge?: string;
}

const packages: Package[] = [
  {
    id: 0,
    name: 'Micro Entry',
    min: '$100',
    return: '4–6% p.a.',
    duration: '3 months',
    description: 'Perfect first step into the Tesla ecosystem with minimal commitment.',
    includes: ['Monthly reports', 'Email support', 'Community access'],
    featured: false,
    color: 'border-[#2A2A2A]',
    badge: 'New',
  },
  {
    id: 1,
    name: 'Seed Plan',
    min: '$500',
    return: '6–9% p.a.',
    duration: '6 months',
    description: 'Build early exposure to Tesla energy and vehicle asset pools.',
    includes: ['Bi-monthly reports', 'Email support', 'Community access', 'Referral bonus eligible'],
    featured: false,
    color: 'border-[#2A2A2A]',
    badge: 'New',
  },
  {
    id: 2,
    name: 'Starter Energy',
    min: '$5,000',
    return: '8–12% p.a.',
    duration: '12 months',
    description: 'Entry-level package focused on Tesla energy products and Powerwall allocations.',
    includes: ['Powerwall priority access', 'Quarterly reports', 'Email support'],
    featured: false,
    color: 'border-[#2A2A2A]',
  },
  {
    id: 3,
    name: 'Growth Portfolio',
    min: '$25,000',
    return: '12–18% p.a.',
    duration: '24 months',
    description: 'Balanced exposure across vehicles, energy systems and early robotics.',
    includes: ['Mixed asset allocation', 'Monthly performance reports', 'Priority support', 'VIP webinar access'],
    featured: true,
    color: 'border-primary/40',
  },
  {
    id: 4,
    name: 'Private Elite',
    min: '$100,000',
    return: 'Custom',
    duration: '36+ months',
    description: 'Bespoke high-net-worth package with private session eligibility and Optimus early access.',
    includes: ['Dedicated account manager', 'Private Elon session eligibility', 'Optimus allocation priority', 'Custom reporting'],
    featured: false,
    color: 'border-[#2A2A2A]',
  },
];

export default function InvestmentPackagesSection() {
  return (
    <section id="invest" className="relative z-10 py-20 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-14 section-reveal">
          <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase mb-3 block">Investment Packages</span>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h2 className="text-section-title font-extrabold tracking-tighter text-white">
              Choose Your{' '}
              <span className="gradient-text-primary">Allocation</span>
            </h2>
            <Link
              href="/invest"
              className="inline-flex items-center gap-2 text-xs font-bold text-primary tracking-widest uppercase hover:text-red-400 transition-colors shrink-0"
            >
              Apply Now →
            </Link>
          </div>
          <p className="text-sm text-[#555555] mt-3 max-w-xl">
            From micro-entry at $100 to elite private allocations — every investor has a place in the Tesla ecosystem.
          </p>
        </div>

        {/* Top row: micro plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {packages.slice(0, 2).map((pkg, idx) => (
            <div
              key={pkg.id}
              className="section-reveal"
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <div className={`relative bg-[#111111] rounded-lg p-6 h-full flex flex-col border ${pkg.color} overflow-hidden`}>
                {pkg.badge && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 rounded bg-green-500/20 text-green-400 text-[9px] font-extrabold tracking-widest uppercase border border-green-500/30">
                    {pkg.badge}
                  </div>
                )}
                <div className="border-b border-[#1A1A1A] pb-4 mb-4">
                  <h3 className="text-base font-extrabold text-white mb-1">{pkg.name}</h3>
                  <p className="text-xs text-[#666666] leading-relaxed">{pkg.description}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <div className="text-[9px] font-bold text-[#555555] uppercase tracking-widest mb-1">Min. Investment</div>
                    <div className="text-base font-extrabold text-primary">{pkg.min}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-[#555555] uppercase tracking-widest mb-1">Expected Return</div>
                    <div className="text-base font-extrabold text-white">{pkg.return}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-[#555555] uppercase tracking-widest mb-1">Duration</div>
                    <div className="text-sm font-semibold text-white">{pkg.duration}</div>
                  </div>
                </div>
                <ul className="space-y-1.5 mb-5 flex-1">
                  {pkg.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-[#666666]">
                      <svg className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/invest"
                  className="w-full py-3 rounded text-xs font-bold tracking-widest uppercase text-center transition-all duration-300 hover:-translate-y-0.5 min-h-[44px] flex items-center justify-center border border-[#2A2A2A] text-white hover:border-primary/40 hover:bg-primary/5"
                >
                  Get Started →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row: main plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {packages.slice(2).map((pkg, idx) => (
            <div
              key={pkg.id}
              className={`relative section-reveal ${pkg.featured ? 'md:-mt-4 md:mb-4' : ''}`}
              style={{ transitionDelay: `${(idx + 2) * 100}ms` }}
            >
              {pkg.featured && (
                <div className="absolute -inset-px bg-gradient-to-b from-primary/30 via-primary/10 to-transparent rounded-lg blur-sm" aria-hidden="true" />
              )}

              <div className={`relative bg-[#111111] rounded-lg p-7 h-full flex flex-col border ${pkg.color} overflow-hidden`}>
                {pkg.featured && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 rounded bg-primary text-white text-[9px] font-extrabold tracking-widest uppercase">
                    Most Popular
                  </div>
                )}

                <div className="border-b border-[#1A1A1A] pb-5 mb-5">
                  <h3 className="text-lg font-extrabold text-white mb-1">{pkg.name}</h3>
                  <p className="text-xs text-[#666666] leading-relaxed">{pkg.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <div className="text-[9px] font-bold text-[#555555] uppercase tracking-widest mb-1">Min. Investment</div>
                    <div className="text-lg font-extrabold text-primary">{pkg.min}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-[#555555] uppercase tracking-widest mb-1">Expected Return</div>
                    <div className={`text-lg font-extrabold ${pkg.featured ? 'text-primary' : 'text-white'}`}>{pkg.return}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[9px] font-bold text-[#555555] uppercase tracking-widest mb-1">Duration</div>
                    <div className="text-sm font-semibold text-white">{pkg.duration}</div>
                  </div>
                </div>

                <ul className="space-y-2 mb-7 flex-1">
                  {pkg.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-[#666666]">
                      <svg className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/invest"
                  className={`w-full py-3.5 rounded text-xs font-bold tracking-widest uppercase text-center transition-all duration-300 hover:-translate-y-0.5 min-h-[48px] flex items-center justify-center btn-shimmer ${
                    pkg.featured
                      ? 'bg-primary text-white' :'border border-[#2A2A2A] text-white hover:border-primary/40 hover:bg-primary/5'
                  }`}
                  style={pkg.featured ? { boxShadow: '0 0 25px rgba(227,25,55,0.25)' } : {}}
                >
                  Apply Now →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}