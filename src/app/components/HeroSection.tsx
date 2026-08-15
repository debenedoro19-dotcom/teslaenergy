'use client';
import React, { useEffect, useRef } from 'react';
import AppImage from '@/components/ui/AppImage';
import Link from 'next/link';

const stats = [
  { label: 'Assets Under Management', value: '$2.4T+' },
  { label: 'Active Investors', value: '50K+' },
  { label: 'Platform Uptime', value: '99.9%' },
];

const badges = [
  { icon: '🔒', label: 'Bank-grade Security' },
  { icon: '⚡', label: 'Real-time Pricing' },
  { icon: '✓', label: 'Instant Settlement' },
];

export default function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return; // throttle to one rAF per frame
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const rect = hero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const orb = hero.querySelector('.hero-orb') as HTMLElement;
        if (orb) {
          orb.style.transform = `translate(${x * 40}px, ${y * 30}px)`;
        }
      });
    };

    hero.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      hero.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <header
      ref={heroRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
    >
      {/* Background layers */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        {/* Deep ambient glow */}
        <div className="hero-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full transition-transform duration-700 ease-out" style={{ background: 'radial-gradient(circle, rgba(227,25,55,0.1) 0%, rgba(180,0,0,0.05) 40%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(227,25,55,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(100,0,20,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        {/* Dot grid overlay */}
        <div className="absolute inset-0 dot-grid opacity-30" />
      </div>

      {/* Cybertruck image */}
      <div className="absolute right-0 top-0 w-full h-full z-0" aria-hidden="true">
        <AppImage
          src="https://img.rocket.new/generatedImages/rocket_gen_img_195615429-1772068664371.png"
          alt="Tesla Cybertruck angular stainless steel body in dramatic dark studio lighting"
          fill
          className="object-cover object-center opacity-20"
          priority
        />
        {/* Scrim */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/85 to-[#0A0A0A]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/50" />
      </div>

      {/* Floating 3D accent elements */}
      <div className="absolute right-8 top-1/4 hidden xl:block z-5" aria-hidden="true">
        <div className="float-slow w-48 h-48 rounded-full" style={{ background: 'conic-gradient(from 0deg, rgba(227,25,55,0.15), rgba(200,0,0,0.05), rgba(227,25,55,0.15))', filter: 'blur(1px)', border: '1px solid rgba(227,25,55,0.1)' }} />
      </div>
      <div className="absolute left-8 bottom-1/3 hidden xl:block z-5" aria-hidden="true">
        <div className="float-medium w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, rgba(227,25,55,0.12) 0%, transparent 70%)', border: '1px solid rgba(227,25,55,0.08)' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full py-24">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-primary/25 bg-primary/8 mb-8 badge-3d">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ boxShadow: '0 0 6px rgba(227,25,55,0.8)' }} />
            <span className="text-primary font-bold text-[10px] tracking-[0.3em] uppercase neon-red">Tesla Ecosystem · Investment Platform</span>
          </div>

          {/* Headline */}
          <h1 className="font-extrabold leading-[0.88] tracking-tighter mb-8" style={{ fontSize: 'clamp(3.5rem, 10vw, 8rem)' }}>
            <span className="text-white block" style={{ textShadow: '0 2px 20px rgba(255,255,255,0.05)' }}>Trade Tesla</span>
            <span className="gradient-text-primary block neon-red">Tomorrow.</span>
          </h1>

          {/* Sub */}
          <p className="text-[#888888] text-lg sm:text-xl font-light leading-relaxed max-w-xl mb-10">
            The most secure fintech marketplace for Tesla vehicles, energy systems, and robotics. Zero friction. Maximum opportunity.
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-3 mb-10">
            {badges?.map((b) => (
              <div key={b?.label} className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#2A2A2A] bg-[#111111] text-xs font-medium text-[#666666] depth-card">
                <span>{b?.icon}</span>
                <span>{b?.label}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 tesla-btn-primary rounded text-xs min-h-[52px] btn-shimmer btn-elevated"
            >
              Start Investing
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
            <a
              href="#inventory"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 tesla-btn-outline rounded text-xs min-h-[52px]"
            >
              Browse Inventory
            </a>
          </div>
        </div>

        {/* Stats — bottom right */}
        <div className="absolute bottom-24 right-6 lg:right-8 hidden lg:block">
          <div className="glass-premium rounded-xl p-6 w-64 depth-card scanlines">
            <div className="text-[9px] font-bold text-[#555555] tracking-[0.3em] uppercase mb-4">Platform Metrics</div>
            <div className="space-y-4">
              {stats?.map((s) => (
                <div key={s?.label} className="flex items-center justify-between">
                  <span className="text-xs text-[#555555]">{s?.label}</span>
                  <span className="text-sm font-extrabold stat-number">{s?.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-[#1A1A1A] bg-[#080808]/90 backdrop-blur-sm hidden md:block" style={{ boxShadow: '0 -1px 0 rgba(227,25,55,0.1)' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex gap-8">
            {stats?.map((s) => (
              <div key={s?.label} className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold tracking-widest text-[#444444] uppercase">{s?.label}</span>
                <span className="text-xs font-extrabold text-primary" style={{ textShadow: '0 0 8px rgba(227,25,55,0.4)' }}>{s?.value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
            <span className="text-[9px] font-bold text-[#444444] tracking-widest uppercase">Markets Live</span>
          </div>
        </div>
      </div>
    </header>
  );
}