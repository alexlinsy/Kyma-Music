import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('taste')
      .eq('user_id', user.id)
      .single();

    if (error || !data || !data.taste || Object.keys(data.taste).length === 0) {
      return NextResponse.json({ 
        likedGenres: [], 
        likedArtists: [], 
        dislikedGenres: [],
        isNewUser: true 
      });
    }

    return NextResponse.json({ ...data.taste, isNewUser: false });
  } catch (error) {
    console.error('[API] Preferences GET Error:', error);
    return NextResponse.json({ error: 'Failed to read preferences' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { likedGenres, likedArtists, dislikedGenres } = body;
    
    const prefs = {
      likedGenres: likedGenres || [],
      likedArtists: likedArtists || [],
      dislikedGenres: dislikedGenres || [],
      updatedAt: new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, taste: prefs }, { onConflict: 'user_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Preferences POST Error:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
