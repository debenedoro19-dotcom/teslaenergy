'use client';
import React, { useState, useEffect, memo } from 'react';

interface Giveaway {
  id: number;
  title: string;
  description: string;
  prize: string;
  ends: string;
  entryFee: string;
  entries: number;
  maxEntries: number;
  badge: string;
}

const giveaways: Giveaway[] = [
  {
    id: 1,
    title: 'Win a 2025 Model 3 Long Range',
    description: '2025 Tesla Model 3 Long Range AWD. One winner selected after campaign ends. Includes standard delivery within the continental US.',
    prize: '2025 Tesla Model 3 Long Range AWD',
    ends: '2026-12-31',
    entryFee: 'Free with any inventory inquiry',
    entries: 1247,
    maxEntries: 5000,
    badge: 'FREE ENTRY',
  },
  {
    id: 2,
    title: 'Cybertruck Experience Weekend',
    description: 'Win a full weekend with a Cybertruck Foundation Series plus a $2,000 platform credit toward any purchase.',
    prize: 'Cybertruck Foundation Series + $2,000 credit',
    ends: '2026-10-15',
    entryFee: '$25 entry',
    entries: 683,
    maxEntries: 2000,
    badge: '$25 ENTRY',
  },
];

interface TimeLeft { d: number; h: number; m: number; s: number }

function calcTimeLeft(endDate: string): TimeLeft {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

const CountdownTimer = memo(function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    setTimeLeft(calcTimeLeft(endDate));
    const id = setInterval(() => setTimeLeft(calcTimeLeft(endDate)), 1000);
    return () => clearInterval(id);
  }, [endDate]);

  const pads = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex gap-3" aria-label="Countdown timer">
      {[{ v: timeLeft.d, l: 'Days' }, { v: timeLeft.h, l: 'Hrs' }, { v: timeLeft.m, l: 'Min' }, { v: timeLeft.s, l: 'Sec' }].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center">
          <span className="text-2xl font-extrabold text-primary tabular-nums">{pads(v)}</span>
          <span className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase">{l}</span>
        </div>
      ))}
    </div>
  );
});

const GiveawayCard = memo(function GiveawayCard({ g, idx }: { g: Giveaway; idx: number }) {
  const pct = Math.round((g.entries / g.maxEntries) * 100);
  return (
    <article
      className="glass-card glass-card-hover rounded-2xl p-8 section-reveal relative overflow-hidden"
      style={{ transitionDelay: `${idx * 100}ms` }}
    >
      <div className="absolute top-0 right-0 w-48 h-48 blob-accent opacity-30 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4 gap-4">
          <h3 className="text-xl font-extrabold text-foreground leading-tight">{g.title}</h3>
          <span className="shrink-0 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-accent/15 text-accent border border-accent/30">
            {g.badge}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{g.description}</p>
        <div className="mb-6">
          <div className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-2">Ends {g.ends}</div>
          <CountdownTimer endDate={g.ends} />
        </div>
        <div className="mb-6">
          <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>{g.entries.toLocaleString()} entries</span>
            <span>{g.maxEntries.toLocaleString()} max</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={g.entries}
              aria-valuemin={0}
              aria-valuemax={g.maxEntries}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">{pct}% filled · {g.entryFee}</div>
        </div>
        <button className="w-full py-3.5 bg-accent text-accent-foreground font-bold rounded-xl btn-shimmer text-sm transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 min-h-[48px]">
          Enter Giveaway →
        </button>
      </div>
    </article>
  );
});

export default function GiveawaysSection() {
  return (
    <section id="giveaways" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 section-reveal">
          <span className="text-xs font-bold text-accent tracking-[0.25em] uppercase mb-3 block">Tesla Giveaways</span>
          <h2 className="text-section-title font-extrabold tracking-tighter text-foreground">
            Win Vehicles &{' '}
            <span className="gradient-text-accent">Exclusive Experiences</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {giveaways.map((g, idx) => (
            <GiveawayCard key={g.id} g={g} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}