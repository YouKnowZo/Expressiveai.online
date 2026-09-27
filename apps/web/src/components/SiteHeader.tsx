'use client';

import Link from 'next/link';
import { useAuth, SignInButton, UserButton } from '@clerk/nextjs';
import { Sparkles, LogIn, Menu, X } from 'lucide-react';
import { useState } from 'react';

const nav = [
  { href: '/#generator', label: 'Studio' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#security', label: 'Security' },
];

export function SiteHeader() {
  const { isSignedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0a0c13]/80 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/35 transition-shadow">
            <Sparkles className="w-4 h-4 text-white" aria-hidden />
          </span>
          <span className="text-base sm:text-lg font-semibold tracking-tight gradient-text-premium truncate">
            expressiveai.online
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm font-medium text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex text-sm font-medium text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <SignInButton mode="modal">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-full btn-premium"
              >
                <LogIn className="w-4 h-4" aria-hidden />
                Sign in
              </button>
            </SignInButton>
          )}
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="md:hidden inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-300" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && <nav className="absolute inset-x-0 top-[72px] md:hidden border-y border-white/[0.08] bg-[#0a0c13]/95 px-4 py-3 shadow-2xl backdrop-blur-2xl" aria-label="Mobile main">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {nav.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium text-slate-300 hover:bg-white/[0.06]">{item.label}</Link>)}
            {isSignedIn && <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium text-slate-300 hover:bg-white/[0.06]">Dashboard</Link>}
          </div>
        </nav>}
      </div>
    </header>
  );
}
