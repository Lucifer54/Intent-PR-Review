export interface GitHubPRInfo {
  prNumber: number;
  title: string;
  repo: string;
  branch: string;
  author: string;
  createdAt: string;
}

export function parsePRUrl(url: string): { owner: string; repo: string; number: number } | null {
  const m = url.trim().match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2], number: parseInt(m[3], 10) };
}

export async function fetchPRData(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string,
): Promise<{ prInfo: GitHubPRInfo; diff: string }> {
  const apiHeaders: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) apiHeaders['Authorization'] = `Bearer ${token}`;

  // ── Diff: use the public web URL (.diff) — never hits the API rate limit ──
  // Falls back to the API diff endpoint only when a token is provided.
  let diff: string;
  if (token) {
    const diffRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers: { ...apiHeaders, Accept: 'application/vnd.github.diff' } },
    );
    if (!diffRes.ok) throw new Error(`Failed to fetch diff (API): ${diffRes.status}`);
    diff = await diffRes.text();
  } else {
    // Public web URL — no auth, no API quota consumed
    const diffRes = await fetch(`https://github.com/${owner}/${repo}/pull/${prNumber}.diff`);
    if (!diffRes.ok) {
      if (diffRes.status === 404) throw new Error('PR not found. Check the URL, or add a GitHub token for private repos.');
      throw new Error(`Failed to fetch diff: ${diffRes.status}`);
    }
    diff = await diffRes.text();
  }

  if (!diff.trim() || !diff.startsWith('diff --git')) {
    throw new Error('Could not fetch the PR diff. The PR may be private — add a GitHub Personal Access Token in "Advanced / API Keys".');
  }

  // ── Metadata: try API, fall back gracefully if rate-limited ──────────────
  let prInfo: GitHubPRInfo;
  try {
    const metaRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers: apiHeaders },
    );
    if (!metaRes.ok) throw new Error(`meta:${metaRes.status}`);
    const pr = await metaRes.json();
    prInfo = {
      prNumber: pr.number,
      title: pr.title,
      repo: `${owner}/${repo}`,
      branch: pr.head.ref,
      author: pr.user.login,
      createdAt: pr.created_at,
    };
  } catch {
    // Rate-limited or network error — use sensible defaults from the URL
    prInfo = {
      prNumber,
      title: `PR #${prNumber} — ${owner}/${repo}`,
      repo: `${owner}/${repo}`,
      branch: 'main',
      author: 'unknown',
      createdAt: new Date().toISOString(),
    };
  }

  return { prInfo, diff };
}
