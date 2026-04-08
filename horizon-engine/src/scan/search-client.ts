import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';

export interface SearchResult {
  query: string;
  sourceCategory: string;
  sector: string;
  geography: string;
  content: string;
}

let clientInstance: Anthropic | null = null;

function getClient(): Anthropic {
  if (!clientInstance) {
    clientInstance = new Anthropic();
  }
  return clientInstance;
}

/**
 * Execute a web search via the Anthropic API with the web_search tool.
 * Each call is a focused search with a specific query and system prompt
 * instructing the model to find and summarise regulatory developments.
 */
export async function executeSearch(
  query: string,
  sector: string,
  geography: string,
  sourceCategory: string
): Promise<SearchResult> {
  const client = getClient();

  const systemPrompt = `You are a regulatory intelligence analyst scanning for recent regulatory and policy developments.

Your task: Search for the most recent and significant regulatory, legislative, or policy developments matching the search query provided.

Focus on:
- New or proposed legislation, rules, or regulations
- Regulatory body announcements, consultations, and guidance
- Enforcement actions, fines, and penalties
- Government speeches and policy statements
- Court decisions with regulatory implications

For each development found, provide:
1. The specific development (what happened, who did it, when)
2. The primary source URL
3. The date of the development
4. The regulatory body or institution involved

Be factual and specific. Do not editorialize. Focus on developments from the last 30 days where possible, but include significant older developments if they are still actively progressing.

Sector focus: ${sector}
Geographic focus: ${geography}
Source type: ${sourceCategory}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Search for: ${query}\n\nFind the most recent and significant regulatory developments related to "${sector}" in "${geography}". Focus on primary sources from ${sourceCategory}. Summarise each development you find with its source URL, date, and the specific regulatory action taken.`,
        },
      ],
    });

    // Extract text content from the response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    const content = textBlocks.map((block) => block.text).join('\n\n');

    return {
      query,
      sourceCategory,
      sector,
      geography,
      content,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Handle rate limiting with retry
    if (errMsg.includes('rate_limit') || errMsg.includes('429')) {
      console.log(`  ⏳ Rate limited on "${query}". Waiting 10s before retry...`);
      await sleep(10000);
      return executeSearch(query, sector, geography, sourceCategory);
    }

    console.error(`  ✗ Search failed for "${query}": ${errMsg}`);
    return {
      query,
      sourceCategory,
      sector,
      geography,
      content: `[Search failed: ${errMsg}]`,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute multiple searches with rate-limit-aware sequential processing.
 * Adds a small delay between calls to avoid hitting rate limits.
 */
export async function executeSearchBatch(
  searches: Array<{
    query: string;
    sector: string;
    geography: string;
    sourceCategory: string;
  }>
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (let i = 0; i < searches.length; i++) {
    const search = searches[i];
    console.log(
      `  [${i + 1}/${searches.length}] Searching: ${search.sourceCategory} — ${search.sector} (${search.geography})`
    );

    const result = await executeSearch(
      search.query,
      search.sector,
      search.geography,
      search.sourceCategory
    );
    results.push(result);

    // Small delay between requests to be respectful of rate limits
    if (i < searches.length - 1) {
      await sleep(1000);
    }
  }

  return results;
}
