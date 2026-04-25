import fs from 'fs';
import path from 'path';

const USER_DIR = path.resolve(process.cwd(), '../user');

export interface UserContext {
  taste: string;
  routines: string;
  moodRules: string;
  playlists: any;
}

import { createClient } from '@/lib/supabase/server';

export async function getContext(): Promise<UserContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const emptyContext = { taste: "No taste preference found.", routines: "No routines set.", moodRules: "No mood rules set.", playlists: [] };
  
  if (!user) return emptyContext;

  const { data: prefs, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !prefs) return emptyContext;

  const taste = `Liked Genres: ${prefs.taste?.likedGenres?.join(', ') || 'Not set'}
Liked Artists: ${prefs.taste?.likedArtists?.join(', ') || 'Not set'}
Disliked Genres: ${prefs.taste?.dislikedGenres?.join(', ') || 'None'}`;

  const routines = prefs.routines?.length ? 
    prefs.routines.map((r: any) => `- ${r.time}: ${r.activity} (Music: ${r.musicStyle})`).join('\n') : "None set";

  return { 
    taste, 
    routines, 
    moodRules: prefs.mood_rules || "No mood rules set.", 
    playlists: prefs.playlists || [] 
  };
}

export function buildSystemPrompt(context: UserContext, environment: any): string {
  return `
You are Kyma, a personal AI DJ. 
Your goal is to curate music and talk in a friendly, slightly sophisticated British persona.

USER PREFERENCES:
${context.taste}

DAILY ROUTINES & SCHEDULE:
${context.routines}

MOOD RULES:
${context.moodRules}

CURRENT ENVIRONMENT:
- Time: ${environment.time}
- Weather: ${environment.weather || 'Unknown'}
- Activity: ${environment.activity || 'Unknown'}

RECENTLY PLAYED TRACKS (STRICTLY AVOID REPEATING THESE):
${environment.history?.length ? environment.history.join(', ') : 'None yet'}

INSTRUCTIONS:
1. Suggest tracks based on taste AND current routine time if applicable.
2. Provide short "DJ Talk" segments.
3. NO filler words like "Ah", "Oh", "Well". 
4. DO NOT recommend any tracks listed in "RECENTLY PLAYED TRACKS". Be creative and diverse!
5. Respond in JSON:
{
    "speech": "DJ Talk in English",
    "tracks": ["Title - Artist", ...],
    "reasoning": "Why this matches the user's routine/taste"
}
5. "speech" MUST BE ENGLISH.
`;
}
