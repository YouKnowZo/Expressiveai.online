import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Privacy</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-400">Last updated: September 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">1. Information we collect</h2>
              <p>
                We may collect account information, such as name, email address, authentication details, usage activity, payment records,
                generated content metadata, IP address, browser information, device information, and communication preferences necessary to operate and improve the service.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">2. How we use information</h2>
              <p>
                We use information to provide, secure, personalize, and improve the service; troubleshoot issues; prevent fraud; protect platform integrity;
                fulfill billing obligations; maintain support communications; and comply with applicable legal obligations.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">3. Sharing and disclosure</h2>
              <p>
                We do not sell personal data. We may share data with trusted service providers that help us operate the platform, such as hosting,
                email delivery, payments, analytics, security, and customer support. We may also disclose information when required by law or to protect users and the platform.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">4. Cookies and tracking</h2>
              <p>
                We may use cookies and similar technologies for account management, analytics, and personalization. You can manage browser cookie settings,
                but disabling cookies may affect site functionality and account experience.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">5. Data retention</h2>
              <p>
                We retain personal data only for as long as necessary to fulfill the purpose for which it was collected, satisfy legal requirements,
                resolve disputes, and enforce agreements. Generated content and account records may be kept for operational and safety reasons.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">6. Your rights</h2>
              <p>
                Depending on your location, you may have rights to access, correct, delete, or restrict processing of your personal data, subject to legal exceptions.
                You may also object to direct marketing or withdraw consent where consent is used as the legal basis for processing.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">7. Security</h2>
              <p>
                We implement reasonable technical and organizational safeguards to protect personal data. However, no system is completely secure,
                and we cannot guarantee absolute protection against unauthorized access or cybersecurity events.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">8. International transfers</h2>
              <p>
                If your data is transferred outside your home country, we will take appropriate steps to ensure the transfer is lawful and protected by suitable safeguards.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">9. Contact</h2>
              <p>
                For questions, privacy requests, or concerns, please contact <a href="mailto:privacy@expressiveai.online" className="text-violet-300 underline">privacy@expressiveai.online</a>.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
