'use client';

import { useEffect, useRef } from 'react';
import { FileCode, Plus, Minus, Zap, ChevronDown, FilePlus } from 'lucide-react';
import type { IntentCluster, FileDiff, DiffLine } from '@/lib/types';
import clsx from 'clsx';

interface Props {
  clusters: IntentCluster[];
  selectedClusterId: string | null;
  selectedFile: string | null;
  fileDiffs: Record<string, FileDiff>;
}

function DiffLineRow({ line, idx }: { line: DiffLine; idx: number }) {
  const prefix = line.type === 'add' ? '+' : line.type === 'del' ? '−' : line.type === 'hdr' ? '⋯' : ' ';
  const cls =
    line.type === 'add' ? 'diff-add' :
    line.type === 'del' ? 'diff-del' :
    line.type === 'hdr' ? 'diff-hdr' : 'diff-ctx';

  return (
    <div className={clsx('flex items-start px-0 min-w-0', cls)}>
      <span className="line-num w-9 text-right pr-3 py-0.5 select-none text-[10px] flex-shrink-0">
        {line.type !== 'hdr' ? idx + 1 : ''}
      </span>
      <span className={clsx('diff-prefix w-4 py-0.5 flex-shrink-0 text-center text-xs font-bold select-none font-code')}>
        {prefix}
      </span>
      <span className={clsx('diff-text flex-1 py-0.5 pr-4 whitespace-pre font-code text-[12.5px] leading-relaxed overflow-x-auto')}>
        {line.content || ' '}
      </span>
    </div>
  );
}

function FileDiffBlock({
  filePath,
  diff,
  cluster,
  hunkIndices,
  isSplitBrain,
  scrollRef,
}: {
  filePath: string;
  diff: FileDiff;
  cluster: IntentCluster;
  hunkIndices?: number[];
  isSplitBrain?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>;
}) {
  const filename = filePath.split('/').pop() ?? filePath;
  const dir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) : '';
  const hunksToShow = hunkIndices ? diff.hunks.filter((_, i) => hunkIndices.includes(i)) : diff.hunks;

  return (
    <div ref={scrollRef} className="bg-[#0a0a14] border border-[#1c1c30] rounded-xl overflow-hidden mb-4">
      {/* File header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0d0d1a] border-b border-[#1c1c30]">
        {diff.isNew
          ? <FilePlus className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          : <FileCode className="w-4 h-4 text-[#5a5a78] flex-shrink-0" />
        }
        <span className="font-code text-xs text-[#9090b0] flex-1 truncate">
          <span className="text-[#3a3a5c]">{dir}</span>
          <span className="text-[#d0d0e8] font-semibold">{filename}</span>
        </span>

        <div className="flex items-center gap-2 ml-auto">
          {isSplitBrain && (
            <span className="split-brain-badge flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
              <Zap className="w-3 h-3" />
              SPLIT-BRAIN — showing {hunkIndices?.length} of {diff.hunks.length} hunks
            </span>
          )}
          {diff.isNew && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-600/15 border border-indigo-600/25 text-indigo-400 text-[10px] font-bold">
              NEW FILE
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-[#34d399] font-medium">
            <Plus className="w-3 h-3" />{diff.additions}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#f87171] font-medium">
            <Minus className="w-3 h-3" />{diff.deletions}
          </span>

          {/* Intent color tag */}
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
            style={{ color: cluster.color, background: cluster.bgColor, borderColor: cluster.borderColor }}
          >
            {cluster.emoji} {cluster.title.split(' ').slice(0, 3).join(' ')}…
          </span>
        </div>
      </div>

      {/* Diff hunks */}
      <div className="overflow-x-auto">
        {hunksToShow.map((hunk, hi) => {
          let lineIdx = 0;
          return (
            <div key={hi}>
              {/* Hunk header */}
              <div className="diff-hdr flex items-center px-4 py-1 gap-3">
                <ChevronDown className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <span className="font-code text-[11px] text-blue-300 italic">{hunk.header}</span>
              </div>

              {/* Lines */}
              {hunk.lines.map((line, li) => {
                const rowIdx = line.type === 'hdr' ? 0 : lineIdx++;
                return <DiffLineRow key={li} line={line} idx={rowIdx} />;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DiffPanel({ clusters, selectedClusterId, selectedFile, fileDiffs }: Props) {
  const fileRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Build ref map on mount
  const allPaths = clusters.flatMap(c => c.files.map(f => `${c.id}::${f.path}`));
  allPaths.forEach(key => {
    if (!fileRefs.current[key]) {
      fileRefs.current[key] = { current: null } as React.RefObject<HTMLDivElement>;
    }
  });

  // Scroll to selected file
  useEffect(() => {
    if (selectedClusterId && selectedFile) {
      const key = `${selectedClusterId}::${selectedFile}`;
      const ref = fileRefs.current[key];
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedClusterId, selectedFile]);

  const activeClusters = selectedClusterId
    ? clusters.filter(c => c.id === selectedClusterId)
    : clusters;

  if (activeClusters.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#3a3a5c]">
        <p className="text-sm">Select an intent cluster to begin reviewing.</p>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="flex-1 overflow-y-auto px-6 py-5">
      {activeClusters.map(cluster => (
        <div key={cluster.id} className="mb-8">
          {/* Cluster section header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#1c1c30]">
            <span className="text-xl">{cluster.emoji}</span>
            <div>
              <h3 className="text-sm font-bold text-[#f0f0f8]">{cluster.title}</h3>
              <p className="text-xs text-[#5a5a78] mt-0.5 max-w-xl">{cluster.description}</p>
            </div>
            <div
              className="ml-auto px-3 py-1 rounded-full text-xs font-semibold border"
              style={{ color: cluster.color, background: cluster.bgColor, borderColor: cluster.borderColor }}
            >
              {cluster.files.length} files · +{cluster.additions} −{cluster.deletions}
            </div>
          </div>

          {/* File diffs */}
          {cluster.files.map(file => {
            const diff = fileDiffs[file.path];
            if (!diff) return null;
            const key = `${cluster.id}::${file.path}`;
            if (!fileRefs.current[key]) {
              fileRefs.current[key] = { current: null } as React.RefObject<HTMLDivElement>;
            }
            return (
              <FileDiffBlock
                key={key}
                filePath={file.path}
                diff={diff}
                cluster={cluster}
                hunkIndices={file.hunkIndices}
                isSplitBrain={file.isSplitBrain}
                scrollRef={fileRefs.current[key]}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
