import * as fs from 'fs';
import * as path from 'path';
import { SearchResult } from '../scan/search-client';
import { BriefingItem } from '../analysis/analyser';
import { HorizonConfig } from '../config/manager';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const RUNS_DIR = path.join(DATA_DIR, 'runs');
const HISTORY_PATH = path.join(DATA_DIR, 'history.json');

export type RunStatus = 'scanning' | 'awaiting_approval' | 'analysing' | 'complete' | 'failed';

export interface RunManifest {
  runId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  config: HorizonConfig;
  searchCount: number;
  successCount: number;
  briefingItemCount: number;
  briefingFile: string | null;
}

export interface ItemHistory {
  title: string;
  source: string;
  firstSeen: string;
  lastSeen: string;
  seenCount: number;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateRunId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${h}${min}${s}`;
}

export function createRun(config: HorizonConfig): { runId: string; runDir: string } {
  const runId = generateRunId();
  const runDir = path.join(RUNS_DIR, runId);
  ensureDir(runDir);

  const manifest: RunManifest = {
    runId,
    status: 'scanning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config,
    searchCount: 0,
    successCount: 0,
    briefingItemCount: 0,
    briefingFile: null,
  };

  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { runId, runDir };
}

export function updateRunStatus(runId: string, status: RunStatus, extra?: Partial<RunManifest>): void {
  const runDir = path.join(RUNS_DIR, runId);
  const manifestPath = path.join(runDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return;

  const manifest: RunManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.status = status;
  manifest.updatedAt = new Date().toISOString();
  if (extra) {
    Object.assign(manifest, extra);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

export function saveScanResults(runId: string, results: SearchResult[]): void {
  const runDir = path.join(RUNS_DIR, runId);
  ensureDir(runDir);
  fs.writeFileSync(path.join(runDir, 'scan-results.json'), JSON.stringify(results, null, 2));

  const successCount = results.filter((r) => !r.content.startsWith('[Search failed')).length;
  updateRunStatus(runId, 'awaiting_approval', {
    searchCount: results.length,
    successCount,
  });
}

export function loadScanResults(runId: string): SearchResult[] | null {
  const filePath = path.join(RUNS_DIR, runId, 'scan-results.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function saveBriefingItems(runId: string, items: BriefingItem[]): void {
  const runDir = path.join(RUNS_DIR, runId);
  ensureDir(runDir);
  fs.writeFileSync(path.join(runDir, 'briefing-items.json'), JSON.stringify(items, null, 2));
  updateRunStatus(runId, 'complete', { briefingItemCount: items.length });
}

export function loadBriefingItems(runId: string): BriefingItem[] | null {
  const filePath = path.join(RUNS_DIR, runId, 'briefing-items.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function saveBriefingFile(runId: string, briefingText: string): string {
  const runDir = path.join(RUNS_DIR, runId);
  ensureDir(runDir);
  const filePath = path.join(runDir, 'briefing.md');
  fs.writeFileSync(filePath, briefingText, 'utf-8');
  updateRunStatus(runId, 'complete', { briefingFile: filePath });
  return filePath;
}

export function writeAuditLog(runId: string, entries: string[]): void {
  const runDir = path.join(RUNS_DIR, runId);
  ensureDir(runDir);
  const content = `# Audit Log — Run ${runId}\n\nGenerated: ${new Date().toISOString()}\n\n${entries.join('\n')}\n`;
  fs.writeFileSync(path.join(runDir, 'audit-log.md'), content, 'utf-8');
}

export function getRunManifest(runId: string): RunManifest | null {
  const manifestPath = path.join(RUNS_DIR, runId, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

export function listRuns(): RunManifest[] {
  ensureDir(RUNS_DIR);
  const dirs = fs.readdirSync(RUNS_DIR).filter((d) => {
    const stat = fs.statSync(path.join(RUNS_DIR, d));
    return stat.isDirectory();
  });

  return dirs
    .map((d) => getRunManifest(d))
    .filter((m): m is RunManifest => m !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getLatestRun(): RunManifest | null {
  const runs = listRuns();
  return runs.length > 0 ? runs[0] : null;
}

// --- Deduplication ---

function loadHistory(): ItemHistory[] {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveHistory(history: ItemHistory[]): void {
  ensureDir(DATA_DIR);
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

export function deduplicateItems(items: BriefingItem[]): { items: BriefingItem[]; duplicates: string[] } {
  const history = loadHistory();
  const now = new Date().toISOString();
  const duplicates: string[] = [];
  const fresh: BriefingItem[] = [];

  for (const item of items) {
    const existing = history.find(
      (h) =>
        h.title.toLowerCase() === item.title.toLowerCase() ||
        (h.source && item.source && h.source === item.source)
    );

    if (existing) {
      existing.lastSeen = now;
      existing.seenCount++;
      duplicates.push(item.title);
    } else {
      history.push({
        title: item.title,
        source: item.source,
        firstSeen: now,
        lastSeen: now,
        seenCount: 1,
      });
      fresh.push(item);
    }
  }

  saveHistory(history);
  return { items: fresh, duplicates };
}

export function getRunDir(runId: string): string {
  return path.join(RUNS_DIR, runId);
}
