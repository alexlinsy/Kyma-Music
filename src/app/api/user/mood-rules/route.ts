import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('user_preferences')
      .select('mood_rules')
      .eq('user_id', user.id)
      .single();

    if (error || !data || !data.mood_rules) {
      return new NextResponse("No mood rules set.");
    }

    return new NextResponse(data.mood_rules);
  } catch (error) {
    console.error('[API] Mood Rules GET Error:', error);
    return new NextResponse('Failed to read mood rules.', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    const markdown = await req.text();
    
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, mood_rules: markdown }, { onConflict: 'user_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Mood Rules POST Error:', error);
    return new NextResponse('Failed to save mood rules.', { status: 500 });
  }
}
