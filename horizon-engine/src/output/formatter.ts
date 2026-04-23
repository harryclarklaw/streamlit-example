import * as fs from 'fs';
import { AnalysisResult, BriefingItem } from '../analysis/analyser';
import { HorizonConfig } from '../config/manager';
import { UserPreferences } from '../refine/preferences';

/**
 * Format a date as "DD Month YYYY"
 */
function formatDate(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format a single briefing item.
 */
function formatItem(item: BriefingItem): string {
  const lines: string[] = [];

  const confidenceLabel = item.confidence.toUpperCase();
  lines.push(`### ${item.title}`);
  lines.push(`*Confidence: ${confidenceLabel}*`);
  lines.push('');
  lines.push(`**What happened:**`);
  lines.push(item.whatHappened);
  lines.push('');
  lines.push(`**Strategic significance:**`);
  lines.push(item.strategicSignificance);
  lines.push('');
  lines.push(`**Who should care:**`);
  lines.push(item.whoShouldCare);
  lines.push('');
  lines.push(`**Smart move:**`);
  lines.push(item.smartMove);
  lines.push('');
  if (item.source) {
    lines.push(`**Source:** ${item.source}`);
    lines.push('');
  }
  lines.push('---');

  return lines.join('\n');
}

/**
 * Format the complete briefing output.
 */
export function formatBriefing(
  analysis: AnalysisResult,
  config: HorizonConfig,
  preferences: UserPreferences | null,
  totalSearches: number
): string {
  const lines: string[] = [];
  const date = formatDate(new Date());

  // Header
  lines.push('================================================================================');
  lines.push(`HORIZON BRIEFING — ${date}`);
  lines.push('================================================================================');
  lines.push('');
  lines.push(`Sectors:  ${config.sectors.join(', ')}`);
  lines.push(`Markets:  ${config.geographies.join(', ')}`);
  lines.push(`Sources:  ${analysis.items.length} developments identified across ${totalSearches} searches`);
  lines.push('');

  // Classify items by urgency
  const immediate = analysis.items.filter((i) => i.urgency === 'immediate');
  const emerging = analysis.items.filter((i) => i.urgency === 'emerging');
  const directional = analysis.items.filter((i) => i.urgency === 'directional');

  // IMMEDIATE
  if (immediate.length > 0) {
    lines.push('================================================================================');
    lines.push('IMMEDIATE — Action Required (next 2–4 weeks)');
    lines.push('================================================================================');
    lines.push('');
    for (const item of immediate) {
      lines.push(formatItem(item));
      lines.push('');
    }
  }

  // EMERGING
  if (emerging.length > 0) {
    lines.push('================================================================================');
    lines.push('EMERGING — 3–6 Month Horizon');
    lines.push('================================================================================');
    lines.push('');
    for (const item of emerging) {
      lines.push(formatItem(item));
      lines.push('');
    }
  }

  // DIRECTIONAL
  if (directional.length > 0) {
    lines.push('================================================================================');
    lines.push('DIRECTIONAL — Strategic Signals (12+ months)');
    lines.push('================================================================================');
    lines.push('');
    for (const item of directional) {
      lines.push(formatItem(item));
      lines.push('');
    }
  }

  // No items at all
  if (analysis.items.length === 0) {
    lines.push('No significant regulatory developments identified in this scan period.');
    lines.push('Consider broadening your sector or geography configuration.');
    lines.push('');
  }

  // Calibration note
  if (preferences && preferences.refinementCount >= 5) {
    lines.push('================================================================================');
    lines.push('CALIBRATION NOTE');
    lines.push('================================================================================');
    lines.push('');

    if (preferences.weightedTopics.length > 0) {
      lines.push(`Based on your feedback, this briefing is weighted toward: ${preferences.weightedTopics.join(', ')}.`);
    }
    if (preferences.suppressedTopics.length > 0) {
      lines.push(`Suppressing: ${preferences.suppressedTopics.join(', ')}.`);
    }
    lines.push('');
    lines.push('Tell me if this needs adjustment.');
    lines.push('');
  }

  lines.push('================================================================================');
  lines.push('END OF BRIEFING');
  lines.push('================================================================================');

  return lines.join('\n');
}

/**
 * Print the briefing to stdout.
 */
export function printBriefing(briefing: string): void {
  console.log('\n' + briefing);
}

/**
 * Save the briefing to a file and return the path.
 */
export function saveBriefingToFile(briefing: string, filePath: string): void {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, briefing, 'utf-8');
}
