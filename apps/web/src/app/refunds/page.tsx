import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Refund policy',
};

export default function RefundsPage() {
  return (
    <main className="deep-space-bg min-h-screen text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Sparkles className="h-4 w-4 text-white" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight gradient-text-premium">expressiveai.online</span>
          </div>
        </div>

        <article className="glass-card rounded-3xl border border-white/10 p-6 sm:p-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Billing</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Refund policy</h1>
          <p className="mt-3 text-sm text-slate-400">Last updated: September 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">1. Subscription charges</h2>
              <p>
                Subscription fees are billed in advance according to the billing cycle selected at checkout. Charges are non-refundable except where required by law or as described below.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">2. Usage-based credits</h2>
              <p>
                Credits purchased for usage-based access are generally consumed as you generate content. If a purchase was made in error or the service failed materially, credit disputes may be reviewed on a case-by-case basis.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">3. Cancellation</h2>
              <p>
                You may cancel a recurring subscription at any time from your account settings. Cancellation stops future billing, and access continues until the end of the current billing period unless otherwise stated.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">4. Refund requests</h2>
              <p>
                Refund requests may be considered for duplicate charges, unauthorized transactions, or service failures that materially prevent use of the platform. Requests should be sent to <a href="mailto:support@expressiveai.online" className="text-violet-300 underline">support@expressiveai.online</a>.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
