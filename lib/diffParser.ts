import type { FileDiff, DiffHunk, DiffLine } from './types';

export function parseDiff(rawDiff: string): FileDiff[] {
  const files: FileDiff[] = [];
  const lines = rawDiff.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.startsWith('diff --git ')) { i++; continue; }

    const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    const path = match ? match[2] : line.replace('diff --git a/', '');

    const file: FileDiff = { path, hunks: [], additions: 0, deletions: 0 };
    i++;

    // Header lines between "diff --git" and first "@@"
    while (i < lines.length && !lines[i].startsWith('diff --git ') && !lines[i].startsWith('@@ ')) {
      const h = lines[i];
      if (h.startsWith('new file mode') || h === 'new file') file.isNew = true;
      if (h.startsWith('deleted file mode')) file.isDeleted = true;
      i++;
    }

    // Hunks
    while (i < lines.length && !lines[i].startsWith('diff --git ')) {
      if (!lines[i].startsWith('@@ ')) { i++; continue; }

      const hunk: DiffHunk = { header: lines[i], lines: [] };
      i++;

      while (i < lines.length && !lines[i].startsWith('@@ ') && !lines[i].startsWith('diff --git ')) {
        const dl = lines[i];
        if (dl.startsWith('+')) {
          hunk.lines.push({ type: 'add', content: dl.slice(1) });
          file.additions++;
        } else if (dl.startsWith('-')) {
          hunk.lines.push({ type: 'del', content: dl.slice(1) });
          file.deletions++;
        } else if (!dl.startsWith('\\')) {
          hunk.lines.push({ type: 'ctx', content: dl.length > 0 ? dl.slice(1) : '' });
        }
        i++;
      }

      if (hunk.lines.length > 0) file.hunks.push(hunk);
    }

    if (file.hunks.length > 0 || file.isNew || file.isDeleted) {
      files.push(file);
    }
  }

  return files;
}

// For the Claude prompt: produce a compact per-file summary
export function summariseDiff(files: FileDiff[], maxLinesPerFile = 60): string {
  return files.map((f, idx) => {
    const allLines: DiffLine[] = f.hunks.flatMap(h => h.lines);
    const shown = allLines.slice(0, maxLinesPerFile);
    const truncated = allLines.length > maxLinesPerFile;

    const formatted = shown.map(l => {
      const prefix = l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' ';
      return `${prefix}${l.content}`;
    }).join('\n');

    return [
      `### [${idx}] ${f.path}  +${f.additions} -${f.deletions}${f.isNew ? '  (NEW FILE)' : ''}`,
      formatted,
      truncated ? `  ... (${allLines.length - maxLinesPerFile} more lines truncated)` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}
