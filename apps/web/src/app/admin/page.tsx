'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { apiUrl } from '@/lib/api';

interface Overview {
  totalUsers: number;
  totalVideos: number;
  pendingVideos: number;
  completedVideos: number;
  failedVideos: number;
  publicVideos: number;
  avgCostPerVideoCredits: number;
}

export default function AdminPage() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      if (!userId) return;
      setLoading(true);
      const [o, v] = await Promise.all([
        fetch(apiUrl(`/api/admin/overview?userId=${encodeURIComponent(userId)}`)),
        fetch(apiUrl(`/api/admin/videos?userId=${encodeURIComponent(userId)}`)),
      ]);
      if (o.ok) setOverview(await o.json());
      if (v.ok) {
        const data = await v.json();
        setVideos(data.videos || []);
      }
      setLoading(false);
    }
    if (isSignedIn) run();
  }, [isSignedIn, userId]);

  if (!isLoaded || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        {!overview ? <p className="text-red-600">Admin access required. Add your Clerk user ID to ADMIN_CLERK_IDS.</p> : (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              {Object.entries(overview).map(([k, v]) => (
                <div key={k} className="bg-white rounded-2xl border p-4">
                  <p className="text-xs text-slate-500 uppercase">{k}</p>
                  <p className="text-2xl font-semibold mt-2">{v}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border p-4">
              <h2 className="font-semibold mb-3">Recent videos</h2>
              <div className="space-y-2">
                {videos.map((video) => (
                  <div key={video.id} className="text-sm border rounded-xl p-3 flex items-center justify-between gap-2">
                    <span className="line-clamp-1">{video.prompt}</span>
                    <span className="text-slate-500">{video.status}</span>
                    <span className="text-slate-500">{video.cost_credits || 1} credits</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
