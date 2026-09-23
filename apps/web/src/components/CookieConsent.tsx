'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'expressiveai-cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = window.localStorage.getItem(STORAGE_KEY);
    setVisible(!consent);
  }, []);

  const accept = () => {
    window.localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-violet-500/30 bg-slate-950/95 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl md:left-auto md:right-6 md:max-w-md">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-violet-400" aria-hidden />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">We use cookies</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            We use cookies to keep your session secure, remember preferences, and improve the experience. See our{' '}
            <Link href="/cookies" className="text-violet-300 underline underline-offset-2">
              Cookie Policy
            </Link>
            .
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={accept}
              className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Accept
            </button>
            <Link href="/privacy" className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-200">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
