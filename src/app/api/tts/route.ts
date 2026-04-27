import { NextResponse } from 'next/server';
import { EdgeTTS } from '@andresaya/edge-tts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    
    // Support for bilingual speech (British Sonia for English, Xiaoxiao for Chinese)
    const SONIA = 'en-GB-SoniaNeural';
    const XIAOXIAO = 'zh-CN-XiaoxiaoNeural';
    
    const isChinese = /[\u4e00-\u9fa5]/.test(text || '');
    const voice = isChinese ? XIAOXIAO : SONIA;
    
    console.log(`[TTS] Synthesizing: "${text?.substring(0, 30)}..." using ${voice}`);

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const tts = new EdgeTTS();
    
    // IMPORTANT: In this library, voice is passed to synthesize(), not the constructor!
    await tts.synthesize(text, voice);
    
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
