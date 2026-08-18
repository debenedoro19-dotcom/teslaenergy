'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const navLinks = [
  { label: 'Vehicles', href: '#inventory' },
  { label: 'Energy', href: '#market' },
  { label: 'Invest', href: '#invest' },
  { label: 'Giveaways', href: '#giveaways' },
  { label: 'VIP', href: '#vip' },
  { label: 'News', href: '/news' },
  { label: 'Account', href: '/account' },
  { label: 'Deposit', href: '/account/deposit' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase?.auth?.getUser()?.then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
    const { data: { subscription } } = supabase?.auth?.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#080808]/96 backdrop-blur-2xl shadow-[0_1px_0_rgba(227,25,55,0.15),0_4px_32px_rgba(0,0,0,0.6)]'
            : 'bg-transparent'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Premium top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group" aria-label="Trade Tesla home">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:bg-primary/35 transition-all duration-300" />
              <svg width="28" height="28" viewBox="0 0 342 512" fill="currentColor" className="text-primary relative z-10 drop-shadow-[0_0_8px_rgba(227,25,55,0.6)]" aria-hidden="true">
                <path d="M0 57.3C0 57.3 57.3 0 171 0s171 57.3 171 57.3L285 85.5s-28.5-28.5-114-28.5S57 85.5 57 85.5L0 57.3zM171 512L57 85.5s28.5 28.5 114 28.5 114-28.5 114-28.5L171 512z"/>
              </svg>
            </div>
            <span className="text-white font-bold text-base tracking-widest uppercase">
              Trade <span className="text-primary" style={{ textShadow: '0 0 12px rgba(227,25,55,0.5)' }}>Tesla</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0">
            {navLinks?.map((link) => (
              link?.href?.startsWith('/') ? (
                <Link
                  key={link?.label}
                  href={link?.href}
                  className="px-4 py-2 text-xs font-semibold text-[#888888] hover:text-white transition-colors tracking-widest uppercase relative group"
                >
                  {link?.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-primary group-hover:w-4 transition-all duration-300" />
                </Link>
              ) : (
                <a
                  key={link?.label}
                  href={link?.href}
                  className="px-4 py-2 text-xs font-semibold text-[#888888] hover:text-white transition-colors tracking-widest uppercase relative group"
                >
                  {link?.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-primary group-hover:w-4 transition-all duration-300" />
                </a>
              )
            ))}
          </div>

          {/* Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {!isLoggedIn && (
              <Link
                href="/login"
                className="px-5 py-2 text-xs font-semibold text-white border border-[#2A2A2A] rounded hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 tracking-widest uppercase"
              >
                Sign In
              </Link>
            )}
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-5 py-2 text-xs font-bold bg-primary text-white rounded btn-shimmer hover:bg-accent transition-all duration-300 tracking-widest uppercase"
                style={{ boxShadow: '0 0 20px rgba(227,25,55,0.4), 0 2px 8px rgba(0,0,0,0.4)' }}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/register"
                className="px-5 py-2 text-xs font-bold bg-primary text-white rounded btn-shimmer hover:bg-accent transition-all duration-300 tracking-widest uppercase"
                style={{ boxShadow: '0 0 20px rgba(227,25,55,0.4), 0 2px 8px rgba(0,0,0,0.4)' }}
              >
                Get Started
              </Link>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span className={`w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </nav>
      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute inset-0 bg-[#0A0A0A]/98 backdrop-blur-xl" onClick={() => setMenuOpen(false)} />
        <div className={`absolute top-16 left-0 right-0 bg-[#080808] border-b border-[#1A1A1A] p-6 transition-transform duration-300 shadow-[0_8px_40px_rgba(0,0,0,0.8)] ${menuOpen ? 'translate-y-0' : '-translate-y-4'}`}>
          <div className="flex flex-col gap-1 mb-6">
            {navLinks?.map((link) => (
              link?.href?.startsWith('/') ? (
                <Link
                  key={link?.label}
                  href={link?.href}
                  className="px-4 py-3 text-sm font-semibold text-[#888888] hover:text-white hover:bg-[#111111] rounded transition-colors tracking-widest uppercase min-h-[44px] flex items-center"
                  onClick={() => setMenuOpen(false)}
                >
                  {link?.label}
                </Link>
              ) : (
                <a
                  key={link?.label}
                  href={link?.href}
                  className="px-4 py-3 text-sm font-semibold text-[#888888] hover:text-white hover:bg-[#111111] rounded transition-colors tracking-widest uppercase min-h-[44px] flex items-center"
                  onClick={() => setMenuOpen(false)}
                >
                  {link?.label}
                </a>
              )
            ))}
          </div>
          <div className="flex flex-col gap-3 pt-4 border-t border-[#1A1A1A]">
            {!isLoggedIn && (
              <Link href="/login" className="w-full py-3 text-center text-xs font-semibold text-white border border-[#2A2A2A] rounded tracking-widest uppercase min-h-[44px] flex items-center justify-center" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
            )}
            {isLoggedIn ? (
              <Link href="/dashboard" className="w-full py-3 text-center text-xs font-bold bg-primary text-white rounded tracking-widest uppercase min-h-[44px] flex items-center justify-center" style={{ boxShadow: '0 0 20px rgba(227,25,55,0.3)' }} onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
            ) : (
              <Link href="/register" className="w-full py-3 text-center text-xs font-bold bg-primary text-white rounded tracking-widest uppercase min-h-[44px] flex items-center justify-center" style={{ boxShadow: '0 0 20px rgba(227,25,55,0.3)' }} onClick={() => setMenuOpen(false)}>
                Get Started
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}