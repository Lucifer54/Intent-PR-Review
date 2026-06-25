import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    aiEnabled: !!process.env.ANTHROPIC_API_KEY,
    githubTokenSet: !!process.env.GITHUB_TOKEN,
  });
}
