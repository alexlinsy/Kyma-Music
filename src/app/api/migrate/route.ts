import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

const USER_DIR = path.resolve(process.cwd(), '../user');

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const safeReadFile = (p: string) => fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : "";
    const safeReadJson = (p: string, def: any) => {
      try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : def; }
      catch { return def; }
    };

    let taste = {};
    const prefPath = path.join(USER_DIR, 'preferences.json');
    if (fs.existsSync(prefPath)) {
      taste = safeReadJson(prefPath, {});
    }

    const routineJsonPath = path.join(USER_DIR, 'routines.json');
    const routines = safeReadJson(routineJsonPath, {}).routines || [];

    const mood_rules = safeReadFile(path.join(USER_DIR, 'mood-rules.md')) || "No mood rules set.";
    const playlists = safeReadJson(path.join(USER_DIR, 'playlists.json'), []);

    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, taste, routines, mood_rules, playlists }, { onConflict: 'user_id' });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Migration completed successfully!" });
  } catch (error: any) {
    console.error('[API] Migration Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to migrate data' }, { status: 500 });
  }
}
