'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlayCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { apiUrl } from '@/lib/api';

interface Video {
  id: string;
  thumbnail_url: string;
  video_url: string;
  prompt: string;
  view_count: number;
}

const MOCK: Video[] = [
  {
    id: 'v1',
    thumbnail_url: 'https://images.unsplash.com/photo-1682687982501-1e5898cb89e8?auto=format&fit=crop&w=600&q=80',
    video_url: '#',
    prompt: 'A cyberpunk city glowing in neon pink and cyan at midnight, rain pouring…',
    view_count: 1245,
  },
  {
    id: 'v2',
    thumbnail_url: 'https://images.unsplash.com/photo-1682687981922-7b55f5f4b595?auto=format&fit=crop&w=600&q=80',
    video_url: '#',
    prompt: 'Surreal landscape of floating islands with waterfalls falling into the abyss',
    view_count: 852,
  },
  {
    id: 'v3',
    thumbnail_url: 'https://images.unsplash.com/photo-1682687218904-de46ed992b58?auto=format&fit=crop&w=600&q=80',
    video_url: '#',
    prompt: 'Hyperrealistic portrait of a golden retriever astronaut on Mars',
    view_count: 3102,
  },
  {
    id: 'v4',
    thumbnail_url: 'https://images.unsplash.com/photo-1682685797500-1c5c5c06d042?auto=format&fit=crop&w=600&q=80',
    video_url: '#',
    prompt: 'Time-lapse of a cherry blossom tree blooming in spring',
    view_count: 531,
  },
];

export default function GalleryPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromApi, setFromApi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/generate/public'), { cache: 'no-store' });
        if (!res.ok) throw new Error('public feed unavailable');
        const data = await res.json();
        const list = (data.videos || []) as Video[];
        if (!cancelled && list.length > 0) {
          setVideos(list);
          setFromApi(true);
        } else if (!cancelled) {
          setVideos(MOCK);
        }
      } catch {
        if (!cancelled) setVideos(MOCK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col text-slate-900">
      <SiteHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
          <p className="text-sm font-medium text-indigo-600 mb-2">Community gallery</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">Discover what creators are making</h1>
          <p className="text-slate-600">
            Public generations from the network{fromApi ? '' : ' — showing curated examples until your API returns community posts'}.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" aria-hidden />
            <span className="text-sm">Loading gallery…</span>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {videos.map((vid, idx) => (
              <motion.div
                key={vid.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="group relative rounded-3xl overflow-hidden border border-slate-200/80 bg-slate-900 shadow-sm hover:shadow-xl transition-shadow"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vid.thumbnail_url || ''}
                  alt=""
                  className="w-full h-72 object-cover opacity-90 group-hover:opacity-75 transition-opacity duration-500"
                />

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <PlayCircle className="text-white w-16 h-16 drop-shadow-lg" aria-hidden />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 bg-gradient-to-t from-black/90 via-black/55 to-transparent">
                  <p className="text-white font-medium line-clamp-2 text-sm leading-relaxed mb-3">&ldquo;{vid.prompt}&rdquo;</p>
                  <div className="flex items-center gap-4 text-xs text-white/75">
                    <span className="flex items-center gap-1">
                      <PlayCircle className="w-3.5 h-3.5" aria-hidden />
                      {vid.view_count?.toLocaleString?.() ?? '—'} views
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                      Watermarked
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <p className="text-center text-sm text-slate-500 mt-12">
          Want yours featured?{' '}
          <Link href="/dashboard" className="text-indigo-600 font-medium hover:underline">
            Generate in the studio
          </Link>{' '}
          and opt in to public sharing when available.
        </p>
      </main>
    </div>
  );
}
