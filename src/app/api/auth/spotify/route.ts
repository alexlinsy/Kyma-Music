import { NextResponse } from 'next/server';
import querystring from 'querystring';

export async function GET() {
  const scope = 'user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state user-library-read playlist-read-private playlist-read-collaborative';
  
  const query = querystring.stringify({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${query}`);
}
