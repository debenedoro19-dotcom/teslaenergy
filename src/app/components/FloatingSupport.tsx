'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function FloatingSupport() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat bubble */}
      {chatOpen && (
        <div className="glass-card rounded-2xl p-5 w-72 border border-border shadow-2xl animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-bold text-foreground">Tesla Trade Support</span>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Hi! How can we help you today?</p>
          <div className="space-y-2">
            <Link
              href="/support"
              onClick={() => setChatOpen(false)}
              className="flex items-center gap-2 w-full py-2.5 px-4 bg-primary text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity justify-center min-h-[44px]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Submit a Support Ticket
            </Link>
            <Link
              href="/support"
              onClick={() => setChatOpen(false)}
              className="flex items-center gap-2 w-full py-2 px-4 bg-card border border-border text-muted-foreground font-medium rounded-xl text-sm hover:text-foreground hover:border-muted transition-colors justify-center min-h-[40px]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              Track My Tickets
            </Link>
          </div>
        </div>
      )}

      {/* Live chat button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-2xl hover:opacity-90 transition-all duration-300 hover:-translate-y-0.5"
        aria-label="Open support chat"
        style={{ boxShadow: '0 4px 20px rgba(0,212,255,0.35)' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>
  );
}