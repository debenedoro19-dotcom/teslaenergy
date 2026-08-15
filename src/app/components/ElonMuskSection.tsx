'use client';
import React, { useState, useCallback, memo } from 'react';
import AppImage from '@/components/ui/AppImage';

const companies = [
  {
    id: 'tesla',
    name: 'Tesla',
    founded: '2003',
    role: 'CEO & Product Architect',
    tagline: 'Accelerating the world\'s transition to sustainable energy',
    review:
      'Under Musk\'s leadership, Tesla transformed from a niche EV startup into the world\'s most valuable automaker. The company pioneered over-the-air software updates, built the Gigafactory network, and achieved full vertical integration across vehicles, energy storage, and solar. Tesla\'s market cap surpassed $1 trillion in 2021, validating the long-term bet on electrification.',
    valuation: '$700B+',
    color: '#E31937',
    icon: '⚡',
    highlights: ['Model S, 3, X, Y, Cybertruck', 'Gigafactory network', 'Full Self-Driving AI', 'Powerwall & Megapack'],
  },
  {
    id: 'spacex',
    name: 'SpaceX',
    founded: '2002',
    role: 'CEO & CTO',
    tagline: 'Making humanity multiplanetary',
    review:
      'SpaceX achieved what NASA and Boeing could not — reusable orbital rockets. The Falcon 9 booster landings redefined aerospace economics, slashing launch costs by 90%. Starship, the largest rocket ever built, is designed to carry 100+ people to Mars. SpaceX now controls over 60% of global commercial launch market share and operates the Starlink broadband constellation.',
    valuation: '$350B+',
    color: '#00D4FF',
    icon: '🚀',
    highlights: ['Falcon 9 reusability', 'Starship development', 'Starlink constellation', 'NASA Artemis contract'],
  },
  {
    id: 'neuralink',
    name: 'Neuralink',
    founded: '2016',
    role: 'Co-founder & CEO',
    tagline: 'Merging human cognition with artificial intelligence',
    review:
      'Neuralink is developing ultra-high-bandwidth brain-computer interfaces to treat neurological disorders and eventually enable symbiosis with AI. In 2024, the first human patient received the N1 implant, demonstrating the ability to control a computer cursor with thought alone. The long-term vision is to give paralyzed patients full digital autonomy and expand human cognitive bandwidth.',
    valuation: '$8B+',
    color: '#A78BFA',
    icon: '🧠',
    highlights: ['N1 chip implant', 'First human trials 2024', 'Paralysis treatment', 'BCI research platform'],
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    founded: '2022 (acquired)',
    role: 'Owner & Executive Chairman',
    tagline: 'The everything app — free speech, payments, and beyond',
    review:
      'Musk acquired Twitter for $44B in 2022 and rebranded it to X, with ambitions to build a super-app combining social media, payments, and AI. He cut the workforce by 80%, introduced paid verification, and launched X Money for peer-to-peer payments. Despite controversy, X remains a dominant real-time information platform with 600M+ monthly active users.',
    valuation: '$19B+',
    color: '#F5F5F5',
    icon: '✕',
    highlights: ['600M+ monthly users', 'X Money payments', 'Grok AI integration', 'Creator monetization'],
  },
  {
    id: 'xai',
    name: 'xAI',
    founded: '2023',
    role: 'Founder & CEO',
    tagline: 'Understanding the true nature of the universe',
    review:
      'Founded to compete directly with OpenAI and Google DeepMind, xAI launched Grok — an AI assistant integrated into X with real-time internet access. Grok 3 benchmarks rival GPT-4o and Claude 3.5 Sonnet. xAI raised $6B in 2024 at a $24B valuation and is building the Colossus supercomputer cluster in Memphis — the largest AI training facility in the world.',
    valuation: '$50B+',
    color: '#00FF88',
    icon: '🤖',
    highlights: ['Grok AI assistant', 'Colossus supercomputer', '$6B Series B 2024', 'Real-time AI reasoning'],
  },
  {
    id: 'boring',
    name: 'The Boring Company',
    founded: '2016',
    role: 'Founder',
    tagline: 'Solving urban traffic through underground tunnels',
    review:
      'The Boring Company was born from Musk\'s frustration with LA traffic. It developed a low-cost tunneling method using smaller-diameter tunnels and electric vehicles. The Las Vegas Convention Center Loop became the first commercial deployment, transporting 4,400+ passengers per hour. Projects in Austin, Miami, and Chicago are in various stages of approval and development.',
    valuation: '$5.7B+',
    color: '#F59E0B',
    icon: '🚇',
    highlights: ['Vegas Loop operational', 'Prufrock boring machine', 'Austin & Miami projects', 'Low-cost tunneling tech'],
  },
];

