import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('user_preferences')
      .select('routines')
      .eq('user_id', user.id)
      .single();

    if (error || !data || !data.routines) {
      return NextResponse.json({ routines: [] });
    }

    return NextResponse.json({ routines: data.routines });
  } catch (error) {
    console.error('[API] Routines GET Error:', error);
    return NextResponse.json({ error: 'Failed to get routines' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { routines } = body;
    
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, routines: routines || [] }, { onConflict: 'user_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Routines POST Error:', error);
    return NextResponse.json({ error: 'Failed to save routines' }, { status: 500 });
  }
}
