import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { playlists } = await req.json();
    console.log(`[API] Syncing ${playlists?.length} playlists`);
    
    // Using explicit absolute path to avoid ambiguity with process.cwd()
    const PLAYLIST_PATH = '/Users/shaoyilin/kyma/user/playlists.json';
    
    const data = {
      version: "1.0",
      lastUpdated: new Date().toISOString(),
      collections: (playlists || []).map((p: any) => ({
        name: p.name,
        description: p.description || "",
        id: p.id,
        tracks: p.tracks || []
      }))
    };

    console.log(`[API] Overwriting file: ${PLAYLIST_PATH}`);
    fs.writeFileSync(PLAYLIST_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    // Verify write
    const stats = fs.statSync(PLAYLIST_PATH);
    console.log(`[API] Success. File size: ${stats.size} bytes`);
    
    return NextResponse.json({ success: true, size: stats.size });
  } catch (error: any) {
    console.error('[API] Sync error:', error);
    return NextResponse.json({ error: `Failed to sync: ${error.message}` }, { status: 500 });
  }
}
