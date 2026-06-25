import Anthropic from '@anthropic-ai/sdk';
import type { FileDiff, PRAnalysis, IntentCluster, IntentFile } from './types';
import type { GitHubPRInfo } from './github';
import { summariseDiff } from './diffParser';

// ── Colour palette for clusters ──────────────────────────────────────────────
const PALETTE = [
  { color: '#f87171', bgColor: 'rgba(239,68,68,0.08)',    borderColor: 'rgba(239,68,68,0.25)' },
  { color: '#c084fc', bgColor: 'rgba(192,132,252,0.08)',  borderColor: 'rgba(192,132,252,0.25)' },
  { color: '#fbbf24', bgColor: 'rgba(251,191,36,0.08)',   borderColor: 'rgba(251,191,36,0.25)' },
  { color: '#34d399', bgColor: 'rgba(52,211,153,0.08)',   borderColor: 'rgba(52,211,153,0.25)' },
  { color: '#60a5fa', bgColor: 'rgba(96,165,250,0.08)',   borderColor: 'rgba(96,165,250,0.25)' },
  { color: '#f97316', bgColor: 'rgba(249,115,22,0.08)',   borderColor: 'rgba(249,115,22,0.25)' },
];

// ── Claude response types ─────────────────────────────────────────────────────
interface ClaudeFile {
  path: string;
  isSplitBrain?: boolean;
  hunkIndices?: number[] | null;
}
interface ClaudeCluster {
  id: string;
  emoji: string;
  title: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  files: ClaudeFile[];
}
interface ClaudeResponse {
  executiveSummary: string;
  riskStatement: string;
  clusters: ClaudeCluster[];
}

// ── Main analyser ─────────────────────────────────────────────────────────────
export async function analyzeIntent(
  prInfo: GitHubPRInfo,
  fileDiffs: FileDiff[],
  fileDiffsRecord: Record<string, FileDiff>,
  apiKey: string,
): Promise<PRAnalysis> {
  const client = new Anthropic({ apiKey });

  const diffSummary = summariseDiff(fileDiffs, 60);

  const prompt = `You are a senior software engineer reviewing a GitHub Pull Request.
Your task: group the changed files into logical "Intent Clusters" — cohesive groups of changes that serve the same semantic purpose.

PR #${prInfo.prNumber}: ${prInfo.title}
Repo: ${prInfo.repo}  |  Branch: ${prInfo.branch}  |  Author: ${prInfo.author}
Files changed: ${fileDiffs.length} total, +${fileDiffs.reduce((s,f)=>s+f.additions,0)} -${fileDiffs.reduce((s,f)=>s+f.deletions,0)} lines

=== DIFF CONTENTS ===
${diffSummary}
=== END DIFF ===

Instructions:
1. Create 2–6 clusters. Each cluster = one coherent goal (e.g. "Upgrade auth token expiry", "Polish login UI", "Add integration tests").
2. A file MAY appear in multiple clusters if it genuinely serves two different purposes (set isSplitBrain: true, and optionally provide hunkIndices to indicate which hunk indices, 0-based, belong to this cluster).
3. Choose emojis matching the intent: 🔐 auth/security  🎨 UI/styles  🗄️ database  🧪 tests  ⚡ performance  🐛 bugfix  ♻️ refactor  📦 deps  🌐 API  📝 docs
4. Risk: "high" = auth/security/schema migration, "medium" = business logic, "low" = UI/tests/docs.

Respond with ONLY valid JSON — no markdown fences, no explanation — matching this exact schema:
{
  "executiveSummary": "<2 sentences: what the PR does and its impact>",
  "riskStatement": "<1 sentence: the key deployment/rollback risk>",
  "clusters": [
    {
      "id": "kebab-slug",
      "emoji": "🔐",
      "title": "Short title (5–8 words)",
      "description": "1–2 sentences explaining what this cluster achieves.",
      "risk": "high",
      "files": [
        { "path": "exact/path.ts", "isSplitBrain": false, "hunkIndices": null }
      ]
    }
  ]
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('');

  // Extract JSON — handle cases where Claude wraps in ```json fences
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                    rawText.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : rawText;

  let claude: ClaudeResponse;
  try {
    claude = JSON.parse(jsonStr.trim());
  } catch {
    throw new Error('Claude returned invalid JSON. Try again or check your API key.');
  }

  return buildAnalysis(prInfo, fileDiffs, fileDiffsRecord, claude);
}

