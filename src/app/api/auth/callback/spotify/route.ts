import { NextResponse } from 'next/server';
import SpotifyWebApi from 'spotify-web-api-node';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const baseUrl = new URL(req.url).origin;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?error=no_code`);
  }

  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
  });

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const accessToken = data.body['access_token'];
    
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('spotify_token', accessToken, { 
      path: '/', 
      httpOnly: false, 
      maxAge: 3600 
    });
    
    return response;
  } catch (error) {
    console.error('Spotify Auth Error:', error);
    return NextResponse.redirect(`${baseUrl}/?error=auth_failed`);
  }
}
