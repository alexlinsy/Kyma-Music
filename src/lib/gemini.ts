import { GoogleGenerativeAI } from "@google/generative-ai";
import { getContext, buildSystemPrompt } from "./context";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function askGemini(userInput: string, environment: any, type: string = 'chat') {
  if (!process.env.GEMINI_API_KEY) {
    return {
      speech: "配置错误：未检测到 GEMINI_API_KEY。请检查 .env.local 并重启 npm run dev。",
      tracks: [],
      reasoning: "Missing API Key"
    };
  }
  const context = await getContext();
  const systemPrompt = buildSystemPrompt(context, environment);
  
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = type === 'intro' ? `
    System Context:
    ${systemPrompt}
    
    CRITICAL: YOU MUST RESPOND IN ENGLISH ONLY. NO CHINESE CHARACTERS ALLOWED IN "speech".
    
    Task: The user's Spotify player just started playing the track: ${userInput}.
    Provide a very short, punchy, engaging AI DJ commentary (maximum 2 sentences) about this specific track. 
    Mix it up: you can make a joke, share a quick fact, or just drop a cool observation about the artist.
    CRITICAL: Avoid repetitive or cliché phrasing. Do not end your sentences with tag questions like "isn't it?", "won't it?", or "shall we?". Keep it fresh.
    CRITICAL: Keep "tracks" array completely EMPTY. Do not queue any new tracks. Just provide the "speech".
    
    Response:
  ` : `
    System Context:
    ${systemPrompt}
    
    CRITICAL: YOU MUST RESPOND IN ENGLISH ONLY. NO CHINESE CHARACTERS ALLOWED IN "speech".
    
    User Input: ${userInput}
    
    Response:
    `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Gemini Raw Response:", text);
    
    // Strip markdown JSON blocks if present
    const cleanJson = text.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    // Remove annoying conversation fillers that LLMs tend to generate
    if (parsed.speech) {
      parsed.speech = parsed.speech.replace(/^(ah,|ah!|ah |oh,|oh!|oh )/i, '').trim();
      parsed.speech = parsed.speech.charAt(0).toUpperCase() + parsed.speech.slice(1);
    }
    
    return parsed;
  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    let detailedError = error.message || "Unknown error";
    
    if (error.status === 429) detailedError = "API Quota exceeded (429). Please check Google Cloud billing/limits.";
    if (error.status === 403) detailedError = "API Key invalid or restricted (403).";
    
    return {
      speech: `大脑连接异常: ${detailedError}`,
      tracks: [],
      reasoning: "Error calling Gemini API"
    };
  }
}
