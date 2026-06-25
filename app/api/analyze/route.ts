import { NextRequest, NextResponse } from 'next/server';
import { parsePRUrl, fetchPRData } from '@/lib/github';
import { parseDiff } from '@/lib/diffParser';
import { analyzeIntent, heuristicAnalysis } from '@/lib/intentAnalyzer';
import type { FileDiff } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prUrl, githubToken, anthropicKey } = body as {
      prUrl: string;
      githubToken?: string;
      anthropicKey?: string;
    };

    if (!prUrl?.trim()) {
      return NextResponse.json({ error: 'prUrl is required' }, { status: 400 });
    }

    // 1. Parse URL
    const parsed = parsePRUrl(prUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub PR URL. Expected: https://github.com/owner/repo/pull/123' },
        { status: 400 },
      );
    }

    // 2. Fetch PR data from GitHub
    const ghToken = githubToken || process.env.GITHUB_TOKEN;
    const { prInfo, diff } = await fetchPRData(parsed.owner, parsed.repo, parsed.number, ghToken);

    if (!diff.trim()) {
      return NextResponse.json({ error: 'PR diff is empty — nothing to analyze.' }, { status: 400 });
    }

    // 3. Parse the unified diff
    const fileDiffs = parseDiff(diff);
    if (fileDiffs.length === 0) {
      return NextResponse.json({ error: 'Could not parse any file diffs from this PR.' }, { status: 400 });
    }

    const fileDiffsRecord: Record<string, FileDiff> = {};
    for (const fd of fileDiffs) {
      fileDiffsRecord[fd.path] = fd;
    }

    // 4. Analyze intent (Claude if key available, else heuristic)
    const apiKey = anthropicKey || process.env.ANTHROPIC_API_KEY;

    const analysis = apiKey
      ? await analyzeIntent(prInfo, fileDiffs, fileDiffsRecord, apiKey)
      : heuristicAnalysis(prInfo, fileDiffs, fileDiffsRecord);

    return NextResponse.json({ analysis, usedAI: !!apiKey });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[/api/analyze]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
