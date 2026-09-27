import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast';
import { CookieConsent } from '../components/CookieConsent';
import './globals.css';

// ---------------------------------------------------------------------------
// Font
// ---------------------------------------------------------------------------
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// ---------------------------------------------------------------------------
// Viewport (separate export required in Next.js 14)
// ---------------------------------------------------------------------------
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#090b15' },
    { media: '(prefers-color-scheme: light)', color: '#090b15' },
  ],
  colorScheme: 'dark',
};

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('NEXT_PUBLIC_APP_URL is required in production. Set it in the deployment environment or apps/web/.env.example.');
      })()
    : 'https://expressiveai.online');
const SITE_NAME = 'ExpressiveAI';
const TITLE     = 'ExpressiveAI — Create AI Videos Without Boundaries';
const DESCRIPTION =
  'Create AI-generated videos from a prompt, with clear duration controls, responsible-use guidance, and a personal video library. ' +
  'Start creating with ExpressiveAI.';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: DESCRIPTION,

  // ── Canonical & robots ───────────────────────────────────────────────
  alternates: { canonical: '/' },
  robots: {
    index:          true,
    follow:         true,
    googleBot: {
      index:               true,
      follow:              true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },

  // ── OpenGraph ────────────────────────────────────────────────────────
  openGraph: {
    type:        'website',
    locale:      'en_US',
    url:         APP_URL,
    siteName:    SITE_NAME,
    title:       TITLE,
    description: DESCRIPTION,
    images: [
      {
        url:    '/og-image.png',
        width:  1200,
        height: 630,
        alt:    'ExpressiveAI — AI Video Generation Platform',
      },
    ],
  },

  // ── Twitter / X ──────────────────────────────────────────────────────
  twitter: {
    card:        'summary_large_image',
    title:       TITLE,
    description: DESCRIPTION,
    site:        '@expressiveai',
    creator:     '@expressiveai',
    images:      ['/og-image.png'],
  },

  // ── App / PWA ────────────────────────────────────────────────────────
  applicationName: SITE_NAME,
  keywords: [
    'AI video generation',
    'text to video',
    'AI video creator',
    'stable video diffusion',
    'generative AI',
    'video AI',
    'expressiveai',
  ],
  authors:   [{ name: 'ExpressiveAI', url: APP_URL }],
  creator:   'ExpressiveAI',
  publisher: 'ExpressiveAI',

  // ── Icons ────────────────────────────────────────────────────────────
  icons: {
    icon:          [{ url: '/favicon.ico' }, { url: '/icon.png', type: 'image/png' }],
    apple:         [{ url: '/apple-icon.png', sizes: '180x180' }],
    shortcut:      '/favicon.ico',
  },

  // ── Verification (fill in once verified) ────────────────────────────
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '',
  },

  // ── Manifest ────────────────────────────────────────────────────────
  manifest: '/manifest.json',
};

// ---------------------------------------------------------------------------
// Root Layout
// ---------------------------------------------------------------------------
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary:    '#8b82f6',
          colorBackground: '#101426',
          colorText:       '#f1f5f9',
          colorInputBackground: '#1e293b',
          colorInputText:  '#f1f5f9',
        },
        elements: {
          card:              'bg-[#101426]/95 border border-indigo-200/10 shadow-2xl backdrop-blur-xl',
          headerTitle:       'text-white',
          headerSubtitle:    'text-slate-400',
          formButtonPrimary: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white',
          footerActionLink:  'text-violet-400 hover:text-violet-300',
        },
      }}
    >
      {/* Force dark colour-scheme at the document level */}
      <html lang="en" className="dark" suppressHydrationWarning>
        <body
          className={`${
            inter.variable
          } font-sans antialiased bg-[#0b0f19] text-slate-100 selection:bg-fuchsia-500/30`}
        >
          {children}
          <CookieConsent />

          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background:   'rgba(15,23,42,0.95)',
                color:        '#f1f5f9',
                border:       '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(16px)',
                borderRadius: '12px',
                fontSize:     '14px',
              },
              success: { iconTheme: { primary: '#a78bfa', secondary: '#0b0f19' } },
              error:   { iconTheme: { primary: '#f87171', secondary: '#0b0f19' } },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
