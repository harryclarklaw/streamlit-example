import Anthropic from '@anthropic-ai/sdk';
import { HorizonConfig } from '../config/manager';
import { UserPreferences } from '../refine/preferences';
import { SearchResult } from '../scan/search-client';
import { buildAnalysisSystemPrompt, buildAnalysisUserPrompt } from './prompts';

const MODEL = 'claude-sonnet-4-20250514';

export interface BriefingItem {
  title: string;
  urgency: 'immediate' | 'emerging' | 'directional';
  whatHappened: string;
  strategicSignificance: string;
  whoShouldCare: string;
  smartMove: string;
  source: string;
  sector: string;
  geography: string;
}

export interface AnalysisResult {
  items: BriefingItem[];
  timestamp: string;
  sectorsAnalysed: string[];
  geographiesAnalysed: string[];
}

/**
 * Run the analysis layer: takes raw search results and transforms them
 * into a structured strategic briefing via a dedicated API call.
 */
export async function analyseResults(
  searchResults: SearchResult[],
  config: HorizonConfig,
  preferences: UserPreferences | null
): Promise<AnalysisResult> {
  console.log('\n─── Analysis Layer ───\n');
  console.log('Transforming search results into strategic briefing...');

  // Filter out failed searches
  const validResults = searchResults.filter(
    (r) => !r.content.startsWith('[Search failed')
  );

  if (validResults.length === 0) {
    console.log('  ⚠ No valid search results to analyse.');
    return {
      items: [],
      timestamp: new Date().toISOString(),
      sectorsAnalysed: config.sectors,
      geographiesAnalysed: config.geographies,
    };
  }

  console.log(`  Analysing ${validResults.length} search results...`);

  const client = new Anthropic();

  const systemPrompt = buildAnalysisSystemPrompt(config, preferences);
  const userPrompt = buildAnalysisUserPrompt(validResults);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    const rawContent = textBlocks.map((block) => block.text).join('');

    // Parse the JSON response
    const items = parseAnalysisResponse(rawContent);

    console.log(`  ✓ Analysis complete: ${items.length} briefing items produced`);
    console.log(
      `    Immediate: ${items.filter((i) => i.urgency === 'immediate').length}`
    );
    console.log(
      `    Emerging:  ${items.filter((i) => i.urgency === 'emerging').length}`
    );
    console.log(
      `    Directional: ${items.filter((i) => i.urgency === 'directional').length}`
    );

    return {
      items,
      timestamp: new Date().toISOString(),
      sectorsAnalysed: config.sectors,
      geographiesAnalysed: config.geographies,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ Analysis failed: ${errMsg}`);
    return {
      items: [],
      timestamp: new Date().toISOString(),
      sectorsAnalysed: config.sectors,
      geographiesAnalysed: config.geographies,
    };
  }
}

/**
 * Parse the JSON response from the analysis API call.
 * Handles potential formatting issues in the response.
 */
function parseAnalysisResponse(raw: string): BriefingItem[] {
  // Try to extract JSON array from the response
  let jsonStr = raw.trim();

  // If wrapped in markdown code block, extract it
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Find the JSON array boundaries
  const startIdx = jsonStr.indexOf('[');
  const endIdx = jsonStr.lastIndexOf(']');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    jsonStr = jsonStr.substring(startIdx, endIdx + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      console.error('  ⚠ Analysis response is not an array');
      return [];
    }

    return parsed.map((item: Record<string, unknown>) => ({
      title: String(item.title ?? 'Untitled'),
      urgency: normaliseUrgency(String(item.urgency ?? 'emerging')),
      whatHappened: String(item.whatHappened ?? ''),
      strategicSignificance: String(item.strategicSignificance ?? ''),
      whoShouldCare: String(item.whoShouldCare ?? ''),
      smartMove: String(item.smartMove ?? ''),
      source: String(item.source ?? ''),
      sector: String(item.sector ?? ''),
      geography: String(item.geography ?? ''),
    }));
  } catch (err) {
    console.error('  ⚠ Failed to parse analysis response as JSON');
    console.error('  Raw response (first 500 chars):', raw.substring(0, 500));
    return [];
  }
}

function normaliseUrgency(
  urgency: string
): 'immediate' | 'emerging' | 'directional' {
  const lower = urgency.toLowerCase().trim();
  if (lower === 'immediate') return 'immediate';
  if (lower === 'directional') return 'directional';
  return 'emerging';
}
