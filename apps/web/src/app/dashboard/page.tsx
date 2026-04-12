'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Loader2, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Video {
  id: string;
  prompt: string;
  status: string;
  video_url: string;
  thumbnail_url: string;
  created_at: string;
}

export default function Dashboard() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  useEffect(() => {
    if (isSignedIn && userId) {
      fetchVideos();
    }
  }, [isSignedIn, userId]);

  const fetchVideos = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/generate/my-videos?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setRecentVideos(data.videos || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !userId) return;
    setIsGenerating(true);
    const toastId = toast.loading('Initializing generation...');

    try {
      const res = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userId, length: 5 }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to queue generation');
      }

      toast.loading(`Queued! Estimated time: ${data.estimatedTime}s`, { id: toastId });
      
      // Start polling
      pollStatus(data.videoId, toastId);
      
      setPrompt('');
      fetchVideos(); // Refresh list to show pending
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
      setIsGenerating(false);
    }
  };

  const pollStatus = (videoId: string, toastId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/generate/status/${videoId}`);
        const data = await res.json();
        
        if (data.status === 'completed') {
          clearInterval(interval);
          setIsGenerating(false);
          toast.success('Your video is ready!', { id: toastId });
          fetchVideos();
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setIsGenerating(false);
          toast.error(`Generation failed: ${data.error}`, { id: toastId });
          fetchVideos();
        } else if (data.status === 'processing') {
          toast.loading(`Processing... ${data.progress}% complete`, { id: toastId });
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 5000);
  };

  if (!isLoaded || !isSignedIn) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-10 h-10 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
             expressiveai.online
          </Link>
          <div className="flex items-center gap-6">
             <Link href="/gallery" className="text-gray-600 hover:text-gray-900 transition">Gallery</Link>
             <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition">Get Credits</Link>
             <div className="h-6 w-px bg-gray-300" />
             <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-5xl mx-auto px-6 py-12 w-full">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Welcome back, {user?.firstName || 'Creator'}!</h1>
        
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-16">
          <h2 className="text-xl font-semibold mb-6">Generate New Video</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prompt (be descriptive)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A cinematic drone shot over a misty mountain valley at sunrise..."
                className="w-full h-32 px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-shadow"
              />
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full bg-black text-white rounded-full py-4 font-semibold text-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <><Loader2 className="animate-spin w-5 h-5" /> Generating...</>
              ) : (
                'Generate Video'
              )}
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Your Recent Videos</h2>
          {loadingVideos ? (
            <div className="flex justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>
          ) : recentVideos.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
              <PlayCircle className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500 font-medium">You haven't generated any videos yet.</p>
              <p className="text-gray-400 mt-1">Write a prompt above to get started!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
               {recentVideos.map((vid, idx) => (
                 <motion.div 
                   key={vid.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.1 }}
                   className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col group cursor-pointer hover:shadow-xl transition-all"
                 >
                   <div className="relative h-48 bg-gray-100">
                     {vid.status === 'completed' && vid.thumbnail_url ? (
                       <img src={vid.thumbnail_url} alt="thumbnail" className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                         {vid.status === 'pending' || vid.status === 'processing' ? (
                            <><Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" /> <span>{vid.status}</span></>
                         ) : vid.status === 'failed' ? (
                            <span className="text-red-500">Failed to render</span>
                         ) : (
                            <PlayCircle className="w-10 h-10" />
                         )}
                       </div>
                     )}
                     
                     {vid.status === 'completed' && (
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <PlayCircle className="text-white w-12 h-12" />
                       </div>
                     )}
                   </div>
                   <div className="p-5">
                     <p className="text-gray-800 line-clamp-2 text-sm font-medium">"{vid.prompt}"</p>
                     <p className="text-gray-400 text-xs mt-2">{new Date(vid.created_at).toLocaleDateString()}</p>
                   </div>
                 </motion.div>
               ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
