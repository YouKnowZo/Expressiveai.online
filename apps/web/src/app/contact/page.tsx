import Link from 'next/link';
import { ArrowLeft, Mail, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Contact support',
};

export default function ContactPage() {
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Support</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Contact us</h1>

          <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <div className="flex items-center gap-3 text-white">
                <Mail className="h-5 w-5 text-violet-300" />
                <span className="font-semibold">Email support</span>
              </div>
              <a href="mailto:support@expressiveai.online" className="mt-3 inline-block text-violet-300 underline underline-offset-2">
                support@expressiveai.online
              </a>
            </div>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">What to include</h2>
              <p>
                When contacting support, include your account email, the issue you are experiencing, any error message, and the approximate time the problem happened.
                This helps us respond faster and resolve access, billing, content, or account issues accurately.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Typical response time</h2>
              <p>
                We aim to respond to support requests within 1–2 business days, although urgent account security issues may receive a faster response.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
