import { useState, useEffect, useCallback, useRef } from 'react';
import { initSpotifySDK } from '@/lib/spotify';

export function useSpotify(token: string, onTrackEnded?: () => void) {
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [progress, setProgress] = useState({ position: 0, duration: 0 });
  const [error, setError] = useState<string | null>(null);
  
  const onTrackEndedRef = useRef(onTrackEnded);
  const lastEndedUriRef = useRef<string | null>(null);

  useEffect(() => {
    onTrackEndedRef.current = onTrackEnded;
  }, [onTrackEnded]);

  const connectPlayer = useCallback(async (existingPlayer: any) => {
    if (!existingPlayer) return;
    try {
      console.log("Attempting to connect Spotify Player...");
      const success = await existingPlayer.connect();
      if (success) {
        console.log("Spotify Player connected successfully.");
      }
    } catch (err) {
      console.error("Connection attempt failed:", err);
    }
  }, []);

  const initPlayer = useCallback(async () => {
    if (!token || player) return;

    try {
      await initSpotifySDK();

      const spotifyPlayer = new window.Spotify.Player({
        name: 'Kyma AI Radio',
        getOAuthToken: (cb: (token: string) => void) => { cb(token); },
        volume: 0.5
      });

      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify Player Ready. Device ID:', device_id);
        setDeviceId(device_id);
        setIsReady(true);
        setError(null);
        
        // Transfer playback to this device
        fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ device_ids: [device_id], play: false }),
        }).catch(err => console.error("Transfer error:", err));
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
        setIsReady(false);
      });

      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        const currentUri = state.track_window.current_track.uri;
        const isAtEnd = state.paused && state.position === 0 && state.track_window.previous_tracks.length > 0;
        
        if (isAtEnd && lastEndedUriRef.current !== currentUri) {
          lastEndedUriRef.current = currentUri;
          if (onTrackEndedRef.current) onTrackEndedRef.current();
        }

        if (!state.paused && state.position > 0) {
          if (lastEndedUriRef.current === currentUri) lastEndedUriRef.current = null;
        }

        setCurrentTrack((prev: any) => {
          if (prev?.id !== currentUri && prev?.uri !== currentUri) {
            setProgress({ position: 0, duration: state.duration });
          } else {
            setProgress({ position: state.position, duration: state.duration });
          }
          return state.track_window.current_track;
        });
        setIsPlaying(!state.paused);
      });

      spotifyPlayer.addListener('initialization_error', ({ message }: any) => setError(`Init Error: ${message}`));
      spotifyPlayer.addListener('authentication_error', ({ message }: any) => setError(`Auth Error: ${message}`));
      spotifyPlayer.addListener('account_error', ({ message }: any) => setError(`Account Error (Premium Required): ${message}`));

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    } catch (err: any) {
      setError(`Setup error: ${err.message}`);
    }
  }, [token, player]);

  useEffect(() => {
    if (token) initPlayer();
  }, [token, initPlayer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(prev => ({
          ...prev,
          position: Math.min(prev.position + 1000, prev.duration)
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return { player, isReady, currentTrack, isPlaying, deviceId, progress, setProgress, error, connect: () => connectPlayer(player) };
}
