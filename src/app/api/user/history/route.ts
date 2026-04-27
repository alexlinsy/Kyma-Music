import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const HISTORY_LIMIT = 50;
const RESET_DAYS = 3;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('user_preferences')
      .select('played_history, history_last_cleared')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[API] History GET Supabase Error:', error);
      // Fallback: If columns don't exist, we might need to handle it.
      // But we'll try to use them as if they exist.
    }

    let history = data?.played_history || [];
    const lastCleared = data?.history_last_cleared ? new Date(data.history_last_cleared) : null;
    
    const now = new Date();
    // Check for 3-day reset
    if (lastCleared && (now.getTime() - lastCleared.getTime()) > RESET_DAYS * 24 * 60 * 60 * 1000) {
      console.log(`[History] Resetting history for user ${user.id} (3 days passed)`);
      history = [];
      await supabase
        .from('user_preferences')
        .upsert({ 
          user_id: user.id, 
          played_history: [], 
          history_last_cleared: now.toISOString() 
        }, { onConflict: 'user_id' });
    } else if (!lastCleared) {
      // Initialize if not present
      await supabase
        .from('user_preferences')
        .upsert({ 
          user_id: user.id, 
          history_last_cleared: now.toISOString() 
        }, { onConflict: 'user_id' });
    }

    return NextResponse.json({ history });
  } catch (err: any) {
    console.error('[API] History GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { track } = await req.json();
    if (!track) return NextResponse.json({ error: 'Track is required' }, { status: 400 });

    const { data } = await supabase
      .from('user_preferences')
      .select('played_history')
      .eq('user_id', user.id)
      .single();

    let history: string[] = data?.played_history || [];
    
    if (!history.includes(track)) {
      history = [track, ...history].slice(0, HISTORY_LIMIT);
      
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ 
          user_id: user.id, 
          played_history: history 
        }, { onConflict: 'user_id' });

      if (error) throw error;
    }

    return NextResponse.json({ success: true, history });
  } catch (err: any) {
    console.error('[API] History POST Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