const bioTimeline = [
  { year: '1971', event: 'Born in Pretoria, South Africa' },
  { year: '1995', event: 'Dropped out of Stanford PhD after 2 days; co-founded Zip2' },
  { year: '1999', event: 'Sold Zip2 for $307M; founded X.com (became PayPal)' },
  { year: '2002', event: 'Founded SpaceX with $100M of his own money' },
  { year: '2004', event: 'Led Series A investment in Tesla; became chairman' },
  { year: '2008', event: 'Became Tesla CEO; SpaceX\'s Falcon 1 reached orbit' },
  { year: '2015', event: 'Co-founded OpenAI; launched Tesla Powerwall' },
  { year: '2022', event: 'Acquired Twitter for $44B; rebranded to X' },
  { year: '2024', event: 'First Neuralink human implant; xAI Grok 3 launch' },
];

export default function ElonMuskSection() {
  const [activeCompany, setActiveCompany] = useState(companies?.[0]);

  const handleCompanySelect = useCallback((c) => {
    setActiveCompany(c);
  }, []);

  return (
    <section id="elon-musk" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Section Header */}
        <div className="text-center mb-16 section-reveal">
          <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase mb-3 block">The Architect</span>
          <h2 className="text-section-title font-extrabold tracking-tighter text-foreground mb-4">
            Elon Musk —{' '}
            <span className="gradient-text-primary">The Man Behind the Vision</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base font-light">
            Engineer, entrepreneur, and provocateur — Musk has built more transformative companies simultaneously than any figure in modern history.
          </p>
        </div>

        {/* Biography Block */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-16 section-reveal">
          {/* Portrait */}
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden min-h-[420px] group">
            <AppImage
              src="/assets/images/elon_musk_portrait.png"
              alt="Elon Musk portrait in formal attire against dark background"
              fill
              className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/50 to-transparent" />
            {/* Name badge */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="text-2xl font-extrabold text-foreground">Elon Musk</div>
              <div className="text-xs font-bold text-primary tracking-widest uppercase mt-1">Born June 28, 1971 · Pretoria, South Africa</div>
              <div className="flex flex-wrap gap-2 mt-3">
                {['Engineer', 'Entrepreneur', 'Inventor']?.map((tag) => (
                  <span key={tag} className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary/30 text-primary bg-primary/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bio text + timeline */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Bio paragraphs */}
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-lg font-extrabold text-foreground mb-4">Biography</h3>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Elon Reeve Musk was born on June 28, 1971, in Pretoria, South Africa. A self-taught programmer, he sold his first video game at age 12. After studying at Queen&apos;s University in Canada, he transferred to the University of Pennsylvania, earning dual degrees in economics and physics before enrolling in a Stanford PhD program — which he abandoned after two days to pursue entrepreneurship.
                </p>
                <p>
                  His first venture, Zip2, was sold to Compaq for $307 million in 1999. He then founded X.com, an online payments company that merged with Confinity to become PayPal — sold to eBay for $1.5 billion in 2002. Rather than retiring, Musk invested nearly all his proceeds into SpaceX and Tesla, nearly going bankrupt in 2008 before both companies secured critical funding on the same day.
                </p>
                <p>
                  Today Musk leads six companies simultaneously — Tesla, SpaceX, Neuralink, X, xAI, and The Boring Company — with a combined enterprise value exceeding $1 trillion. His stated mission: ensure humanity becomes a multiplanetary species and that artificial intelligence benefits all of humanity rather than a narrow elite.
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-sm font-extrabold text-foreground mb-5 tracking-widest uppercase">Key Milestones</h3>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[52px] top-0 bottom-0 w-px bg-border" />
                <div className="space-y-3">
                  {bioTimeline?.map((item) => (
                    <div key={item?.year} className="flex items-start gap-4">
                      <div className="w-[52px] shrink-0 text-right">
                        <span className="text-[10px] font-extrabold text-primary tracking-wider">{item?.year}</span>
                      </div>
                      <div className="relative flex items-start gap-3 pb-1">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0 relative z-10" />
                        <p className="text-xs text-muted-foreground leading-relaxed">{item?.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Reviews */}
        <div className="section-reveal">
          <div className="mb-8">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase mb-2 block">Portfolio of Disruption</span>
            <h3 className="text-2xl font-extrabold text-foreground">Company Reviews</h3>
          </div>

          {/* Company selector tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {companies?.map((c) => (
              <button
                key={c?.id}
                onClick={() => handleCompanySelect(c)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  activeCompany?.id === c?.id
                    ? 'border-transparent text-background' :'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground bg-transparent'
                }`}
                style={activeCompany?.id === c?.id ? { background: c?.color, color: '#0A0A0A' } : {}}
              >
                <span>{c?.icon}</span>
                <span>{c?.name}</span>
              </button>
            ))}
          </div>

          {/* Active company detail */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-1" style={{ background: `linear-gradient(90deg, ${activeCompany?.color}22, transparent)` }}>
              <div className="glass-card rounded-xl p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: main info */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-4 mb-5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ background: `${activeCompany?.color}18`, border: `1px solid ${activeCompany?.color}30` }}
                      >
                        {activeCompany?.icon}
                      </div>
                      <div>
                        <h4 className="text-xl font-extrabold text-foreground">{activeCompany?.name}</h4>
                        <div className="text-xs font-semibold text-muted-foreground">
                          Founded {activeCompany?.founded} · {activeCompany?.role}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm font-semibold mb-4" style={{ color: activeCompany?.color }}>
                      &ldquo;{activeCompany?.tagline}&rdquo;
                    </p>

                    <p className="text-sm text-muted-foreground leading-relaxed">{activeCompany?.review}</p>
                  </div>

                  {/* Right: stats + highlights */}
                  <div className="flex flex-col gap-5">
                    <div className="rounded-xl p-5 border" style={{ borderColor: `${activeCompany?.color}30`, background: `${activeCompany?.color}08` }}>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Est. Valuation</div>
                      <div className="text-3xl font-extrabold" style={{ color: activeCompany?.color }}>{activeCompany?.valuation}</div>
                    </div>

                    <div className="rounded-xl p-5 border border-border bg-muted/10">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Key Highlights</div>
                      <ul className="space-y-2">
                        {activeCompany?.highlights?.map((h) => (
                          <li key={h} className="flex items-center gap-2 text-xs text-foreground">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: activeCompany?.color }} />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Companies Led', value: '6', color: '#00D4FF' },
              { label: 'Combined Valuation', value: '$1T+', color: '#00FF88' },
              { label: 'Patents Filed', value: '200+', color: '#A78BFA' },
              { label: 'Net Worth (2025)', value: '$300B+', color: '#E31937' },
            ]?.map((s) => (
              <div key={s?.label} className="glass-card rounded-xl p-5 text-center">
                <div className="text-2xl font-extrabold mb-1" style={{ color: s?.color }}>{s?.value}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s?.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
