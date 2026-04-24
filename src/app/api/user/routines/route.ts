import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const USER_DIR = path.resolve(process.cwd(), '../user');
const ROUTINE_PATH = path.join(USER_DIR, 'routines.json');

export async function GET() {
  try {
    if (!fs.existsSync(ROUTINE_PATH)) {
      return NextResponse.json({ routines: [] });
    }
    const content = fs.readFileSync(ROUTINE_PATH, 'utf-8').trim();
    if (!content) {
      return NextResponse.json({ routines: [] });
    }
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Routines GET Error:', error);
    return NextResponse.json({ error: 'Failed to read routines' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    fs.writeFileSync(ROUTINE_PATH, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Routines POST Error:', error);
    return NextResponse.json({ error: 'Failed to save routines' }, { status: 500 });
  }
}