// ── Heuristic fallback (no API key) ──────────────────────────────────────────

// Named cluster configs — used when a clear category is detected
const NAMED: Record<string, { emoji: string; title: string; desc: string; risk: 'low'|'medium'|'high' }> = {
  docs:      { emoji: '📝', title: 'Documentation & Specs',       desc: 'Markdown docs, RFCs, changelogs, and specification files.',           risk: 'low'    },
  tests:     { emoji: '🧪', title: 'Tests',                       desc: 'Unit, integration, and end-to-end test changes.',                     risk: 'low'    },
  ci:        { emoji: '⚙️',  title: 'CI/CD & Workflow Config',    desc: 'GitHub Actions, pipeline, and deployment configuration.',             risk: 'medium' },
  deps:      { emoji: '📦', title: 'Dependency Updates',          desc: 'Package manifests, lockfiles, and version bumps.',                    risk: 'medium' },
  db:        { emoji: '🗄️', title: 'Database Schema',             desc: 'Migrations, schema definitions, and query changes.',                  risk: 'high'   },
  auth:      { emoji: '🔐', title: 'Auth & Security',             desc: 'Authentication, session management, and security logic.',             risk: 'high'   },
  ui:        { emoji: '🎨', title: 'UI Components & Styles',      desc: 'Components, CSS, and visual layer changes.',                          risk: 'low'    },
  api:       { emoji: '🌐', title: 'API Routes & Handlers',       desc: 'Backend endpoints, controllers, and request handlers.',               risk: 'medium' },
  i18n:      { emoji: '🌍', title: 'Internationalisation',        desc: 'Locale strings, translation files, and i18n config.',                 risk: 'low'    },
  build:     { emoji: '🏗️', title: 'Build & Tooling',             desc: 'Build scripts, compiler config, and dev-toolchain changes.',          risk: 'medium' },
  stdlib:    { emoji: '📚', title: 'Standard Library',            desc: 'Core runtime and standard library module updates.',                   risk: 'high'   },
  compiler:  { emoji: '🔧', title: 'Compiler Internals',          desc: 'Parser, AST, type checker, and code generation changes.',             risk: 'high'   },
  perf:      { emoji: '⚡', title: 'Performance',                 desc: 'Optimisations, benchmarks, and profiling changes.',                   risk: 'medium' },
};

