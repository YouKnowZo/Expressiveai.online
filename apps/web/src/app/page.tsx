'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ShieldCheck, Zap, Menu, X, Play, LogIn, Lock, Scale, Cpu, 
  Video, Timer, Ratio, Palette, Share2, Download, Heart, User, Check, Crown, ScanEye, Fingerprint, Ban
} from 'lucide-react';
import { useAuth, SignInButton, UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const thinkingMessages = [
  'Interpreting creative vision...',
  'Composing visual elements...',
  'Rendering frame sequences...',
  'Applying cinematic grading...',
  'Embedding forensic signature...',
  'Finalizing output...'
];

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  
  // Generator State
  const [credits, setCredits] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorStatus, setGeneratorStatus] = useState('Ready to create');
  const [statusColor, setStatusColor] = useState('text-slate-500');
  const [progress, setProgress] = useState(0);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [resultPrompt, setResultPrompt] = useState('');
  const [textareaShake, setTextareaShake] = useState(false);

  // Scroll effect for Navbar & Revealer
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
  }, [mobileMenuOpen]);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  const handleGenerateClick = () => {
    if (showResult) {
      // Reset
      setShowResult(false);
      setPrompt('');
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

    if (credits <= 0) {
      setGeneratorStatus('No credits remaining — upgrade your tier');
      setStatusColor('text-amber-400');
      return;
    }

    // Start Generation Simulation
    setCredits(prev => prev - 1);
    setIsGenerating(true);
    setGeneratorStatus('Generating...');
    setStatusColor('text-slate-400');
    setThinkingIndex(0);
    setProgress(0);
    setShowResult(false);
    
    const msgInterval = setInterval(() => setThinkingIndex(prev => (prev + 1) % thinkingMessages.length), 1500);
    const progressInterval = setInterval(() => setProgress(prev => Math.min(prev + Math.random() * 15 + 5, 90)), 500);

    setTimeout(() => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        setIsGenerating(false);
        setShowResult(true);
        setResultPrompt(`"${prompt.trim()}"`);
        setGeneratorStatus('Generation complete');
        setStatusColor('text-green-400');
        
        setTimeout(() => {
          setGeneratorStatus('Ready to create');
          setStatusColor('text-slate-500');
        }, 3000);
      }, 500);
    }, 6000);
  };

  return (
    <div className="deep-space-bg text-white min-h-screen overflow-x-hidden">
      
      {/* Ambient Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse-soft"></div>
        <div className="absolute top-[30%] right-[-200px] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] animate-pulse-soft delay-200"></div>
        <div className="absolute bottom-[-100px] left-[30%] w-[400px] h-[400px] bg-fuchsia-600/8 rounded-full blur-[120px] animate-pulse-soft delay-400"></div>
      </div>

      {/* Navigation */}
      <nav id="main-nav" className={`fixed top-0 w-full z-50 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${scrolled ? 'glass-card border-b border-white/5' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl rotate-12 btn-premium flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold gradient-text-premium tracking-tight">expressiveai.online</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <button onClick={() => handleScrollTo('generator')} className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all">Studio</button>
            <button onClick={() => handleScrollTo('gallery')} className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all">Gallery</button>
            <button onClick={() => handleScrollTo('pricing')} className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all">Pricing</button>
            <button onClick={() => handleScrollTo('security')} className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all">Security</button>
          </div>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
               <div className="hidden sm:flex ml-4"><UserButton /></div>
            ) : (
               <SignInButton mode="modal">
                 <button className="hidden sm:flex items-center gap-2 px-5 py-2 text-sm font-semibold btn-premium rounded-full">
                   <LogIn className="w-4 h-4" /> Sign In
                 </button>
               </SignInButton>
            )}
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="absolute inset-y-0 right-0 z-50 w-72 glass-card p-6 flex flex-col gap-2 border-l border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold gradient-text-premium">Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <button onClick={() => handleScrollTo('generator')} className="text-left px-4 py-3 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-all">Studio</button>
              <button onClick={() => handleScrollTo('gallery')} className="text-left px-4 py-3 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-all">Gallery</button>
              <button onClick={() => handleScrollTo('pricing')} className="text-left px-4 py-3 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-all">Pricing</button>
              <button onClick={() => handleScrollTo('security')} className="text-left px-4 py-3 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-all">Security</button>
              <div className="mt-auto">
                <SignInButton mode="modal">
                  <button className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold btn-premium rounded-full">
                    <LogIn className="w-4 h-4" /> Sign In
                  </button>
                </SignInButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-8 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs font-mono text-fuchsia-300 mb-6">
            <div className="status-dot"></div>
            Platform Online — GPU Clusters Active
          </div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.05] tracking-[-0.03em] mb-6">
          Express without<br />
          <span className="gradient-text-premium">creative boundaries</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Transform your imagination into stunning AI-generated video. From surreal dreamscapes to cinematic narratives — no limits, no compromises.
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
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono"><ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Forensic Watermarking</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono"><Lock className="w-3.5 h-3.5 text-indigo-400" /> End-to-End Encrypted</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono"><Scale className="w-3.5 h-3.5 text-indigo-400" /> Section 230 Compliant</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono"><Cpu className="w-3.5 h-3.5 text-indigo-400" /> GPU-Accelerated</div>
        </motion.div>
      </section>

      {/* Generator Section */}
      <section id="generator" className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className={`glass-card rounded-3xl p-6 sm:p-8 transition-all ${isGenerating ? 'thinking-glow' : 'breathing-glow'}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl btn-premium flex items-center justify-center text-white"><Video className="w-5 h-5"/></div>
              <div>
                <h2 className="text-lg font-bold text-white">Video Studio</h2>
                <p className={`text-xs font-mono transition-colors ${statusColor}`}>{generatorStatus}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs font-mono">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="text-amber-300">{credits}</span>
                <span className="text-slate-500">credits left</span>
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
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card text-sm">
                  <Timer className="w-4 h-4 text-slate-500" />
                  <select disabled={isGenerating} className="bg-transparent text-slate-300 outline-none cursor-pointer text-sm [&>option]:bg-slate-900">
                    <option value="5">5s</option><option value="10">10s</option>
                  </select>
                </div>
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
                 <div className="w-full aspect-video bg-black/50 flex items-center justify-center">
                    <PlayCircle className="text-white w-16 h-16 opacity-50"/>
                 </div>
                <div className="p-4 flex items-center justify-between">
                  <p className="text-sm text-slate-300 italic line-clamp-2">{resultPrompt}</p>
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-white transition-colors" title="Share"><Share2 className="w-5 h-5"/></button>
                    <button className="text-slate-400 hover:text-white transition-colors" title="Download"><Download className="w-5 h-5"/></button>
                    <div className="flex items-center gap-1 text-indigo-400/60"><ShieldCheck className="w-4 h-4"/></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-white/5 mt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 font-mono">
              <ShieldCheck className="w-4 h-4 text-indigo-400/60" /> Forensic Security Active
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
      <section id="gallery" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-4">
            Created with <span className="gradient-text-premium">ExpressiveAI</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">Every video below was generated from a single text prompt. No edits, no post-production.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {/* Replace URLs with solid gradient placeholders since static photos won't load */}
           {[
             { prompt: "A surreal dreamscape where colors melt into music, ethereal waves of sound made visible", time: "10s", ratio: "16:9", bg: "from-indigo-600 to-purple-600" },
             { prompt: "An enchanted forest at twilight, bioluminescent mushrooms glowing in harmonious rhythm", time: "15s", ratio: "16:9", bg: "from-emerald-600 to-teal-600" },
             { prompt: "A neural network becoming conscious, data streams weaving into thoughts made of light", time: "10s", ratio: "1:1", bg: "from-cyan-600 to-blue-600" }
           ].map((g, i) => (
             <motion.div key={i} initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay: i * 0.1}} className="group glass-card glass-card-hover rounded-3xl overflow-hidden transition-all duration-300">
               <div className="relative">
                 <div className={`w-full aspect-video object-cover video-preview bg-gradient-to-br ${g.bg} opacity-50`}></div>
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
                 <div className="flex items-center justify-between mt-3">
                   <span className="text-xs font-mono text-slate-600 uppercase tracking-widest">{g.time} • {g.ratio}</span>
                   <div className="flex gap-3">
                     <button className="text-slate-500 hover:text-white transition-colors"><Share2 className="w-4 h-4" /></button>
                     <button className="text-slate-500 hover:text-red-400 transition-colors"><Heart className="w-4 h-4" /></button>
                   </div>
                 </div>
               </div>
             </motion.div>
           ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-4">
            Choose your <span className="gradient-text-premium">creative tier</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">Scale your imagination. Every tier includes forensic watermarking and Section 230 compliance.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="glass-card glass-card-hover rounded-3xl p-8 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><User className="w-5 h-5 text-slate-400"/></div>
              <div><h3 className="text-lg font-bold text-white">Free</h3><p className="text-xs text-slate-500">Explore & experiment</p></div>
            </div>
            <div className="mb-6"><span className="text-4xl font-extrabold text-white">$0</span><span className="text-slate-500">/month</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-green-500 flex-shrink-0"/> 5 videos per day</li>
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-green-500 flex-shrink-0"/> 10s max duration</li>
              <li className="flex items-center gap-3 text-sm text-slate-500"><X className="w-4 h-4 text-slate-600 flex-shrink-0"/> No commercial license</li>
            </ul>
            <button className="w-full py-3 rounded-full glass-card glass-card-hover text-sm font-semibold text-slate-300 transition-all">Get Started Free</button>
          </motion.div>

          {/* Pro Tier */}
          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.1}} className="pricing-glow-pro glass-card rounded-3xl p-8 transition-all duration-300 relative" style={{background: 'rgba(79, 70, 229, 0.08)', backdropFilter: 'blur(24px)'}}>
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/20 text-indigo-300">POPULAR</div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center"><Zap className="w-5 h-5 text-indigo-400"/></div>
              <div><h3 className="text-lg font-bold text-white">Pro</h3><p className="text-xs text-indigo-400">For serious creators</p></div>
            </div>
            <div className="mb-6"><span className="text-4xl font-extrabold text-white">$19</span><span className="text-slate-500">/month</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400 flex-shrink-0"/> 200 videos per month</li>
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400 flex-shrink-0"/> 30s max duration</li>
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400 flex-shrink-0"/> Priority GPU queue</li>
            </ul>
            <button className="w-full py-3 rounded-full btn-premium text-sm font-semibold text-white transition-all">Upgrade to Pro</button>
          </motion.div>

          {/* Creator Tier */}
          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.2}} className="glass-card glass-card-hover rounded-3xl p-8 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center"><Crown className="w-5 h-5 text-purple-400"/></div>
              <div><h3 className="text-lg font-bold text-white">Creator</h3><p className="text-xs text-purple-400">Unlimited power</p></div>
            </div>
            <div className="mb-6"><span className="text-4xl font-extrabold text-white">$49</span><span className="text-slate-500">/month</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-purple-400 flex-shrink-0"/> Unlimited videos</li>
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-purple-400 flex-shrink-0"/> 60s max duration</li>
              <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-purple-400 flex-shrink-0"/> 4K resolution</li>
            </ul>
            <button className="w-full py-3 rounded-full glass-card glass-card-hover text-sm font-semibold text-purple-300 border-purple-500/30 transition-all border">Go Creator Mode</button>
          </motion.div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-4">
            Built with <span className="gradient-text-premium">iron-clad security</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">Every output is traceable. Every user is accountable. This is responsible AI creation.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4"><ShieldCheck className="w-6 h-6 text-indigo-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">Forensic Watermarking</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Every video carries an invisible digital signature linking it to the generator's identity — your primary legal defense.</p>
          </motion.div>

          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.1}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4"><ScanEye className="w-6 h-6 text-purple-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">Smart Content Filter</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Artistic expression is protected while illegal content is hard-blocked. The filter understands creative intent.</p>
          </motion.div>

          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.2}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 flex items-center justify-center mb-4"><Scale className="w-6 h-6 text-fuchsia-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">Section 230 Compliant</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Users are the publishers of their content. ExpressiveAI operates as a neutral platform with clear indemnification.</p>
          </motion.div>

          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4"><Lock className="w-6 h-6 text-green-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">End-to-End Encrypted</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Your prompts and outputs are encrypted in transit and at rest. Only you can access your creative history.</p>
          </motion.div>

          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.1}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4"><Fingerprint className="w-6 h-6 text-amber-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">Identity Verification</h3>
            <p className="text-sm text-slate-400 leading-relaxed">MFA-enabled auth with Clerk ensures every account is tied to a real identity for accountability.</p>
          </motion.div>

          <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.2}} className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4"><Ban className="w-6 h-6 text-red-400"/></div>
            <h3 className="text-base font-bold text-white mb-2">Deepfake Prevention</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Celebrity and political figure prompts are automatically blocked. No exceptions, no workarounds.</p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="glass-card breathing-glow rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-4">
            Ready to <span className="gradient-text-premium">express</span>?
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-8">Join thousands of creators pushing the boundaries of AI-generated video. Your imagination is the only limit.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => handleScrollTo('generator')} className="flex items-center gap-2 px-8 py-3.5 text-base font-semibold btn-premium rounded-full">
              <Sparkles className="w-5 h-5" /> Start Creating — It's Free
            </button>
          </div>
          <p className="text-xs text-slate-600 font-mono mt-6">No credit card required · 5 free videos per day · Forensic security included</p>
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
                <li className="hover:text-slate-300 cursor-pointer">Terms of Service</li>
                <li className="hover:text-slate-300 cursor-pointer">Privacy Policy</li>
                <li className="hover:text-slate-300 cursor-pointer">Section 230 Notice</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Security</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><button onClick={() => handleScrollTo('security')} className="hover:text-slate-300">Watermarking</button></li>
                <li className="hover:text-slate-300 cursor-pointer">Content Policy</li>
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
                <p className="text-xs text-slate-600">© 2026 Owned and operated by Lockett Creative LLC. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
