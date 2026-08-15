import React from 'react';
import AppImage from '@/components/ui/AppImage';

const stats = [
  { label: 'Starship Launches', value: '6+' },
  { label: '2026 Mars Target', value: 'Active' },
  { label: 'Ecosystem Value', value: '$350B+' },
];

const categories = [
  {
    id: 1,
    name: 'Tesla Vehicles',
    sub: 'Model S, 3, X, Y & Cybertruck',
    description: 'Full range of verified listings with live market pricing.',
    cta: 'Browse listings →',
    href: '#inventory',
    image: '/assets/images/tesla_vehicles_hero.png',
    imageAlt: 'Tesla Cybertruck fleet lineup in dramatic dark studio with cinematic lighting',
    colSpan: 'lg:col-span-2',
    accent: '#00D4FF',
  },
  {
    id: 2,
    name: 'Energy Systems',
    sub: 'Powerwall · Solar Roof · Megapack',
    description: 'Complete your energy ecosystem with verified installations.',
    cta: 'Browse listings →',
    href: '#inventory',
    image: '/assets/images/tesla_energy_hero.png',
    imageAlt: 'Tesla Powerwall and solar panels installed on modern home at golden hour',
    colSpan: 'lg:col-span-1',
    accent: '#00FF88',
  },
  {
    id: 3,
    name: 'Robotics',
    sub: 'Optimus Gen 2 · Industrial Automation',
    description: 'Early access to the future of humanoid robotics.',
    cta: 'Browse listings →',
    href: '#inventory',
    image: '/assets/images/tesla_optimus_robotics.png',
    imageAlt: 'Tesla Optimus humanoid robot in futuristic factory with neon blue lighting',
    colSpan: 'lg:col-span-3',
    accent: '#A78BFA',
  },
];

export default function EcosystemSection() {
  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 section-reveal">
          <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase mb-3 block">The Future Is Now</span>
          <h2 className="text-section-title font-extrabold tracking-tighter text-foreground mb-4">
            Beyond Earth.{' '}
            <span className="gradient-text-primary">Beyond Limits.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base font-light">
            From Tesla vehicles and energy to SpaceX Starship, Neuralink, and xAI — one interconnected vision for humanity&apos;s multiplanetary future.
          </p>
        </div>

        {/* Stats — with SpaceX launch cinematic background */}
        <div className="relative rounded-2xl overflow-hidden mb-12 section-reveal">
          {/* SpaceX background image */}
          <div className="absolute inset-0 z-0">
            <AppImage
              src="/assets/images/spacex_starship_launch.png"
              alt="SpaceX Starship rocket launching at night with massive flame plume"
              fill
              className="object-cover object-center"
              priority
            />
            {/* Dark overlay so text stays readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/85 via-[#0A0A0A]/70 to-[#0A0A0A]/85" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/60 via-transparent to-[#0A0A0A]/40" />
          </div>

          {/* Stats grid on top */}
          <div className="relative z-10 grid grid-cols-3 gap-4 p-6 sm:p-8">
            {stats?.map((s) => (
              <div key={s?.label} className="rounded-xl p-5 text-center border border-white/10 bg-black/30 backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl font-extrabold text-primary mb-1">{s?.value}</div>
                <div className="text-xs font-semibold text-white/70">{s?.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bento grid — 3 cards across 3 cols */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* col-1–2: Vehicles */}
          <div className="glass-card glass-card-hover rounded-2xl section-reveal lg:col-span-2 relative overflow-hidden group min-h-[280px]">
            {/* Background image */}
            <div className="absolute inset-0 z-0">
              <AppImage
                src={categories?.[0]?.image}
                alt={categories?.[0]?.imageAlt}
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/40 to-transparent" />
            </div>
            <div className="relative z-10 p-8 flex flex-col justify-end h-full min-h-[280px]">
              <h3 className="text-2xl font-extrabold text-foreground mb-1">{categories?.[0]?.name}</h3>
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: categories?.[0]?.accent }}>{categories?.[0]?.sub}</div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">{categories?.[0]?.description}</p>
              <a href={categories?.[0]?.href} className="text-sm font-bold transition-colors" style={{ color: categories?.[0]?.accent }}>
                {categories?.[0]?.cta}
              </a>
            </div>
          </div>

          {/* col-3: Energy */}
          <div className="glass-card glass-card-hover rounded-2xl section-reveal lg:col-span-1 relative overflow-hidden group min-h-[280px]">
            {/* Background image */}
            <div className="absolute inset-0 z-0">
              <AppImage
                src={categories?.[1]?.image}
                alt={categories?.[1]?.imageAlt}
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
            </div>
            <div className="relative z-10 p-8 flex flex-col justify-end h-full min-h-[280px]">
              <h3 className="text-xl font-extrabold text-foreground mb-1">{categories?.[1]?.name}</h3>
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: categories?.[1]?.accent }}>{categories?.[1]?.sub}</div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">{categories?.[1]?.description}</p>
              <a href={categories?.[1]?.href} className="text-sm font-bold transition-colors" style={{ color: categories?.[1]?.accent }}>
                {categories?.[1]?.cta}
              </a>
            </div>
          </div>

          {/* col-1–3: Robotics (full width) */}
          <div className="glass-card glass-card-hover rounded-2xl section-reveal lg:col-span-3 relative overflow-hidden group min-h-[260px]">
            {/* Background image */}
            <div className="absolute inset-0 z-0">
              <AppImage
                src={categories?.[2]?.image}
                alt={categories?.[2]?.imageAlt}
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/70 to-[#0A0A0A]/40" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-transparent to-transparent" />
            </div>
            <div className="relative z-10 p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 min-h-[260px]">
              <div className="flex flex-col justify-end">
                <h3 className="text-2xl font-extrabold text-foreground mb-1">{categories?.[2]?.name}</h3>
                <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: categories?.[2]?.accent }}>{categories?.[2]?.sub}</div>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">{categories?.[2]?.description}</p>
              </div>
              <a
                href={categories?.[2]?.href}
                className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm btn-shimmer transition-all duration-300 min-h-[48px] border"
                style={{ color: categories?.[2]?.accent, borderColor: `${categories?.[2]?.accent}40` }}
              >
                {categories?.[2]?.cta}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}