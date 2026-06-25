'use client';

import { useState } from 'react';
import {
  ChevronDown, ChevronRight, CheckCircle2, XCircle, FileCode,
  Zap, AlertTriangle, Plus, Minus,
} from 'lucide-react';
import type { IntentCluster, IntentStatus } from '@/lib/types';
import clsx from 'clsx';

interface Props {
  clusters: IntentCluster[];
  selectedClusterId: string | null;
  selectedFile: string | null;
  onSelectCluster: (id: string) => void;
  onSelectFile: (clusterId: string, path: string) => void;
  onUpdateStatus: (id: string, status: IntentStatus) => void;
}

const riskLabel: Record<string, { label: string; color: string }> = {
  high:   { label: 'High',   color: '#f87171' },
  medium: { label: 'Medium', color: '#fbbf24' },
  low:    { label: 'Low',    color: '#34d399' },
};

const statusConfig: Record<IntentStatus, { icon: React.ElementType; label: string; color: string; bg: string; border: string }> = {
  pending:  { icon: ChevronRight, label: 'Pending',  color: '#5a5a78', bg: 'rgba(90,90,120,0.1)', border: 'rgba(90,90,120,0.2)' },
  approved: { icon: CheckCircle2, label: 'Approved', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' },
  rejected: { icon: XCircle,     label: 'Rejected', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
};

function ClusterCard({
  cluster,
  isSelected,
  selectedFile,
  onSelectCluster,
  onSelectFile,
  onUpdateStatus,
}: {
  cluster: IntentCluster;
  isSelected: boolean;
  selectedFile: string | null;
  onSelectCluster: () => void;
  onSelectFile: (path: string) => void;
  onUpdateStatus: (status: IntentStatus) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [flashClass, setFlashClass] = useState('');
  const sc = statusConfig[cluster.status];
  const StatusIcon = sc.icon;
  const rl = riskLabel[cluster.risk];

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateStatus(cluster.status === 'approved' ? 'pending' : 'approved');
    setFlashClass('flash-approve');
    setTimeout(() => setFlashClass(''), 500);
  };
  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateStatus(cluster.status === 'rejected' ? 'pending' : 'rejected');
    setFlashClass('flash-reject');
    setTimeout(() => setFlashClass(''), 500);
  };

  return (
    <div
      className={clsx(
        'cluster-card rounded-xl border transition-all overflow-hidden',
        flashClass,
        isSelected
          ? 'border-indigo-600/50 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]'
          : 'border-[#1c1c30] hover:border-[#262640]',
      )}
    >
      {/* Cluster header row */}
      <div
        className="flex items-start gap-2.5 px-3.5 py-3 cursor-pointer select-none"
        style={{ background: isSelected ? cluster.bgColor : 'transparent' }}
        onClick={() => { onSelectCluster(); setExpanded(e => !e); }}
      >
        {/* Expand chevron */}
        <button
          className="mt-0.5 text-[#3a3a5c] hover:text-[#9090b0] flex-shrink-0 transition-colors"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Emoji + title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-base leading-none">{cluster.emoji}</span>
            <span className="text-[13px] font-semibold text-[#f0f0f8] leading-snug">
              {cluster.title}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium" style={{ color: rl.color }}>
              {rl.label} risk
            </span>
            <span className="text-[#2a2a44] text-[10px]">·</span>
            <span className="text-[10px] text-[#34d399] flex items-center gap-0.5">
              <Plus className="w-2.5 h-2.5" />{cluster.additions}
            </span>
            <span className="text-[10px] text-[#f87171] flex items-center gap-0.5">
              <Minus className="w-2.5 h-2.5" />{cluster.deletions}
            </span>
            {/* Status badge */}
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex items-center gap-1"
              style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}
            >
              <StatusIcon className="w-2.5 h-2.5" />
              {sc.label}
            </span>
          </div>
        </div>
      </div>

      {/* Approve / Reject action buttons */}
      <div className="flex items-center gap-1.5 px-3.5 pb-2.5">
        <button
          onClick={handleApprove}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all',
            cluster.status === 'approved'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-900/50 text-emerald-500 hover:text-emerald-300',
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {cluster.status === 'approved' ? 'Approved ✓' : 'Approve Intent'}
        </button>
        <button
          onClick={handleReject}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all',
            cluster.status === 'rejected'
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : 'bg-red-950/40 hover:bg-red-900/50 border-red-900/50 text-red-500 hover:text-red-300',
          )}
        >
          <XCircle className="w-3.5 h-3.5" />
          {cluster.status === 'rejected' ? 'Rejected ✗' : 'Request Rework'}
        </button>
      </div>

      {/* File list */}
      {expanded && (
        <div className="border-t border-[#1c1c30]">
          {cluster.files.map(file => {
            const isFileSelected = selectedFile === file.path;
            const filename = file.path.split('/').pop() ?? file.path;
            const dir = file.path.includes('/')
              ? file.path.substring(0, file.path.lastIndexOf('/') + 1)
              : '';

            return (
              <button
                key={file.path}
                onClick={() => onSelectFile(file.path)}
                className={clsx(
                  'w-full flex items-center gap-2 px-4 py-2 text-left transition-all group',
                  isFileSelected
                    ? 'bg-indigo-600/12'
                    : 'hover:bg-[#12121f]',
                )}
              >
                {/* Left accent line */}
                <div
                  className="w-0.5 h-full min-h-[16px] rounded-full flex-shrink-0 self-stretch"
                  style={{ background: isFileSelected ? cluster.color : '#1c1c30' }}
                />

                <FileCode
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: isFileSelected ? cluster.color : '#3a3a5c' }}
                />

                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className={clsx('text-xs truncate font-medium', isFileSelected ? 'text-[#e0e0f0]' : 'text-[#7878a0] group-hover:text-[#a0a0c0]')}>
                      {dir && <span className="text-[#3a3a5c]">{dir}</span>}
                      {filename}
                    </span>

                    {file.isSplitBrain && (
                      <span className="split-brain-badge flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold">
                        <Zap className="w-2.5 h-2.5" />
                        SPLIT
                      </span>
                    )}
                    {file.isNew && (
                      <span className="flex-shrink-0 px-1 py-0.5 rounded text-[9px] font-bold bg-indigo-600/15 text-indigo-400 border border-indigo-600/20">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#34d399]">+{file.additions}</span>
                    <span className="text-[10px] text-[#f87171]">−{file.deletions}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function IntentSidebar({
  clusters,
  selectedClusterId,
  selectedFile,
  onSelectCluster,
  onSelectFile,
  onUpdateStatus,
}: Props) {
  const totalApproved = clusters.filter(c => c.status === 'approved').length;
  const totalRejected = clusters.filter(c => c.status === 'rejected').length;
  const progress = Math.round(((totalApproved + totalRejected) / clusters.length) * 100);

  return (
    <aside className="flex flex-col h-full overflow-hidden bg-[#09090f] border-r border-[#1c1c30]">
      {/* Sidebar header */}
      <div className="px-4 py-3.5 border-b border-[#1c1c30] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#5a5a78] uppercase tracking-wider">
            Intent Clusters
          </span>
          <span className="text-xs text-[#5a5a78]">
            {totalApproved + totalRejected}/{clusters.length} reviewed
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 rounded-full bg-[#1c1c30] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {clusters.some(c => c.files.some(f => f.isSplitBrain)) && (
          <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-amber-400 bg-amber-500/8 border border-amber-500/15 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span><strong>Split-Brain detected</strong> — 1 file spans 2 intents</span>
          </div>
        )}
      </div>

      {/* Cluster list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {clusters.map(cluster => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            isSelected={selectedClusterId === cluster.id}
            selectedFile={selectedFile}
            onSelectCluster={() => onSelectCluster(cluster.id)}
            onSelectFile={path => onSelectFile(cluster.id, path)}
            onUpdateStatus={status => onUpdateStatus(cluster.id, status)}
          />
        ))}
      </div>

      {/* Bottom summary */}
      <div className="px-4 py-3 border-t border-[#1c1c30] flex-shrink-0 bg-[#0a0a14]">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-bold text-[#f0f0f8]">{clusters.length}</div>
            <div className="text-[10px] text-[#3a3a5c]">Intents</div>
          </div>
          <div>
            <div className="text-sm font-bold text-[#34d399]">{totalApproved}</div>
            <div className="text-[10px] text-[#3a3a5c]">Approved</div>
          </div>
          <div>
            <div className="text-sm font-bold text-[#f87171]">{totalRejected}</div>
            <div className="text-[10px] text-[#3a3a5c]">Rejected</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
