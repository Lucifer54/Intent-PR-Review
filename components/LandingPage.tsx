'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GitBranch, Zap, ArrowRight, FileCode2, Layers, CheckCircle2,
  Code2, Sparkles, Github, ChevronDown, KeyRound, Lock,
  AlertTriangle,
} from 'lucide-react';
import { SAMPLE_DIFF_TEXT } from '@/lib/mockData';

type Mode = 'github' | 'paste';

interface AppConfig {
  aiEnabled: boolean;
  githubTokenSet: boolean;
}

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('github');
  const [config, setConfig] = useState<AppConfig | null>(null);

  // GitHub mode
  const [prUrl, setPrUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Paste mode
  const [diffText, setDiffText] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [urlError, setUrlError] = useState('');

  // Read server config once on mount
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(setConfig)
      .catch(() => setConfig({ aiEnabled: false, githubTokenSet: false }));
  }, []);

  const isGithubValid = /github\.com\/.+\/.+\/pull\/\d+/.test(prUrl.trim());

  const launch = () => {
    if (mode === 'github') {
      if (!isGithubValid) {
        setUrlError('Paste a valid GitHub PR URL — e.g. https://github.com/owner/repo/pull/42');
        return;
      }
      setUrlError('');
      setIsLaunching(true);
      sessionStorage.setItem('ir_mode', 'github');
      sessionStorage.setItem('ir_pr_url', prUrl.trim());
      sessionStorage.setItem('ir_gh_token', githubToken.trim());
      // Only pass key from UI if env key is NOT set
      sessionStorage.setItem('ir_anthropic_key', config?.aiEnabled ? '' : anthropicKey.trim());
    } else {
      if (!diffText.trim()) return;
      setIsLaunching(true);
      sessionStorage.setItem('ir_mode', diffText === SAMPLE_DIFF_TEXT ? 'sample' : 'paste');
      sessionStorage.setItem('ir_diff_text', diffText);
    }
    setTimeout(() => router.push('/review'), 80);
  };

  const aiActive = config?.aiEnabled || anthropicKey.trim().startsWith('sk-ant-');
  const modeLoading = config === null;

  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-[#1c1c30]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-[#f0f0f8] font-semibold text-base tracking-tight">Intent Review</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 ml-1">BETA</span>
        </div>
        {/* Mode pill — top right */}
        <div className="flex items-center gap-3">
          {!modeLoading && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
              style={aiActive
                ? { color: '#34d399', background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.25)' }
                : { color: '#fbbf24', background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.25)' }
              }
            >
              {aiActive
                ? <><Sparkles className="w-3 h-3" /> AI Mode Active</>
                : <><AlertTriangle className="w-3 h-3" /> Heuristic Mode</>
              }
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-10 max-w-2xl animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Designed for the age of AI-generated PRs
          </div>
          <h1 className="text-[52px] font-bold text-[#f0f0f8] leading-[1.1] tracking-tighter mb-5">
            Review by
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"> Intent</span>,
            <br />not by file.
          </h1>
          <p className="text-[#7070a0] text-lg leading-relaxed">
            Paste a GitHub PR URL — every diff hunk is grouped by its
            <em className="text-[#9090b0] not-italic font-medium"> semantic purpose</em>,
            {aiActive ? ' powered by Claude.' : ' using heuristic analysis (add API key for AI clustering).'}
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex items-center gap-3 mb-8 flex-wrap justify-center">
          {[
            { icon: Layers,       label: 'Semantic Intent Clusters' },
            { icon: Zap,          label: 'Split-Brain Detection' },
            { icon: CheckCircle2, label: 'Approve by Intent' },
            { icon: Sparkles,     label: 'AI Executive Summary' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#12121f] border border-[#1c1c30] text-[#9090b0] text-xs font-medium">
              <Icon className="w-3.5 h-3.5 text-indigo-400" />
              {label}
            </div>
          ))}
        </div>

        {/* Input card */}
        <div className="w-full max-w-2xl bg-[#0d0d18] border border-[#1c1c30] rounded-2xl overflow-hidden shadow-2xl shadow-black/60 animate-fade-in">

          {/* Mode tabs */}
          <div className="flex border-b border-[#1c1c30]">
            {(['github', 'paste'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                  mode === m
                    ? 'text-[#f0f0f8] border-b-2 border-indigo-500 bg-indigo-600/5'
                    : 'text-[#5a5a78] hover:text-[#9090b0] border-b-2 border-transparent'
                }`}
              >
                {m === 'github' ? <Github className="w-4 h-4" /> : <FileCode2 className="w-4 h-4" />}
                {m === 'github' ? 'GitHub PR URL' : 'Paste Raw Diff'}
              </button>
            ))}
          </div>

          {/* ── GitHub mode ──────────────────────────────────────────────────── */}
          {mode === 'github' && (
            <div className="p-5 space-y-3">
              {/* URL input */}
              <div>
                <label className="text-xs text-[#5a5a78] font-medium mb-1.5 block">Pull Request URL</label>
                <div className="flex items-center gap-2.5 bg-[#0a0a14] border border-[#1c1c30] rounded-xl px-3.5 py-2.5 focus-within:border-indigo-600/50 transition-colors">
                  <Github className="w-4 h-4 text-[#3a3a5c] flex-shrink-0" />
                  <input
                    type="url"
                    value={prUrl}
                    onChange={e => { setPrUrl(e.target.value); setUrlError(''); }}
                    onKeyDown={e => e.key === 'Enter' && launch()}
                    placeholder="https://github.com/owner/repo/pull/42"
                    className="flex-1 bg-transparent text-[#f0f0f8] text-sm placeholder:text-[#2a2a44] focus:outline-none font-mono"
                  />
                  {isGithubValid && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                </div>
                {urlError && <p className="text-xs text-red-400 mt-1.5">{urlError}</p>}
              </div>

              {/* Analysis mode indicator */}
              {!modeLoading && (
                <div
                  className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs"
                  style={aiActive
                    ? { background: 'rgba(52,211,153,0.06)', borderColor: 'rgba(52,211,153,0.2)', color: '#34d399' }
                    : { background: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.2)', color: '#fbbf24' }
                  }
                >
                  {aiActive ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold">AI Mode — </span>
                        {config?.aiEnabled
                          ? 'Claude will analyse diff content and cluster by semantic intent.'
                          : 'API key provided — Claude will analyse this PR.'
                        }
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold">Heuristic Mode — </span>
                        clusters by file path patterns.{' '}
                        <button
                          onClick={() => setShowAdvanced(true)}
                          className="underline underline-offset-2 hover:text-amber-300 transition-colors"
                        >
                          Add an Anthropic API key
                        </button>{' '}
                        for AI-powered semantic clustering.
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Advanced settings toggle */}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-xs text-[#5a5a78] hover:text-[#9090b0] transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                Advanced / API Keys
                <span className="ml-1 text-[10px] text-[#3a3a5c]">(optional)</span>
              </button>

              {showAdvanced && (
                <div className="space-y-2.5 pt-1">
                  {/* GitHub token */}
                  {!config?.githubTokenSet && (
                    <div>
                      <label className="text-xs text-[#5a5a78] font-medium mb-1 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> GitHub Personal Access Token
                        <span className="text-[#3a3a5c] font-normal ml-1">— for private repos or higher rate limits</span>
                      </label>
                      <div className="flex items-center gap-2 bg-[#0a0a14] border border-[#1c1c30] rounded-lg px-3 py-2 focus-within:border-[#262640]">
                        <KeyRound className="w-3.5 h-3.5 text-[#3a3a5c] flex-shrink-0" />
                        <input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          className="flex-1 bg-transparent text-[#9090b0] text-xs placeholder:text-[#2a2a44] focus:outline-none font-mono" />
                      </div>
                    </div>
                  )}
                  {config?.githubTokenSet && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      GitHub token configured via <code className="font-mono text-[10px]">GITHUB_TOKEN</code> env var
                    </div>
                  )}

                  {/* Anthropic key — only show if NOT set via env */}
                  {!config?.aiEnabled ? (
                    <div>
                      <label className="text-xs text-[#5a5a78] font-medium mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" /> Anthropic API Key
                        <span className="text-[#3a3a5c] font-normal ml-1">— enables AI semantic clustering</span>
                      </label>
                      <div className="flex items-center gap-2 bg-[#0a0a14] border border-[#1c1c30] rounded-lg px-3 py-2 focus-within:border-indigo-600/40">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-400/50 flex-shrink-0" />
                        <input type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)}
                          placeholder="sk-ant-xxxxxxxxxxxxxxxxxxxx"
                          className="flex-1 bg-transparent text-[#9090b0] text-xs placeholder:text-[#2a2a44] focus:outline-none font-mono" />
                      </div>
                      <p className="text-[10px] text-[#3a3a5c] mt-1">
                        Or set permanently:{' '}
                        <code className="font-mono bg-[#1c1c30] px-1 py-0.5 rounded text-[#5a5a78]">
                          ANTHROPIC_API_KEY=sk-ant-... in .env.local
                        </code>
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Anthropic API key configured via <code className="font-mono text-[10px]">ANTHROPIC_API_KEY</code> env var
                    </div>
                  )}
                </div>
              )}

              {/* Example PRs */}
              <div className="pt-1">
                <p className="text-[10px] text-[#3a3a5c] mb-1.5">Try a public example:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'vercel/next.js #74716', url: 'https://github.com/vercel/next.js/pull/74716' },
                    { label: 'calcom/cal.com #17400', url: 'https://github.com/calcom/cal.com/pull/17400' },
                  ].map(ex => (
                    <button key={ex.url} onClick={() => { setPrUrl(ex.url); setUrlError(''); }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-600/8 hover:bg-indigo-600/15 border border-indigo-600/20 px-2.5 py-1 rounded-lg transition-all font-mono">
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Paste diff mode ───────────────────────────────────────────────── */}
          {mode === 'paste' && (
            <div>
              <div className="flex items-center justify-between px-5 py-3 bg-[#0a0a14]">
                <span className="text-xs text-[#5a5a78]">Paste raw git diff output</span>
                <button onClick={() => setDiffText(SAMPLE_DIFF_TEXT)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-600/20 transition-all">
                  <GitBranch className="w-3.5 h-3.5" /> Load Sample Diff
                </button>
              </div>
              <textarea value={diffText} onChange={e => setDiffText(e.target.value)}
                placeholder={`diff --git a/src/auth/jwt.config.ts b/src/auth/jwt.config.ts\n@@ -3,2 +3,2 @@\n-  expiry: '7d',\n+  expiry: '30d',`}
                className="w-full h-52 bg-[#08080f] text-[#7878a0] font-code text-xs px-5 py-4 resize-none focus:outline-none placeholder:text-[#2a2a44] leading-relaxed"
                spellCheck={false} />
              {diffText && (
                <div className="px-5 py-2 bg-[#0a0a14] border-t border-[#1c1c30] text-xs text-[#3a3a5c]">
                  {diffText.split('\n').length} lines · {(diffText.match(/^diff --git/gm) || []).length} files detected
                </div>
              )}
            </div>
          )}

          {/* Action footer */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#1c1c30] bg-[#0a0a14]">
            <div className="text-xs text-[#3a3a5c]">
              {mode === 'github' && isGithubValid && '✓ Valid PR URL'}
              {mode === 'github' && !isGithubValid && prUrl && 'Invalid URL format'}
            </div>
            <button onClick={launch}
              disabled={isLaunching || (mode === 'github' ? !isGithubValid : !diffText.trim())}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-900/40">
              {isLaunching
                ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Launching…</>
                : <>Analyze Intent <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
