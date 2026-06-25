'use client';

import { useEffect, useState } from 'react';
import { Brain, GitBranch, Layers, Zap, CheckCircle2, Code2, Github } from 'lucide-react';

interface Stage {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  durationMs: number;
}

const SAMPLE_STAGES: Stage[] = [
  { icon: GitBranch,    label: 'Parsing diff hunks',           sublabel: 'Extracting 10 file diffs from raw git output…',  durationMs: 350 },
  { icon: Brain,        label: 'Analysing semantic intent',     sublabel: 'Grouping hunks by underlying goal using LLM…',   durationMs: 500 },
  { icon: Zap,          label: 'Detecting split-brain files',   sublabel: 'Scanning for files with dual-intent changes…',   durationMs: 300 },
  { icon: Layers,       label: 'Building intent clusters',      sublabel: 'Constructing reviewable groups with metadata…',  durationMs: 250 },
  { icon: CheckCircle2, label: 'Ready',                         sublabel: 'Intent review dashboard prepared.',              durationMs: 100 },
];

const GITHUB_STAGES: Stage[] = [
  { icon: Github,       label: 'Fetching PR from GitHub',       sublabel: 'Calling api.github.com for metadata and diff…', durationMs: 0 },
  { icon: GitBranch,    label: 'Parsing diff hunks',            sublabel: 'Splitting unified diff into per-file hunks…',   durationMs: 0 },
  { icon: Brain,        label: 'Analysing semantic intent',     sublabel: 'Asking Claude to cluster files by goal…',       durationMs: 0 },
  { icon: Zap,          label: 'Detecting split-brain files',   sublabel: 'Scanning for files spanning multiple intents…', durationMs: 0 },
  { icon: Layers,       label: 'Building intent clusters',      sublabel: 'Constructing reviewable groups with metadata…', durationMs: 0 },
  { icon: CheckCircle2, label: 'Ready',                         sublabel: 'Intent review dashboard prepared.',             durationMs: 0 },
];

interface Props {
  onDone: () => void;
  // GitHub mode: driven by external state
  waitForReady?: boolean;  // true = don't auto-advance past last fake stage
  isReady?: boolean;       // true = API call finished, transition to review
  externalLabel?: string;  // override the current stage label
}

export default function ProcessingScreen({ onDone, waitForReady, isReady, externalLabel }: Props) {
  const isGithubMode = waitForReady !== undefined;
  const stages = isGithubMode ? GITHUB_STAGES : SAMPLE_STAGES;

  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isGithubMode) {
      // For GitHub mode: animate smoothly through stages based on time,
      // but pause near the end until isReady fires.
      let p = 0;
      const HOLD_AT = 88; // hold here until isReady
      const tick = setInterval(() => {
        if (isReady) {
          p = Math.min(p + 4, 100);
        } else {
          p = Math.min(p + 1.2, HOLD_AT);
        }
        setProgress(Math.round(p));
        setStageIdx(Math.min(Math.floor((p / 100) * (stages.length - 1)), stages.length - 1));
        if (p >= 100) {
          clearInterval(tick);
          setDone(true);
          setTimeout(onDone, 300);
        }
      }, 80);
      return () => clearInterval(tick);
    } else {
      // Sample/paste mode: fake timed animation
      const total = SAMPLE_STAGES.reduce((s, st) => s + st.durationMs, 0);
      let elapsed = 0;
      const tick = setInterval(() => {
        elapsed += 40;
        setProgress(Math.min(100, Math.round((elapsed / total) * 100)));
        let acc = 0;
        for (let i = 0; i < SAMPLE_STAGES.length; i++) {
          acc += SAMPLE_STAGES[i].durationMs;
          if (elapsed <= acc) { setStageIdx(i); break; }
        }
        if (elapsed >= total) {
          clearInterval(tick);
          setDone(true);
          setTimeout(onDone, 300);
        }
      }, 40);
      return () => clearInterval(tick);
    }
  }, [isGithubMode, isReady, onDone, stages.length]);

  const currentStage = stages[stageIdx];
  const Icon = currentStage.icon;
  const label = externalLabel && !done ? externalLabel : currentStage.label;

  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col items-center justify-center">
      <div className="flex items-center gap-2.5 mb-14">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
          <Code2 className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-[#f0f0f8] tracking-tight">Intent Review</span>
      </div>

      {/* Animated stage icon */}
      <div className="relative mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500"
          style={{
            background: done ? 'rgba(52,211,153,0.15)' : 'rgba(99,102,241,0.12)',
            border:  done ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(99,102,241,0.3)',
            boxShadow: done ? '0 0 32px rgba(52,211,153,0.2)' : '0 0 32px rgba(99,102,241,0.25)',
          }}
        >
          <Icon className="w-8 h-8 transition-all" style={{ color: done ? '#34d399' : '#818cf8' }} />
        </div>
        {!done && (
          <div className="absolute inset-0 rounded-2xl border-2 border-indigo-600/20 border-t-indigo-500/60 animate-spin-slow" />
        )}
      </div>

      <h2 className="text-lg font-semibold text-[#f0f0f8] mb-1.5">
        {label}
        {!done && <span className="animate-pulse ml-1 text-indigo-400">…</span>}
      </h2>
      <p className="text-sm text-[#5a5a78] mb-10 text-center max-w-xs">{currentStage.sublabel}</p>

      {/* Progress bar */}
      <div className="w-64 h-1.5 bg-[#1c1c30] rounded-full overflow-hidden mb-3 shimmer-bar relative">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-[#3a3a5c] font-mono">{progress}%</p>

      {/* Stage breadcrumbs */}
      <div className="flex items-center gap-2 mt-10 flex-wrap justify-center px-4">
        {stages.map((s, i) => {
          const S = s.icon;
          const isComplete = i < stageIdx || done;
          const isActive   = i === stageIdx && !done;
          return (
            <div
              key={i}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all"
              style={{
                background: isComplete ? 'rgba(52,211,153,0.08)' : isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                color:      isComplete ? '#34d399' : isActive ? '#818cf8' : '#3a3a5c',
              }}
            >
              <S className="w-3 h-3" />
              {s.label.split(' ')[0]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
