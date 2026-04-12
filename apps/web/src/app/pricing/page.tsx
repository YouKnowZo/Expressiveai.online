'use client';

import { motion } from 'framer-motion';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { Sparkles, Zap, Check } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { SiteHeader } from '@/components/SiteHeader';
import { apiUrl } from '@/lib/api';

export default function PricingPage() {
  const { isSignedIn, userId } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePurchase = async (planId: string) => {
    if (!isSignedIn) return;
    setLoadingPlan(planId);
    const toastId = toast.loading('Opening checkout…');
    try {
      const res = await fetch(apiUrl('/api/payments/create-checkout-session'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planId }),
      });
      const data = await res.json();
      if (data.url) {
        toast.success('Redirecting to secure checkout', { id: toastId });
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Could not start checkout', { id: toastId });
        setLoadingPlan(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error — try again shortly', { id: toastId });
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: 'starter_50',
      name: 'Starter',
      credits: 50,
      price: '$5',
      icon: Sparkles,
      features: ['50 generations', 'Standard quality', 'Standard queue', 'Watermark on export'],
    },
    {
      id: 'pro_200',
      name: 'Pro',
      credits: 200,
      price: '$15',
      icon: Zap,
      popular: true,
      features: ['200 generations', 'High quality', 'Priority queue', 'No watermark', 'Commercial rights'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col text-slate-900">
      <SiteHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
        >
          <p className="text-sm font-medium text-indigo-600 mb-2">Pricing</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">Simple, transparent credit packs</h1>
          <p className="text-slate-600">Buy what you need. Subscriptions on the homepage outline ongoing tiers; here you top up credits anytime.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className={`relative rounded-3xl p-8 border bg-white ${
                plan.popular
                  ? 'border-indigo-300 shadow-xl shadow-indigo-100 ring-1 ring-indigo-200/60'
                  : 'border-slate-200 shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-8">
                  <span className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                    Most popular
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`p-3 rounded-2xl ${
                    plan.popular ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <plan.icon className="w-8 h-8" aria-hidden />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{plan.name}</h2>
                  <p className="text-slate-500 text-sm">{plan.credits} credits</p>
                </div>
              </div>

              <div className="mb-8">
                <span className="text-5xl font-extrabold text-slate-900">{plan.price}</span>
                <span className="text-slate-500 ml-2">one-time</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-center gap-3 text-slate-700 text-sm">
                    <Check className="w-5 h-5 text-indigo-500 flex-shrink-0" aria-hidden />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => handlePurchase(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all disabled:opacity-50 ${
                    plan.popular
                      ? 'text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/25 hover:shadow-lg'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {loadingPlan === plan.id ? 'Processing…' : 'Buy credits'}
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="w-full py-3.5 rounded-xl font-semibold text-base border-2 border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    Sign in to purchase
                  </button>
                </SignInButton>
              )}
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500 mt-12">
          Questions?{' '}
          <Link href="/" className="text-indigo-600 font-medium hover:underline">
            Back to product
          </Link>
        </p>
      </main>
    </div>
  );
}
