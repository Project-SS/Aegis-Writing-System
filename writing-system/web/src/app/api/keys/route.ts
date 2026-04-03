import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    claude: !!process.env.CLAUDE_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  });
}
