#!/usr/bin/env node

import * as readline from 'readline';
import { loadConfig, configExists, runConfigure } from './config/manager';
import { runScan } from './scan/scanner';
import { analyseResults, BriefingItem } from './analysis/analyser';
import { runRefine } from './refine/preferences';
import { formatBriefing, printBriefing, saveBriefingToFile } from './output/formatter';
import {
  createRun,
  saveScanResults,
  loadScanResults,
  saveBriefingItems,
  saveBriefingFile,
  writeAuditLog,
  updateRunStatus,
  getRunManifest,
  getLatestRun,
  listRuns,
  loadBriefingItems,
  deduplicateItems,
  getRunDir,
} from './runs/manager';
import { loadPreferences } from './refine/preferences';

let lastBriefingItems: BriefingItem[] = [];
let lastRunId: string | undefined;

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

async function handleConfigure(): Promise<void> {
  await runConfigure();
}

async function handleScan(): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.log('\n  No configuration found. Run configure first.\n');
    return;
  }

  const auditEntries: string[] = [];
  const startTime = new Date();
  auditEntries.push(`- **Start:** ${startTime.toISOString()}`);
  auditEntries.push(`- **Sectors:** ${config.sectors.join(', ')}`);
  auditEntries.push(`- **Markets:** ${config.geographies.join(', ')}`);
  auditEntries.push(`- **Priorities:** ${config.strategicPriorities.join(', ')}`);

  // Create a new run
  const { runId } = createRun(config);
  auditEntries.push(`- **Run ID:** ${runId}`);
  console.log(`\n  Run ID: ${runId}\n`);

  // Phase 1: Scan
  const scanResult = await runScan(config);
  saveScanResults(runId, scanResult.searchResults);

  const successCount = scanResult.searchResults.filter(
    (r) => !r.content.startsWith('[Search failed')
  ).length;
  auditEntries.push(`\n## Scan Phase\n`);
  auditEntries.push(`- **Total searches:** ${scanResult.totalSearches}`);
  auditEntries.push(`- **Successful:** ${successCount}`);
  auditEntries.push(`- **Failed:** ${scanResult.totalSearches - successCount}`);

  // Phase 2: Human approval gate
  const approved = await showApprovalGate(scanResult.searchResults, runId);
  auditEntries.push(`\n## Approval Gate\n`);

  if (!approved) {
    auditEntries.push(`- **Decision:** Rejected — scan discarded`);
    updateRunStatus(runId, 'failed');
    writeAuditLog(runId, auditEntries);
    console.log(`\n  Run ${runId} cancelled. Scan results saved for later review.\n`);
    console.log(`  To resume: npx ts-node src/index.ts resume ${runId}\n`);
    return;
  }

  auditEntries.push(`- **Decision:** Approved — proceeding to analysis`);

  // Phase 3: Analysis
  await runAnalysisPhase(runId, scanResult.searchResults, config, auditEntries);
}

