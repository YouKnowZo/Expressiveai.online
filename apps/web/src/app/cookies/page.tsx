import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Cookie Policy',
};

export default function CookiesPage() {
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
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Cookie Policy</h1>
          <p className="mt-3 text-sm text-slate-400">Last updated: September 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">What are cookies?</h2>
              <p>
                Cookies are small text files stored on your device to help websites remember settings, recognize returning users, and understand usage patterns.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">How we use them</h2>
              <p>
                We use cookies to keep you signed in, maintain your session, analyze product usage, improve performance, detect abuse, and improve the user experience.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Types of cookies</h2>
              <p>
                Essential cookies enable core functionality, analytics cookies help us understand traffic and usage trends, and preference cookies remember settings such as theme or language.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Your choices</h2>
              <p>
                You can disable cookies in your browser settings, though some site features may not work as intended. Consent preferences may also be managed from our website if available.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
