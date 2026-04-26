import { NextResponse } from 'next/server';

// Mobile User-Agent helps with geo-restricted song URL responses
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36 NeteaseMusic/9.1.65.240927';

export async function POST(req: Request) {
  try {
    const { action, params, cookie } = await req.json();

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'User-Agent': MOBILE_UA,
      'Referer': 'https://music.163.com/',
      'Origin': 'https://music.163.com',
      ...(cookie ? { 'Cookie': cookie } : {}),
    };

    // ---------- Special case: Song URL with geo-restriction bypass ----------
    if (action === 'songUrl') {
      const id = params.id;

      // Strategy 1: Authenticated API (best quality, may be null outside CN)
      try {
        const authRes = await fetch(
          `https://music.163.com/api/song/enhance/player/url?id=${id}&ids=[${id}]&br=320000`,
          { headers }
        );
        const authData = await authRes.json();
        const authUrl: string | null = authData?.data?.[0]?.url || null;
        if (authUrl) {
          return NextResponse.json({ data: [{ url: authUrl }], source: 'auth' });
        }
      } catch {
        // Auth API failed, try outer URL
      }

      // Strategy 2: Public outer URL — follow redirect and verify it's a real audio file
      try {
        const outerUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
        const outerRes = await fetch(outerUrl, {
          headers: { 'User-Agent': MOBILE_UA, 'Referer': 'https://music.163.com/' },
          redirect: 'follow',
        });

        const finalUrl = outerRes.url;
        const contentType = outerRes.headers.get('content-type') || '';
        const isRealAudio =
          outerRes.ok &&
          !finalUrl.includes('music.163.com') && // must have redirected to CDN
          (contentType.includes('audio') || contentType.includes('mpeg') || contentType.includes('octet-stream'));

        if (isRealAudio) {
          return NextResponse.json({ data: [{ url: finalUrl }], source: 'outer' });
        }
      } catch {
        // Outer URL fetch failed
      }

      // Both strategies failed — geo-blocked or premium-only track
      // Return null so the client shows the region-lock UI instead of a bad URL
      return NextResponse.json({ data: [{ url: null }], source: 'geo-blocked' });
    }

    // ---------- All other actions ----------
    let url = '';
    let method = 'GET';
    let body: string | null = null;

    switch (action) {
      case 'search':
        url = `https://music.163.com/api/search/get?s=${encodeURIComponent(params.keyword)}&type=1&limit=${params.limit || 20}`;
        break;
      case 'lyric':
        url = `https://music.163.com/api/song/lyric?id=${params.id}&lv=1&tv=-1`;
        break;
      case 'playlist':
        url = `https://music.163.com/api/user/playlist?uid=${params.uid}&limit=100&timestamp=${Date.now()}`;
        break;
      case 'recommend':
        url = 'https://music.163.com/api/v2/discovery/recommend/songs?total=true&n=100';
        break;
      case 'validate':
        url = 'https://music.163.com/api/search/get?s=test&type=1&limit=1';
        break;

      // ---- QR Code Login ----
      case 'qrKey':
        url = `https://music.163.com/api/login/qrcode/unikey?type=1&timestamp=${Date.now()}`;
        method = 'POST';
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        body = `timestamp=${Date.now()}`;
        break;
      case 'qrCreate':
        url = 'https://music.163.com/api/login/qrcode/generate';
        method = 'POST';
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        body = `key=${params.key}&qrimg=true&type=1`;
        break;
      case 'qrCheck':
        url = 'https://music.163.com/api/login/qrcode/client/login';
        method = 'POST';
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        body = `key=${params.key}&type=1&timestamp=${Date.now()}`;
        break;

      // ---- SMS Login ----
      case 'smsSend':
        url = 'https://music.163.com/api/sms/send';
        method = 'POST';
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        body = `cellphone=${params.phone}&ctcode=${params.ctcode || '86'}&timestamp=${Date.now()}`;
        break;
      case 'smsVerify':
        url = 'https://music.163.com/api/login/cellphone';
        method = 'POST';
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        body = `phone=${params.phone}&captcha=${params.captcha}&countrycode=${params.ctcode || '86'}&rememberLogin=true`;
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const response = await fetch(url, {
      method,
      headers,
      ...(body ? { body } : {}),
    });

    const data = await response.json();
    const setCookie = response.headers.get('set-cookie');
    return NextResponse.json({ ...data, _setCookie: setCookie || undefined });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error', message: (error as Error).message }, { status: 500 });
  }
}