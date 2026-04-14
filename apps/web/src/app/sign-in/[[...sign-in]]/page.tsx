import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Sign in',
};

export default function SignInPage() {
  return (
    <div className="deep-space-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Logo mark */}
      <Link href="/" className="flex items-center gap-2.5 mb-10 group">
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Sparkles className="w-5 h-5 text-white" aria-hidden />
        </span>
        <span className="text-lg font-bold tracking-tight gradient-text-premium">
          expressiveai.online
        </span>
      </Link>

      {/* Clerk component — appearance overridden globally in layout.tsx */}
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
      />

      <p className="mt-8 text-xs text-slate-600 text-center">
        By signing in you agree to our{' '}
        <Link href="/#terms" className="text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2">
          Terms of Service
        </Link>
        {' '}and{' '}
        <Link href="/#privacy" className="text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
