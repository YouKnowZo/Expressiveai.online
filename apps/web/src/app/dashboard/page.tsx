'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, PlayCircle, Sparkles, Film } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { SiteHeader } from '@/components/SiteHeader';
import { apiUrl } from '@/lib/api';

interface Video {
  id: string;
  prompt: string;
  status: string;
  video_url: string;
  thumbnail_url: string;
  created_at: string;
}

const POLL_MS = 4000;
const MAX_POLLS = 90;

export default function Dashboard() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [lengthSec, setLengthSec] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  const fetchVideos = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(apiUrl(`/api/generate/my-videos?userId=${encodeURIComponent(userId)}`));
      if (res.ok) {
        const data = await res.json();
        setRecentVideos(data.videos || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVideos(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isSignedIn && userId) {
      setLoadingVideos(true);
      fetchVideos();
    }
  }, [isSignedIn, userId, fetchVideos]);

  useEffect(() => () => clearPoll(), [clearPoll]);

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
          const res = await fetch(apiUrl(`/api/generate/status/${videoId}`));
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Status check failed');

          if (data.status === 'completed') {
            clearPoll();
            setIsGenerating(false);
            toast.success('Your video is ready!', { id: toastId });
            fetchVideos();
          } else if (data.status === 'failed') {
            clearPoll();
            setIsGenerating(false);
            toast.error(`Generation failed: ${data.error || 'Unknown error'}`, { id: toastId });
            fetchVideos();
          } else if (data.status === 'processing' || data.status === 'pending') {
            const p = typeof data.progress === 'number' ? data.progress : 0;
            toast.loading(`Processing… ${p}%`, { id: toastId });
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, POLL_MS);
    },
    [clearPoll, fetchVideos]
  );

  const handleGenerate = async () => {
    if (!prompt.trim() || !userId) return;
    setIsGenerating(true);
    const toastId = toast.loading('Queueing generation…');

    try {
      const res = await fetch(apiUrl('/api/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), userId, length: lengthSec }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to queue generation');
      }

      toast.success('Queued — we will notify you when it is ready.', { id: toastId });
      setPrompt('');
      fetchVideos();
      pollStatus(data.videoId, toastId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message, { id: toastId });
      setIsGenerating(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" aria-label="Loading" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" aria-label="Redirecting" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 flex flex-col">
      <SiteHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="mb-10 sm:mb-12">
          <p className="text-sm font-medium text-indigo-600 mb-1">Creator studio</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Describe a scene, pick a length, and we route it to the GPU queue. Your library updates as jobs complete.
          </p>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 p-6 sm:p-8 mb-12 sm:mb-14"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Film className="w-6 h-6 text-white" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">New generation</h2>
              <p className="text-sm text-slate-500 mt-0.5">Clear prompts produce more consistent motion and lighting.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="dash-prompt" className="block text-sm font-medium text-slate-700 mb-2">
                Prompt
              </label>
              <textarea
                id="dash-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Cinematic drone shot over a misty valley at sunrise, soft volumetric light…"
                className="w-full min-h-[140px] px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none resize-y transition-shadow"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label htmlFor="dash-length" className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                  Duration
                </label>
                <select
                  id="dash-length"
                  value={lengthSec}
                  onChange={(e) => setLengthSec(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                >
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 disabled:opacity-45 disabled:cursor-not-allowed transition-shadow"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" aria-hidden />
                  Working…
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" aria-hidden />
                  Generate video
                </>
              )}
            </button>
          </div>
        </motion.section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Your videos</h2>
          {loadingVideos ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600 w-9 h-9" aria-label="Loading videos" />
            </div>
          ) : recentVideos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 py-20 text-center">
              <PlayCircle className="mx-auto w-12 h-12 text-slate-300 mb-4" aria-hidden />
              <p className="text-slate-600 font-medium">No videos yet</p>
              <p className="text-slate-400 text-sm mt-1">Submit a prompt above to create your first clip.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {recentVideos.map((vid, idx) => (
                <motion.article
                  key={vid.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="group rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative h-48 bg-slate-100">
                    {vid.status === 'completed' && vid.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vid.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                        {vid.status === 'pending' || vid.status === 'processing' ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" aria-hidden />
                            <span className="capitalize">{vid.status}</span>
                          </>
                        ) : vid.status === 'failed' ? (
                          <span className="text-red-600 font-medium">Failed</span>
                        ) : (
                          <PlayCircle className="w-10 h-10 text-slate-300" aria-hidden />
                        )}
                      </div>
                    )}
                    {vid.status === 'completed' && (
                      <div className="absolute inset-0 bg-slate-900/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="text-white w-12 h-12" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-slate-800 line-clamp-2 text-sm font-medium">&ldquo;{vid.prompt}&rdquo;</p>
                    <p className="text-slate-400 text-xs mt-2">
                      {new Date(vid.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/80 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} ExpressiveAI</span>
          <Link href="/pricing" className="hover:text-slate-800 transition-colors font-medium">
            Buy credits
          </Link>
        </div>
      </footer>
    </div>
  );
}
