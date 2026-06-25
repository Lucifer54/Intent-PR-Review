export type LineType = 'add' | 'del' | 'ctx' | 'hdr';

export interface DiffLine {
  type: LineType;
  content: string;
  lineOld?: number;
  lineNew?: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface FileDiff {
  path: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

export type RiskLevel = 'low' | 'medium' | 'high';
export type IntentStatus = 'pending' | 'approved' | 'rejected';

export interface IntentFile {
  path: string;
  additions: number;
  deletions: number;
  isSplitBrain?: boolean;
  isNew?: boolean;
  hunkIndices?: number[];
}

export interface IntentCluster {
  id: string;
  emoji: string;
  title: string;
  description: string;
  risk: RiskLevel;
  color: string;
  bgColor: string;
  borderColor: string;
  files: IntentFile[];
  status: IntentStatus;
  additions: number;
  deletions: number;
}

export interface PRAnalysis {
  prNumber: number;
  title: string;
  repo: string;
  branch: string;
  author: string;
  createdAt: string;
  executiveSummary: string;
  riskStatement: string;
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  splitBrainFiles: string[];
  clusters: IntentCluster[];
  fileDiffs: Record<string, FileDiff>;
}
