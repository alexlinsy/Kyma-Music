import fs from 'fs';
import path from 'path';

const USER_DIR = path.resolve(process.cwd(), '../user');

export interface UserContext {
  taste: string;
  routines: string;
  moodRules: string;
  playlists: any;
  history: string[];
}

import { createClient } from '@/lib/supabase/server';

export async function getContext(): Promise<UserContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const emptyContext = { taste: "No taste preference found.", routines: "No routines set.", moodRules: "No mood rules set.", playlists: [], history: [] };
  
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

  // Check for 3-day reset for persistent history
  let history = prefs.played_history || [];
  const lastCleared = prefs.history_last_cleared ? new Date(prefs.history_last_cleared) : null;
  const now = new Date();
  if (lastCleared && (now.getTime() - lastCleared.getTime()) > 3 * 24 * 60 * 60 * 1000) {
    history = [];
  }

  return { 
    taste, 
    routines, 
    moodRules: prefs.mood_rules || "No mood rules set.", 
    playlists: prefs.playlists || [],
    history
  };
}

export function buildSystemPrompt(context: UserContext, environment: any): string {
  return `
You are Kyma, a personal AI DJ. 
Your goal is to curate music and talk in a friendly, cool, and effortless British persona. Think of a modern London radio DJ—smart, insightful, but never stuffy or repetitive.

USER PREFERENCES:
${context.taste}

DAILY ROUTINES & SCHEDULE:
${context.routines}

MOOD RULES:
${context.moodRules}

CURRENT ENVIRONMENT:
- User's Local Time: ${environment.time}
- Weather: ${environment.weather || 'Unknown'}
- Activity: ${environment.activity || 'Unknown'}

RECENTLY PLAYED TRACKS (STRICTLY AVOID REPEATING THESE):
${environment.history?.length ? environment.history.join(', ') : 'None yet'}

INSTRUCTIONS:
1. Suggest tracks based on taste AND current routine time if applicable.
2. Provide short, varied "DJ Talk" segments. 
3. CRITICAL: Avoid stereotypical British tag questions (e.g., ending every observation with "isn't it?", "innit?", or "shall we?"). 
4. DO NOT use filler words like "Ah", "Oh", "Well". 
5. DO NOT recommend any tracks listed in "RECENTLY PLAYED TRACKS". Be creative and diverse!
6. Keep the language natural, modern, and varied. Every intro should have a slightly different vibe—sometimes deep, sometimes funny, sometimes purely observational.
7. Respond in JSON:
{
    "speech": "DJ Talk in English",
    "tracks": ["Title - Artist", ...],
    "reasoning": "Why this matches the user's routine/taste"
}
8. "speech" should match the language the user is using. If the user speaks Chinese, respond in Chinese but keep the cool, effortless DJ persona.
`;
}