function classifyFile(path: string, diff: FileDiff): string | null {
  const p     = path.toLowerCase();
  const parts = p.split('/');
  const fname = parts[parts.length - 1];
  const ext   = fname.includes('.') ? fname.split('.').pop()! : '';

  // ── Documentation ───────────────────────────────────────────────────────────
  if (['md', 'mdx', 'rst', 'txt', 'adoc', 'asciidoc'].includes(ext)) return 'docs';

  // ── Tests ───────────────────────────────────────────────────────────────────
  if (
    parts.some(d => ['test', 'tests', 'spec', 'specs', '__tests__', '__mocks__', 'fixtures', 'e2e', 'integration'].includes(d)) ||
    /\.(test|spec)\.[a-z]+$/.test(p) ||
    fname.startsWith('test_') ||
    fname.endsWith('_test.go') ||
    fname.endsWith('_spec.rb')
  ) return 'tests';

  // ── CI / GitHub Actions ─────────────────────────────────────────────────────
  if (
    parts.some(d => ['.github', '.circleci', '.travis', 'ci', '.gitlab', '.buildkite'].includes(d)) ||
    (['yml', 'yaml'].includes(ext) && /workflow|ci|deploy|pipeline|action/.test(p))
  ) return 'ci';

  // ── Dependency manifests ────────────────────────────────────────────────────
  if (['package.json', 'cargo.toml', 'requirements.txt', 'gemfile', 'go.mod', 'go.sum',
       'pom.xml', 'build.gradle', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock',
       'cargo.lock', 'poetry.lock', 'pipfile.lock', 'composer.json', 'pyproject.toml'].includes(fname)) return 'deps';

  // ── Database ────────────────────────────────────────────────────────────────
  if (/migrat|schema\.prisma|\.sql$|knex|sequelize|alembic|flyway|liquibase/.test(p)) return 'db';

  // ── Auth / security ─────────────────────────────────────────────────────────
  if (/\/(auth|oauth|jwt|session|credential|password|crypto|security|token|permission|privilege)\//.test(p) ||
      /auth\.|jwt\.|oauth\.|session\.|security\./.test(fname)) return 'auth';

  // ── Build / tooling ─────────────────────────────────────────────────────────
  if (['makefile', 'cmake', 'rakefile', 'gulpfile', 'gruntfile'].includes(fname) ||
      /^(webpack|rollup|vite|babel|jest|vitest|tsconfig|eslint|prettier|stylelint)/.test(fname)) return 'build';

  // ── Rust standard library sub-crates → fall through to directory grouping ──
  // (handled below so each lib* dir becomes its own cluster)

  // ── Compiler / language tooling ─────────────────────────────────────────────
  if (/\/(compiler|codegen|parse|lexer|ast|typeck|typecheck|lint|hir|mir|llvm|backend|borrow)\//.test(p)) return 'compiler';

  // ── Styles ──────────────────────────────────────────────────────────────────
  if (['css', 'scss', 'less', 'sass', 'styl'].includes(ext)) return 'ui';

  // ── React/Vue components ────────────────────────────────────────────────────
  if (['tsx', 'jsx', 'vue', 'svelte'].includes(ext) &&
      /component|\/ui\/|\/views\/|\/pages\/|\/screens\//.test(p)) return 'ui';

  // ── API routes ──────────────────────────────────────────────────────────────
  if (/\/(route[s]?|api|endpoint[s]?|controller[s]?|handler[s]?|resolver[s]?)\//.test(p) ||
      /\.(route|controller|handler|resolver|gateway)\.[a-z]+$/.test(p)) return 'api';

  // ── i18n ────────────────────────────────────────────────────────────────────
  if (/locale[s]?|i18n|l10n|translation[s]?|\/lang\//.test(p) ||
      (['json', 'po', 'pot', 'xlf', 'xliff'].includes(ext) && /locale|i18n|lang/.test(p))) return 'i18n';

  // ── Performance ─────────────────────────────────────────────────────────────
  if (/bench(mark)?|perf|profil/.test(p)) return 'perf';

  // ── Content-based fallback: scan the actual diff lines for keywords ─────────
  const changed = diff.hunks
    .flatMap(h => h.lines)
    .filter(l => l.type !== 'ctx')
    .map(l => l.content.toLowerCase())
    .join(' ');

  if (/\b(test|assert|expect|should|describe|it\(|beforeeach|aftereach)\b/.test(changed)) return 'tests';
  if (/\b(auth|token|password|session|oauth|permission)\b/.test(changed)) return 'auth';
  if (/\b(database|query|sql|schema|migrat|insert|select|update|delete)\b/.test(changed)) return 'db';
  if (/\b(bench|benchmark|throughput|latency|perf|profile)\b/.test(changed)) return 'perf';

  return null; // let directory-based grouping handle it
}

// Human-readable labels for well-known Rust lib sub-crates
const RUST_LIBNAMES: Record<string, { emoji: string; title: string }> = {
  liballoc:       { emoji: '🔢', title: 'liballoc — Memory Allocation' },
  libcollections: { emoji: '🗃️', title: 'libcollections — Collections' },
  libcore:        { emoji: '⚙️',  title: 'libcore — Core Primitives'   },
  libstd:         { emoji: '📚', title: 'libstd — Standard Library'    },
  libtest:        { emoji: '🧪', title: 'libtest — Test Harness'       },
  libproc_macro:  { emoji: '🔧', title: 'libproc_macro — Macros'       },
};

// Turn a raw directory segment into a human-readable title
function dirToTitle(dir: string): { emoji: string; title: string; risk: 'low'|'medium'|'high' } {
  const d = dir.toLowerCase();

  // Rust standard library sub-crates
  if (RUST_LIBNAMES[d]) return { ...RUST_LIBNAMES[d], risk: 'high' };
  if (/^lib/.test(d)) return { emoji: '📚', title: `${dir} — Library`, risk: 'high' };

  if (/^compiler|^codegen|^parse|^hir|^mir/.test(d))
    return { emoji: '🔧', title: `${dir} — Compiler`, risk: 'high' };
  if (/^(src|lib|source)$/.test(d))
    return { emoji: '🔩', title: 'Core Source Changes', risk: 'medium' };
  if (/^(app|apps)$/.test(d))
    return { emoji: '🖥️', title: 'Application Layer', risk: 'medium' };
  if (/^(pkg|package[s]?)$/.test(d))
    return { emoji: '📦', title: 'Package Changes', risk: 'medium' };
  if (/^(component[s]?|ui|views|pages|screens)$/.test(d))
    return { emoji: '🎨', title: `${dir} — UI`, risk: 'low' };
  if (/^(api|route[s]?|controller[s]?|handler[s]?)$/.test(d))
    return { emoji: '🌐', title: `${dir} — API`, risk: 'medium' };
  if (/^(test[s]?|spec[s]?|__tests__)$/.test(d))
    return { emoji: '🧪', title: 'Tests', risk: 'low' };
  if (/^(doc[s]?|documentation)$/.test(d))
    return { emoji: '📝', title: 'Documentation', risk: 'low' };
  // Generic: capitalise the directory name as the title
  const pretty = dir.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { emoji: '🗂️', title: `${pretty} Changes`, risk: 'medium' };
}

export function heuristicAnalysis(
  prInfo: GitHubPRInfo,
  fileDiffs: FileDiff[],
  fileDiffsRecord: Record<string, FileDiff>,
): PRAnalysis {
  type Bucket = { emoji: string; title: string; desc: string; risk: 'low'|'medium'|'high'; paths: string[] };
  const buckets: Record<string, Bucket> = {};

  const assign = (path: string, key: string, cfg: { emoji: string; title: string; desc: string; risk: 'low'|'medium'|'high' }) => {
    if (!buckets[key]) buckets[key] = { ...cfg, paths: [] };
    buckets[key].paths.push(path);
  };

  // Collect files that need directory-based grouping
  const unclassified: FileDiff[] = [];

  for (const f of fileDiffs) {
    const category = classifyFile(f.path, f);
    if (category && NAMED[category]) {
      assign(f.path, category, { ...NAMED[category], desc: NAMED[category].desc });
    } else {
      unclassified.push(f);
    }
  }

  // Directory-based grouping for unclassified files
  for (const f of unclassified) {
    const parts = f.path.split('/');
    // Use the most specific meaningful directory segment
    // For paths like src/libcore/iter.rs → use "libcore"
    // For paths like packages/app-store/foo.ts → use "app-store"
    const groupDir = parts.length >= 3 ? parts[1] :
                     parts.length === 2 ? parts[0] : 'misc';
    const key = `dir:${groupDir}`;
    if (!buckets[key]) {
      const cfg = dirToTitle(groupDir);
      buckets[key] = { emoji: cfg.emoji, title: cfg.title, desc: `Changes inside the \`${groupDir}\` directory.`, risk: cfg.risk, paths: [] };
    }
    buckets[key].paths.push(f.path);
  }

  // Merge tiny orphan buckets (<= 1 file) that have the same risk into misc
  const smallKeys = Object.keys(buckets).filter(k => buckets[k].paths.length === 1 && k.startsWith('dir:'));
  if (smallKeys.length > 1) {
    const miscPaths: string[] = [];
    for (const k of smallKeys) {
      miscPaths.push(...buckets[k].paths);
      delete buckets[k];
    }
    if (miscPaths.length) {
      if (!buckets['misc']) buckets['misc'] = { emoji: '♻️', title: 'Miscellaneous Changes', desc: 'Small changes across various files.', risk: 'medium', paths: [] };
      buckets['misc'].paths.push(...miscPaths);
    }
  }

  const clusterCount = Object.keys(buckets).length;
  const synthetic: ClaudeResponse = {
    executiveSummary: `This PR modifies ${fileDiffs.length} file${fileDiffs.length === 1 ? '' : 's'} across ${clusterCount} intent cluster${clusterCount === 1 ? '' : 's'} (heuristic analysis). Add an Anthropic API key for a detailed AI-generated summary with richer intent detection.`,
    riskStatement: 'Add an Anthropic API key in "Advanced / API Keys" for AI-powered risk assessment.',
    clusters: Object.entries(buckets).map(([id, b]) => ({
      id: id.replace(/[^a-z0-9]/g, '-'),
      emoji: b.emoji,
      title: b.title,
      description: b.desc,
      risk: b.risk,
      files: b.paths.map(p => ({ path: p, isSplitBrain: false, hunkIndices: null })),
    })),
  };

  return buildAnalysis(prInfo, fileDiffs, fileDiffsRecord, synthetic);
}

// ── Assemble PRAnalysis from Claude / heuristic output ────────────────────────
function buildAnalysis(
  prInfo: GitHubPRInfo,
  fileDiffs: FileDiff[],
  fileDiffsRecord: Record<string, FileDiff>,
  claude: ClaudeResponse,
): PRAnalysis {
  const splitBrainFiles: string[] = [];

  const clusters: IntentCluster[] = claude.clusters.map((c, idx) => {
    const palette = PALETTE[idx % PALETTE.length];

    const files: IntentFile[] = c.files.map(cf => {
      const fd = fileDiffsRecord[cf.path];
      if (cf.isSplitBrain && !splitBrainFiles.includes(cf.path)) {
        splitBrainFiles.push(cf.path);
      }
      return {
        path: cf.path,
        additions: fd?.additions ?? 0,
        deletions: fd?.deletions ?? 0,
        isSplitBrain: cf.isSplitBrain ?? false,
        isNew: fd?.isNew,
        hunkIndices: cf.hunkIndices ?? undefined,
      };
    }).filter(f => fileDiffsRecord[f.path]); // only include files we actually have diffs for

    const additions = files.reduce((s, f) => s + f.additions, 0);
    const deletions = files.reduce((s, f) => s + f.deletions, 0);

    return {
      id: c.id,
      emoji: c.emoji,
      title: c.title,
      description: c.description,
      risk: c.risk,
      ...palette,
      files,
      status: 'pending',
      additions,
      deletions,
    };
  });

  return {
    prNumber: prInfo.prNumber,
    title: prInfo.title,
    repo: prInfo.repo,
    branch: prInfo.branch,
    author: prInfo.author,
    createdAt: prInfo.createdAt,
    executiveSummary: claude.executiveSummary,
    riskStatement: claude.riskStatement,
    totalFiles: fileDiffs.length,
    totalAdditions: fileDiffs.reduce((s, f) => s + f.additions, 0),
    totalDeletions: fileDiffs.reduce((s, f) => s + f.deletions, 0),
    splitBrainFiles,
    clusters,
    fileDiffs: fileDiffsRecord,
  };
}
