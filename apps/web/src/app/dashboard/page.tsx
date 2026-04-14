'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, PlayCircle, Sparkles, Film, Share2, Copy, Shield } from 'lucide-react';
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
  share_count?: number;
  cost_credits?: number;
}

const POLL_MS = 4000;
const MAX_POLLS = 90;

export default function Dashboard() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [lengthSec, setLengthSec] = useState(5);
  const [quality, setQuality] = useState<'economy' | 'standard' | 'premium'>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [referralLink, setReferralLink] = useState('');
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
      const query = historyFilter === 'all' ? '' : `&status=${historyFilter}`;
      const res = await fetch(apiUrl(`/api/generate/my-videos?userId=${encodeURIComponent(userId)}${query}`));
      if (res.ok) {
        const data = await res.json();
        setRecentVideos(data.videos || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVideos(false);
    }
  }, [userId, historyFilter]);

  const fetchReferral = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(apiUrl(`/api/referrals/summary?userId=${encodeURIComponent(userId)}`));
    if (!res.ok) return;
    const data = await res.json();
    setReferralLink(data.referralLink || '');
  }, [userId]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isSignedIn && userId) {
      setLoadingVideos(true);
      fetchVideos();
      fetchReferral();
    }
  }, [isSignedIn, userId, fetchVideos, fetchReferral]);

  useEffect(() => () => clearPoll(), [clearPoll]);

  const pollStatus = useCallback((videoId: string, toastId: string) => {
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
  }, [clearPoll, fetchVideos]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !userId) return;
    setIsGenerating(true);
    const toastId = toast.loading('Queueing generation…');

    try {
      const res = await fetch(apiUrl('/api/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), userId, length: lengthSec, quality }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to queue generation');

      toast.success(data.cacheHit ? 'Served from cache instantly ⚡' : `Queued (${data.costCredits} credits)`, { id: toastId });
      setPrompt('');
      fetchVideos();
      if (!data.cacheHit) pollStatus(data.videoId, toastId);
      else setIsGenerating(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message, { id: toastId });
      setIsGenerating(false);
    }
  };

  const shareVideo = async (vid: Video) => {
    if (!userId) return;
    const url = `${window.location.origin}/gallery#${vid.id}`;
    await fetch(apiUrl('/api/referrals/track-share'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, videoId: vid.id, channel: 'copy_link' }),
    });
    await navigator.clipboard.writeText(url);
    toast.success('Share link copied');
    fetchVideos();
  };

  const creditsEstimate = useMemo(() => {
    if (quality === 'economy') return Math.max(1, Math.ceil(lengthSec / 10));
    if (quality === 'premium') return Math.max(2, Math.ceil(lengthSec / 6));
    return Math.max(1, Math.ceil(lengthSec / 8));
  }, [lengthSec, quality]);

  if (!isLoaded || !isSignedIn) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 flex flex-col">
      <SiteHeader />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="mb-10 sm:mb-12">
          <p className="text-sm font-medium text-indigo-600 mb-1">Creator studio</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Welcome back{user?.firstName ? `, ${user.firstName}` : ''}</h1>
          <p className="mt-2 text-slate-600 max-w-2xl">Create, monitor history, and share videos to grow reach faster.</p>
        </div>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200/80 bg-white shadow-sm p-6 sm:p-8 mb-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center"><Film className="w-6 h-6 text-white" /></div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">New generation</h2>
              <p className="text-sm text-slate-500 mt-0.5">Quality controls now optimize cost per video automatically.</p>
            </div>
          </div>

          <div className="space-y-6">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Cinematic drone shot over a misty valley at sunrise..." className="w-full min-h-[130px] px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50" />
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Duration</label>
                <select value={lengthSec} onChange={(e) => setLengthSec(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value={5}>5 seconds</option><option value={10}>10 seconds</option><option value={20}>20 seconds</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Quality</label>
                <select value={quality} onChange={(e) => setQuality(e.target.value as 'economy' | 'standard' | 'premium')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="economy">Economy (lowest cost)</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <p className="text-xs text-slate-500">Estimated: <span className="font-semibold text-slate-700">{creditsEstimate} credits</span></p>
            </div>
            <button type="button" onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 disabled:opacity-45">
              {isGenerating ? <><Loader2 className="animate-spin w-5 h-5" /> Working…</> : <><Sparkles className="w-5 h-5" /> Generate video</>}
            </button>
          </div>
        </motion.section>

        <section className="grid lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Video history</h2>
              <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value as 'all' | 'completed' | 'pending' | 'failed')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="all">All</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option>
              </select>
            </div>
            {loadingVideos ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div> : (
              <div className="grid sm:grid-cols-2 gap-4">
                {recentVideos.map((vid) => (
                  <article key={vid.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    <div className="h-40 bg-slate-100 flex items-center justify-center">
                      {vid.status === 'completed' && vid.thumbnail_url ? <img src={vid.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <PlayCircle className="w-9 h-9 text-slate-400" />}
                    </div>
                    <div className="p-4">
                      <p className="text-sm line-clamp-2">“{vid.prompt}”</p>
                      <p className="text-xs text-slate-500 mt-1 capitalize">{vid.status} · {vid.cost_credits || 1} credits</p>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => shareVideo(vid)} className="text-xs px-3 py-1.5 rounded-full border inline-flex items-center gap-1"><Share2 className="w-3 h-3" /> Share</button>
                        {vid.video_url ? <a href={vid.video_url} target="_blank" className="text-xs px-3 py-1.5 rounded-full border">Open</a> : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Copy className="w-4 h-4" /> Viral sharing</h3>
            <p className="text-sm text-slate-600">Invite creators and share video links to increase reach and referral credits.</p>
            <button onClick={() => referralLink && navigator.clipboard.writeText(referralLink).then(() => toast.success('Referral link copied'))} className="w-full rounded-xl border px-4 py-2 text-sm">Copy referral link</button>
            <Link href="/admin" className="w-full rounded-xl border px-4 py-2 text-sm inline-flex justify-center items-center gap-2"><Shield className="w-4 h-4" /> Open admin panel</Link>
          </aside>
        </section>
      </main>
    </div>
  );
}
