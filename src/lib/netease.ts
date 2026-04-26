/**
 * NetEase Music (网易云音乐) Adapter
 * Uses proper encryption for authentication
 */
import CryptoJS from 'crypto-js';

export interface NeteaseTrack {
  id: number;
  name: string;
  artists: { name: string }[];
  album: { name: string; picUrl: string };
  duration: number;
}

export interface NeteasePlaylist {
  id: number;
  name: string;
  coverImgUrl: string;
  trackCount: number;
}

function hexReverse(str: string): string {
  const hex = str.toLowerCase();
  let result = '';
  for (let i = hex.length - 2; i >= 0; i -= 2) {
    result += hex.substring(i, i + 2);
  }
  return result;
}

function encryptPassword(password: string): string {
  const passwordMd5 = CryptoJS.MD5(password).toString();
  const reversedMd5 = hexReverse(passwordMd5);
  return CryptoJS.MD5(reversedMd5 + 'ck_ecb').toString();
}

export class NeteaseMusicAdapter {
  private cookie: string = '';
  private deviceId: string;

  constructor(cookie?: string) {
    this.cookie = cookie || '';
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private getHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://music.163.com/',
      'Origin': 'https://music.163.com',
    };
  }

  /**
   * Login with phone number
   */
  async loginWithPhone(phone: string, password: string): Promise<{ token: string; cookie: string }> {
    const encryptedPassword = encryptPassword(password);

    const response = await fetch('https://music.163.com/api/login/cellphone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...this.getHeaders(),
      },
      body: new URLSearchParams({
        phone,
        password: encryptedPassword,
        countrycode: '86',
        md5pwd: encryptedPassword,
        rememberLogin: 'true',
      }),
    });

    const data = await response.json();

    if (data.code === 400 || data.code === 502) {
      throw new Error(data.msg || '登录失败，请检查手机号和密码');
    }

    if (data.code !== 200) {
      throw new Error(data.msg || `登录失败 (code: ${data.code})`);
    }

    return {
      token: data.token || '',
      cookie: typeof data.cookie === 'string' ? data.cookie : JSON.stringify(data.cookie),
    };
  }

  /**
   * Get user's playlists
   */
  async getUserPlaylists(uid: number): Promise<NeteasePlaylist[]> {
    const response = await fetch(
      `https://music.163.com/api/user/playlist?uid=${uid}&limit=100&timestamp=${Date.now()}`,
      { headers: { Cookie: this.cookie, ...this.getHeaders() } }
    );

    const data = await response.json();
    return (data.playlist || []).map((pl: any) => ({
      id: pl.id,
      name: pl.name,
      coverImgUrl: pl.coverImgUrl || pl.coverUrl || '',
      trackCount: pl.trackCount || 0,
    }));
  }

  /**
   * Get playlist tracks
   */
  async getPlaylistTracks(playlistId: number): Promise<NeteaseTrack[]> {
    const response = await fetch(
      `https://music.163.com/api/playlist/v4/detail?id=${playlistId}&id=${playlistId}&n=10000`,
      { headers: { Cookie: this.cookie, ...this.getHeaders() } }
    );

    const data = await response.json();
    return (data.tracks || []).map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.ar || track.artists || [],
      album: track.al || track.album || { name: '', picUrl: '' },
      duration: track.dt || track.duration || 0,
    }));
  }

  /**
   * Search songs
   */
  async searchSongs(keyword: string, limit = 20): Promise<NeteaseTrack[]> {
    const response = await fetch(
      `https://music.163.com/api/search/get?csrf_token=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=${limit}`,
      { headers: { Cookie: this.cookie, ...this.getHeaders() } }
    );

    const data = await response.json();
    return ((data.result || {}).songs || []).map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists || track.ar || [],
      album: track.album || track.al || { name: '', picUrl: track.al ? track.al.picUrl : '' },
      duration: track.duration || track.dt || 0,
    }));
  }

  /**
   * Get song URL (for playback)
   */
  async getSongUrl(trackId: number): Promise<string | null> {
    const response = await fetch(
      `https://music.163.com/api/song/enhance/player/url?id=${trackId}&ids=[${trackId}]&br=128000`,
      { headers: { Cookie: this.cookie, ...this.getHeaders() } }
    );

    const data = await response.json();
    if (data.data?.[0]?.url) {
      return data.data[0].url;
    }
    return null;
  }

  /**
   * Get lyric
   */
  async getLyric(trackId: number): Promise<string | null> {
    const response = await fetch(
      `https://music.163.com/api/song/lyric?id=${trackId}&lv=1&tv=-1`,
      { headers: { Cookie: this.cookie, ...this.getHeaders() } }
    );

    const data = await response.json();
    return data.lrc?.lyric || null;
  }

  /**
   * Get recommended songs
   */
  async getRecommendSongs(): Promise<NeteaseTrack[]> {
    const response = await fetch(
      `https://music.163.com/api/v2/discovery/recommend/songs?total=true&n=100`,
      { headers: { Cookie: this.cookie, ...this.getHeaders() } }
    );

    const data = await response.json();
    return ((data.recommend || [])).map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists || track.ar || [],
      album: track.album || track.al || { name: '', picUrl: '' },
      duration: track.duration || track.dt || 0,
    }));
  }

  setCookie(cookie: string) {
    this.cookie = cookie;
  }
}

export const initNeteaseSDK = () => {
  console.log('NetEase Music SDK initialized');
};

export function createNeteaseAdapter(cookie?: string): NeteaseMusicAdapter {
  return new NeteaseMusicAdapter(cookie);
}