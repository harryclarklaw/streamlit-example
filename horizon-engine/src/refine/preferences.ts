import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { BriefingItem } from '../analysis/analyser';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PREFERENCES_PATH = path.join(DATA_DIR, 'preferences.json');

export interface ItemFeedback {
  timestamp: string;
  itemTitle: string;
  sector: string;
  geography: string;
  relevance: number;
  accuracy: number;
  comment: string;
  topic: string;
}

export interface FeedbackEntry {
  timestamp: string;
  itemTitle: string;
  action: 'dismiss' | 'boost';
  topic: string;
  reason?: string;
}

export interface UserPreferences {
  suppressedTopics: string[];
  weightedTopics: string[];
  feedbackLog: FeedbackEntry[];
  itemFeedback: ItemFeedback[];
  refinementCount: number;
  lastRefinement: string;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadPreferences(): UserPreferences | null {
  try {
    if (!fs.existsSync(PREFERENCES_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(PREFERENCES_PATH, 'utf-8');
    const prefs = JSON.parse(raw) as UserPreferences;
    if (!prefs.itemFeedback) prefs.itemFeedback = [];
    return prefs;
  } catch {
    return null;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  ensureDataDir();
  fs.writeFileSync(PREFERENCES_PATH, JSON.stringify(prefs, null, 2), 'utf-8');
}

function getOrCreatePreferences(): UserPreferences {
  return (
    loadPreferences() ?? {
      suppressedTopics: [],
      weightedTopics: [],
      feedbackLog: [],
      itemFeedback: [],
      refinementCount: 0,
      lastRefinement: '',
    }
  );
}

function extractTopic(item: BriefingItem): string {
  const titleWords = item.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 3 &&
        !['the', 'and', 'for', 'from', 'with', 'that', 'this', 'will', 'have', 'been'].includes(w)
    );

  const keyWords = titleWords.slice(0, 3).join(' ');
  return keyWords || item.sector || item.title.substring(0, 30);
}

function applyFeedbackToPreferences(
  prefs: UserPreferences,
  item: BriefingItem,
  feedback: ItemFeedback
): void {
  const topic = feedback.topic;

  // Low relevance (1-2) → suppress; high relevance (4-5) → boost; 3 → no change
  if (feedback.relevance <= 2) {
    if (!prefs.suppressedTopics.includes(topic)) {
      prefs.suppressedTopics.push(topic);
    }
    prefs.weightedTopics = prefs.weightedTopics.filter((t) => t !== topic);
  } else if (feedback.relevance >= 4) {
    if (!prefs.weightedTopics.includes(topic)) {
      prefs.weightedTopics.push(topic);
    }
    prefs.suppressedTopics = prefs.suppressedTopics.filter((t) => t !== topic);
  }

  prefs.itemFeedback.push(feedback);
  prefs.refinementCount++;
  prefs.lastRefinement = new Date().toISOString();
}

/**
 * Save per-run feedback file alongside the briefing in the run directory.
 */
function saveRunFeedback(runId: string | null, allFeedback: ItemFeedback[]): void {
  if (!runId || allFeedback.length === 0) return;
  const runDir = path.join(DATA_DIR, 'runs', runId);
  if (!fs.existsSync(runDir)) return;
  fs.writeFileSync(
    path.join(runDir, 'feedback.json'),
    JSON.stringify(allFeedback, null, 2),
    'utf-8'
  );
}

function parseRating(input: string, min: number, max: number): number | null {
  const num = parseInt(input, 10);
  if (isNaN(num) || num < min || num > max) return null;
  return num;
}

export async function runRefine(items: BriefingItem[], runId?: string): Promise<void> {
  if (items.length === 0) {
    console.log('\n  No briefing items to refine. Run a scan first.\n');
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (prompt: string): Promise<string> =>
    new Promise((resolve) => {
      rl.question(prompt, (answer) => resolve(answer.trim()));
    });

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          HORIZON ENGINE — Refinement                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const prefs = getOrCreatePreferences();
  console.log(`  Refinement cycle: ${prefs.refinementCount + 1}`);
  if (prefs.suppressedTopics.length > 0) {
    console.log(`  Currently suppressed: ${prefs.suppressedTopics.join(', ')}`);
  }
  if (prefs.weightedTopics.length > 0) {
    console.log(`  Currently boosted: ${prefs.weightedTopics.join(', ')}`);
  }
  console.log('');

  console.log('  Review each item. For each you will rate:\n');
  console.log('    Relevance (1-5):  How relevant is this to your practice?');
  console.log('      1 = Not relevant at all, suppress this topic');
  console.log('      2 = Marginally relevant');
  console.log('      3 = Somewhat relevant');
  console.log('      4 = Highly relevant');
  console.log('      5 = Critical, show me more like this\n');
  console.log('    Accuracy (1-5):   How accurate and well-sourced is this item?');
  console.log('      1 = Inaccurate or fabricated');
  console.log('      2 = Contains significant errors');
  console.log('      3 = Broadly correct but imprecise');
  console.log('      4 = Accurate with minor issues');
  console.log('      5 = Verified and precise\n');
  console.log('    Comment:          Free-text note (optional)\n');
  console.log('  Press [s] to skip an item, [q] to quit.\n');

  const sessionFeedback: ItemFeedback[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const urgencyLabel = item.urgency.toUpperCase();
    const confidenceLabel = item.confidence ? item.confidence.toUpperCase() : 'N/A';

    console.log('────────────────────────────────────────────────────────────');
    console.log(`  Item ${i + 1}/${items.length}  [${urgencyLabel}]  Confidence: ${confidenceLabel}`);
    console.log('────────────────────────────────────────────────────────────');
    console.log(`  ${item.title}`);
    console.log('');
    console.log(`  What happened: ${item.whatHappened}`);
    console.log(`  Significance:  ${item.strategicSignificance}`);
    console.log(`  Smart move:    ${item.smartMove}`);
    console.log(`  Source:        ${item.source || 'N/A'}`);
    console.log(`  Sector: ${item.sector} | Geography: ${item.geography}`);
    console.log('');

    // Relevance
    let relevance: number | null = null;
    while (relevance === null) {
      const input = await ask('  Relevance (1-5) or [s]kip / [q]uit: ');
      if (input.toLowerCase() === 'q') {
        console.log('\n  Refinement ended early.\n');
        finishRefinement(prefs, sessionFeedback, runId, rl);
        return;
      }
      if (input.toLowerCase() === 's') {
        console.log('  Skipped.\n');
        relevance = -1; // sentinel for skip
        break;
      }
      relevance = parseRating(input, 1, 5);
      if (relevance === null) {
        console.log('    Enter a number 1-5, or s/q.');
      }
    }

    if (relevance === -1) continue;

    // Accuracy
    let accuracy: number | null = null;
    while (accuracy === null) {
      const input = await ask('  Accuracy  (1-5): ');
      accuracy = parseRating(input, 1, 5);
      if (accuracy === null) {
        console.log('    Enter a number 1-5.');
      }
    }

    // Comment
    const comment = await ask('  Comment (optional, press Enter to skip): ');

    const topic = extractTopic(item);
    const feedback: ItemFeedback = {
      timestamp: new Date().toISOString(),
      itemTitle: item.title,
      sector: item.sector,
      geography: item.geography,
      relevance,
      accuracy,
      comment,
      topic,
    };

    applyFeedbackToPreferences(prefs, item, feedback);
    sessionFeedback.push(feedback);

    // Show confirmation with visual indicators
    const relBar = '|'.repeat(relevance) + '.'.repeat(5 - relevance);
    const accBar = '|'.repeat(accuracy) + '.'.repeat(5 - accuracy);
    console.log(`\n  Recorded: Relevance [${relBar}] ${relevance}/5  Accuracy [${accBar}] ${accuracy}/5`);
    if (comment) {
      console.log(`  Comment: "${comment}"`);
    }

    // Show what this feedback does
    if (relevance <= 2) {
      console.log(`  -> Topic "${topic}" will be suppressed in future scans.`);
    } else if (relevance >= 4) {
      console.log(`  -> Topic "${topic}" will be boosted in future scans.`);
    }
    if (accuracy <= 2) {
      console.log(`  -> Flagged as low accuracy. Source quality concerns logged.`);
    }
    console.log('');
  }

  finishRefinement(prefs, sessionFeedback, runId, rl);
}

function finishRefinement(
  prefs: UserPreferences,
  sessionFeedback: ItemFeedback[],
  runId: string | undefined,
  rl: readline.Interface
): void {
  rl.close();

  if (sessionFeedback.length === 0) {
    console.log('  No feedback recorded.\n');
    return;
  }

  savePreferences(prefs);
  saveRunFeedback(runId ?? null, sessionFeedback);

  // Summary statistics
  const avgRelevance = sessionFeedback.reduce((s, f) => s + f.relevance, 0) / sessionFeedback.length;
  const avgAccuracy = sessionFeedback.reduce((s, f) => s + f.accuracy, 0) / sessionFeedback.length;
  const withComments = sessionFeedback.filter((f) => f.comment.length > 0).length;
  const suppressed = sessionFeedback.filter((f) => f.relevance <= 2).length;
  const boosted = sessionFeedback.filter((f) => f.relevance >= 4).length;
  const lowAccuracy = sessionFeedback.filter((f) => f.accuracy <= 2).length;

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          Refinement Summary                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log(`  Items reviewed:       ${sessionFeedback.length}`);
  console.log(`  Avg relevance:        ${avgRelevance.toFixed(1)}/5`);
  console.log(`  Avg accuracy:         ${avgAccuracy.toFixed(1)}/5`);
  console.log(`  Items with comments:  ${withComments}`);
  console.log(`  Topics suppressed:    ${suppressed}`);
  console.log(`  Topics boosted:       ${boosted}`);
  if (lowAccuracy > 0) {
    console.log(`  Low-accuracy flags:   ${lowAccuracy}`);
  }
  console.log('');
  console.log(`  Total refinement cycles: ${prefs.refinementCount}`);
  console.log(`  Suppressed topics: ${prefs.suppressedTopics.join(', ') || 'none'}`);
  console.log(`  Boosted topics:    ${prefs.weightedTopics.join(', ') || 'none'}`);

  if (prefs.refinementCount >= 5) {
    console.log('\n  Calibration note will appear in future briefings based on your feedback.');
  } else {
    console.log(`\n  ${5 - prefs.refinementCount} more refinement cycles until calibration notes appear.`);
  }

  if (runId) {
    console.log(`  Feedback saved to run: ${runId}`);
  }
  console.log('');
}
