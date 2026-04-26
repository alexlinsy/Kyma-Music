const fs = require('fs');
const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace(
  `import LoginModal from '@/components/LoginModal';`,
  `import LoginModal from '@/components/LoginModal';\nimport NeteaseLoginModal from '@/components/NeteaseLoginModal';\nimport { useNeteaseMusic } from '@/hooks/useNetease';`
);

// 2. State
content = content.replace(
  `const [loginReason, setLoginReason] = useState<string>('');`,
  `const [loginReason, setLoginReason] = useState<string>('');\n  const [isNeteaseModalOpen, setIsNeteaseModalOpen] = useState(false);\n  const [neteaseCookie, setNeteaseCookie] = useState('');\n  const [neteaseUid, setNeteaseUid] = useState<number>(0);\n  const neteaseAudioRef = useRef<HTMLAudioElement | null>(null);\n  const neteaseProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);\n  const [neteaseTrackState, setNeteaseTrackState] = useState<any>(null);`
);

// 3. Hooks Setup
content = content.replace(
  `const { player, isReady, currentTrack, isPlaying, progress, setProgress, deviceId, error: spotifyError, connect } = useSpotify(token, () => trackEndedRef.current());`,
  `const { player, isReady, currentTrack, isPlaying, progress, setProgress, deviceId, error: spotifyError, connect } = useSpotify(token, () => trackEndedRef.current());

  const { isPlaying: neteasePlaying, progress: neteaseProgress, error: neteaseError, playTrack: playNeteaseTrack, pause: pauseNetease, resume: resumeNetease, getRecommendSongs } = useNeteaseMusic(neteaseCookie, {
    onTrackChange: (track, url) => {
      setNeteaseTrackState(track);
      if (url) {
        if (!neteaseAudioRef.current) {
          neteaseAudioRef.current = new Audio();
        }
        neteaseAudioRef.current.src = url;
        neteaseAudioRef.current.volume = volumeRef.current;
        neteaseAudioRef.current.currentTime = 0;
        neteaseAudioRef.current.play().catch(err => console.log('Audio play error:', err));
        
        neteaseAudioRef.current.onended = () => {
          trackEndedRef.current();
        };
      }
      console.log(\`[Kyma] Playing Netease: \${track.name}\`);
    }
  });

  // Netease Progress Sync
  useEffect(() => {
    if (neteasePlaying && neteaseAudioRef.current) {
      neteaseProgressIntervalRef.current = setInterval(() => {
        if (neteaseAudioRef.current) {
           // We just read directly when rendering, or update a state. Actually, let's just trigger a re-render or let it be.
        }
      }, 1000);
    } else {
      if (neteaseProgressIntervalRef.current) clearInterval(neteaseProgressIntervalRef.current);
    }
    return () => { if (neteaseProgressIntervalRef.current) clearInterval(neteaseProgressIntervalRef.current); };
  }, [neteasePlaying]);

  const activeMode = neteaseCookie ? 'netease' : 'spotify';
  const effectiveTrack = activeMode === 'netease' ? neteaseTrackState : currentTrack;
  const effectiveIsPlaying = activeMode === 'netease' ? neteasePlaying : isPlaying;
`
);

// 4. playTrackAction
const oldPlayTrackAction = `const playTrackAction = useCallback(async (trackName: string) => {
    if (!token || !deviceId) return false;
    try {
      log(\`Searching: \${trackName}\`);
      const searchRes = await fetch(\`https://api.spotify.com/v1/search?q=\${encodeURIComponent(trackName)}&type=track&limit=1\`, {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const searchData = await searchRes.json();
      const trackUri = searchData.tracks?.items[0]?.uri;
      if (trackUri) {
        log(\`Playing: \${trackName}\`);
        await fetch(\`https://api.spotify.com/v1/me/player/play?device_id=\${deviceId}\`, {
          method: 'PUT',
          headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ uris: [trackUri], position_ms: 0 })
        });
        return true;
      }
      return false;
    } catch (err: any) { log(\`Play error: \${err.message}\`); return false; }
  }, [token, deviceId, log]);`;