async function runAnalysisPhase(
  runId: string,
  searchResults: any[],
  config: any,
  auditEntries: string[]
): Promise<void> {
  updateRunStatus(runId, 'analysing');

  const preferences = loadPreferences();
  const analysis = await analyseResults(searchResults, config, preferences);

  auditEntries.push(`\n## Analysis Phase\n`);
  auditEntries.push(`- **Items produced:** ${analysis.items.length}`);
  auditEntries.push(`- **Immediate:** ${analysis.items.filter((i) => i.urgency === 'immediate').length}`);
  auditEntries.push(`- **Emerging:** ${analysis.items.filter((i) => i.urgency === 'emerging').length}`);
  auditEntries.push(`- **Directional:** ${analysis.items.filter((i) => i.urgency === 'directional').length}`);

  // Deduplication
  const { items: freshItems, duplicates } = deduplicateItems(analysis.items);
  auditEntries.push(`\n## Deduplication\n`);
  auditEntries.push(`- **Fresh items:** ${freshItems.length}`);
  auditEntries.push(`- **Duplicates suppressed:** ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log(`\n  Deduplication: ${duplicates.length} previously seen items suppressed`);
    for (const dup of duplicates) {
      auditEntries.push(`  - ${dup}`);
    }
  }

  // Use fresh items but keep duplicates if no fresh items remain
  const finalItems = freshItems.length > 0 ? freshItems : analysis.items;
  const dedupedAnalysis = { ...analysis, items: finalItems };

  // Format and output
  const briefing = formatBriefing(
    dedupedAnalysis,
    config,
    preferences,
    searchResults.length
  );

  printBriefing(briefing);

  // Save everything
  saveBriefingItems(runId, finalItems);
  const briefingPath = saveBriefingFile(runId, briefing);

  auditEntries.push(`\n## Output\n`);
  auditEntries.push(`- **Briefing saved to:** ${briefingPath}`);
  auditEntries.push(`- **End:** ${new Date().toISOString()}`);
  writeAuditLog(runId, auditEntries);

  console.log(`\n  Briefing saved: ${briefingPath}`);
  console.log(`  Audit log:     ${getRunDir(runId)}/audit-log.md`);
  console.log(`  Run ID:        ${runId}\n`);

  lastBriefingItems = finalItems;
  lastRunId = runId;
}

async function showApprovalGate(
  searchResults: any[],
  runId: string
): Promise<boolean> {
  const validResults = searchResults.filter(
    (r) => !r.content.startsWith('[Search failed')
  );

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          APPROVAL GATE — Review Before Analysis             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log(`  ${validResults.length} successful searches returned results.`);
  console.log(`  ${searchResults.length - validResults.length} searches failed.\n`);

  // Show a summary of what was found, grouped by sector
  const bySector = new Map<string, { geography: string; sourceCategory: string; preview: string }[]>();
  for (const r of validResults) {
    const entries = bySector.get(r.sector) ?? [];
    entries.push({
      geography: r.geography,
      sourceCategory: r.sourceCategory,
      preview: r.content.substring(0, 120).replace(/\n/g, ' '),
    });
    bySector.set(r.sector, entries);
  }

  for (const [sector, entries] of bySector) {
    console.log(`  --- ${sector} (${entries.length} results) ---`);
    for (const entry of entries.slice(0, 5)) {
      console.log(`    [${entry.geography}] ${entry.sourceCategory}`);
      console.log(`      ${entry.preview}...`);
    }
    if (entries.length > 5) {
      console.log(`    ... and ${entries.length - 5} more`);
    }
    console.log('');
  }

  console.log('  Proceeding to analysis will make 1 additional API call (~$0.10–$0.30).\n');

  const rl = createReadlineInterface();
  const answer = await question(rl, '  Proceed with analysis? [y/n/q]: ');
  rl.close();

  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

async function handleResume(runId?: string): Promise<void> {
  const targetRunId = runId ?? getLatestRun()?.runId;

  if (!targetRunId) {
    console.log('\n  No runs found. Run a scan first.\n');
    return;
  }

  const manifest = getRunManifest(targetRunId);
  if (!manifest) {
    console.log(`\n  Run ${targetRunId} not found.\n`);
    return;
  }

  console.log(`\n  Resuming run ${targetRunId} (status: ${manifest.status})\n`);

  if (manifest.status === 'complete') {
    const items = loadBriefingItems(targetRunId);
    if (items) {
      lastBriefingItems = items;
      lastRunId = targetRunId;
      console.log(`  Loaded ${items.length} briefing items from completed run.`);
      console.log(`  You can now use "refine" to provide feedback.\n`);
    }
    return;
  }

  if (manifest.status === 'awaiting_approval' || manifest.status === 'failed') {
    const scanResults = loadScanResults(targetRunId);
    if (!scanResults) {
      console.log(`\n  Scan results not found for run ${targetRunId}.\n`);
      return;
    }

    const approved = await showApprovalGate(scanResults, targetRunId);
    if (!approved) {
      console.log(`\n  Run ${targetRunId} remains paused.\n`);
      return;
    }

    const config = manifest.config;
    const auditEntries: string[] = [
      `\n## Resumed\n`,
      `- **Resumed at:** ${new Date().toISOString()}`,
      `- **Original run:** ${targetRunId}`,
    ];
    await runAnalysisPhase(targetRunId, scanResults, config, auditEntries);
    return;
  }

  console.log(`\n  Run ${targetRunId} is in status "${manifest.status}" and cannot be resumed.\n`);
}

async function handleRefine(): Promise<void> {
  if (lastBriefingItems.length === 0) {
    const latestRun = getLatestRun();
    if (latestRun && latestRun.status === 'complete') {
      const items = loadBriefingItems(latestRun.runId);
      if (items && items.length > 0) {
        lastBriefingItems = items;
        lastRunId = latestRun.runId;
        console.log(`\n  Loaded ${items.length} items from run ${latestRun.runId}.\n`);
      }
    }
  }

  if (lastBriefingItems.length === 0) {
    console.log('\n  No briefing items available. Run a scan first.\n');
    return;
  }

  await runRefine(lastBriefingItems, lastRunId);
}

function handleHistory(): void {
  const runs = listRuns();
  if (runs.length === 0) {
    console.log('\n  No scan runs found.\n');
    return;
  }

  console.log('\n─── Run History ───\n');
  for (const run of runs.slice(0, 10)) {
    const statusIcon =
      run.status === 'complete' ? '+' :
      run.status === 'awaiting_approval' ? '?' :
      run.status === 'failed' ? 'x' : '~';

    console.log(
      `  [${statusIcon}] ${run.runId}  ${run.status.padEnd(20)} ${run.searchCount} searches, ${run.briefingItemCount} items`
    );
  }
  if (runs.length > 10) {
    console.log(`\n  ... and ${runs.length - 10} older runs`);
  }
  console.log('');
}

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          HORIZON ENGINE                                      ║
║          Regulatory & Policy Intelligence                    ║
╚══════════════════════════════════════════════════════════════╝

Usage:
  horizon-engine <command>

Commands:
  configure           Set up your sector focus, markets, and priorities
  scan                Run a regulatory scan and produce a strategic briefing
  resume [run-id]     Resume a paused run (approval gate) or reload a completed run
  refine              Review briefing items and provide feedback to calibrate future scans
  history             Show past scan runs and their status
  help                Show this help message

Workflow:
  1. configure     Define sectors, markets, client types, priorities
  2. scan          Execute searches, review findings, approve analysis
  3. refine        Provide feedback to improve future scans

Run data is saved to data/runs/<run-id>/ with:
  - scan-results.json     Raw search results
  - briefing-items.json   Structured briefing items
  - briefing.md           Formatted briefing output
  - audit-log.md          Full workflow audit trail
  - manifest.json         Run metadata and status

Environment:
  ANTHROPIC_API_KEY    Required. Your Anthropic API key for web search and analysis.
`);
}

async function showMenu(): Promise<void> {
  const rl = createReadlineInterface();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          HORIZON ENGINE                                      ║');
  console.log('║          Regulatory & Policy Intelligence                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (!configExists()) {
    console.log('  No configuration found. Starting initial setup...\n');
    rl.close();
    await handleConfigure();
    return;
  }

  const config = loadConfig();
  if (config) {
    console.log(`  Configured sectors: ${config.sectors.join(', ')}`);
    console.log(`  Configured markets: ${config.geographies.join(', ')}`);
  }

  // Show latest run status
  const latestRun = getLatestRun();
  if (latestRun) {
    console.log(`  Latest run: ${latestRun.runId} (${latestRun.status})`);
  }
  console.log('');

  console.log('  [1] Configure — Set up or update your monitoring profile');
  console.log('  [2] Scan      — Run a regulatory scan and produce a briefing');
  console.log('  [3] Resume    — Resume or reload a previous run');
  console.log('  [4] Refine    — Provide feedback on the last briefing');
  console.log('  [5] History   — View past scan runs');
  console.log('  [6] Help      — Show usage information');
  console.log('  [q] Quit\n');

  let running = true;
  while (running) {
    const choice = await question(rl, '  Select an option: ');

    switch (choice) {
      case '1':
      case 'configure':
        rl.close();
        await handleConfigure();
        running = false;
        break;
      case '2':
      case 'scan':
        rl.close();
        await handleScan();
        running = false;
        break;
      case '3':
      case 'resume':
        rl.close();
        await handleResume();
        running = false;
        break;
      case '4':
      case 'refine':
        rl.close();
        await handleRefine();
        running = false;
        break;
      case '5':
      case 'history':
        handleHistory();
        break;
      case '6':
      case 'help':
        showHelp();
        break;
      case 'q':
      case 'quit':
      case 'exit':
        console.log('\n  Goodbye.\n');
        rl.close();
        running = false;
        break;
      default:
        console.log('  Unknown option. Try 1-6 or q.\n');
    }
  }
}

async function main(): Promise<void> {
  const command = process.argv[2]?.toLowerCase();

  switch (command) {
    case 'configure':
      await handleConfigure();
      break;
    case 'scan':
      await handleScan();
      break;
    case 'resume':
      await handleResume(process.argv[3]);
      break;
    case 'refine':
      await handleRefine();
      break;
    case 'history':
      handleHistory();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      await showMenu();
      break;
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
