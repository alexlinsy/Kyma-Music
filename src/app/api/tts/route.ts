import { NextResponse } from 'next/server';
import { EdgeTTS } from '@andresaya/edge-tts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    
    // Explicitly using Sonia (British Adult Female)
    const SONIA = 'en-GB-SoniaNeural';
    
    console.log(`[TTS] Synthesizing: "${text?.substring(0, 30)}..." using ${SONIA}`);

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const tts = new EdgeTTS();
    
    // IMPORTANT: In this library, voice is passed to synthesize(), not the constructor!
    await tts.synthesize(text, SONIA);
    
    const audioBuffer = await tts.toBuffer();
    const uint8Array = new Uint8Array(audioBuffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store, max-age=0',
        'X-Voice-Used': SONIA
      },
    });
  } catch (error: any) {
    console.error("[TTS ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
