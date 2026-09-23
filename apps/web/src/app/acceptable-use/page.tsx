import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Acceptable Use Policy',
};

export default function AcceptableUsePage() {
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Policy</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Acceptable Use Policy</h1>
          <p className="mt-3 text-sm text-slate-400">Last updated: September 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Use of the platform</h2>
              <p>
                You may use ExpressiveAI only for lawful purposes and in a manner consistent with these policies and applicable law. You may not use the service to create or distribute abusive, harmful, deceptive, or unlawful content.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Prohibited activity</h2>
              <p>
                Prohibited activities include bypassing access controls, exploiting vulnerabilities, mass scraping, manipulating billing, unauthorized automated use, fraud, impersonation, and misuse of AI outputs for deception or harm.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Enforcement</h2>
              <p>
                We may limit, suspend, or terminate access when this policy is violated. Where required, we may report illegal activity to the appropriate authorities or take technical measures to protect the security of the service.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
