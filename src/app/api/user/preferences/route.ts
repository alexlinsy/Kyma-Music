import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const USER_DIR = path.resolve(process.cwd(), '../user');
const PREF_PATH = path.join(USER_DIR, 'preferences.json');

export async function GET() {
  try {
    if (!fs.existsSync(PREF_PATH)) {
      return NextResponse.json({ 
        likedGenres: [], 
        likedArtists: [], 
        dislikedGenres: [],
        isNewUser: true 
      });
    }
    
    const content = fs.readFileSync(PREF_PATH, 'utf-8').trim();
    if (!content) {
      return NextResponse.json({ 
        likedGenres: [], 
        likedArtists: [], 
        dislikedGenres: [],
        isNewUser: true 
      });
    }

    const data = JSON.parse(content);
    return NextResponse.json({ ...data, isNewUser: false });
  } catch (error) {
    console.error('[API] Preferences GET Error:', error);
    return NextResponse.json({ error: 'Failed to read preferences' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { likedGenres, likedArtists, dislikedGenres } = body;
    
    const prefs = {
      likedGenres: likedGenres || [],
      likedArtists: likedArtists || [],
      dislikedGenres: dislikedGenres || [],
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(PREF_PATH, JSON.stringify(prefs, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Preferences POST Error:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
