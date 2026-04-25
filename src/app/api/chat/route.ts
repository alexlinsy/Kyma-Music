import { NextResponse } from 'next/server';
import { askGemini } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { message, type, track, history } = await req.json();
    
    const environment = {
      time: new Date().toLocaleTimeString(),
      weather: "Sunny",
      activity: "Relaxing",
      history
    };

    const query = type === 'intro' ? `${track?.name} by ${track?.artists?.map((a:any)=>a.name).join(', ')}` : message;
    const result = await askGemini(query, environment, type || 'chat');
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ speech: "大脑连接中断..." }, { status: 500 });
  }
}
