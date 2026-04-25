import fs from 'fs';
import path from 'path';

const USER_DIR = path.resolve(process.cwd(), '../user');

export interface UserContext {
  taste: string;
  routines: string;
  moodRules: string;
  playlists: any;
}

export async function getContext(): Promise<UserContext> {
  const safeReadFile = (p: string) => fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : "";
  const safeReadJson = (p: string, def: any) => {
    try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : def; }
    catch { return def; }
  };

  let taste = "";
  const prefPath = path.join(USER_DIR, 'preferences.json');
  if (fs.existsSync(prefPath)) {
    const prefs = safeReadJson(prefPath, {});
    taste = `Liked Genres: ${prefs.likedGenres?.join(', ') || 'Not set'}
Liked Artists: ${prefs.likedArtists?.join(', ') || 'Not set'}
Disliked Genres: ${prefs.dislikedGenres?.join(', ') || 'None'}`;
  } else {
    taste = safeReadFile(path.join(USER_DIR, 'taste.md')) || "No taste preference found.";
  }

  let routines = "";
  const routineJsonPath = path.join(USER_DIR, 'routines.json');
  if (fs.existsSync(routineJsonPath)) {
    const data = safeReadJson(routineJsonPath, {});
    routines = data.routines?.map((r: any) => `- ${r.time}: ${r.activity} (Music: ${r.musicStyle})`).join('\n') || "None set";
  } else {
    routines = safeReadFile(path.join(USER_DIR, 'routines.md')) || "No routines set.";
  }

  const moodRules = safeReadFile(path.join(USER_DIR, 'mood-rules.md')) || "No mood rules set.";
  const playlists = safeReadJson(path.join(USER_DIR, 'playlists.json'), []);

  return { taste, routines, moodRules, playlists };
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

INSTRUCTIONS:
1. Suggest tracks based on taste AND current routine time if applicable.
2. Provide short "DJ Talk" segments.
3. NO filler words like "Ah", "Oh", "Well". 
4. Respond in JSON:
{
    "speech": "DJ Talk in English",
    "tracks": ["Title - Artist", ...],
    "reasoning": "Why this matches the user's routine/taste"
}
5. "speech" MUST BE ENGLISH.
`;
}
