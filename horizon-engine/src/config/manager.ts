import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface HorizonConfig {
  sectors: string[];
  geographies: string[];
  clientTypes: string[];
  strategicPriorities: string[];
  createdAt?: string;
  updatedAt?: string;
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const SCHEMA_PATH = path.join(__dirname, 'schema.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadConfig(): HorizonConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw) as HorizonConfig;
    const errors = validateConfig(config);
    if (errors.length > 0) {
      console.error('Config validation errors:', errors.join(', '));
      return null;
    }
    return config;
  } catch (err) {
    console.error('Failed to load config:', err);
    return null;
  }
}

export function saveConfig(config: HorizonConfig): void {
  ensureDataDir();
  const now = new Date().toISOString();
  if (!config.createdAt) {
    config.createdAt = now;
  }
  config.updatedAt = now;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function validateConfig(config: Partial<HorizonConfig>): string[] {
  const errors: string[] = [];

  if (!config.sectors || !Array.isArray(config.sectors) || config.sectors.length === 0) {
    errors.push('At least one sector is required');
  }
  if (!config.geographies || !Array.isArray(config.geographies) || config.geographies.length === 0) {
    errors.push('At least one geography is required');
  }
  if (!config.clientTypes || !Array.isArray(config.clientTypes) || config.clientTypes.length === 0) {
    errors.push('At least one client type is required');
  }
  if (!config.strategicPriorities || !Array.isArray(config.strategicPriorities) || config.strategicPriorities.length === 0) {
    errors.push('At least one strategic priority is required');
  }

  // Validate string content
  const arrayFields: (keyof HorizonConfig)[] = ['sectors', 'geographies', 'clientTypes', 'strategicPriorities'];
  for (const field of arrayFields) {
    const arr = config[field];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item !== 'string' || item.trim().length === 0) {
          errors.push(`All items in ${field} must be non-empty strings`);
          break;
        }
      }
    }
  }

  return errors;
}

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function parseCommaSeparated(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function runConfigure(): Promise<HorizonConfig> {
  const rl = createReadlineInterface();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          HORIZON ENGINE — Configuration                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const existing = loadConfig();
  if (existing) {
    console.log('Existing configuration found:');
    console.log(`  Sectors: ${existing.sectors.join(', ')}`);
    console.log(`  Markets: ${existing.geographies.join(', ')}`);
    console.log(`  Client types: ${existing.clientTypes.join(', ')}`);
    console.log(`  Priorities: ${existing.strategicPriorities.join(', ')}`);
    console.log('');
    const overwrite = await question(rl, 'Overwrite existing configuration? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      rl.close();
      console.log('Keeping existing configuration.');
      return existing;
    }
    console.log('');
  }

  // Sectors
  console.log('Define your sector focus. These are the industries you want to monitor');
  console.log('for regulatory and policy developments.');
  console.log('Examples: interactive entertainment, fintech, life sciences, AI/ML, adtech\n');
  let sectors: string[] = [];
  while (sectors.length === 0) {
    const input = await question(rl, 'Sectors (comma-separated): ');
    sectors = parseCommaSeparated(input);
    if (sectors.length === 0) {
      console.log('  ⚠ At least one sector is required.\n');
    }
  }

  // Coverage critique for sectors
  console.log(`\n  ✓ Sectors: ${sectors.join(', ')}`);
  if (sectors.length === 1) {
    console.log('  💡 Tip: Consider adding adjacent sectors. Regulatory developments often');
    console.log('     have cross-sector implications (e.g., AI regulation affects all tech sectors).\n');
  }

  // Geographies
  console.log('Define your geographic markets. These determine which jurisdictions are');
  console.log('scanned for regulatory developments.');
  console.log('Examples: UK, EU, US, Singapore, Australia, Japan\n');
  let geographies: string[] = [];
  while (geographies.length === 0) {
    const input = await question(rl, 'Geographic markets (comma-separated): ');
    geographies = parseCommaSeparated(input);
    if (geographies.length === 0) {
      console.log('  ⚠ At least one geography is required.\n');
    }
  }

  console.log(`\n  ✓ Markets: ${geographies.join(', ')}`);
  if (!geographies.some((g) => ['UK', 'EU', 'US'].includes(g.toUpperCase()))) {
    console.log('  💡 Tip: UK, EU, and US are the most active regulatory environments.');
    console.log('     Consider adding them for comprehensive coverage.\n');
  }

  // Client types
  console.log('Define your client types. These help tailor the "Who should care"');
  console.log('section of briefings to your actual client base.');
  console.log('Examples: mobile games developers, crypto exchanges, SaaS companies, pharma manufacturers\n');
  let clientTypes: string[] = [];
  while (clientTypes.length === 0) {
    const input = await question(rl, 'Client types (comma-separated): ');
    clientTypes = parseCommaSeparated(input);
    if (clientTypes.length === 0) {
      console.log('  ⚠ At least one client type is required.\n');
    }
  }

  console.log(`\n  ✓ Client types: ${clientTypes.join(', ')}`);

  // Strategic priorities
  console.log('Define your strategic priorities. These are specific regulatory topics');
  console.log('or policy areas you want to track most closely.');
  console.log('Examples: loot box regulation, AI governance, data localisation, open banking\n');
  let strategicPriorities: string[] = [];
  while (strategicPriorities.length === 0) {
    const input = await question(rl, 'Strategic priorities (comma-separated): ');
    strategicPriorities = parseCommaSeparated(input);
    if (strategicPriorities.length === 0) {
      console.log('  ⚠ At least one strategic priority is required.\n');
    }
  }

  console.log(`\n  ✓ Priorities: ${strategicPriorities.join(', ')}`);

  // Coverage critique
  console.log('\n─── Coverage Assessment ───\n');
  const totalCombinations = sectors.length * geographies.length;
  console.log(`  Sector × Geography combinations: ${totalCombinations}`);
  console.log(`  Estimated searches per scan: ${totalCombinations * 4} (3-5 per combination)`);
  console.log(`  Strategic priorities tracked: ${strategicPriorities.length}`);
  if (totalCombinations > 20) {
    console.log('\n  ⚠ High combination count. Scans will require many API calls.');
    console.log('    Consider narrowing sectors or geographies for faster, more focused scans.');
  }
  if (strategicPriorities.length < 3) {
    console.log('\n  💡 Consider adding more strategic priorities for richer filtering.');
    console.log('    Broader priorities help surface unexpected cross-cutting developments.');
  }

  const config: HorizonConfig = {
    sectors,
    geographies,
    clientTypes,
    strategicPriorities,
  };

  // Confirmation
  console.log('\n─── Configuration Summary ───\n');
  console.log(`  Sectors:    ${sectors.join(', ')}`);
  console.log(`  Markets:    ${geographies.join(', ')}`);
  console.log(`  Clients:    ${clientTypes.join(', ')}`);
  console.log(`  Priorities: ${strategicPriorities.join(', ')}`);

  const confirm = await question(rl, '\nSave this configuration? (y/n): ');
  rl.close();

  if (confirm.toLowerCase() === 'y') {
    saveConfig(config);
    console.log(`\n  ✓ Configuration saved to ${CONFIG_PATH}`);
    console.log('  Run `horizon-engine scan` to generate your first briefing.\n');
  } else {
    console.log('\n  Configuration discarded. Run configure again when ready.\n');
  }

  return config;
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_PATH);
}
