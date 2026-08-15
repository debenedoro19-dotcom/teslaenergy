import React from 'react';
import Link from 'next/link';

export default function FinalCTASection() {
  return (
    <section className="relative z-10 py-20 px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-2xl p-12 sm:p-20 overflow-hidden text-center section-reveal holo-border" style={{ background: 'linear-gradient(135deg, rgba(18,18,18,0.98) 0%, rgba(12,12,12,0.99) 100%)', border: '1px solid rgba(227,25,55,0.2)', boxShadow: '0 0 80px rgba(227,25,55,0.08), 0 40px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
          {/* Background */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full rounded-full blur-[120px]" style={{ background: 'radial-gradient(ellipse, rgba(227,25,55,0.08) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-[80px]" style={{ background: 'radial-gradient(circle, rgba(227,25,55,0.05) 0%, transparent 70%)' }} />
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            {/* Scanlines */}
            <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.02) 3px, rgba(0,0,0,0.02) 6px)' }} />
          </div>

          {/* Corner accents — enhanced */}
          <div className="absolute top-5 left-5 w-10 h-10 border-t-2 border-l-2 border-primary/50" aria-hidden="true" style={{ boxShadow: '-2px -2px 8px rgba(227,25,55,0.15)' }} />
          <div className="absolute top-5 right-5 w-10 h-10 border-t-2 border-r-2 border-primary/50" aria-hidden="true" style={{ boxShadow: '2px -2px 8px rgba(227,25,55,0.15)' }} />
          <div className="absolute bottom-5 left-5 w-10 h-10 border-b-2 border-l-2 border-primary/50" aria-hidden="true" style={{ boxShadow: '-2px 2px 8px rgba(227,25,55,0.15)' }} />
          <div className="absolute bottom-5 right-5 w-10 h-10 border-b-2 border-r-2 border-primary/50" aria-hidden="true" style={{ boxShadow: '2px 2px 8px rgba(227,25,55,0.15)' }} />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-primary/25 bg-primary/8 mb-6 badge-3d">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ boxShadow: '0 0 6px rgba(227,25,55,0.8)' }} />
              <span className="text-xs font-bold text-primary tracking-[0.3em] uppercase">The Future Is Now</span>
            </div>
            <h2 className="text-section-title font-extrabold tracking-tighter text-white mb-4" style={{ textShadow: '0 2px 30px rgba(255,255,255,0.05)' }}>
              Power Tomorrow&apos;s{' '}
              <span className="gradient-text-primary neon-red">Wealth</span>
            </h2>
            <p className="text-[#666666] text-lg font-light max-w-xl mx-auto mb-10">
              Invest smarter. Drive the future. Build sustainable energy with Tesla.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 tesla-btn-primary rounded text-xs btn-shimmer btn-elevated min-h-[52px]"
              >
                Create Account
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link
                href="/invest"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 tesla-btn-outline rounded text-xs min-h-[52px]"
              >
                View Packages
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}