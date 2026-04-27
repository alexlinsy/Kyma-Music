'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatWindow from '@/components/ChatWindow';
import TasteOnboarding from '@/components/TasteOnboarding';
import RoutineSettings from '@/components/RoutineSettings';
import MoodSettings from '@/components/MoodSettings';
import LoginModal from '@/components/LoginModal';
import NeteaseLoginModal from '@/components/NeteaseLoginModal';
import MusicProviderModal from '@/components/MusicProviderModal';
import { Play, SkipForward, SkipBack, Volume2, VolumeX, Radio, Music, Disc, LogIn, Heart, Calendar, RefreshCw, Terminal, SlidersHorizontal, Sun, Moon, User as UserIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpotify } from '@/hooks/useSpotify';
import { useNeteaseMusic } from '@/hooks/useNetease';
import { generateSpeech } from '@/lib/tts';

export default function Home() {
  const [token, setToken] = useState<string>('');
  const [trackQueue, setTrackQueue] = useState<string[]>([]);
  const [volume, setVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [preMuteVolume, setPreMuteVolume] = useState<number>(0.5);

  const volumeRef = useRef<number>(0.5);
  const isTtsPlaying = useRef<boolean>(false);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [djScript, setDjScript] = useState<string>("Welcome back to Kyma. Shall we begin our musical journey today?");
  const [userPrefs, setUserPrefs] = useState<any>(null);
  const [isTasteModalOpen, setIsTasteModalOpen] = useState(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginReason, setLoginReason] = useState<string>('');
  const [isNeteaseModalOpen, setIsNeteaseModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [neteaseCookie, setNeteaseCookie] = useState<string>('');
  const [neteaseTrackState, setNeteaseTrackState] = useState<any>(null);
  const [neteaseIsPlaying, setNeteaseIsPlaying] = useState(false);
  const [neteasePosition, setNeteasePosition] = useState(0);
  const [neteasePlayBlocked, setNeteasePlayBlocked] = useState(false);
  const [neteaseGeoBlocked, setNeteaseGeoBlocked] = useState(false);
  const neteaseAudioRef = useRef<HTMLAudioElement | null>(null);
  const [user, setUser] = useState<any>(null);
  const [freePlays, setFreePlays] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrl = useRef<string | null>(null);
  const lastSpokenText = useRef<string>("");
  const isProcessingNext = useRef<boolean>(false);
  const skipNextIntroRef = useRef<boolean>(false); // prevents double intros when AI already introduced the track
  const hasAutoSynced = useRef<boolean>(false);
  const spotifyResetRef = useRef<boolean>(false); // prevents re-reading token after explicit reset
  const [spotifyReset, setSpotifyReset] = useState(false); // forces provider modal after explicit Reset
  const queueRef = useRef<string[]>([]);
  const trackEndedRef = useRef<() => void>(() => { });
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => { queueRef.current = trackQueue; }, [trackQueue]);

  const { player, isReady, currentTrack, isPlaying, progress, setProgress, deviceId, error: spotifyError, connect } = useSpotify(token, () => trackEndedRef.current());

  // --- NetEase Dual-Core Engine ---
  const { isPlaying: neteasePlaying, error: neteaseError, playTrack: playNeteaseTrack, getRecommendSongs } = useNeteaseMusic(neteaseCookie, {
    onTrackChange: (track, url) => {
      setNeteaseTrackState(track);
      setNeteaseGeoBlocked(false);
      if (!neteaseAudioRef.current) neteaseAudioRef.current = new Audio();
      const audio = neteaseAudioRef.current;
      console.log('[Kyma NetEase] onTrackChange url:', url);
      if (url) {
        audio.src = url;
        audio.volume = volumeRef.current;
        audio.currentTime = 0;
        audio.onended = () => trackEndedRef.current();
        audio.onplay = () => { setNeteaseIsPlaying(true); setNeteasePlayBlocked(false); };
        audio.onpause = () => setNeteaseIsPlaying(false);
        audio.play()
          .then(() => { setNeteasePlayBlocked(false); })
          .catch(err => {
            console.warn('[Kyma NetEase] play() blocked:', err.name, err.message);
            if (err.name === 'NotAllowedError') {
              setNeteasePlayBlocked(true);
            }
          });
      } else {
        // No stream URL — almost certainly a geo-restriction outside mainland China
        console.warn('[Kyma NetEase] No stream URL (geo-restricted or premium-only)');
        setNeteaseGeoBlocked(true);
        // Auto-skip to next track after 6 seconds
        setTimeout(() => {
          setNeteaseGeoBlocked(false);
          trackEndedRef.current();
        }, 6000);
      }
    }
  });

  const isNeteaseMode = !!neteaseCookie;
  const effectiveTrack = isNeteaseMode ? neteaseTrackState : currentTrack;
  const effectiveIsPlaying = isNeteaseMode ? neteaseIsPlaying : isPlaying;
  const effectivePosition = isNeteaseMode ? neteasePosition : progress.position;
  const effectiveDuration = isNeteaseMode ? (effectiveTrack?.duration || 0) : progress.duration;


  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isNeteaseMode && neteaseIsPlaying) {
      interval = setInterval(() => {
        if (neteaseAudioRef.current) {
          setNeteasePosition(neteaseAudioRef.current.currentTime * 1000);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isNeteaseMode, neteaseIsPlaying]);

  const log = useCallback((msg: string) => {
    setDebugLog(prev => {
      if (prev[0] === msg) return prev;
      return [msg, ...prev].slice(0, 20);
    });
    console.log(`[Kyma] ${msg}`);
  }, []);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Show the music-provider picker if no service is connected yet.
  // Returns true if a service is already connected, false if we need to wait.
  const requireMusicProvider = (): boolean => {
    // If the user explicitly reset Spotify, always show the picker (even if token is stale)
    if (spotifyReset) {
      setIsProviderModalOpen(true);
      return false;
    }
    if (token || neteaseCookie) return true;
    setIsProviderModalOpen(true);
    return false;
  };

  const updatePersistentHistory = useCallback(async (trackName: string, artists: string) => {
    const trackStr = `${trackName} - ${artists}`;
    try {
      await fetch('/api/user/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track: trackStr })
      });
    } catch (err) {
      console.error('Failed to update persistent history:', err);
    }
  }, []);

  const checkAILimit = (): boolean => {
    if (!requireMusicProvider()) return false;

    if (user) return true; // unlimited
    if (freePlays >= 5) {
      setLoginReason("You've reached your 5 free AI interactions. Log in to unlock unlimited AI DJ access!");
      setIsLoginModalOpen(true);
      return false;
    }
    const newPlays = freePlays + 1;
    setFreePlays(newPlays);
    localStorage.setItem('kyma_ai_uses', newPlays.toString());
    return true;
  };

  const requireAuth = (reason: string, callback: () => void) => {
    if (user) callback();
    else {
      setLoginReason(reason);
      setIsLoginModalOpen(true);
    }
  };

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
    if (!token && !neteaseCookie) return false;
    try {
      log(`Searching: ${trackName}`);
      if (neteaseCookie) {
        // NetEase search + play
        const res = await fetch('/api/netease', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'search', params: { keyword: trackName, limit: 1 }, cookie: neteaseCookie })
        });
        const data = await res.json();
        let rawTrack = data.result?.songs?.[0];
        if (rawTrack) {
          // If search result is "thin" (missing picUrl), fetch full song details
          const albumObj = rawTrack.album || rawTrack.al || {};
          let picUrl = albumObj.picUrl || rawTrack.al?.picUrl || rawTrack.picUrl || '';
          
          if (!picUrl && rawTrack.id) {
            log(`Thin result for ${rawTrack.name}. Fetching details...`);
            const detailRes = await fetch('/api/netease', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'songDetail', params: { id: rawTrack.id }, cookie: neteaseCookie })
            });
            const detailData = await detailRes.json();
            const detailedTrack = detailData.songs?.[0];
            if (detailedTrack) {
              rawTrack = { ...rawTrack, ...detailedTrack };
              picUrl = detailedTrack.al?.picUrl || detailedTrack.album?.picUrl || '';
            }
          }

          log(`Playing (NetEase): ${rawTrack.name}`);
          
          // Force HTTPS and higher quality
          if (picUrl && picUrl.startsWith('http:')) picUrl = picUrl.replace('http:', 'https:');
          if (picUrl && !picUrl.includes('?param=')) picUrl += '?param=400y400';

          log(`Track: ${rawTrack.name}, Pic: ${picUrl ? 'Found' : 'Missing'}`);
          
          await playNeteaseTrack({
            id: rawTrack.id, 
            name: rawTrack.name,
            artists: rawTrack.artists || rawTrack.ar || [], 
            album: { name: (rawTrack.album?.name || rawTrack.al?.name || ''), picUrl },
            duration: rawTrack.duration || rawTrack.dt || 0,
          });
          return true;
        }
      } else if (token && deviceId) {
        // Spotify search + play
        const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(trackName)}&type=track&limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const searchData = await searchRes.json();
        const trackUri = searchData.tracks?.items[0]?.uri;
        if (trackUri) {
          log(`Playing (Spotify): ${trackName}`);
          await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris: [trackUri], position_ms: 0 })
          });
          return true;
        }
      }
      return false;
    } catch (err: any) { log(`Play error: ${err.message}`); return false; }
  }, [token, deviceId, log, neteaseCookie, playNeteaseTrack]);

  const moveToNext = useCallback(async () => {
    if (isProcessingNext.current || (!token && !neteaseCookie)) return;
    isProcessingNext.current = true;
    try {
      const currentQueue = queueRef.current;
      if (currentQueue.length > 1) {
        const nextTrack = currentQueue[1];
        if (await playTrackAction(nextTrack)) setTrackQueue(prev => prev.slice(1));
      } else {
        if (!checkAILimit()) return;
        log("Queue empty. Asking AI...");
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "The queue is empty. Keep the radio going.", history: trackHistoryRef.current })
        });
        const data = await res.json();
        setDjScript(data.speech);
        speak(data.speech);
        if (data.tracks?.length > 0) {
          skipNextIntroRef.current = true; // AI already introduced this queue
          setTrackQueue(data.tracks);
          await playTrackAction(data.tracks[0]);
        }
      }
    } finally { isProcessingNext.current = false; }
  }, [token, neteaseCookie, playTrackAction, speak, log]);

  const handleAiResponse = useCallback(async (speech: string, tracks: string[]) => {
    setDjScript(speech);
    speak(speech);
    if (tracks?.length > 0) {
      skipNextIntroRef.current = true; // AI already introduced the track in its response
      setTrackQueue(tracks);
      // Play first track regardless of which engine is active
      await playTrackAction(tracks[0]);
    }
  }, [speak, playTrackAction]);

  useEffect(() => {
    trackEndedRef.current = () => {
      log("Track ended.");
      moveToNext();
    };
  }, [moveToNext, log]);

  const manualSkip = () => { log("Skip button clicked."); moveToNext(); };

  const handleSeek = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!effectiveDuration || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    let normalizedAngle = angle + 90;
    if (normalizedAngle < 0) normalizedAngle += 360;
    const percentage = normalizedAngle / 360;
    const seekMs = Math.floor(percentage * effectiveDuration);
    
    if (isNeteaseMode) {
      if (neteaseAudioRef.current) {
        neteaseAudioRef.current.currentTime = seekMs / 1000;
        setNeteasePosition(seekMs);
      }
    } else if (player) {
      setProgress(prev => ({ ...prev, position: seekMs }));
      player.seek(seekMs).catch((err: any) => log(`Seek err: ${err.message}`));
    }
  };

  useEffect(() => {
    log("Kyma Initialized.");
    const fetchUser = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const { data } = await createClient().auth.getUser();
      setUser(data?.user || null);
    };
    fetchUser();

    const val = localStorage.getItem('kyma_ai_uses');
    if (val) setFreePlays(parseInt(val, 10));

    // Restore NetEase cookie after client mount (avoids SSR hydration mismatch)
    const savedNeteaseCookie = localStorage.getItem('netease_cookie');
    if (savedNeteaseCookie) setNeteaseCookie(savedNeteaseCookie);

    const fetchPrefs = async () => {
      try {
        const res = await fetch('/api/user/preferences');
        if (res.status === 401) return; // not logged in
        const data = await res.json();
        setUserPrefs(data);
        if (data && data.isNewUser) setIsTasteModalOpen(true);
      } catch (e) {
        log("Error fetching preferences.");
      }
    };
    fetchPrefs();
  }, []);

  const lastAnnouncedTrackRef = useRef<string | null>(null);
  const trackHistoryRef = useRef<string[]>([]);

  useEffect(() => {
    if (effectiveTrack?.name) {
      const artistStr = effectiveTrack.artists.map((a: any) => a.name).join(', ');
      const trackStr = `${effectiveTrack.name} - ${artistStr}`;
      
      if (!trackHistoryRef.current.includes(trackStr)) {
        trackHistoryRef.current = [trackStr, ...trackHistoryRef.current].slice(0, 50);
        updatePersistentHistory(effectiveTrack.name, artistStr);
      }
    }
  }, [effectiveTrack?.id, updatePersistentHistory]);

  useEffect(() => {
    if (currentTrack?.id && isReady) {
      if (lastAnnouncedTrackRef.current === currentTrack.id) return;
      lastAnnouncedTrackRef.current = currentTrack.id;

      if (skipNextIntroRef.current) {
        skipNextIntroRef.current = false;
        log(`Skipping intro for ${currentTrack.name} as it was already introduced.`);
        return;
      }

      const announce = async () => {
        log(`Requesting DJ intro for ${currentTrack.name}`);

        if (!checkAILimit()) {
          log("AI Limit reached. Pausing music and showing modal.");
          if (player) player.pause();
          return;
        }

        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'intro',
              track: currentTrack,
              history: trackHistoryRef.current,
              localTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            })
          });
          const data = await res.json();
          if (data.speech) {
            setDjScript(data.speech);
            speak(data.speech);
          }
        } catch (e) {
          log(`DJ Intro error: ${e}`);
        }
      };

      // Wait slightly before announcing to let the user hear the track intro
      const timer = setTimeout(announce, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentTrack?.id, isReady, log, speak]); // Use empty array to avoid HMR size change errors during development

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (player && !isReady) connect();
      document.removeEventListener('click', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    return () => document.removeEventListener('click', handleFirstInteraction);
  }, [player, isReady, connect]);

  const applyVolumeGradually = useCallback((targetRaw: number, duration: number = 800) => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    // NetEase mode: fade the HTML Audio element directly
    if (neteaseAudioRef.current && !player) {
      const audio = neteaseAudioRef.current;
      const startVol = audio.volume;
      const steps = 15;
      const stepRate = duration / steps;
      const delta = (targetRaw - startVol) / steps;
      let stepCount = 0;
      fadeIntervalRef.current = setInterval(() => {
        stepCount++;
        audio.volume = Math.max(0, Math.min(1, audio.volume + delta));
        if (stepCount >= steps) {
          audio.volume = targetRaw;
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        }
      }, stepRate);
      return;
    }

    if (!player) return;

    player.getVolume().then((currVol: number) => {
      const steps = 15;
      const stepRate = duration / steps;
      const delta = (targetRaw - currVol) / steps;

      let stepCount = 0;
      fadeIntervalRef.current = setInterval(() => {
        stepCount++;
        currVol += delta;
        if (stepCount >= steps) {
          currVol = targetRaw;
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        }
        const v = Math.max(0, Math.min(1, currVol));
        player.setVolume(v).catch(() => {
          if (token) {
            fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(v * 100)}`, {
              method: 'PUT', headers: { 'Authorization': `Bearer ${token}` },
            }).catch(() => {});
          }
        });
      }, stepRate);
    }).catch(() => {
      player.setVolume(targetRaw).catch(() => {});
    });
  }, [player, token]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    volumeRef.current = newVolume;
    if (newVolume > 0) setIsMuted(false);

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    const effectiveVolume = isTtsPlaying.current ? newVolume * 0.15 : newVolume;

    // NetEase: set volume + muted (iOS ignores .volume, but .muted works everywhere)
    if (neteaseAudioRef.current) {
      try { neteaseAudioRef.current.volume = effectiveVolume; } catch (_) {}
      neteaseAudioRef.current.muted = effectiveVolume === 0;
    }

    // Spotify: try SDK first, REST API as fallback (also works on mobile)
    if (player) {
      player.setVolume(effectiveVolume).catch(() => {
        if (token) {
          fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(effectiveVolume * 100)}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
          }).catch(() => {});
        }
      });
    } else if (token && !neteaseAudioRef.current) {
      // Mobile: SDK not available but REST API works
      fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(effectiveVolume * 100)}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [player, token, log]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      // Unmute
      if (neteaseAudioRef.current) neteaseAudioRef.current.muted = false;
      handleVolumeChange(preMuteVolume || 0.5);
      setIsMuted(false);
    } else {
      // Mute — use .muted for mobile compatibility
      setPreMuteVolume(volume);
      if (neteaseAudioRef.current) neteaseAudioRef.current.muted = true;
      handleVolumeChange(0);
      setIsMuted(true);
    }
  }, [isMuted, preMuteVolume, volume, handleVolumeChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!audioRef.current) audioRef.current = new Audio();

    const onPlay = () => {
      isTtsPlaying.current = true;
      // Mobile: use mute/unmute since volume control is restricted
      if (neteaseAudioRef.current) {
        neteaseAudioRef.current.muted = true;
      } else {
        applyVolumeGradually(volumeRef.current * 0.15, 800);
      }
    };

    const onRestore = () => {
      if (!isTtsPlaying.current) return;
      isTtsPlaying.current = false;
      if (neteaseAudioRef.current) {
        neteaseAudioRef.current.muted = false;
      } else {
        applyVolumeGradually(volumeRef.current, 2000);
      }
    };

    const audio = audioRef.current;
    audio.addEventListener('play', onPlay);
    audio.addEventListener('ended', onRestore);
    audio.addEventListener('pause', onRestore);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('ended', onRestore);
      audio.removeEventListener('pause', onRestore);
    };
  }, [applyVolumeGradually]);

  useEffect(() => {
    if (isLightMode) document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  }, [isLightMode]);

  useEffect(() => {
    if (spotifyResetRef.current) return; // user explicitly reset — don't restore from storage
    const cookies = document.cookie;
    const savedToken = cookies.split('; ').find(row => row.startsWith('spotify_token='))?.split('=')[1] || localStorage.getItem('spotify_token') || '';
    if (savedToken && savedToken !== token) setToken(savedToken);
    if (savedToken && !hasAutoSynced.current) {
      hasAutoSynced.current = true;
      syncPlaylists(savedToken);
    }
  }, [syncPlaylists, token]);

  const togglePlay = async () => {
    if (!requireMusicProvider()) return;
    if (isNeteaseMode) {
      const audio = neteaseAudioRef.current;
      if (audio && neteaseTrackState && audio.src) {
        // Track already loaded — this IS a user gesture, play() will work
        if (neteaseIsPlaying) {
          audio.pause();
        } else {
          audio.play()
            .then(() => setNeteasePlayBlocked(false))
            .catch(err => console.warn('[Kyma] Netease play err:', err));
        }
      } else {
        // No track yet — ask AI. Note: play() after async may be blocked by
        // autoplay policy; if so, neteasePlayBlocked will show a tap-to-play btn.
        moveToNext();
      }
      return;
    }
    if (!token) { window.location.href = '/api/auth/spotify'; return; }
    if (player) { if (!isReady) connect(); player.togglePlay(); }
  };

  // Volume control functions moved up to fix Temporal Dead Zone

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
  };

  const progressPercent = effectiveDuration > 0 ? (effectivePosition / effectiveDuration) * 100 : 0;

  return (
    <main className="min-h-screen bg-kyma-bg text-kyma-text selection:bg-kyma-primary/30 font-inter text-sm transition-colors duration-500 relative overflow-hidden z-0">
      {/* Dynamic Ambient Album Background */}
      <div className="absolute inset-0 pointer-events-none z-[-1]">
        <AnimatePresence>
          {(effectiveTrack?.album?.images?.[0]?.url || effectiveTrack?.album?.picUrl) && (
            <motion.img
              key={effectiveTrack?.album?.images?.[0]?.url || effectiveTrack?.album?.picUrl}
              src={effectiveTrack?.album?.images?.[0]?.url || effectiveTrack?.album?.picUrl}
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: isLightMode ? 0.45 : 0.35, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              className="w-full h-full object-cover blur-[110px] transform-gpu saturate-150 will-change-[opacity,transform]"
            />
          )}
        </AnimatePresence>
      </div>

      <nav className="w-full h-14 border-b border-kyma-text/5 bg-kyma-bg/80 backdrop-blur-xl flex items-center px-4 md:px-6 justify-between sticky top-0 z-50 transition-colors duration-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-kyma-primary rounded-md flex items-center justify-center shadow-lg shadow-kyma-primary/20">
              <Radio size={14} className="text-white" />
            </div>
            <span className="font-bold tracking-tight text-sm text-kyma-primary">Kyma Music</span>
          </div>
          <button onClick={() => setIsLightMode(!isLightMode)} className="text-kyma-text/50 hover:text-kyma-text transition-colors" title="Toggle Light/Dark Mode">
            {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {user ? (
            <div className="flex items-center gap-1.5 ml-2 pl-4 border-l border-kyma-text/10 cursor-pointer" title={user.email}>
              <div className="w-6 h-6 rounded-full bg-kyma-primary/20 border border-kyma-primary/40 flex items-center justify-center">
                <UserIcon size={12} className="text-kyma-primary" />
              </div>
            </div>
          ) : (
            <button onClick={() => { setLoginReason(""); setIsLoginModalOpen(true); }} className="ml-2 pl-4 border-l border-kyma-text/10 text-[10px] font-bold uppercase tracking-wider text-kyma-text/70 hover:text-kyma-primary transition-colors flex items-center gap-1.5">
              <UserIcon size={12} /> <span className="hidden md:inline">Log In / Sign Up</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <button onClick={() => requireAuth("Backing up Playlists to your base requires an account.", () => syncPlaylists(token))} disabled={isSyncing} className={`flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full transition-all border border-transparent ${isLightMode ? 'text-kyma-primary/70 hover:text-kyma-primary hover:bg-kyma-primary/10 hover:border-kyma-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/10'} ${isSyncing ? 'opacity-50 cursor-wait' : ''}`}>
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> <span className="hidden lg:inline text-[11px] font-bold uppercase tracking-wider">{isSyncing ? 'Syncing...' : 'Sync For Preference'}</span>
          </button>
          <button onClick={() => requireAuth("Customizing Taste settings requires an account.", () => setIsTasteModalOpen(true))} className={`flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full transition-all border border-transparent ${isLightMode ? 'text-kyma-primary/70 hover:text-kyma-primary hover:bg-kyma-primary/10 hover:border-kyma-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/10'}`}>
            <Heart size={14} /> <span className="hidden md:inline text-[11px] font-bold uppercase tracking-wider">Taste</span>
          </button>
          <button onClick={() => requireAuth("Automating Routines requires an account.", () => setIsRoutineModalOpen(true))} className={`flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full transition-all border border-transparent ${isLightMode ? 'text-kyma-primary/70 hover:text-kyma-primary hover:bg-kyma-primary/10 hover:border-kyma-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/10'}`}>
            <Calendar size={14} /> <span className="hidden md:inline text-[11px] font-bold uppercase tracking-wider">Routine</span>
          </button>
          <button onClick={() => requireAuth("Setting up Mood rules requires an account.", () => setIsMoodModalOpen(true))} className={`flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full transition-all border border-transparent ${isLightMode ? 'text-kyma-primary/70 hover:text-kyma-primary hover:bg-kyma-primary/10 hover:border-kyma-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/10'}`}>
            <SlidersHorizontal size={14} /> <span className="hidden md:inline text-[11px] font-bold uppercase tracking-wider">Mood</span>
          </button>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative">
        <div className="lg:col-span-7 flex flex-col gap-8">

          <AnimatePresence>
            {isDevMode && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-kyma-panel border border-kyma-text/5 p-4 rounded-2xl font-mono text-[10px] space-y-1 mb-4 shadow-2xl transition-colors duration-500">
                  <div className="flex justify-between border-b border-kyma-text/5 pb-2 mb-2 text-kyma-primary font-bold uppercase tracking-widest">
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
              <button onClick={toggleMute} className="text-zinc-500 hover:text-kyma-primary transition-colors">{isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
              <div className="group relative flex-1 h-1 bg-zinc-800 rounded-full">
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 appearance-none" />
                <div className="h-full bg-kyma-primary rounded-full z-10 transition-all" style={{ width: `${volume * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center py-4">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 flex items-center justify-center mx-auto">
              {spotifyError && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md rounded-full border border-rose-500/30 overflow-hidden">
                  <div className="text-center p-6 flex flex-col items-center w-full">
                    <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle size={24} />
                    </div>
                    <span className="text-rose-400 font-bold text-[11px] tracking-widest uppercase mb-2">Playback Initialization Failed</span>
                    <span className="text-zinc-400 text-[9px] uppercase tracking-wider max-w-[80%] leading-relaxed text-center font-medium">
                      {spotifyError.includes('Premium') ? 'Spotify Premium subscription is strictly required to use the Web Playback SDK in browsers.' : spotifyError}
                    </span>
                  </div>
                </div>
              )}

              {/* NetEase: browser autoplay blocked — needs direct user gesture */}
              {neteasePlayBlocked && neteaseTrackState && (
                <button
                  onClick={() => {
                    const audio = neteaseAudioRef.current;
                    if (audio) audio.play().then(() => setNeteasePlayBlocked(false)).catch(() => {});
                  }}
                  className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-full border border-kyma-primary/30 overflow-hidden group cursor-pointer"
                >
                  <div className="text-center flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-kyma-primary/20 border border-kyma-primary/40 rounded-full flex items-center justify-center group-hover:bg-kyma-primary/30 transition-colors">
                      <Play size={28} fill="currentColor" className="text-kyma-primary ml-1" />
                    </div>
                    <span className="text-kyma-text/70 text-[10px] uppercase tracking-widest font-bold">Tap to Play</span>
                  </div>
                </button>
              )}

              {/* NetEase: geo-restricted track — show friendly message + auto-skip */}
              {neteaseGeoBlocked && neteaseTrackState && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md rounded-full border border-amber-500/25 overflow-hidden">
                  <div className="text-center flex flex-col items-center gap-3 px-8">
                    <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center">
                      {/* Globe icon */}
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-400">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-amber-400 font-bold text-[10px] tracking-widest uppercase mb-1.5">地区限制 · Region Locked</p>
                      <p className="text-zinc-400 text-[9px] leading-relaxed max-w-[160px] mx-auto">
                        此歌曲在中国大陆以外无法播放<br />
                        <span className="text-zinc-500">This track is unavailable outside mainland China due to licensing.</span>
                      </p>
                    </div>
                    <p className="text-zinc-600 text-[9px] tracking-wider">Skipping in 6s...</p>
                  </div>
                </div>
              )}

              <svg ref={svgRef} onClick={handleSeek} className="absolute inset-0 w-full h-full -rotate-90 overflow-visible z-30 cursor-pointer outline-none" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45.5" fill="none" stroke="transparent" strokeWidth="8" />
                <motion.circle cx="50" cy="50" r="45.5" fill="none" stroke="var(--kyma-primary)" strokeWidth="0.8" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: progressPercent / 100 }} style={{ filter: `drop-shadow(0 0 3px var(--kyma-glow))` }} transition={{ type: "tween", ease: "linear", duration: 1 }} />
              </svg>

              {/* Outer Shadow Container */}
              <div className="absolute w-[90%] h-[90%] rounded-full shadow-2xl pointer-events-none z-0" />

              <div
                className="relative w-[90%] h-[90%] rounded-full overflow-hidden z-10"
                style={{ WebkitMaskImage: 'radial-gradient(circle, transparent 14%, black 14.5%)', maskImage: 'radial-gradient(circle, transparent 14%, black 14.5%)' }}
              >
                <AnimatePresence mode="wait">
                  <motion.div key={effectiveTrack?.id || 'empty'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="w-full h-full rounded-full overflow-hidden relative group">
                    {(effectiveTrack?.album?.images?.[0]?.url || effectiveTrack?.album?.picUrl) ? (
                      <img 
                        src={effectiveTrack?.album?.images?.[0]?.url || effectiveTrack?.album?.picUrl} 
                        alt={effectiveTrack?.name} 
                        className={`w-full h-full object-cover transition-transform duration-700 ${effectiveIsPlaying ? 'animate-[spin_40s_linear_infinite]' : 'scale-95 opacity-80'}`} 
                        onError={(e) => log(`Image Load Failed: ${e.currentTarget.src.substring(0, 40)}...`)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-kyma-primary/10 transition-colors duration-500"><Music size={40} className="text-kyma-primary/60" /></div>
                    )}
                    {/* Vinyl Texture & Gloss */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-white/10 pointer-events-none" />
                    <div className="absolute inset-0 mix-blend-overlay pointer-events-none opacity-60" style={{ background: 'conic-gradient(from 45deg, transparent 0%, rgba(255,255,255,0.6) 15%, transparent 30%, transparent 50%, rgba(255,255,255,0.6) 65%, transparent 80%)' }} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 3D Vinyl Hole Rim Effect */}
              <div className="absolute z-20 w-[25.2%] h-[25.2%] rounded-full shadow-[inset_0_4px_10px_rgba(0,0,0,0.5),_0_2px_8px_rgba(0,0,0,0.2)] border border-black/10 pointer-events-none" />
            </div>

            <div className="mt-10 text-center space-y-2">
              <motion.h2 key={effectiveTrack?.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl md:text-2xl font-bold tracking-tight text-kyma-primary line-clamp-1 px-4">{effectiveTrack ? effectiveTrack.name : 'Ready to Broadcast'}</motion.h2>
              <div className="flex flex-col items-center">
                <motion.p key={effectiveTrack?.artists?.[0]?.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#a39e98] text-sm font-medium tracking-wide uppercase">{effectiveTrack ? effectiveTrack.artists.map((a: any) => a.name).join(', ') : 'Kyma Music'}</motion.p>
                <span className="text-[10px] font-mono text-zinc-600 tabular-nums font-bold mt-1.5 opacity-80">{formatTime(effectivePosition)} / {formatTime(effectiveDuration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-10 md:gap-14 py-4">
            <button className="text-zinc-500 hover:text-kyma-text transition-all active:scale-90" onClick={() => isNeteaseMode ? null : player?.previousTrack()}><SkipBack size={32} /></button>
            <button onClick={togglePlay} className="w-20 h-20 bg-kyma-primary text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-kyma-primary/40">
              {effectiveIsPlaying ? <div className="w-6 h-6 bg-white rounded-sm" /> : <Play size={36} fill="white" className="ml-1.5" />}
            </button>
            <button className="text-zinc-500 hover:text-kyma-text transition-all active:scale-90" onClick={manualSkip}><SkipForward size={32} /></button>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-kyma-panel border border-kyma-text/5 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 right-0 p-4"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-kyma-primary rounded-full animate-pulse" /><span className="text-[9px] font-bold text-kyma-primary uppercase tracking-widest">Live</span></div></div>
            <div className="flex items-center gap-2 mb-4"><Music size={14} className="text-zinc-500" /><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Kyma DJ On Air</span></div>
            <AnimatePresence mode="wait"><motion.div key={djScript} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-lg leading-relaxed text-kyma-text font-medium italic min-h-[4rem]">"{djScript}"</motion.div></AnimatePresence>
            {trackQueue.length > 1 && (<div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/5 backdrop-blur-sm"><span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest block mb-1.5">Up Next</span><div className="text-xs text-zinc-300 truncate font-medium">{trackQueue[1]}</div></div>)}
          </motion.div>
          <ChatWindow onResponse={handleAiResponse} onSendRequest={checkAILimit} history={trackHistoryRef.current} />
          <div className="flex flex-wrap gap-2">
            {['LO-FI', 'MORNING', 'FOCUS', 'AI-CURATED'].map(tag => (<span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] font-bold text-zinc-600 tracking-tighter hover:text-zinc-400 hover:border-zinc-700 transition-colors cursor-default">{tag}</span>))}
          </div>
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-6 right-6 z-[90]">
          <button onClick={() => setIsDevMode(!isDevMode)} className="p-2.5 rounded-full bg-white shadow-2xl transition-all border border-white hover:bg-zinc-50 group flex items-center justify-center">
            <Terminal size={14} className={isDevMode ? 'text-kyma-primary' : 'text-black'} />
          </button>
        </div>
      )}

      <TasteOnboarding isOpen={isTasteModalOpen} onClose={() => setIsTasteModalOpen(false)} initialData={userPrefs} onSave={(data) => { setUserPrefs(data); log("Taste updated."); }} />
      <RoutineSettings isOpen={isRoutineModalOpen} onClose={() => setIsRoutineModalOpen(false)} />
      <MoodSettings isOpen={isMoodModalOpen} onClose={() => setIsMoodModalOpen(false)} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} reason={loginReason} />
      <NeteaseLoginModal
        isOpen={isNeteaseModalOpen}
        onClose={() => setIsNeteaseModalOpen(false)}
        onLoginSuccess={(cookie, uid) => {
          setNeteaseCookie(cookie);
          localStorage.setItem('netease_cookie', cookie);
          log('网易云音乐连接成功！');
        }}
      />
      <MusicProviderModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        onSelectSpotify={() => {
          setIsProviderModalOpen(false);
          // User is actively re-connecting — clear the reset guard
          spotifyResetRef.current = false;
          setSpotifyReset(false);
          window.location.href = '/api/auth/spotify';
        }}
        onSelectNetease={() => {
          setIsProviderModalOpen(false);
          // Switching to NetEase — clear the Spotify reset guard
          spotifyResetRef.current = false;
          setSpotifyReset(false);
          setIsNeteaseModalOpen(true);
        }}
      />

      <footer className="mt-8 py-12 border-t border-white/5 text-center flex flex-col items-center gap-6">
        <div className="text-zinc-600 text-[11px] tracking-tight max-w-xs mx-auto leading-relaxed text-center">
          {'Kyma v1.2 • Notion Design System • Spotify Audio Engine'.split(' • ').map(tech => (
            <p key={tech}>{tech}</p>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          {user && (
            <button onClick={async () => {
              const { createClient } = await import('@/lib/supabase/client');
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.reload();
            }} className="text-zinc-700 text-[9px] uppercase font-bold tracking-[0.2em] hover:text-white transition-colors px-4 py-2 rounded-full border border-zinc-800/50 hover:border-white/20">Sign Out</button>
          )}

          {/* Reset Spotify: clears stored token but Spotify may auto-reconnect with cached session */}
          <button
            onClick={() => {
              spotifyResetRef.current = true;
              setSpotifyReset(true);
              localStorage.removeItem('spotify_token');
              document.cookie = 'spotify_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
              setToken('');
              if (player) player.disconnect();
              log('Spotify 已断开连接');
            }}
            className="text-zinc-700 text-[9px] uppercase font-bold tracking-[0.2em] hover:text-rose-500 transition-colors px-4 py-2 rounded-full border border-zinc-800/50 hover:border-rose-500/20"
          >Reset Spotify</button>

          {/* Switch Account: forces Spotify login screen via show_dialog=true */}
          {token && (
            <button
              onClick={() => {
                localStorage.removeItem('spotify_token');
                document.cookie = 'spotify_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                setToken('');
                if (player) player.disconnect();
                // Redirect with show_dialog=true to force the Spotify account picker
                window.location.href = '/api/auth/spotify?force=true';
              }}
              className="text-zinc-700 text-[9px] uppercase font-bold tracking-[0.2em] hover:text-kyma-primary transition-colors px-4 py-2 rounded-full border border-zinc-800/50 hover:border-kyma-primary/20"
            >Switch Account</button>
          )}

          {neteaseCookie && (
            <button onClick={() => { localStorage.removeItem('netease_cookie'); setNeteaseCookie(''); setNeteaseTrackState(null); log('网易云已断开连接'); }} className="text-zinc-700 text-[9px] uppercase font-bold tracking-[0.2em] hover:text-[#e60026] transition-colors px-4 py-2 rounded-full border border-zinc-800/50 hover:border-[#e60026]/20">Reset NetEase</button>
          )}
        </div>
      </footer>
    </main>
  );
}
