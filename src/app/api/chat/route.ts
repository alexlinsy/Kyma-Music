import { NextResponse } from 'next/server';
import { askGemini } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    // Simulate some environment data
    const environment = {
      time: new Date().toLocaleTimeString(),
      weather: "Sunny",
      activity: "Relaxing"
    };

    const result = await askGemini(message, environment);
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ speech: "大脑连接中断..." }, { status: 500 });
  }
}