const newPlayTrackAction = `const playTrackAction = useCallback(async (trackName: string) => {
    if (!token && !neteaseCookie) return false;
    try {
      log(\`Searching: \${trackName}\`);
      if (neteaseCookie) {
        const res = await fetch('/api/netease', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'search', params: { keyword: trackName, limit: 1 }, cookie: neteaseCookie }) });
        const data = await res.json();
        const nTrack = data.result?.songs?.[0];
        if (nTrack) {
          log(\`Playing: \${trackName}\`);
          const adaptedTrack = {
            id: nTrack.id,
            name: nTrack.name,
            artists: nTrack.artists || [],
            album: nTrack.album || { name: '', picUrl: '' },
            duration: nTrack.duration || 0,
          };
          await playNeteaseTrack(adaptedTrack);
          return true;
        }
      } else if (token && deviceId) {
        const searchRes = await fetch(\`https://api.spotify.com/v1/search?q=\${encodeURIComponent(trackName)}&type=track&limit=1\`, {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        const searchData = await searchRes.json();
        const trackUri = searchData.tracks?.items[0]?.uri;
        if (trackUri) {
          log(\`Playing: \${trackName}\`);
          await fetch(\`https://api.spotify.com/v1/me/player/play?device_id=\${deviceId}\`, {
            method: 'PUT',
            headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris: [trackUri], position_ms: 0 })
          });
          return true;
        }
      }
      return false;
    } catch (err: any) { log(\`Play error: \${err.message}\`); return false; }
  }, [token, deviceId, log, neteaseCookie, playNeteaseTrack]);`;

content = content.replace(oldPlayTrackAction, newPlayTrackAction);

// 5. activeTrack logic UI replacements
content = content.replace(/currentTrack\?/g, "effectiveTrack?");
content = content.replace(/currentTrack\.name/g, "effectiveTrack.name");
content = content.replace(/currentTrack\.id/g, "effectiveTrack.id");
content = content.replace(/currentTrack\.artists/g, "effectiveTrack.artists");
content = content.replace(/currentTrack\.album/g, "effectiveTrack.album");
content = content.replace(/isPlaying/g, "effectiveIsPlaying");
content = content.replace(/const effectiveIsPlaying = activeMode === 'netease' \? neteasePlaying : effectiveIsPlaying;/g, "const effectiveIsPlaying = activeMode === 'netease' ? neteasePlaying : isPlaying;"); // Revert any self replacement
content = content.replace(/volume === 0 \? <VolumeX/g, "volume === 0 ? <VolumeX");

// 6. Fix handleVolumeChange for Netease
content = content.replace(
  `const handleVolumeChange = useCallback((v: number) => {`,
  `const handleVolumeChange = useCallback((v: number) => {
    if (neteaseAudioRef.current) neteaseAudioRef.current.volume = v;`
);

// 7. Add Netease UI Header Log In
content = content.replace(
  `{user && (
            <button onClick={async () => {`,
  `<button onClick={() => setIsNeteaseModalOpen(true)} className="text-zinc-700 text-[9px] uppercase font-bold tracking-[0.2em] hover:text-[#e60026] transition-colors px-4 py-2 rounded-full border border-zinc-800/50 hover:border-[#e60026]/20">Login NetEase</button>
          
          {user && (
            <button onClick={async () => {`
);

// Add Modals
content = content.replace(
  `<LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} reason={loginReason} />`,
  `<LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} reason={loginReason} />\n      <NeteaseLoginModal isOpen={isNeteaseModalOpen} onClose={() => setIsNeteaseModalOpen(false)} onLoginSuccess={(cookie, uid) => { setNeteaseCookie(cookie); setNeteaseUid(uid); console.log("网易云登录成功"); }} />`
);

// Update progress formats
content = content.replace(
  `{formatTime(progress.position)} / {formatTime(progress.duration)}`,
  `{formatTime(activeMode === 'netease' ? (neteaseAudioRef.current?.currentTime ? neteaseAudioRef.current.currentTime * 1000 : 0) : progress.position)} / {formatTime(activeMode === 'netease' ? effectiveTrack?.duration || 0 : progress.duration)}`
);

fs.writeFileSync(file, content);
console.log('Patched page.tsx successfully');
