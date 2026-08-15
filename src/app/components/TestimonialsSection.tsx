import React from 'react';
import AppImage from '@/components/ui/AppImage';

const testimonials = [
  {
    name: 'Robert Wilson',
    role: 'Investment Manager',
    location: 'London, UK',
    quote: 'The real-time pricing and secure marketplace made trading Tesla inventory seamless. Highly recommend.',
    // Male avatar – pravatar ID 11 (middle-aged professional male)
    avatar: 'https://i.pravatar.cc/150?img=11',
    alt: 'Robert Wilson professional headshot, male, business attire, neutral background',
  },
  {
    name: 'Jennifer Taylor',
    role: 'Tech Entrepreneur',
    location: 'New York, US',
    quote: 'Early access to robotics listings has been a game changer for my portfolio.',
    // Female avatar – pravatar ID 47 (young professional female)
    avatar: 'https://i.pravatar.cc/150?img=47',
    alt: 'Jennifer Taylor professional headshot, female, business attire, neutral background',
  },
  {
    name: 'Paul Davies',
    role: 'Energy Consultant',
    location: 'Manchester, UK',
    quote: 'From Powerwall to vehicles, everything is verified and the support is outstanding.',
    // Male avatar – pravatar ID 13 (mature professional male)
    avatar: 'https://i.pravatar.cc/150?img=13',
    alt: 'Paul Davies professional headshot, male, smart casual attire, neutral background',
  },
  {
    name: 'Amanda Stewart',
    role: 'Business Owner',
    location: 'California, US',
    quote: 'Zero friction trading experience. Exactly what the market needed for Tesla ecosystem assets.',
    // Female avatar – pravatar ID 44 (professional female, business attire)
    avatar: 'https://i.pravatar.cc/150?img=44',
    alt: 'Amanda Stewart professional headshot, female, business attire, office background',
  },
  {
    name: 'Christopher Brown',
    role: 'Financial Advisor',
    location: 'Edinburgh, UK',
    quote: 'Professional, secure, and the live market data is incredibly useful for timing entries.',
    // Male avatar – pravatar ID 15 (professional male, formal)
    avatar: 'https://i.pravatar.cc/150?img=15',
    alt: 'Christopher Brown professional headshot, male, formal attire, neutral background',
  },
  {
    name: 'Michelle Garcia',
    role: 'Property Developer',
    location: 'Texas, US',
    quote: 'The VIP membership and private sessions opened doors I didn\'t expect. Worth every penny.',
    // Female avatar – pravatar ID 56 (professional female, smart attire)
    avatar: 'https://i.pravatar.cc/150?img=56',
    alt: 'Michelle Garcia professional headshot, female, smart attire, neutral background',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 section-reveal">
          <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase mb-3 block">Testimonials</span>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h2 className="text-section-title font-extrabold tracking-tighter text-foreground">
              Trusted by Traders{' '}
              <span className="gradient-text-primary">Worldwide</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Join thousands of satisfied users from the UK, US, and beyond
            </p>
          </div>
        </div>

        {/* Horizontal scroll */}
        <div className="flex overflow-x-auto gap-5 pb-6 no-scrollbar snap-x snap-mandatory">
          {testimonials?.map((t, idx) => (
            <article
              key={t?.name}
              className="min-w-[300px] sm:min-w-[360px] glass-card glass-card-hover rounded-2xl p-7 snap-center shrink-0 section-reveal"
              style={{ transitionDelay: `${idx * 80}ms` }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 })?.map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-muted-foreground text-sm leading-relaxed italic mb-6">
                &ldquo;{t?.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border shrink-0">
                  <AppImage
                    src={t?.avatar}
                    alt={t?.alt}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">{t?.name}</div>
                  <div className="text-xs text-muted-foreground">{t?.role} · {t?.location}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}