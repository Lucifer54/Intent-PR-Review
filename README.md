# Intent Review — AI-Powered Code Review by Semantic Intent

Intent Review analyzes GitHub pull requests and groups file changes by **what they're trying to accomplish**, not by which files were touched. Instead of reviewing 47 files in alphabetical order, you review 4 logical intentions: "Auth Token Expiry Update", "UI Polish", "Performance Optimization", "Test Coverage".

Built for reviewing AI-generated PRs where a single commit can touch many unrelated files at once.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss) ![Claude](https://img.shields.io/badge/Claude-claude--sonnet--4--5-orange)

---

## How It Works

1. **Paste a GitHub PR URL** (or raw `git diff` output)
2. The app fetches the diff and sends a compact summary to Claude
3. Claude returns intent clusters as structured JSON — groups of files sharing a common goal
4. You review and approve/reject each **intent**, not each file
5. Split-brain files (spanning multiple intents) are flagged for extra attention

Without an API key, the app falls back to heuristic pattern matching on file paths and diff content.

---

## Features

- **Semantic Intent Clustering** — Claude groups related changes into named clusters with emoji, risk level, and color coding
- **Split-Brain Detection** — identifies files where changes serve more than one intent
- **Risk Assessment** — auto-classifies clusters as low / medium / high risk (auth & DB = high, docs & UI = low)
- **Heuristic Fallback** — works without an API key using file-path pattern matching
- **Interactive Review Dashboard** — approve or reject clusters; progress bar tracks completion
- **Executive Summary** — AI-generated plain-English summary of the PR's purpose and risk
- **Syntax-Highlighted Diff Viewer** — green/red/blue diff rendering with per-file expand/collapse

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone <repo-url>
cd intent-pr
npm install
```

### Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Required for AI-powered clustering (Claude claude-sonnet-4-5)
ANTHROPIC_API_KEY=sk-ant-...

# Optional — enables private repo access and higher GitHub rate limits
GITHUB_TOKEN=ghp_...
```

Both keys are optional. Without `ANTHROPIC_API_KEY`, the app uses heuristic mode. Without `GITHUB_TOKEN`, public repos still work (subject to GitHub's unauthenticated rate limits).

API keys can also be entered directly in the UI at review time if you prefer not to use an env file.

### Run

```bash
npm run dev       # development server at http://localhost:3000
npm run build     # production build
npm start         # serve production build
npm run lint      # ESLint
```

---

## Usage

### GitHub PR URL Mode

1. Paste any GitHub PR URL: `https://github.com/owner/repo/pull/123`
2. Optionally enter your Anthropic API key and/or GitHub token in the UI
3. Click **Analyze Intent**
4. The processing screen shows live stage progress (Fetching → Parsing → Analyzing → Detecting → Building)
5. Review the intent clusters in the sidebar; click a cluster to see its diff
6. Approve ✓ or reject ✗ each cluster
7. Submit when all clusters are reviewed

### Paste Raw Diff Mode

1. Switch to the **Paste Raw Diff** tab
2. Paste the output of `git diff` or click **Load Sample** to try the demo
3. Click **Analyze Intent** — runs entirely client-side using the heuristic engine or sample data

---

## Project Structure

```
.
├── app/
│   ├── layout.tsx              # Root layout and metadata
│   ├── page.tsx                # Landing page entry
│   ├── globals.css             # Global styles, diff highlighting, animations
│   ├── review/page.tsx         # Review dashboard entry
│   └── api/
│       ├── analyze/route.ts    # Main analysis endpoint (fetches diff, calls Claude)
│       └── config/route.ts     # Checks which API keys are configured
├── components/
│   ├── LandingPage.tsx         # URL/paste input, mode selection, API key inputs
│   ├── ReviewDashboard.tsx     # Review flow orchestrator (loading → processing → review)
│   ├── ProcessingScreen.tsx    # Animated progress screen during analysis
│   ├── ExecutiveSummary.tsx    # PR metadata + AI summary card
│   ├── IntentSidebar.tsx       # Cluster list with approve/reject controls
│   └── DiffPanel.tsx           # Syntax-highlighted diff viewer
└── lib/
    ├── types.ts                # Core TypeScript interfaces (DiffLine, IntentCluster, PRAnalysis)
    ├── intentAnalyzer.ts       # Claude API call + heuristic fallback engine
    ├── diffParser.ts           # Unified diff parser and compactor
    ├── github.ts               # GitHub PR URL parser and diff fetcher
    └── mockData.ts             # Sample PR data for demo/paste mode
```

---

## Architecture

```
LandingPage
    │
    ▼ POST /api/analyze
    │   ├── github.ts        — fetch PR metadata + .diff from GitHub
    │   ├── diffParser.ts    — parse unified diff → FileDiff[]
    │   └── intentAnalyzer.ts
    │         ├── AI path    — summarise diff → Claude → JSON clusters
    │         └── Heuristic  — classify by file path patterns → clusters
    │
    ▼ PRAnalysis JSON
    │
ReviewDashboard
    ├── ExecutiveSummary     — PR title, author, AI summary, risk statement
    ├── IntentSidebar        — cluster cards with approve/reject
    └── DiffPanel            — per-file diff with split-brain hunk filtering
```

The Claude prompt requests structured JSON with `intentClusters[]`, each containing a title, emoji, risk level, color, file list, reasoning, and an executive `summary`. The model used is `claude-sonnet-4-5` with a 4,096-token output budget.

---

## Risk Levels

| Level  | Domains                                      |
|--------|----------------------------------------------|
| High   | Authentication, authorization, database, security |
| Medium | API routes, business logic, configuration    |
| Low    | UI components, documentation, tests, CI      |

---

## Environment Variables

| Variable            | Required | Purpose                                           |
|---------------------|----------|---------------------------------------------------|
| `ANTHROPIC_API_KEY` | No       | Enables Claude-powered semantic clustering        |
| `GITHUB_TOKEN`      | No       | Private repos + higher GitHub API rate limits     |

---

## Tech Stack

| Layer        | Library / Tool                  |
|--------------|---------------------------------|
| Framework    | Next.js 16 (App Router)         |
| Language     | TypeScript 5                    |
| Styling      | Tailwind CSS 3                  |
| Icons        | Lucide React                    |
| AI           | Anthropic SDK (`claude-sonnet-4-5`) |
| Utilities    | clsx                            |

---

## License

MIT
