'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatWindow from '@/components/ChatWindow';
import TasteOnboarding from '@/components/TasteOnboarding';
import RoutineSettings from '@/components/RoutineSettings';
import { Play, SkipForward, SkipBack, Volume2, VolumeX, Radio, Music, Disc, LogIn, Heart, Calendar, RefreshCw, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpotify } from '@/hooks/useSpotify';
import { generateSpeech } from '@/lib/tts';

export default function Home() {
  const [token, setToken] = useState<string>('');
  const [trackQueue, setTrackQueue] = useState<string[]>([]);
  const [volume, setVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [preMuteVolume, setPreMuteVolume] = useState<number>(0.5);
  const [djScript, setDjScript] = useState<string>("Welcome back to Kyma. Shall we begin our musical journey today?");
  const [userPrefs, setUserPrefs] = useState<any>(null);
  const [isTasteModalOpen, setIsTasteModalOpen] = useState(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrl = useRef<string | null>(null);
  const lastSpokenText = useRef<string>("");
  const isProcessingNext = useRef<boolean>(false);
  const hasAutoSynced = useRef<boolean>(false);
  const queueRef = useRef<string[]>([]);
  const trackEndedRef = useRef<() => void>(() => {});
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => { queueRef.current = trackQueue; }, [trackQueue]);

  const { player, isReady, currentTrack, isPlaying, progress, setProgress, deviceId, error: spotifyError, connect } = useSpotify(token, () => trackEndedRef.current());

  const log = useCallback((msg: string) => {
    setDebugLog(prev => {
      if (prev[0] === msg) return prev;
      return [msg, ...prev].slice(0, 20);
    });
    console.log(`[Kyma] ${msg}`);
  }, []);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const syncPlaylists = useCallback(async (accessToken: string) => {
    if (!accessToken) return;
    setIsSyncing(true);
    log("Sync: Robust Mode...");
    
    let collections: any[] = [];
    
    try {
      const spotifyFetch = async (url: string) => {
        const r = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (r.status === 429) {
          const retryAfter = r.headers.get('Retry-After');
          return { error: 'rate_limit', retryAfter: parseInt(retryAfter || '5') };
        }
        if (!r.ok) return { error: r.status };
        return r.json();
      };

      // 1. Liked Songs
      log("Step 1: Liked Songs...");
      const likedData = await spotifyFetch('https://api.spotify.com/v1/me/tracks?limit=20');
      if (likedData && !likedData.error) {
        const tracks = likedData.items?.map((i: any) => `${i.track?.name} - ${i.track?.artists?.map((a: any) => a.name).join(', ')}`) || [];
        collections.push({ name: "Liked Songs", id: "liked-songs", description: "Your top picks", tracks });
        log(`Fetched ${tracks.length} liked songs.`);
      } else {
        log("Could not fetch liked songs.");
      }

      await sleep(1000);

      // 2. Playlists
      log("Step 2: Playlists...");
      const plData = await spotifyFetch('https://api.spotify.com/v1/me/playlists?limit=8');
      
      if (plData && plData.error) {
        log(`Playlist fetch stopped: ${plData.error}`);
      } else if (plData && plData.items && plData.items.length > 0) {
        log(`Found ${plData.items.length} playlists. Syncing details...`);
        for (const pl of plData.items) {
          log(`Syncing: ${pl.name}...`);
          await sleep(1500);
          const tData = await spotifyFetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=5`);
          
          if (tData && tData.error) {
            log(`Skipped ${pl.name} (${tData.error})`);
            collections.push({ name: pl.name, id: pl.id, tracks: [] });
            continue;
          }

          const tracks = tData.items?.map((i: any) => `${i.track?.name} - ${i.track?.artists?.map((a: any) => a.name).join(', ')}`) || [];
          collections.push({
            name: pl.name, id: pl.id, description: pl.description || "",
            tracks
          });
        }
      } else {
        log("No playlists found in your account.");
      }

      if (collections.length > 0) {
        log(`Updating brain with ${collections.length} groups...`);
        const saveRes = await fetch('/api/user/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playlists: collections })
        });
        const saveStatus = await saveRes.json();
        log(`Sync Complete! (${saveStatus.size} bytes written)`);
      } else {
        log("Sync failed: No data fetched.");
      }

    } catch (err: any) {
      log(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [log]); // Remove isSyncing to prevent dependency instability

  const speak = useCallback(async (text: string) => {
    if (!text || text === lastSpokenText.current) return;
    lastSpokenText.current = text;
    log("Kyma speaking...");
    const audioUrl = await generateSpeech(text);
    if (audioUrl && audioRef.current) {
      if (currentAudioUrl.current) URL.revokeObjectURL(currentAudioUrl.current);
      currentAudioUrl.current = audioUrl;
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(e => log(`Audio error: ${e.message}`));
    }
  }, [log]);

  const playTrackAction = useCallback(async (trackName: string) => {
    if (!token || !deviceId) return false;
    try {
      log(`Searching: ${trackName}`);
      const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(trackName)}&type=track&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const searchData = await searchRes.json();
      const trackUri = searchData.tracks?.items[0]?.uri;
      if (trackUri) {
        log(`Playing: ${trackName}`);
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ uris: [trackUri], position_ms: 0 })
        });
        return true;
      }
      return false;
    } catch (err: any) { log(`Play error: ${err.message}`); return false; }
  }, [token, deviceId, log]);

  const moveToNext = useCallback(async () => {
    if (isProcessingNext.current || !token || !deviceId) return;
    isProcessingNext.current = true;
    try {
      const currentQueue = queueRef.current;
      if (currentQueue.length > 1) {
        const nextTrack = currentQueue[1];
        if (await playTrackAction(nextTrack)) setTrackQueue(prev => prev.slice(1));
      } else {
        log("Queue empty. Asking AI...");
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "The queue is empty. Keep the radio going." })
        });
        const data = await res.json();
        setDjScript(data.speech);
        speak(data.speech);
        if (data.tracks?.length > 0) {
          setTrackQueue(data.tracks);
          await playTrackAction(data.tracks[0]);
        }
      }
    } finally { isProcessingNext.current = false; }
  }, [token, deviceId, playTrackAction, speak, log]);

  const handleAiResponse = useCallback(async (speech: string, tracks: string[]) => {
    setDjScript(speech);
    speak(speech);
    if (tracks?.length > 0) {
      setTrackQueue(tracks);
      if (token && deviceId) await playTrackAction(tracks[0]);
    }
  }, [speak, token, deviceId, playTrackAction]);

  useEffect(() => {
    trackEndedRef.current = () => {
      log("Track ended.");
      moveToNext();
    };
  }, [moveToNext, log]);

  const manualSkip = () => { log("Skip button clicked."); moveToNext(); };

  const handleSeek = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!player || !progress.duration || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    let normalizedAngle = angle + 90; 
    if (normalizedAngle < 0) normalizedAngle += 360;
    const percentage = normalizedAngle / 360;
    const seekMs = Math.floor(percentage * progress.duration);
    setProgress(prev => ({ ...prev, position: seekMs }));
    player.seek(seekMs).catch((err: any) => log(`Seek err: ${err.message}`));
  };

  useEffect(() => {
    log("Kyma Initialized.");
    const fetchPrefs = async () => {
      try {
        const res = await fetch('/api/user/preferences');
        const data = await res.json();
        setUserPrefs(data);
        if (data && data.isNewUser) setIsTasteModalOpen(true);
      } catch (e) {
        log("Error fetching preferences.");
      }
    };
    fetchPrefs();
  }, []); // Use empty array to avoid HMR size change errors during development

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (player && !isReady) connect();
      document.removeEventListener('click', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    return () => document.removeEventListener('click', handleFirstInteraction);
  }, [player, isReady, connect]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) audioRef.current = new Audio();
  }, []);

  useEffect(() => {
    const cookies = document.cookie;
    const savedToken = cookies.split('; ').find(row => row.startsWith('spotify_token='))?.split('=')[1] || localStorage.getItem('spotify_token') || '';
    if (savedToken && savedToken !== token) setToken(savedToken);
    if (savedToken && !hasAutoSynced.current) {
      hasAutoSynced.current = true;
      syncPlaylists(savedToken);
    }
  }, [syncPlaylists, token]);

  const togglePlay = async () => {
    if (!token) { window.location.href = '/api/auth/spotify'; return; }
    if (player) { if (!isReady) connect(); player.togglePlay(); }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
    if (player) player.setVolume(newVolume).catch((err: any) => log(`Vol err: ${err.message}`));
  };

  const toggleMute = () => {
    if (isMuted) { handleVolumeChange(preMuteVolume || 0.5); setIsMuted(false); }
    else { setPreMuteVolume(volume); handleVolumeChange(0); setIsMuted(true); }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
  };

  const progressPercent = progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-[#f6f5f4] selection:bg-[#0075de]/30 font-inter text-sm">
      <nav className="w-full h-14 border-b border-white/5 bg-[#0f0f0f]/80 backdrop-blur-xl flex items-center px-6 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#0075de] rounded-md flex items-center justify-center shadow-lg shadow-[#0075de]/20">
            <Radio size={14} className="text-white" />
          </div>
          <span className="font-bold tracking-tight text-sm">Kyma Music</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => syncPlaylists(token)} disabled={isSyncing} className={`flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-full transition-all text-zinc-400 hover:text-white border border-transparent hover:border-white/10 ${isSyncing ? 'opacity-50 cursor-wait' : ''}`}>
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> <span className="text-[11px] font-bold uppercase tracking-wider">{isSyncing ? 'Syncing' : 'Sync'}</span>
          </button>
          <button onClick={() => setIsTasteModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-full transition-all text-zinc-400 hover:text-white border border-transparent hover:border-white/10">
            <Heart size={14} /> <span className="text-[11px] font-bold uppercase tracking-wider">Taste</span>
          </button>
          <button onClick={() => setIsRoutineModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-full transition-all text-zinc-400 hover:text-white border border-transparent hover:border-white/10">
            <Calendar size={14} /> <span className="text-[11px] font-bold uppercase tracking-wider">Routine</span>
          </button>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 relative">
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          <AnimatePresence>
            {isDevMode && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-[#121212] border border-white/10 p-4 rounded-2xl font-mono text-[10px] space-y-1 mb-4 shadow-2xl">
                  <div className="flex justify-between border-b border-white/5 pb-2 mb-2 text-[#0075de] font-bold uppercase tracking-widest">
                    <span>Diagnostic Terminal</span>
                    <span>{isReady ? 'System Ready' : 'Connecting...'}</span>
                  </div>
                  <div className="max-h-[180px] overflow-y-auto space-y-1.5 custom-scrollbar py-1">
                    {debugLog.length > 0 ? (
                      debugLog.map((l, i) => <div key={i} className={`${i === 0 ? 'text-white' : 'text-zinc-500'} truncate`}>{`> ${l}`}</div>)
                    ) : (
                      <div className="text-zinc-700 italic">No activity logs yet...</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center w-full px-4 pt-4">
            <div className="flex items-center gap-4 px-6 py-3 w-1/2">
              <button onClick={toggleMute} className="text-zinc-500 hover:text-white transition-colors">{isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
              <div className="group relative flex-1 h-1 bg-zinc-800 rounded-full">
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 appearance-none" />
                <div className="h-full bg-zinc-600 rounded-full z-10 transition-all group-hover:bg-[#0075de]" style={{ width: `${volume * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center py-4">
            <div className="relative w-96 h-96 flex items-center justify-center">
              <svg ref={svgRef} onClick={handleSeek} className="absolute inset-0 w-full h-full -rotate-90 overflow-visible z-30 cursor-pointer" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45.5" fill="none" stroke="transparent" strokeWidth="8" />
                <motion.circle cx="50" cy="50" r="45.5" fill="none" stroke="#0075de" strokeWidth="0.8" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: progressPercent / 100 }} style={{ filter: "drop-shadow(0 0 2px #0075de)" }} transition={{ type: "tween", ease: "linear", duration: 1 }} />
              </svg>
              <div className="relative w-[90%] h-[90%] rounded-full shadow-2xl overflow-hidden z-10 border border-white/5 bg-[#121212]">
                <AnimatePresence mode="wait">
                  <motion.div key={currentTrack?.id || 'empty'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="w-full h-full rounded-full overflow-hidden relative group">
                    {currentTrack?.album?.images?.[0]?.url ? (
                      <img src={currentTrack.album.images[0].url} alt={currentTrack.name} className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'animate-[spin_40s_linear_infinite]' : 'scale-95 opacity-80'}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]"><Music size={40} className="text-zinc-800" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-10 text-center space-y-2">
              <motion.h2 key={currentTrack?.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold tracking-tight text-white line-clamp-1 px-4">{currentTrack ? currentTrack.name : 'Ready to Broadcast'}</motion.h2>
              <div className="flex flex-col items-center">
                <motion.p key={currentTrack?.artists?.[0]?.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#a39e98] text-sm font-medium tracking-wide uppercase">{currentTrack ? currentTrack.artists.map((a:any) => a.name).join(', ') : 'Kyma Music'}</motion.p>
                <span className="text-[10px] font-mono text-zinc-600 tabular-nums font-bold mt-1.5 opacity-80">{formatTime(progress.position)} / {formatTime(progress.duration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-14 py-4">
             <button className="text-zinc-500 hover:text-white transition-all active:scale-90" onClick={() => player?.previousTrack()}><SkipBack size={32} /></button>
             <button onClick={togglePlay} className="w-20 h-20 bg-[#0075de] text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_15px_40px_rgba(0,117,222,0.4)]">
               {isPlaying ? <div className="w-6 h-6 bg-white rounded-sm" /> : <Play size={36} fill="white" className="ml-1.5" />}
             </button>
             <button className="text-zinc-500 hover:text-white transition-all active:scale-90" onClick={manualSkip}><SkipForward size={32} /></button>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-[#181818] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#0075de] rounded-full animate-pulse" /><span className="text-[9px] font-bold text-[#0075de] uppercase tracking-widest">Live</span></div></div>
            <div className="flex items-center gap-2 mb-4"><Music size={14} className="text-zinc-500" /><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Kyma DJ On Air</span></div>
            <AnimatePresence mode="wait"><motion.div key={djScript} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-lg leading-relaxed text-zinc-200 font-medium italic min-h-[4rem]">"{djScript}"</motion.div></AnimatePresence>
            {trackQueue.length > 1 && (<div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/5 backdrop-blur-sm"><span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest block mb-1.5">Up Next</span><div className="text-xs text-zinc-300 truncate font-medium">{trackQueue[1]}</div></div>)}
          </motion.div>
          <ChatWindow onResponse={handleAiResponse} />
          <div className="flex flex-wrap gap-2">
            {['LO-FI', 'MORNING', 'FOCUS', 'AI-CURATED'].map(tag => (<span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] font-bold text-zinc-600 tracking-tighter hover:text-zinc-400 hover:border-zinc-700 transition-colors cursor-default">{tag}</span>))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-[90]">
        <button onClick={() => setIsDevMode(!isDevMode)} className="p-2.5 rounded-full bg-white shadow-2xl transition-all border border-white hover:bg-zinc-50 group flex items-center justify-center">
          <Terminal size={14} className={isDevMode ? 'text-[#0075de]' : 'text-black'} />
        </button>
      </div>

      <TasteOnboarding isOpen={isTasteModalOpen} onClose={() => setIsTasteModalOpen(false)} initialData={userPrefs} onSave={(data) => { setUserPrefs(data); log("Taste updated."); }} />
      <RoutineSettings isOpen={isRoutineModalOpen} onClose={() => setIsRoutineModalOpen(false)} />

      <footer className="mt-8 py-12 border-t border-white/5 text-center flex flex-col items-center gap-6">
        <p className="text-zinc-600 text-[11px] tracking-tight max-w-xs mx-auto leading-loose">Kyma v1.2 • Notion Design System • Spotify Audio Engine</p>
        <button onClick={() => { localStorage.removeItem('spotify_token'); document.cookie = "spotify_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; window.location.reload(); }} className="text-zinc-700 text-[9px] uppercase font-bold tracking-[0.2em] hover:text-rose-500 transition-colors px-4 py-2 rounded-full border border-zinc-800/50 hover:border-rose-500/20">Reset Environment</button>
      </footer>
    </main>
  );
}
