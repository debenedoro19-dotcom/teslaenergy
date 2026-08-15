import React from 'react';
import Link from 'next/link';

const footerLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Invest', href: '#invest' },
  { label: 'News', href: '/news' },
  { label: 'Referral', href: '/referral' },
  { label: 'Login', href: '/login' },
  { label: 'Sign Up', href: '/register' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Support', href: '/support' },
];

const socialLinks = [
  {
    label: 'X (Twitter)',
    href: '#',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    label: 'Telegram',
    href: '#',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: '#',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: '#',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#1A1A1A] py-14 px-6 lg:px-8" style={{ background: 'linear-gradient(to bottom, #0A0A0A, #060606)' }}>
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0" aria-label="Trade Tesla home">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/15 rounded-full blur-sm group-hover:bg-primary/25 transition-all duration-300" />
              <svg width="22" height="22" viewBox="0 0 342 512" fill="currentColor" className="text-primary relative z-10 drop-shadow-[0_0_6px_rgba(227,25,55,0.5)]" aria-hidden="true">
                <path d="M0 57.3C0 57.3 57.3 0 171 0s171 57.3 171 57.3L285 85.5s-28.5-28.5-114-28.5S57 85.5 57 85.5L0 57.3zM171 512L57 85.5s28.5 28.5 114 28.5 114-28.5 114-28.5L171 512z"/>
              </svg>
            </div>
            <span className="text-white font-bold text-sm tracking-widest uppercase">
              Trade <span className="text-primary" style={{ textShadow: '0 0 10px rgba(227,25,55,0.4)' }}>Tesla</span>
            </span>
          </Link>

          {/* Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks?.map((link) => (
              link?.href?.startsWith('/') ? (
                <Link key={link?.label} href={link?.href} className="text-xs font-medium text-[#555555] hover:text-white transition-colors tracking-wider uppercase">
                  {link?.label}
                </Link>
              ) : (
                <a key={link?.label} href={link?.href} className="text-xs font-medium text-[#555555] hover:text-white transition-colors tracking-wider uppercase">
                  {link?.label}
                </a>
              )
            ))}
          </div>
        </div>

        <div className="tesla-divider mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Copyright */}
          <p className="text-xs text-[#444444] tracking-wide">
            © 2026 Trade Tesla. All Rights Reserved.
          </p>

          {/* Social Icons */}
          <div className="flex items-center gap-2">
            {socialLinks?.map((social) => (
              <span
                key={social?.label}
                aria-label={social?.label}
                role="img"
                className="w-8 h-8 flex items-center justify-center rounded border border-[#222222] text-[#555555] hover:text-white hover:border-primary/40 hover:bg-primary/8 transition-all duration-300 cursor-default select-none"
              >
                {social?.icon}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}