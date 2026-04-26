import { useState, useEffect, useCallback } from 'react';
import { NeteaseMusicAdapter, type NeteaseTrack } from '@/lib/netease';

interface UseNeteaseMusicOptions {
  onTrackChange?: (track: NeteaseTrack, url: string | null) => void;
}

export function useNeteaseMusic(cookie: string, options?: UseNeteaseMusicOptions) {
  const [currentTrack, setCurrentTrack] = useState<NeteaseTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState({ position: 0, duration: 0 });
  const [error, setError] = useState<string | null>(null);

  // Use API proxy to avoid CORS issues
  const fetchProxy = useCallback(async (action: string, params?: any) => {
    const response = await fetch('/api/netease', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params, cookie })
    });
    return response.json();
  }, [cookie]);

  const playTrack = useCallback(async (track: NeteaseTrack) => {
    try {
      const data = await fetchProxy('songUrl', { id: track.id });

      setCurrentTrack(track);
      setIsPlaying(true);
      setProgress({ position: 0, duration: track.duration });

      if (options?.onTrackChange) {
        options.onTrackChange(track, data.data?.[0]?.url || null);
      }
    } catch (err) {
      setError(`播放失败: ${err}`);
    }
  }, [fetchProxy, options]);

  const getRecommendSongs = useCallback(async (): Promise<NeteaseTrack[]> => {
    try {
      const data = await fetchProxy('recommend');
      return (data.recommend || []).map((track: any) => ({
        id: track.id,
        name: track.name,
        artists: track.artists || track.ar || [],
        album: track.al || track.album || { name: '', picUrl: '' },
        duration: track.duration || track.dt || 0,
      }));
    } catch (err) {
      setError(`获取推荐失败: ${err}`);
      return [];
    }
  }, [fetchProxy]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (currentTrack) setIsPlaying(true);
  }, [currentTrack]);

  return {
    isReady: !!cookie,
    currentTrack,
    isPlaying,
    progress,
    error,
    playTrack,
    pause,
    resume,
    getRecommendSongs,
  };
}

export function createNeteaseAdapter(cookie?: string): NeteaseMusicAdapter {
  return new NeteaseMusicAdapter(cookie);
}