#!/usr/bin/env node

import * as readline from 'readline';
import { loadConfig, configExists, runConfigure } from './config/manager';
import { runScan } from './scan/scanner';
import { analyseResults } from './analysis/analyser';
import { runRefine } from './refine/preferences';
import { formatBriefing, printBriefing } from './output/formatter';
import { BriefingItem } from './analysis/analyser';

// Store the last scan's briefing items for refinement
let lastBriefingItems: BriefingItem[] = [];

async function handleConfigure(): Promise<void> {
  await runConfigure();
}

async function handleScan(): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.log('\n  ⚠ No configuration found. Run configure first.\n');
    return;
  }

  const scanResult = await runScan(config);

  const analysis = await analyseResults(
    scanResult.searchResults,
    config,
    scanResult.preferences
  );

  const briefing = formatBriefing(
    analysis,
    config,
    scanResult.preferences,
    scanResult.totalSearches
  );

  printBriefing(briefing);

  // Store items for potential refinement
  lastBriefingItems = analysis.items;
}

async function handleRefine(): Promise<void> {
  if (lastBriefingItems.length === 0) {
    console.log('\n  ⚠ No briefing items in memory. Run a scan first, then refine.\n');
    return;
  }

  await runRefine(lastBriefingItems);
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
  configure    Set up your sector focus, markets, and priorities
  scan         Run a regulatory scan and produce a strategic briefing
  refine       Review briefing items and provide feedback to calibrate future scans
  help         Show this help message

Examples:
  $ npx ts-node src/index.ts configure
  $ npx ts-node src/index.ts scan
  $ npx ts-node src/index.ts refine

Environment:
  ANTHROPIC_API_KEY    Required. Your Anthropic API key for web search and analysis.
`);
}

async function showMenu(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => {
      rl.question(prompt, (answer) => resolve(answer.trim()));
    });

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
    console.log('');
  }

  console.log('  [1] Configure — Set up or update your monitoring profile');
  console.log('  [2] Scan      — Run a regulatory scan and produce a briefing');
  console.log('  [3] Refine    — Provide feedback on the last briefing');
  console.log('  [4] Help      — Show usage information');
  console.log('  [q] Quit\n');

  let running = true;
  while (running) {
    const choice = await question('  Select an option: ');

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
      case 'refine':
        rl.close();
        await handleRefine();
        running = false;
        break;
      case '4':
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
        console.log('  Unknown option. Try 1, 2, 3, 4, or q.\n');
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
    case 'refine':
      await handleRefine();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      // No command provided — show interactive menu
      await showMenu();
      break;
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
