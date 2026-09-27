'use client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ShieldCheck, Zap, Play, PlayCircle, Lock, Scale, Cpu,
  Video, Timer, Ratio, Palette, Share2, Download, User, Check, Crown, ScanEye, Fingerprint, Ban, X
} from 'lucide-react';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { SiteHeader } from '@/components/SiteHeader';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';

const thinkingMessages = [
  'Interpreting creative vision...',
  'Composing visual elements...',
  'Rendering frame sequences...',
  'Applying cinematic grading...',
  'Embedding forensic signature...',
  'Finalizing output...'
];

const demoVideos = [
  {
    prompt: 'Reference footage — replace with an ExpressiveAI generation',
    time: '6s',
    ratio: '16:9',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  {
    prompt: 'Reference footage — replace with an ExpressiveAI generation',
    time: '6s',
    ratio: '16:9',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
  },
  {
    prompt: 'Reference footage — replace with an ExpressiveAI generation',
    time: '6s',
    ratio: '16:9',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
];

export default function LandingPage() {
  const { isSignedIn, userId, getToken } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [videoLength, setVideoLength] = useState(5);
  
  // Generator State
  const [credits, setCredits] = useState(0);
  const [accountTier, setAccountTier] = useState('free');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorStatus, setGeneratorStatus] = useState('Ready to create');
  const [statusColor, setStatusColor] = useState('text-slate-500');
  const [progress, setProgress] = useState(0);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [resultPrompt, setResultPrompt] = useState('');
  const [resultVideoUrl, setResultVideoUrl] = useState('');
  const [textareaShake, setTextareaShake] = useState(false);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setInterval(() => {
      setThinkingIndex((index) => (index + 1) % thinkingMessages.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    getToken().then(token => fetch(apiUrl('/api/users/me'), { headers: { Authorization: `Bearer ${token ?? ''}` } }))
      .then(response => response.ok ? response.json() : null)
      .then(profile => {
        if (profile) {
          setCredits(profile.creditsRemaining ?? 0);
          setAccountTier(profile.tier ?? 'free');
        }
      })
      .catch(error => console.error('Could not load account profile:', error));
  }, [isSignedIn, userId, getToken]);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleGenerateClick = async () => {
    if (showResult) {
      // Reset
      setShowResult(false);
      setPrompt('');
      setResultVideoUrl('');
      setProgress(0);
      setGeneratorStatus('Ready to create');
      setStatusColor('text-slate-500');
      return;
    }

    if (!prompt.trim()) {
      setTextareaShake(true);
      setTimeout(() => setTextareaShake(false), 2000);
      return;
    }

    if (isSignedIn && credits <= 0) {
      setGeneratorStatus('No credits remaining — upgrade your tier');
      setStatusColor('text-amber-400');
      return;
    }

    if (isSignedIn && userId) {
      try {
        setIsGenerating(true);
        setGeneratorStatus('Queueing generation...');
        setStatusColor('text-slate-400');
        setThinkingIndex(0);
        setProgress(0);
        setShowResult(false);

        const response = await fetch(apiUrl('/api/generate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getToken() ?? ''}`,
          },
          body: JSON.stringify({ prompt: prompt.trim(), length: videoLength }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to queue generation.');
        }
        setCredits(current => Math.max(0, current - 1));

        setGeneratorStatus(data.artisticMode ? 'Artistic mode · in queue' : 'Generation queued');
        for (let attempt = 0; attempt < 180; attempt += 1) {
          await new Promise(resolve => window.setTimeout(resolve, 5000));
          const statusResponse = await fetch(apiUrl(`/api/generate/status/${data.videoId}`), {
            headers: { Authorization: `Bearer ${await getToken() ?? ''}` },
          });
          const statusData = await statusResponse.json();
          if (!statusResponse.ok) throw new Error(statusData.error || 'Could not check generation status.');
          setProgress(statusData.progress ?? 0);
          if (statusData.status === 'failed') throw new Error(statusData.error || 'Video generation failed.');
          if (statusData.status === 'completed' && statusData.videoUrl) {
            setResultVideoUrl(statusData.videoUrl);
            setResultPrompt(`"${prompt.trim()}"`);
            setProgress(100);
            setShowResult(true);
            setGeneratorStatus('Your video is ready');
            setStatusColor('text-emerald-400');
            setIsGenerating(false);
            return;
          }
          setGeneratorStatus(statusData.status === 'processing' ? 'Rendering your video…' : 'Waiting in the generation queue…');
        }
        throw new Error('Generation is taking longer than expected. Check your video library shortly.');
      } catch (error) {
        console.error('Landing generation request failed:', error);
        setGeneratorStatus(error instanceof Error ? error.message : 'Generation failed. Try again.');
        setStatusColor('text-red-400');
        setIsGenerating(false);
        return;
      }
    }

    setGeneratorStatus('Sign in to start generating');
    setStatusColor('text-amber-400');
  };

  return (
    <div className="deep-space-bg text-white min-h-screen overflow-x-hidden">
      
      {/* Ambient Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-200px] left-[-100px] w-[520px] h-[520px] bg-indigo-500/[0.06] rounded-full blur-[120px] animate-pulse-soft" />
        <div className="absolute top-[28%] right-[-180px] w-[420px] h-[420px] bg-violet-500/[0.05] rounded-full blur-[110px] animate-pulse-soft delay-200" />
        <div className="absolute bottom-[-80px] left-[25%] w-[360px] h-[360px] bg-sky-500/[0.04] rounded-full blur-[100px] animate-pulse-soft delay-400" />
      </div>

      <SiteHeader />

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-8 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs font-medium text-indigo-200 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            AI video creation, with room to create
          </div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.05] tracking-[-0.03em] mb-6">
          Your ideas,<br />
          <span className="gradient-text-premium">in motion.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Turn a written idea into an AI-generated video. Shape the scene, choose a duration, and keep every creation organized in your library.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={() => handleScrollTo('generator')} className="flex items-center gap-2 px-8 py-3.5 text-base font-semibold btn-premium rounded-full">
            <Play className="w-5 h-5" /> Start Creating
          </button>
          <button onClick={() => handleScrollTo('gallery')} className="flex items-center gap-2 px-8 py-3.5 text-base font-medium text-slate-300 hover:text-white glass-card glass-card-hover rounded-full transition-all">
            View Gallery
          </button>
        </motion.div>

        {/* Trust Badges */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-12">
          <div className="flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="w-3.5 h-3.5 text-indigo-300" /> Output provenance metadata</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400"><Lock className="w-3.5 h-3.5 text-indigo-300" /> Secure sign-in</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400"><Scale className="w-3.5 h-3.5 text-indigo-300" /> Clear responsible-use rules</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400"><Cpu className="w-3.5 h-3.5 text-indigo-300" /> Queue-based rendering</div>
        </motion.div>
      </section>

      {/* Generator Section */}
      <section id="generator" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className={`glass-card rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto transition-all ${isGenerating ? 'thinking-glow' : 'breathing-glow'}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl btn-premium flex items-center justify-center text-white"><Video className="w-5 h-5"/></div>
              <div>
                <h2 className="text-lg font-bold text-white">Video Studio</h2>
                <p className={`text-xs font-mono transition-colors ${statusColor}`}>{generatorStatus}</p>
              </div>
            </div>              <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="text-amber-300">{isSignedIn ? credits : '—'}</span>
                <span className="text-slate-500">{isSignedIn ? 'credits left' : 'sign in for credits'}</span>
              </span>
            </div>
          </div>

          {/* Prompt */}
          {!showResult ? (
            <>
              <div className="relative mb-4">
                <textarea
                  className={`w-full bg-transparent text-lg sm:text-xl text-white placeholder-slate-600 border-none outline-none resize-none leading-relaxed transition-all ${textareaShake ? 'ring-1 ring-purple-500/50 rounded-xl' : ''}`}
                  rows={4}
                  placeholder="A surreal dreamscape where colors melt into music..."
                  maxLength={500}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  disabled={isGenerating}
                />
                <div className="absolute bottom-1 right-1 text-xs font-mono text-slate-600">{prompt.length}/500</div>
              </div>

              {/* Settings */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card text-sm">
                  <Timer className="w-4 h-4 text-slate-500" />
                  <span className="sr-only">Video duration</span>
                  <select value={videoLength} onChange={event => setVideoLength(Number(event.target.value))} disabled={isGenerating} className="bg-transparent text-slate-300 outline-none cursor-pointer text-sm [&>option]:bg-slate-900">
                    <option value={5}>5 seconds</option><option value={10}>10 seconds</option>
                    {(accountTier === 'pro' || accountTier === 'creator' || accountTier === 'enterprise') && <option value={30}>30 seconds</option>}
                    {(accountTier === 'creator' || accountTier === 'enterprise') && <><option value={60}>1 minute</option><option value={120}>2 minutes</option><option value={180}>3 minutes</option><option value={240}>4 minutes</option><option value={300}>5 minutes</option></>}
                  </select>
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card text-sm">
                  <Ratio className="w-4 h-4 text-slate-500" />
                  <select disabled={isGenerating} className="bg-transparent text-slate-300 outline-none cursor-pointer text-sm [&>option]:bg-slate-900">
                    <option value="16:9">16:9</option><option value="9:16">9:16</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card text-sm">
                  <Palette className="w-4 h-4 text-slate-500" />
                  <select disabled={isGenerating} className="bg-transparent text-slate-300 outline-none cursor-pointer text-sm [&>option]:bg-slate-900">
                    <option value="cinematic">Cinematic</option><option value="surreal">Surreal</option>
                  </select>
                </div>
              </div>
              <p className="mb-6 text-xs leading-5 text-slate-500">
                AI-generated video may include inaccuracies or artifacts. Check rights and consent before using real people or sharing a clip. Longer durations may extend a short generated scene to the selected runtime. <Link href="/disclaimer" className="text-indigo-300 underline underline-offset-2">Read our disclaimer</Link>.
              </p>
              {!isSignedIn && <p className="mb-5 text-xs text-slate-400">Sign in to create a video. New accounts receive 5 credits.</p>}

              {isGenerating && (
                <div className="mt-6 pt-6 border-t border-white/5 animate-fade-in-up">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 rounded-full bg-fuchsia-400 animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                    <span className="text-sm font-mono text-slate-400">{thinkingMessages[thinkingIndex]}</span>
                  </div>
                  <div className="mt-4 w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-6 pt-6 border-t border-white/5 animate-fade-in-up">
              <div className="rounded-2xl overflow-hidden glass-card">
                 <div className="w-full aspect-video bg-black/50">
                   {resultVideoUrl ? <video src={resultVideoUrl} className="w-full h-full object-contain" controls playsInline /> : <div className="w-full h-full flex items-center justify-center"><PlayCircle className="text-white w-16 h-16 opacity-50" /></div>}
                 </div>
                <div className="p-4 flex items-center justify-between">
                  <p className="text-sm text-slate-300 italic line-clamp-2">{resultPrompt}</p>
                  <div className="flex items-center gap-3">
                    {resultVideoUrl && <button onClick={async () => { try { await navigator.clipboard?.writeText(resultVideoUrl); setGeneratorStatus('Video link copied'); } catch { setGeneratorStatus('Unable to copy link'); } }} className="text-slate-400 hover:text-white transition-colors" title="Copy video link"><Share2 className="w-5 h-5"/></button>}
                    {resultVideoUrl && <a href={resultVideoUrl} download className="text-slate-400 hover:text-white transition-colors" title="Download video"><Download className="w-5 h-5"/></a>}
                    <div className="flex items-center gap-1 text-indigo-400/60"><ShieldCheck className="w-4 h-4"/></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-white/5 mt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 font-mono">
              <ShieldCheck className="w-4 h-4 text-indigo-400/60" /> Provenance metadata may be included
            </div>
            {showResult ? (
               <button onClick={handleGenerateClick} className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3.5 text-base font-semibold glass-card glass-card-hover rounded-full">
                 Reset
               </button>
            ) : isSignedIn ? (
               <button 
                  onClick={handleGenerateClick} disabled={isGenerating}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3.5 text-base font-semibold btn-premium rounded-full disabled:opacity-50"
               >
                 {isGenerating ? <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Generating</> : <><Sparkles className="w-5 h-5" /> Generate Video</>}
               </button>
            ) : (
               <SignInButton mode="modal">
                 <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3.5 text-base font-semibold btn-premium rounded-full">
                   <Sparkles className="w-5 h-5" /> Sign In to Generate
                 </button>
               </SignInButton>
            )}
          </div>
        </motion.div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-4">
            Explore the <span className="gradient-text-premium">visual style</span>
          </h2>           <p className="text-slate-400 max-w-xl mx-auto">Reference footage only—not ExpressiveAI generations. We’ll replace these examples with verified generated work before launch.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {demoVideos.map((g, i) => (
             <motion.div key={i} initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay: i * 0.1}} className="group glass-card glass-card-hover rounded-3xl overflow-hidden transition-all duration-300">
               <div className="relative">
                 <video
                   src={g.src}
                   className="w-full aspect-video object-cover bg-slate-950"
                   muted
                   loop
                   playsInline
                   autoPlay
                   preload="metadata"
                   onError={(event) => {
                     const target = event.currentTarget as HTMLVideoElement;
                     target.style.display = 'none';
                   }}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                   <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                     <Play className="w-4 h-4 text-white pl-0.5" />
                   </div>
                 </div>
               </div>
               <div className="p-5">
                 <div className="flex justify-between items-start mb-3">
                   <p className="text-sm text-slate-300 line-clamp-2 italic font-light">"{g.prompt}"</p>
                   <div className="text-indigo-400/50 flex-shrink-0 ml-2"><ShieldCheck className="w-4 h-4" /></div>
                 </div>
                 <div className="mt-3">
                   <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Reference footage · {g.time} • {g.ratio}</span>
                 </div>
               </div>
             </motion.div>
           ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-4">
            Choose your <span className="gradient-text-premium">creative tier</span>
          </h2>            <p className="text-slate-400 max-w-xl mx-auto">One-time credit packs with clear plan unlocks. *Longer outputs may repeat or extend a short generated scene.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="glass-card glass-card-hover rounded-3xl p-8 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><User className="w-5 h-5 text-slate-400"/></div>
              <div><h3 className="text-lg font-bold text-white">Free</h3><p className="text-xs text-slate-500">Explore & experiment</p></div>
            </div>
            <div className="mb-6"><span className="text-4xl font-extrabold text-white">$0</span><span className="text-slate-500">/month</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-green-500 flex-shrink-0"/> 5 starter credits</li>
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-green-500 flex-shrink-0"/> Up to 10 seconds</li>
              <li className="flex items-center gap-3 text-sm text-slate-500"><X className="w-4 h-4 text-slate-600 flex-shrink-0"/> No commercial license</li>
            </ul>
            <SignInButton mode="modal"><button className="w-full py-3 rounded-full glass-card glass-card-hover text-sm font-semibold text-slate-300 transition-all">Get Started Free</button></SignInButton>
          </motion.div>

          {/* Pro Tier */}
          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.1}} className="pricing-glow-pro glass-card rounded-3xl p-8 transition-all duration-300 relative" style={{background: 'rgba(79, 70, 229, 0.08)', backdropFilter: 'blur(24px)'}}>
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-200">PRO</div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center"><Zap className="w-5 h-5 text-indigo-400"/></div>
              <div><h3 className="text-lg font-bold text-white">Pro</h3><p className="text-xs text-indigo-400">For serious creators</p></div>
            </div>
            <div className="mb-6"><span className="text-4xl font-extrabold text-white">$15</span><span className="text-slate-500"> one-time</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400 flex-shrink-0"/> 200 generation credits</li>
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400 flex-shrink-0"/> One-time payment</li>
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400 flex-shrink-0"/> No recurring subscription</li>
            </ul>
            <Link href="/pricing" className="block w-full py-3 rounded-full btn-premium text-sm font-semibold text-white transition-all text-center">Explore credit packs</Link>
          </motion.div>

          {/* Creator Tier */}
          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.2}} className="glass-card glass-card-hover rounded-3xl p-8 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center"><Crown className="w-5 h-5 text-purple-400"/></div>
              <div><h3 className="text-lg font-bold text-white">Creator</h3><p className="text-xs text-purple-400">For extended projects</p></div>
            </div>
            <div className="mb-6"><span className="text-4xl font-extrabold text-white">$49</span><span className="text-slate-500"> one-time</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-purple-400 flex-shrink-0"/> 1,000 generation credits</li>
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-purple-400 flex-shrink-0"/> Unlocks Creator duration tier</li>
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-purple-400 flex-shrink-0"/> Up to 5 minutes per clip*</li>
            </ul>
            <Link href="/pricing" className="block w-full py-3 rounded-full glass-card glass-card-hover text-sm font-semibold text-purple-300 border-purple-500/30 transition-all border text-center">Explore credit packs</Link>
          </motion.div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-4">
            Create with <span className="gradient-text-premium">clarity and care</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">Practical safeguards, clear policies, and honest information about generated media.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4"><ShieldCheck className="w-6 h-6 text-indigo-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">Forensic Watermarking</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Generated exports include provenance metadata. Metadata may be removed by editing or re-encoding and is not a guarantee of ownership or legal protection.</p>
          </motion.div>

          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.1}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4"><ScanEye className="w-6 h-6 text-purple-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">Content safeguards</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Requests are checked against platform rules. Automated filters are not perfect, so users must follow our acceptable-use policy.</p>
          </motion.div>

          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.2}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 flex items-center justify-center mb-4"><Scale className="w-6 h-6 text-fuchsia-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">Clear content policies</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Our acceptable-use policy explains prohibited content and enforcement. Users remain responsible for lawful use of prompts and outputs.</p>
          </motion.div>

          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4"><Lock className="w-6 h-6 text-green-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">Account sign-in</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Sign-in is managed through Clerk. Review our privacy policy for details about account and generation data.</p>
          </motion.div>

          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.1}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4"><Fingerprint className="w-6 h-6 text-amber-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">Account controls</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Manage your account through secure sign-in and review how account information is handled in our privacy policy.</p>
          </motion.div>

          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.2}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4"><Ban className="w-6 h-6 text-red-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">Responsible synthetic media</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Do not use generated media to impersonate, mislead, harass, or violate another person’s rights. Review our policies before publishing.</p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="glass-card breathing-glow rounded-3xl p-8 sm:p-12 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-4">
            Ready to <span className="gradient-text-premium">express</span>?
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-8">Bring a scene to life, then review and refine your output in your creator library.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => handleScrollTo('generator')} className="flex items-center gap-2 px-8 py-3.5 text-base font-semibold btn-premium rounded-full">
              <Sparkles className="w-5 h-5" /> {isSignedIn ? 'Start Creating' : 'Create your free account'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-6">AI-generated outputs can be inaccurate or contain artifacts. Longer clips may extend a short scene. Review the <Link href="/disclaimer" className="underline underline-offset-2 hover:text-slate-300">disclaimer</Link> before use.</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><button onClick={() => handleScrollTo('generator')} className="text-sm text-slate-500 hover:text-slate-300">Studio</button></li>
                <li><button onClick={() => handleScrollTo('gallery')} className="text-sm text-slate-500 hover:text-slate-300">Gallery</button></li>
                <li><button onClick={() => handleScrollTo('pricing')} className="text-sm text-slate-500 hover:text-slate-300">Pricing</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/terms" className="hover:text-slate-300">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-slate-300">Privacy Policy</Link></li>
                <li><Link href="/disclaimer" className="hover:text-slate-300">Disclaimers</Link></li>
                <li><Link href="/cookies" className="hover:text-slate-300">Cookie Policy</Link></li>
                <li><Link href="/dmca" className="hover:text-slate-300">DMCA / Copyright</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/contact" className="hover:text-slate-300">Contact</Link></li>
                <li><Link href="/refunds" className="hover:text-slate-300">Refund policy</Link></li>
                <li><Link href="/acceptable-use" className="hover:text-slate-300">Acceptable use</Link></li>
                <li><button onClick={() => handleScrollTo('security')} className="hover:text-slate-300">Watermarking</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="hover:text-slate-300 cursor-pointer">Discord</li>
                <li className="hover:text-slate-300 cursor-pointer">Twitter / X</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg rotate-12 btn-premium flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-bold gradient-text-premium">expressiveai.online</span>
                </div>
                <p className="text-xs text-slate-600">© {new Date().getFullYear()} ExpressiveAI. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
