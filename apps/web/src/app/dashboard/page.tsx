'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Loader2, PlayCircle, Sparkles, Film, Zap, Crown,
  AlertTriangle, CheckCircle2, Clock, XCircle, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiUrl } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Video {
  id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  length_seconds?: number;
}

interface UserProfile {
  creditsRemaining: number;
  tier: string;
  username: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const POLL_MS   = 4_000;
const MAX_POLLS = 90;

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  completed:  { label: 'Ready',      icon: <CheckCircle2 className="w-3.5 h-3.5" />, cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  processing: { label: 'Processing', icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, cls: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25' },
  pending:    { label: 'Queued',     icon: <Clock className="w-3.5 h-3.5" />, cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  failed:     { label: 'Failed',     icon: <XCircle className="w-3.5 h-3.5" />, cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
};

const TIER_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  free:       { label: 'Free',       icon: <Zap className="w-3 h-3" />,   cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  pro:        { label: 'Pro',        icon: <Sparkles className="w-3 h-3" />, cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  creator:    { label: 'Creator',    icon: <Crown className="w-3 h-3" />, cls: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  enterprise: { label: 'Enterprise', icon: <Crown className="w-3 h-3" />, cls: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user }                          = useUser();
  const router                            = useRouter();

  // Form state
  const [prompt,       setPrompt]       = useState('');
  const [lengthSec,    setLengthSec]    = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  // Data state
  const [recentVideos,  setRecentVideos]  = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [profile,       setProfile]       = useState<UserProfile | null>(null);

  // Polling refs
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  // ── Fetch helpers ────────────────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(apiUrl(`/api/generate/my-videos?userId=${encodeURIComponent(userId)}`));
      if (res.ok) {
        const data = await res.json();
        setRecentVideos(data.videos ?? []);
      }
    } catch (err) {
      console.error('fetchVideos error', err);
    } finally {
      setLoadingVideos(false);
    }
  }, [userId]);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(apiUrl(`/api/users/me?userId=${encodeURIComponent(userId)}`));
      if (res.ok) {
        const data = await res.json();
        setProfile({
          creditsRemaining: data.creditsRemaining ?? 0,
          tier:             data.tier ?? 'free',
          username:         data.username ?? null,
        });
      }
    } catch (err) {
      console.error('fetchProfile error', err);
    }
  }, [userId]);

  // ── Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isSignedIn && userId) {
      setLoadingVideos(true);
      fetchVideos();
      fetchProfile();
    }
  }, [isSignedIn, userId, fetchVideos, fetchProfile]);

  useEffect(() => () => clearPoll(), [clearPoll]);

  // ── Polling ──────────────────────────────────────────────────────────
  const pollStatus = useCallback(
    (videoId: string, toastId: string) => {
      clearPoll();
      pollTimerRef.current = setInterval(async () => {
        pollCountRef.current += 1;
        if (pollCountRef.current > MAX_POLLS) {
          clearPoll();
          setIsGenerating(false);
          toast.error('Generation is taking longer than expected. Check back shortly.', { id: toastId });
          fetchVideos();
          return;
        }
        try {
          const res  = await fetch(apiUrl(`/api/generate/status/${videoId}`));
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Status check failed');

          if (data.status === 'completed') {
            clearPoll();
            setIsGenerating(false);
            toast.success('✨ Your video is ready!', { id: toastId });
            fetchVideos();
            fetchProfile(); // refresh credits
          } else if (data.status === 'failed') {
            clearPoll();
            setIsGenerating(false);
            toast.error(`Generation failed: ${data.error || 'Unknown error'}`, { id: toastId });
            fetchVideos();
            fetchProfile();
          } else {
            const p = typeof data.progress === 'number' ? data.progress : 0;
            toast.loading(`Processing… ${p}%`, { id: toastId });
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, POLL_MS);
    },
    [clearPoll, fetchVideos, fetchProfile],
  );

  // ── Generate handler ─────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim() || !userId) return;
    setIsGenerating(true);
    const toastId = toast.loading('Queueing generation…');

    try {
      const res = await fetch(apiUrl('/api/generate'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), userId, length: lengthSec }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to queue generation');

      toast.success(data.artisticMode ? '🎨 Artistic mode — rendering…' : 'Queued!', { id: toastId });
      setPrompt('');
      fetchVideos();
      fetchProfile();
      pollStatus(data.videoId, toastId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong', { id: toastId });
      setIsGenerating(false);
    }
  };

  // ── Loading / redirect guards ────────────────────────────────────────
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="deep-space-bg min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-violet-400" />
      </div>
    );
  }

  const tierInfo   = TIER_CONFIG[profile?.tier ?? 'free'] ?? TIER_CONFIG.free;
  const credits    = profile?.creditsRemaining ?? 0;
  const lowCredits = credits <= 2;

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="deep-space-bg min-h-screen flex flex-col text-slate-100">

      {/* ── Top nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0b0f19]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-4 h-4 text-white" aria-hidden />
            </span>
            <span className="text-base font-bold tracking-tight gradient-text-premium hidden sm:block">
              expressiveai.online
            </span>
          </Link>

          {/* Credits + tier pill */}
          <div className="flex items-center gap-3">
            {/* Tier badge */}
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tierInfo.cls}`}>
              {tierInfo.icon}
              {tierInfo.label}
            </span>

            {/* Credits badge */}
            <motion.div
              key={credits}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                lowCredits
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-violet-500/15 text-violet-300 border-violet-500/25'
              }`}
            >
              <Zap className="w-3.5 h-3.5" aria-hidden />
              <span>{credits} credit{credits !== 1 ? 's' : ''}</span>
            </motion.div>

            {lowCredits && (
              <Link
                href="/pricing"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-colors shadow-md shadow-indigo-500/20"
              >
                Top up
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        {/* ── Page heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">Creator studio</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Welcome back{user?.firstName ? (
              <span className="gradient-text-premium">, {user.firstName}</span>
            ) : ''}
          </h1>
          <p className="mt-2 text-slate-400 max-w-2xl text-sm">
            Describe a scene, pick a length, and we route it to the GPU queue. Your library updates as jobs complete.
          </p>
        </motion.div>

        {/* ── Generation form ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass-card rounded-3xl p-6 sm:p-8 mb-12"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
              <Film className="w-6 h-6 text-white" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">New generation</h2>
              <p className="text-sm text-slate-400 mt-0.5">Clear, specific prompts produce more consistent motion and lighting.</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Prompt textarea */}
            <div>
              <label htmlFor="dash-prompt" className="block text-sm font-medium text-slate-300 mb-2">
                Describe your scene
              </label>
              <textarea
                id="dash-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Cinematic drone shot over a misty valley at sunrise, soft volumetric light, golden hour…"
                className="w-full min-h-[140px] px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 outline-none resize-y transition-all"
              />
            </div>

            <div className="flex flex-wrap items-end gap-4">
              {/* Duration selector */}
              <div>
                <label htmlFor="dash-length" className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Duration
                </label>
                <select
                  id="dash-length"
                  value={lengthSec}
                  onChange={(e) => setLengthSec(Number(e.target.value))}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-violet-500/40 outline-none"
                >
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                  {(profile?.tier === 'pro' || profile?.tier === 'creator' || profile?.tier === 'enterprise') && (
                    <option value={30}>30 seconds</option>
                  )}
                  {(profile?.tier === 'creator' || profile?.tier === 'enterprise') && (
                    <option value={60}>60 seconds</option>
                  )}
                </select>
              </div>

              {/* No-credit warning */}
              <AnimatePresence>
                {credits < 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-sm text-amber-400"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>No credits — <Link href="/pricing" className="underline underline-offset-2 hover:text-amber-300">upgrade to continue</Link></span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generate button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || credits < 1}
                className="ml-auto inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isGenerating ? (
                  <><Loader2 className="animate-spin w-5 h-5" />Working…</>
                ) : (
                  <><Sparkles className="w-5 h-5" />Generate — 1 credit</>
                )}
              </button>
            </div>
          </div>
        </motion.section>

        {/* ── Video library ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Your videos</h2>
            <button
              type="button"
              onClick={() => { setLoadingVideos(true); fetchVideos(); }}
              className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
              aria-label="Refresh video list"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingVideos ? (
            <div className="flex justify-center py-24">
              <Loader2 className="animate-spin text-violet-400 w-9 h-9" aria-label="Loading videos" />
            </div>
          ) : recentVideos.length === 0 ? (
            <div className="glass-card rounded-3xl py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <PlayCircle className="w-8 h-8 text-slate-500" aria-hidden />
              </div>
              <p className="text-white font-semibold text-lg">No videos yet</p>
              <p className="text-slate-500 text-sm mt-1">Submit a prompt above to create your first clip.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentVideos.map((vid, idx) => {
                const sc = STATUS_CONFIG[vid.status] ?? STATUS_CONFIG.pending;
                return (
                  <motion.article
                    key={vid.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass-card glass-card-hover rounded-3xl overflow-hidden group cursor-default"
                  >
                    {/* Thumbnail / preview */}
                    <div className="relative h-44 bg-white/[0.03]">
                      {vid.status === 'completed' && vid.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={vid.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 text-sm">
                          {vid.status === 'pending' || vid.status === 'processing' ? (
                            <>
                              <Loader2 className="w-8 h-8 animate-spin text-violet-500" aria-hidden />
                              <span className="capitalize text-slate-400">{vid.status}…</span>
                            </>
                          ) : vid.status === 'failed' ? (
                            <>
                              <XCircle className="w-8 h-8 text-red-500" aria-hidden />
                              <span className="text-red-400">Failed</span>
                            </>
                          ) : (
                            <PlayCircle className="w-10 h-10 text-slate-600" aria-hidden />
                          )}
                        </div>
                      )}

                      {/* Play overlay on completed */}
                      {vid.status === 'completed' && vid.video_url && (
                        <a
                          href={vid.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Watch video"
                        >
                          <PlayCircle className="text-white w-14 h-14 drop-shadow-xl" />
                        </a>
                      )}

                      {/* Status badge */}
                      <span
                        className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${sc.cls}`}
                      >
                        {sc.icon}
                        {sc.label}
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="p-5">
                      <p className="text-slate-200 line-clamp-2 text-sm font-medium leading-snug">
                        &ldquo;{vid.prompt}&rdquo;
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-slate-500 text-xs">
                          {new Date(vid.created_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                        {vid.length_seconds && (
                          <span className="text-xs text-slate-500">{vid.length_seconds}s</span>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.07] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} ExpressiveAI.online</span>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="hover:text-slate-300 transition-colors">Buy credits</Link>
            <Link href="/gallery" className="hover:text-slate-300 transition-colors">Gallery</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
