import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const USER_DIR = path.join(process.cwd(), '..', 'user');
const MOOD_RULES_PATH = path.join(USER_DIR, 'mood-rules.md');

export async function GET() {
  try {
    if (fs.existsSync(MOOD_RULES_PATH)) {
      const content = fs.readFileSync(MOOD_RULES_PATH, 'utf-8');
      return NextResponse.json({ content });
    }
    return NextResponse.json({ content: '' });
  } catch (error) {
    return NextResponse.json({ message: 'Error reading mood rules', error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (!fs.existsSync(USER_DIR)) {
      fs.mkdirSync(USER_DIR, { recursive: true });
    }
    fs.writeFileSync(MOOD_RULES_PATH, content, 'utf-8');
    return NextResponse.json({ message: 'Mood rules saved' });
  } catch (error) {
    return NextResponse.json({ message: 'Error saving mood rules', error }, { status: 500 });
  }
}
