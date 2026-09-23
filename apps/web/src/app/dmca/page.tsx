import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'DMCA / Copyright policy',
};

export default function DmcaPage() {
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Rights</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">DMCA / Copyright policy</h1>
          <p className="mt-3 text-sm text-slate-400">Last updated: September 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Copyright ownership</h2>
              <p>
                Users retain ownership of the content they upload or provide as input, subject to any rights granted to us for operation, moderation, and service delivery. ExpressiveAI retains ownership of the platform, software, interface, and generated service tooling.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Notice of infringement</h2>
              <p>
                If you believe that content accessible through the platform infringes your copyright, you may send a written notice including identification of the copyrighted work, the location of the allegedly infringing material, and contact details for the complainant.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Counter-notice</h2>
              <p>
                If content is removed and you believe the removal was in error, you may submit a counter-notice with the required information for review and possible reinstatement.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Contact</h2>
              <p>
                Please send copyright and takedown requests to <a href="mailto:legal@expressiveai.online" className="text-violet-300 underline">legal@expressiveai.online</a>.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
