import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { playlists } = body;
    
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, playlists: playlists || [] }, { onConflict: 'user_id' });

    if (error) throw error;

    const dataSize = Buffer.byteLength(JSON.stringify(playlists), 'utf8');

    return NextResponse.json({ success: true, size: dataSize });
  } catch (error) {
    console.error('[API] Playlists POST Error:', error);
    return NextResponse.json({ error: 'Failed to save playlists' }, { status: 500 });
  }
}
