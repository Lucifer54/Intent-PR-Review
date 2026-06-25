'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, ArrowLeft, GitPullRequest, CheckCircle2, XCircle, Layers, AlertCircle } from 'lucide-react';
import type { IntentStatus, IntentCluster, PRAnalysis } from '@/lib/types';
import { MOCK_PR } from '@/lib/mockData';
import ExecutiveSummary from './ExecutiveSummary';
import IntentSidebar from './IntentSidebar';
import DiffPanel from './DiffPanel';
import ProcessingScreen from './ProcessingScreen';

type Stage = 'processing' | 'review' | 'error';

export default function ReviewDashboard() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('processing');
  const [analysis, setAnalysis] = useState<PRAnalysis | null>(null);
  const [clusters, setClusters] = useState<IntentCluster[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [processingLabel, setProcessingLabel] = useState('');
  const [usedAI, setUsedAI] = useState(false);

  const bootAnalysis = useCallback(async () => {
    const mode = sessionStorage.getItem('ir_mode') ?? 'sample';

    if (mode === 'sample' || mode === 'paste') {
      // Use mock data for the sample / raw-paste demo
      setAnalysis(MOCK_PR);
      setClusters(MOCK_PR.clusters);
      return; // ProcessingScreen drives its own fake animation
    }

    // ── GitHub PR mode ───────────────────────────────────────────────────────
    const prUrl      = sessionStorage.getItem('ir_pr_url') ?? '';
    const ghToken    = sessionStorage.getItem('ir_gh_token') ?? '';
    const anthropicKey = sessionStorage.getItem('ir_anthropic_key') ?? '';

    try {
      setProcessingLabel('Fetching PR from GitHub…');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl, githubToken: ghToken, anthropicKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      setUsedAI(data.usedAI ?? false);
      const pr: PRAnalysis = data.analysis;
      setAnalysis(pr);
      setClusters(pr.clusters);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStage('error');
    }
  }, []);

  useEffect(() => {
    bootAnalysis();
  }, [bootAnalysis]);

  const handleProcessingDone = useCallback(() => {
    if (stage === 'error') return;
    setStage('review');
    const firstCluster = clusters[0] ?? analysis?.clusters[0];
    if (firstCluster) setSelectedClusterId(firstCluster.id);
  }, [stage, clusters, analysis]);

  const handleSelectCluster = useCallback((id: string) => {
    setSelectedClusterId(id);
    setSelectedFile(null);
  }, []);

  const handleSelectFile = useCallback((clusterId: string, path: string) => {
    setSelectedClusterId(clusterId);
    setSelectedFile(path);
  }, []);

  const handleUpdateStatus = useCallback((id: string, status: IntentStatus) => {
    setClusters(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }, []);

  // ── Error screen ────────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-[#08080f] flex flex-col items-center justify-center gap-5 p-8">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-lg font-semibold text-[#f0f0f8] mb-2">Analysis failed</h2>
          <p className="text-sm text-[#7070a0] leading-relaxed">{errorMsg}</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1c1c30] hover:bg-[#262640] border border-[#262640] text-[#9090b0] text-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to input
        </button>
      </div>
    );
  }

  // ── Processing screen ───────────────────────────────────────────────────────
  if (stage === 'processing') {
    return (
      <ProcessingScreen
        externalLabel={processingLabel}
        onDone={handleProcessingDone}
        waitForReady={!analysis && !errorMsg}
        isReady={analysis !== null}
      />
    );
  }

  // ── Full review dashboard ───────────────────────────────────────────────────
  const pr = analysis ? { ...analysis, clusters } : { ...MOCK_PR, clusters };

  const totalApproved = clusters.filter(c => c.status === 'approved').length;
  const totalRejected = clusters.filter(c => c.status === 'rejected').length;
  const allReviewed = totalApproved + totalRejected === clusters.length;

  return (
    <div className="h-screen flex flex-col bg-[#08080f] overflow-hidden">
      {/* Top nav */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-[#1c1c30] bg-[#09090f] flex-shrink-0 z-10">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-xs text-[#5a5a78] hover:text-[#9090b0] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div className="w-px h-4 bg-[#1c1c30]" />

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-[#f0f0f8]">Intent Review</span>
        </div>

        <div className="w-px h-4 bg-[#1c1c30]" />

        <div className="flex items-center gap-2 text-xs min-w-0">
          <GitPullRequest className="w-3.5 h-3.5 text-[#5a5a78] flex-shrink-0" />
          <span className="text-[#9090b0] font-medium flex-shrink-0">{pr.repo}</span>
          <span className="text-[#3a3a5c]">/</span>
          <span className="text-[#6060a0] font-mono flex-shrink-0">#{pr.prNumber}</span>
          <span className="text-[#3a3a5c] mx-1">·</span>
          <span className="text-[#7070a0] truncate">{pr.title}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {usedAI && (
            <span className="flex items-center gap-1 text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-lg">
              ✨ AI-clustered
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#12121f] border border-[#1c1c30]">
            <Layers className="w-3.5 h-3.5 text-[#5a5a78]" />
            <span className="text-[#5a5a78]">{totalApproved + totalRejected}/{clusters.length} reviewed</span>
          </div>

          {allReviewed && (
            <button
              onClick={() => alert('🎉 Review submitted!')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Submit Review
            </button>
          )}

          <div className="flex items-center gap-1.5">
            {totalApproved > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                <CheckCircle2 className="w-3 h-3" /> {totalApproved} approved
              </span>
            )}
            {totalRejected > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                <XCircle className="w-3 h-3" /> {totalRejected} rejected
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Executive summary */}
      <div className="flex-shrink-0 px-5 pt-4">
        <ExecutiveSummary pr={pr} usedAI={usedAI} />
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden mt-4">
        <div className="w-[310px] flex-shrink-0 flex flex-col overflow-hidden">
          <IntentSidebar
            clusters={clusters}
            selectedClusterId={selectedClusterId}
            selectedFile={selectedFile}
            onSelectCluster={handleSelectCluster}
            onSelectFile={handleSelectFile}
            onUpdateStatus={handleUpdateStatus}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-[#08080f]">
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[#1c1c30] bg-[#09090f] flex-shrink-0">
            {selectedClusterId ? (
              (() => {
                const c = clusters.find(cl => cl.id === selectedClusterId);
                return c ? (
                  <>
                    <span className="text-base">{c.emoji}</span>
                    <span className="text-sm font-semibold text-[#f0f0f8]">{c.title}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border ml-1"
                      style={{ color: c.color, background: c.bgColor, borderColor: c.borderColor }}
                    >
                      {c.files.length} files
                    </span>
                  </>
                ) : null;
              })()
            ) : (
              <span className="text-sm text-[#5a5a78]">All intent clusters</span>
            )}
            {selectedClusterId && (
              <button
                onClick={() => { setSelectedClusterId(null); setSelectedFile(null); }}
                className="ml-auto text-xs text-[#3a3a5c] hover:text-[#7070a0] transition-colors"
              >
                Show all
              </button>
            )}
          </div>

          <DiffPanel
            clusters={clusters}
            selectedClusterId={selectedClusterId}
            selectedFile={selectedFile}
            fileDiffs={pr.fileDiffs}
          />
        </div>
      </div>
    </div>
  );
}
