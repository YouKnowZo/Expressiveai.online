'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PlayCircle, ShieldCheck, RefreshCw, Heart,
  Eye, Sparkles, Film, ArrowRight,
} from 'lucide-react';
import { apiUrl } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GalleryVideo {
  id: string;
  thumbnail_url: string | null;
  video_url: string | null;
  prompt: string;
  view_count: number;
  like_count?: number;
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="glass-card rounded-3xl overflow-hidden animate-pulse">
      <div className="h-64 bg-white/[0.04]" />
      <div className="p-5 space-y-2">
        <div className="h-3 bg-white/[0.06] rounded-full w-3/4" />
        <div className="h-3 bg-white/[0.04] rounded-full w-1/2" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gallery page
// ---------------------------------------------------------------------------
export default function GalleryPage() {
  const [videos,    setVideos]    = useState<GalleryVideo[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedIds,  setLikedIds]  = useState<Set<string>>(new Set());
  const [error,     setError]     = useState<string | null>(null);

  const fetchGallery = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(apiUrl('/api/generate/public'), {
        next: { revalidate: 60 },
      } as RequestInit);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVideos((data.videos ?? []) as GalleryVideo[]);
    } catch (err) {
      console.error('Gallery fetch error:', err);
      setError('Could not load the community gallery right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="deep-space-bg min-h-screen flex flex-col text-slate-100">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0b0f19]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            <span className="text-base font-bold tracking-tight gradient-text-premium hidden sm:block">
              expressiveai.online
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/pricing"    className="px-3 py-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/5 transition-colors">Pricing</Link>
            <Link href="/dashboard"  className="px-3 py-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/5 transition-colors">Studio</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        {/* ── Hero heading ── */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-xs font-semibold text-violet-300 mb-4">
            <Film className="w-3.5 h-3.5" />
            Community gallery
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Discover what creators are{' '}
            <span className="gradient-text-premium">making</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Public generations from the network — every clip forensically watermarked and verified.
          </p>
        </div>

        {/* ── Actions bar ── */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-slate-500 text-sm">
            {!loading && !error && `${videos.length} creation${videos.length !== 1 ? 's' : ''}`}
          </p>
          <button
            type="button"
            onClick={() => fetchGallery(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Error state ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-card rounded-2xl p-4 mb-8 text-center text-amber-400 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Skeleton loading ── */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && videos.length === 0 && (
          <div className="glass-card rounded-3xl py-24 text-center">
            <PlayCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-white font-semibold">No public videos yet</p>
            <p className="text-slate-500 text-sm mt-1">Be the first to share your creation.</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600"
            >
              Open Studio <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* ── Video grid ── */}
        {!loading && videos.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos.map((vid, idx) => {
              const liked = likedIds.has(vid.id);
              return (
                <motion.div
                  key={vid.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative glass-card glass-card-hover rounded-3xl overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="relative h-64 bg-white/[0.03] overflow-hidden">
                    {vid.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={vid.thumbnail_url}
                        alt=""
                        className="video-preview w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-10 h-10 text-slate-600" />
                      </div>
                    )}

                    {/* Play overlay */}
                    {vid.video_url && vid.video_url !== '#' ? (
                      <a
                        href={vid.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        aria-label="Watch video"
                      >
                        <PlayCircle className="text-white w-16 h-16 drop-shadow-xl" />
                      </a>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <PlayCircle className="text-white/60 w-16 h-16" />
                      </div>
                    )}

                    {/* Like button */}
                    <button
                      type="button"
                      onClick={() => toggleLike(vid.id)}
                      aria-label={liked ? 'Unlike' : 'Like'}
                      className="absolute top-3 right-3 p-2 rounded-full glass-card opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                    >
                      <Heart
                        className={`w-4 h-4 transition-colors ${
                          liked ? 'fill-red-400 text-red-400' : 'text-white/70'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    <p className="text-slate-200 font-medium text-sm line-clamp-2 leading-snug mb-3">
                      &ldquo;{vid.prompt}&rdquo;
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        {(vid.view_count ?? 0).toLocaleString()} views
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Heart className={`w-3.5 h-3.5 ${liked ? 'text-red-400' : ''}`} />
                        {((vid.like_count ?? 0) + (liked ? 1 : 0)).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5 ml-auto">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Signed</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── CTA ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-slate-500 text-sm mb-4">Want yours featured here?</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Create in the studio
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.07] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} ExpressiveAI.online</span>
          <div className="flex items-center gap-4">
            <Link href="/pricing"   className="hover:text-slate-300 transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
