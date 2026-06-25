import { Sparkles, AlertTriangle, FileCode, Plus, Minus, GitBranch, User, Clock, Zap } from 'lucide-react';
import type { PRAnalysis } from '@/lib/types';

interface Props {
  pr: PRAnalysis;
  usedAI?: boolean;
}

const riskConfig = {
  low: { label: 'Low Risk', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' },
  medium: { label: 'Med Risk', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
  high: { label: 'High Risk', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
};

function overallRisk(pr: PRAnalysis) {
  if (pr.clusters.some(c => c.risk === 'high')) return 'high';
  if (pr.clusters.some(c => c.risk === 'medium')) return 'medium';
  return 'low';
}

export default function ExecutiveSummary({ pr, usedAI }: Props) {
  const risk = overallRisk(pr);
  const rc = riskConfig[risk];

  return (
    <div className="bg-[#0d0d18] border border-[#1c1c30] rounded-xl overflow-hidden mb-0">
      {/* Header bar */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-[#1c1c30] bg-[#0a0a14]">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider">
          {usedAI ? 'AI Executive Summary' : 'Summary'}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full border"
            style={{ color: rc.color, background: rc.bg, borderColor: rc.border }}
          >
            {rc.label}
          </span>
          {!usedAI && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400">
              <AlertTriangle className="w-3 h-3" /> Heuristic
            </span>
          )}
          {pr.splitBrainFiles.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400">
              <Zap className="w-3 h-3" />
              {pr.splitBrainFiles.length} Split-Brain {pr.splitBrainFiles.length === 1 ? 'File' : 'Files'}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {/* PR title + meta */}
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold text-[#f0f0f8] mb-2 leading-snug">{pr.title}</h2>
          <div className="flex items-center gap-5 text-xs text-[#5a5a78]">
            <span className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              {pr.branch}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {pr.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {new Date(pr.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" />
              {pr.totalFiles} files
            </span>
            <span className="flex items-center gap-1 text-[#34d399]">
              <Plus className="w-3 h-3" />
              {pr.totalAdditions}
            </span>
            <span className="flex items-center gap-1 text-[#f87171]">
              <Minus className="w-3 h-3" />
              {pr.totalDeletions}
            </span>
          </div>
        </div>

        {/* Summary text */}
        <p className="text-sm text-[#9090b0] leading-relaxed mb-3">
          {pr.executiveSummary}
        </p>

        {/* Risk statement */}
        <div
          className="flex items-start gap-2.5 text-xs px-3.5 py-2.5 rounded-lg border"
          style={{ background: rc.bg, borderColor: rc.border, color: rc.color }}
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{pr.riskStatement}</span>
        </div>
      </div>

      {/* Cluster stat pills */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-[#1c1c30] bg-[#0a0a14] overflow-x-auto">
        <span className="text-[10px] text-[#3a3a5c] uppercase tracking-wider font-medium mr-1 whitespace-nowrap">
          Intent Clusters
        </span>
        {pr.clusters.map(c => (
          <span
            key={c.id}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap border"
            style={{ color: c.color, background: c.bgColor, borderColor: c.borderColor }}
          >
            {c.emoji} {c.title}
          </span>
        ))}
      </div>
    </div>
  );
}
