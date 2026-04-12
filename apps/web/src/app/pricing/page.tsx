'use client';

import { motion } from 'framer-motion';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { Sparkles, Zap, Check } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PricingPage() {
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePurchase = async (planId: string) => {
    if (!isSignedIn) return;
    setLoadingPlan(planId);
    try {
      const res = await fetch('http://localhost:3001/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
        setLoadingPlan(null);
      }
    } catch (err) {
      console.error(err);
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
      features: ['50 Video Generations', 'Standard Quality', 'Standard Queue', 'Watermarked'],
    },
    {
      id: 'pro_200',
      name: 'Pro',
      credits: 200,
      price: '$15',
      icon: Zap,
      popular: true,
      features: ['200 Video Generations', 'High Quality 4K', 'Priority Queue', 'No Watermark', 'Commercial Rights'],
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
             expressiveai.online
          </Link>
          <div className="flex items-center gap-4">
             <Link href="/gallery" className="text-gray-600 hover:text-gray-900 transition">Gallery</Link>
             <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition">Dashboard</Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-24 pb-16 px-6 max-w-7xl mx-auto text-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-16">
            Buy exactly what you need. No monthly subscriptions required.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative bg-white rounded-3xl p-8 border ${plan.popular ? 'border-indigo-500 shadow-indigo-100 shadow-2xl' : 'border-gray-200 shadow-xl'}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-8 transform -translate-y-1/2">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold tracking-wide">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-2xl ${plan.popular ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                  <plan.icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-gray-500">{plan.credits} Credits</p>
                </div>
              </div>
              
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                <span className="text-gray-500 ml-2">one-time</span>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {isSignedIn ? (
                <button
                  onClick={() => handlePurchase(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg'
                      : 'bg-black text-white hover:bg-gray-800'
                  } disabled:opacity-50`}
                >
                  {loadingPlan === plan.id ? 'Processing...' : 'Buy Credits'}
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className="w-full py-4 rounded-xl font-bold text-lg border-2 border-gray-200 text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all">
                    Sign in to Purchase
                  </button>
                </SignInButton>
              )}
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
