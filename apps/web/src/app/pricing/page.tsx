'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, SignInButton } from '@clerk/nextjs';
import {
  Sparkles, Zap, Crown, Check, ChevronDown,
  ArrowRight, ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { apiUrl } from '@/lib/api';
import { SiteHeader } from '@/components/SiteHeader';

// ---------------------------------------------------------------------------
// Pricing data
// ---------------------------------------------------------------------------
const PLANS = [
  {
    id:       'free',
    name:     'Free',
    price:    '$0',
    period:   'forever',
    icon:     Zap,
    credits:  5,
    badge:    null,
    highlight: false,
    cta:      'Get started free',
    features: [
      '5 starter credits',
      'Up to 10-second clips',
      'Standard queue',
      'Forensic watermarking',
      'Community gallery access',
    ],
    missing: [],
  },
  {
    id:       'starter_50',
    name:     'Starter',
    price:    '$5',
    period:   'one-time',
    icon:     Sparkles,
    credits:  50,
    badge:    null,
    highlight: true,
    cta:      'Buy 50 credits',
    features: [
      '50 generation credits',
      'One-time payment',
      'Credits added after payment confirmation',
      'Up to 10-second clips',
    ],
    missing: [],
  },
  {
    id:       'pro_200',
    name:     'Pro',
    price:    '$15',
    period:   'one-time',
    icon:     Sparkles,
    credits:  200,
    badge:    null,
    highlight: false,
    cta:      'Buy 200 credits',
    features: [
      '200 generation credits',
      'One-time payment',
      'Up to 30-second clips',
    ],
    missing: [],
  },
  {
    id:       'creator_1000',
    name:     'Creator',
    price:    '$49',
    period:   'one-time',
    icon:     Crown,
    credits:  1000,
    badge:    'Best value',
    highlight: false,
    cta:      'Get Creator',
    features: [
      '1,000 generation credits',
      'One-time payment',
      'Unlocks Creator · clips up to 5 minutes*',
      'Long clips extend or repeat a generated scene',
    ],
    missing: [],
  },
] as const;

type PlanId = typeof PLANS[number]['id'];

// ---------------------------------------------------------------------------
// FAQ data
// ---------------------------------------------------------------------------
const FAQ = [
  {
    q: 'What counts as one credit?',
    a: 'Each video generation request currently uses one credit, regardless of selected duration. Longer clips may extend or repeat a generated scene; the requested runtime does not guarantee continuous unique motion.',
  },
  {
    q: 'Can I use generated videos commercially?',
    a: 'Rights can depend on your plan, model provider terms, and applicable law. Review the Terms of Service and the provider’s terms before commercial use.',
  },
  {
    q: 'Do credit packs renew?',
    a: 'No. The credit packs shown are one-time purchases, not subscriptions. Generation availability and queue time may vary.',
  },
  {
    q: 'How do plan limits work?',
    a: 'Free and Starter accounts can generate up to 10 seconds, Pro up to 30 seconds, and Creator up to five minutes. Creator-length outputs may repeat or extend a generated scene rather than create continuous novel footage.',
  },
  {
    q: 'How does forensic watermarking work?',
    a: 'Generated exports include provenance metadata. Editing or re-encoding may remove it, and it is not a guarantee of ownership, authenticity, or legal protection.',
  },
  {
    q: 'How do longer video durations work?',
    a: 'Longer clips may extend or repeat a short generated scene; the requested runtime does not guarantee continuous unique motion. See our disclaimer for details.',
  },
  {
    q: 'Are credit packs subscriptions?',
    a: 'No. The credit packs currently offered are one-time purchases; they do not renew automatically. Pro/Creator access remains on your account tier after the one-time upgrade.',
  },
  {
    q: 'How do I request a refund?',
    a: 'See the Refund Policy for eligibility and contact support with your purchase details. Refunds are reviewed under that policy and are not automatic.',
  },
];

// ---------------------------------------------------------------------------
// FAQ accordion item
// ---------------------------------------------------------------------------
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-sm font-semibold text-slate-200">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm text-slate-400 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function PricingPage() {
  const { isSignedIn, userId, getToken } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePurchase = async (planId: string) => {
    if (!isSignedIn || !userId) return;
    setLoadingPlan(planId);
    const toastId = toast.loading('Opening secure checkout…');

    try {
      const res = await fetch(apiUrl('/api/payments/create-checkout-session'), {
        method:  'POST',        headers:  { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken() ?? ''}` },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();

      if (data.url) {
        toast.success('Redirecting to checkout…', { id: toastId });
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Could not start checkout');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error — try again shortly', { id: toastId });
      setLoadingPlan(null);
    }
  };

  return (
    <div className="deep-space-bg min-h-screen flex flex-col text-slate-100">

      <SiteHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-xs font-semibold text-violet-200 mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Simple, transparent pricing
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Create more. Pay{' '}
            <span className="gradient-text-premium">less.</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Start with five free credits, then buy additional credits as you need them. Credit packs are one-time purchases, not subscriptions.
          </p>
        </motion.div>

        {/* ── Pricing cards ── */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
          {PLANS.map((plan, i) => {
            const Icon      = plan.icon;
            const isLoading = loadingPlan === plan.id;
            const isFree    = plan.id === 'free';

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`relative rounded-3xl p-8 flex flex-col ${
                  plan.highlight
                    ? 'pricing-glow-pro glass-card'
                    : 'glass-card'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                        : 'bg-fuchsia-600 text-white'
                    }`}>
                      {plan.badge === 'Best value' && <Zap className="w-3 h-3" />}
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                    plan.highlight ? 'bg-indigo-500/20' : 'bg-white/[0.06]'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      plan.highlight ? 'text-indigo-400' : 'text-slate-400'
                    }`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                    <p className="text-xs text-slate-400">
                      {plan.credits !== null ? `${plan.credits} credits` : 'No credits'}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <span className="text-5xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-slate-400 ml-2 text-sm">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      {feat}
                    </li>
                  ))}
                  {plan.missing?.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-600 line-through">
                      <Check className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isFree ? (
                  isSignedIn ? (
                    <Link
                      href="/dashboard"
                      className="w-full py-3.5 rounded-xl font-semibold text-sm text-center border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      Go to Studio <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <SignInButton mode="modal">
                      <button
                        type="button"
                        className="w-full py-3.5 rounded-xl font-semibold text-sm border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        {plan.cta}
                      </button>
                    </SignInButton>
                  )
                ) : isSignedIn ? (
                  <button
                    type="button"
                    onClick={() => handlePurchase(plan.id)}
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      plan.highlight
                        ? 'text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500'
                        : 'text-white bg-white/10 border border-white/10 hover:bg-white/15'
                    }`}
                  >
                    {isLoading ? 'Redirecting…' : plan.cta}
                  </button>
                ) : (
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                        plan.highlight
                          ? 'text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25'
                          : 'text-white bg-white/10 border border-white/10 hover:bg-white/15'
                      }`}
                    >
                      Sign in to {plan.cta.toLowerCase()}
                    </button>
                  </SignInButton>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* ── Trust strip ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 mb-20 text-sm text-slate-500"
        >
          {[
            { icon: ShieldCheck, text: 'Checkout powered by Stripe' },
            { icon: Zap,         text: 'Credit packs are one-time purchases' },
            { icon: ArrowRight,  text: 'Refund policy shown before support contact' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-violet-400" />
              <span>{text}</span>
            </div>
          ))}
        </motion.div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>

          <p className="text-center text-slate-500 text-sm mt-10">
            Still have questions?{' '}
            <a
              href="mailto:support@expressiveai.online"
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              Contact support
            </a>
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.07] py-6 mt-16">
        <p className="mx-auto max-w-7xl px-4 pb-4 text-center text-xs text-slate-500">Video generation uses AI. Outputs may contain artifacts; longer clips may repeat or extend generated scenes. <Link href="/disclaimer" className="text-violet-300 underline underline-offset-2">Read the disclaimer.</Link></p>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} ExpressiveAI.online</span>
          <div className="flex items-center gap-4">
            <Link href="/gallery"   className="hover:text-slate-300 transition-colors">Gallery</Link>
            <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
