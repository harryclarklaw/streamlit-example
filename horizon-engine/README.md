# Horizon Engine

A recurring, proactive, sector-focused regulatory and policy monitor that produces daily strategic briefings — not legal updates — about developments affecting your configured sectors and client base.

## What It Does

Horizon Engine operates in three modes:

- **Configure** — Define your sector focus, client industries, geographic markets, and strategic priorities.
- **Scan** — Execute a structured web search across government trackers, regulatory bodies, enforcement databases, and trade press, then produce a strategic briefing.
- **Refine** — Mark briefing items as relevant or irrelevant to calibrate future scans.

## Quick Start

### Prerequisites

- Node.js 18+
- An Anthropic API key with access to `claude-sonnet-4-20250514` and the `web_search` tool

### Installation

```bash
cd horizon-engine
npm install
```

### Set your API key

```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

### Run

```bash
# Interactive menu
npx ts-node src/index.ts

# Or use specific commands
npx ts-node src/index.ts configure
npx ts-node src/index.ts scan
npx ts-node src/index.ts refine
```

### Build (optional)

```bash
npm run build
node dist/index.js scan
```

## Configuration

On first run (or via `configure`), you'll define:

| Field | Description | Example |
|---|---|---|
| Sectors | Industries to monitor | interactive entertainment, fintech |
| Geographies | Markets to scan | UK, EU, Singapore |
| Client Types | Your client base | mobile games developers, crypto exchanges |
| Strategic Priorities | Specific topics to track | loot box regulation, AI governance |

Configuration is saved to `data/config.json`.

## Briefing Output

Briefings are structured by urgency:

- **IMMEDIATE** — Action required within weeks
- **EMERGING** — 3–6 month horizon
- **DIRECTIONAL** — 12+ month strategic signal

Each item includes:
- What happened (factual, 2 sentences)
- Strategic significance (commercial, not legal)
- Who should care (specific client types)
- Smart move (concrete, actionable)
- Source link

## Refinement

After running a scan, use `refine` to provide feedback. The engine logs your preferences and adjusts future scans:

- **Dismissed** topics are suppressed
- **Boosted** topics receive higher weighting
- After 5+ refinement cycles, a calibration note appears in briefings

Preferences are stored in `data/preferences.json`.

## Architecture

```
horizon-engine/
├── src/
│   ├── index.ts                  # CLI entry point with interactive menu
│   ├── config/
│   │   ├── manager.ts            # Read/write/validate user config
│   │   └── schema.json           # JSON schema for configuration
│   ├── scan/
│   │   ├── scanner.ts            # Orchestrates the web search sequence
│   │   ├── source-taxonomy.ts    # Source categories and query patterns
│   │   └── search-client.ts      # Anthropic API calls with web_search tool
│   ├── analysis/
│   │   ├── analyser.ts           # Transforms results into strategic briefing
│   │   └── prompts.ts            # Strategic analysis system prompts
│   ├── refine/
│   │   └── preferences.ts        # Feedback logging and preference management
│   ├── output/
│   │   └── formatter.ts          # Renders briefings in the specified format
│   └── references/
│       ├── source-taxonomy.md    # Categorised source types
│       ├── briefing-format.md    # Output format specification
│       └── strategic-analysis.md # Analysis framework with worked examples
└── data/
    ├── config.json               # User configuration (generated at runtime)
    └── preferences.json          # Refinement log (generated at runtime)
```

## How Scanning Works

1. Reads your configuration and any existing preferences
2. Builds a search plan: for each sector × geography combination, selects 3–5 source categories
3. Executes searches via the Anthropic API with `web_search` tool enabled
4. Passes all results through the analysis layer with a strategic framework system prompt
5. Formats the output as a structured briefing

A typical scan with 2 sectors × 3 geographies generates 30–40 API calls.
