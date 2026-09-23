import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Disclaimer',
};

export default function DisclaimerPage() {
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Legal</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Disclaimers</h1>
          <p className="mt-3 text-sm text-slate-400">Last updated: September 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">1. Service provided as-is</h2>
              <p>
                ExpressiveAI provides AI generation tools on an “as is” and “as available” basis. We do not promise uninterrupted service,
                error-free output, or any particular outcome from the use of our service.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">2. No guarantee of accuracy or fitness</h2>
              <p>
                AI-generated content may contain inaccuracies, omissions, or stylistic artifacts. You acknowledge that output may not be suitable
                for legal, medical, financial, safety-critical, or compliance-sensitive purposes without independent review.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">3. User responsibility</h2>
              <p>
                You are solely responsible for the content you submit, the output you generate, and the way you use or distribute those results.
                You agree to review and verify any content before publishing, sharing, selling, or relying on it.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">4. Third-party providers</h2>
              <p>
                We may rely on third-party infrastructure, model providers, and services to process requests. While we aim to maintain reliable service,
                outages, restrictions, or limitations from those providers may affect the performance or availability of the platform.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">5. No professional advice</h2>
              <p>
                The platform is not a substitute for professional legal, financial, creative, medical, or technical advice. Any output should be reviewed by qualified professionals where required.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
