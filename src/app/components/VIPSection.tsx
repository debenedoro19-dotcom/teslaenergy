import React from 'react';
import AppImage from '@/components/ui/AppImage';

export default function VIPSection() {
  return (
    <section id="vip" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="relative glass-card rounded-3xl overflow-hidden section-reveal border border-accent/20">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 blob-accent opacity-30" />
            <div className="absolute bottom-0 right-0 w-64 h-64 blob-primary opacity-20" />
          </div>

          {/* HUD corner brackets */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-accent/40 rounded-tl-lg z-20" aria-hidden="true" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-accent/40 rounded-tr-lg z-20" aria-hidden="true" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-accent/40 rounded-bl-lg z-20" aria-hidden="true" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-accent/40 rounded-br-lg z-20" aria-hidden="true" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-0">
            {/* Elon Musk portrait — left side */}
            <div className="relative w-full lg:w-[340px] shrink-0 h-[320px] lg:h-auto lg:self-stretch overflow-hidden">
              <AppImage
                src="/assets/images/elon_musk_portrait.png"
                alt="Elon Musk professional portrait, CEO of Tesla and SpaceX, in dark suit with confident expression"
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 340px"
                priority
              />
              {/* Gradient fade to the right on desktop, bottom on mobile */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#111111]/80 lg:hidden" />
              <div className="absolute inset-0 hidden lg:block bg-gradient-to-r from-transparent to-[#111111]/90" />
              {/* Verified badge overlay */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-accent/30 z-10">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#E31937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[10px] font-bold text-white tracking-widest uppercase">Verified</span>
              </div>
            </div>

            {/* Content — right side */}
            <div className="flex-1 p-8 sm:p-12 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-accent font-bold text-xs tracking-[0.25em] uppercase">Limited Appointments Available</span>
              </div>

              <h2 className="text-section-title font-extrabold tracking-tighter text-foreground mb-4">
                Book a Private Session{' '}
                <br className="hidden sm:block" />
                <span className="gradient-text-accent">with Elon Musk</span>
              </h2>

              <p className="text-muted-foreground text-base font-light max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                Discuss investment opportunities, the Tesla ecosystem, and the future of energy, robotics, and space in a private 30-minute session.
              </p>

              {/* Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {[
                  { label: 'Appointment Fee', value: '$50,000' },
                  { label: 'Session Length', value: '30 Minutes' },
                  { label: 'Format', value: 'In-Person / Virtual' },
                ]?.map((d) => (
                  <div key={d?.label} className="bg-muted/30 rounded-xl p-5 border border-border">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{d?.label}</div>
                    <div className="text-lg font-extrabold text-foreground">{d?.value}</div>
                  </div>
                ))}
              </div>

              <button
                className="inline-flex items-center gap-2 px-10 py-4 bg-accent text-accent-foreground font-extrabold rounded-xl btn-shimmer text-sm transition-all duration-300 hover:-translate-y-0.5 min-h-[52px]"
                style={{ boxShadow: '0 0 30px rgba(227,25,55,0.3)' }}
              >
                Apply for an Appointment
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}