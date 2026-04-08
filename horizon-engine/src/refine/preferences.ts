import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { BriefingItem } from '../analysis/analyser';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PREFERENCES_PATH = path.join(DATA_DIR, 'preferences.json');

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
    return JSON.parse(raw) as UserPreferences;
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
      refinementCount: 0,
      lastRefinement: '',
    }
  );
}

/**
 * Log a dismissal — the user marks an item as irrelevant.
 * Extracts the topic from the item and adds it to suppressed topics.
 */
export function dismissItem(item: BriefingItem, reason?: string): void {
  const prefs = getOrCreatePreferences();

  const topic = extractTopic(item);

  const entry: FeedbackEntry = {
    timestamp: new Date().toISOString(),
    itemTitle: item.title,
    action: 'dismiss',
    topic,
    reason,
  };

  prefs.feedbackLog.push(entry);

  // Add to suppressed topics if not already there
  if (!prefs.suppressedTopics.includes(topic)) {
    prefs.suppressedTopics.push(topic);
  }

  prefs.refinementCount++;
  prefs.lastRefinement = new Date().toISOString();

  savePreferences(prefs);
  console.log(`  ✓ Dismissed: "${item.title}"`);
  console.log(`    Topic "${topic}" will be suppressed in future scans.`);
}

/**
 * Log a boost — the user marks an item as particularly relevant.
 * Extracts the topic from the item and adds it to weighted topics.
 */
export function boostItem(item: BriefingItem, reason?: string): void {
  const prefs = getOrCreatePreferences();

  const topic = extractTopic(item);

  const entry: FeedbackEntry = {
    timestamp: new Date().toISOString(),
    itemTitle: item.title,
    action: 'boost',
    topic,
    reason,
  };

  prefs.feedbackLog.push(entry);

  // Add to weighted topics if not already there
  if (!prefs.weightedTopics.includes(topic)) {
    prefs.weightedTopics.push(topic);
  }

  // Remove from suppressed if it was previously suppressed
  prefs.suppressedTopics = prefs.suppressedTopics.filter((t) => t !== topic);

  prefs.refinementCount++;
  prefs.lastRefinement = new Date().toISOString();

  savePreferences(prefs);
  console.log(`  ✓ Boosted: "${item.title}"`);
  console.log(`    Topic "${topic}" will be weighted higher in future scans.`);
}

/**
 * Extract a topic identifier from a briefing item.
 * Uses the item's title, sector, and content to derive a meaningful topic label.
 */
function extractTopic(item: BriefingItem): string {
  // Use the sector as the primary topic identifier,
  // combined with key terms from the title
  const titleWords = item.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 3 &&
        !['the', 'and', 'for', 'from', 'with', 'that', 'this', 'will', 'have', 'been'].includes(w)
    );

  // Take up to 3 key words from the title
  const keyWords = titleWords.slice(0, 3).join(' ');
  return keyWords || item.sector || item.title.substring(0, 30);
}

/**
 * Interactive refinement session: present briefing items and let the user
 * mark them as relevant (boost) or irrelevant (dismiss).
 */
export async function runRefine(items: BriefingItem[]): Promise<void> {
  if (items.length === 0) {
    console.log('\n  No briefing items to refine. Run a scan first.\n');
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => {
      rl.question(prompt, (answer) => resolve(answer.trim()));
    });

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          HORIZON ENGINE — Refinement                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const prefs = getOrCreatePreferences();
  console.log(`Refinement cycle: ${prefs.refinementCount + 1}`);
  if (prefs.suppressedTopics.length > 0) {
    console.log(`Currently suppressed: ${prefs.suppressedTopics.join(', ')}`);
  }
  if (prefs.weightedTopics.length > 0) {
    console.log(`Currently boosted: ${prefs.weightedTopics.join(', ')}`);
  }
  console.log('');

  console.log('Review each item and provide feedback:\n');
  console.log('  [b] Boost — this is highly relevant, show me more like this');
  console.log('  [d] Dismiss — this is not relevant, suppress similar items');
  console.log('  [s] Skip — no feedback on this item');
  console.log('  [q] Quit — stop refinement\n');

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const urgencyLabel = item.urgency.toUpperCase();

    console.log(`─── Item ${i + 1}/${items.length} [${urgencyLabel}] ───`);
    console.log(`  ${item.title}`);
    console.log(`  ${item.whatHappened}`);
    console.log(`  Sector: ${item.sector} | Geography: ${item.geography}`);
    console.log('');

    const action = await question('  Action [b/d/s/q]: ');

    switch (action.toLowerCase()) {
      case 'b': {
        const reason = await question('  Why is this relevant? (optional, press Enter to skip): ');
        boostItem(item, reason || undefined);
        break;
      }
      case 'd': {
        const reason = await question('  Why is this irrelevant? (optional, press Enter to skip): ');
        dismissItem(item, reason || undefined);
        break;
      }
      case 'q':
        console.log('\n  Refinement ended.\n');
        rl.close();
        return;
      case 's':
      default:
        console.log('  Skipped.');
        break;
    }
    console.log('');
  }

  rl.close();

  const updatedPrefs = loadPreferences();
  if (updatedPrefs) {
    console.log('\n─── Refinement Summary ───\n');
    console.log(`  Total refinement cycles: ${updatedPrefs.refinementCount}`);
    console.log(`  Suppressed topics: ${updatedPrefs.suppressedTopics.join(', ') || 'none'}`);
    console.log(`  Boosted topics: ${updatedPrefs.weightedTopics.join(', ') || 'none'}`);

    if (updatedPrefs.refinementCount >= 5) {
      console.log(
        '\n  ℹ Calibration note will appear in future briefings based on your feedback.'
      );
    } else {
      console.log(
        `\n  ℹ ${5 - updatedPrefs.refinementCount} more refinement cycles until calibration notes appear.`
      );
    }
  }
  console.log('');
}
