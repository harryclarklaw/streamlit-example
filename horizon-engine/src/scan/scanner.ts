import { HorizonConfig } from '../config/manager';
import { UserPreferences, loadPreferences } from '../refine/preferences';
import {
  SOURCE_CATEGORIES,
  SourceCategory,
  getSourcesForGeography,
  generateQueries,
} from './source-taxonomy';
import { SearchResult, executeSearchBatch } from './search-client';

export interface ScanResult {
  config: HorizonConfig;
  preferences: UserPreferences | null;
  searchResults: SearchResult[];
  totalSearches: number;
  timestamp: string;
}

/**
 * Build the list of search queries based on config, source taxonomy, and preferences.
 * For each sector × geography combination, selects 3–5 relevant source categories
 * and generates concrete queries.
 */
function buildSearchPlan(
  config: HorizonConfig,
  preferences: UserPreferences | null
): Array<{
  query: string;
  sector: string;
  geography: string;
  sourceCategory: string;
}> {
  const searches: Array<{
    query: string;
    sector: string;
    geography: string;
    sourceCategory: string;
  }> = [];

  const suppressedTopics = preferences?.suppressedTopics ?? [];

  for (const sector of config.sectors) {
    for (const geography of config.geographies) {
      // Get relevant source categories for this geography
      const sources = getSourcesForGeography(geography);

      // Select 3–5 source categories (prioritise by reliability)
      const selectedSources = selectSources(sources, 5);

      for (const source of selectedSources) {
        // Generate queries for this source × sector × geography
        const queries = generateQueries(source, sector, geography);

        // Pick the most specific query (first one tends to be site-specific)
        const query = queries[0];

        // Check if this query is about a suppressed topic
        const isSuppressed = suppressedTopics.some(
          (topic) =>
            query.toLowerCase().includes(topic.toLowerCase()) ||
            sector.toLowerCase().includes(topic.toLowerCase())
        );

        if (!isSuppressed) {
          searches.push({
            query,
            sector,
            geography,
            sourceCategory: source.name,
          });
        }
      }
    }
  }

  // Also add priority-specific searches
  for (const priority of config.strategicPriorities) {
    const isSuppressed = suppressedTopics.some(
      (topic) => priority.toLowerCase().includes(topic.toLowerCase())
    );

    if (!isSuppressed) {
      for (const geography of config.geographies) {
        searches.push({
          query: `${priority} regulation policy update ${geography} ${new Date().getFullYear()}`,
          sector: priority,
          geography,
          sourceCategory: 'Strategic Priority Search',
        });
      }
    }
  }

  return searches;
}

/**
 * Select up to `max` source categories, prioritising by reliability.
 */
function selectSources(sources: SourceCategory[], max: number): SourceCategory[] {
  const reliabilityOrder: Record<string, number> = {
    HIGH: 0,
    'MEDIUM-HIGH': 1,
    MEDIUM: 2,
  };

  return [...sources]
    .sort((a, b) => (reliabilityOrder[a.reliability] ?? 3) - (reliabilityOrder[b.reliability] ?? 3))
    .slice(0, max);
}

/**
 * Execute a full scan based on the user's configuration.
 */
export async function runScan(config: HorizonConfig): Promise<ScanResult> {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          HORIZON ENGINE — Scanning                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log(`Sectors:     ${config.sectors.join(', ')}`);
  console.log(`Markets:     ${config.geographies.join(', ')}`);
  console.log(`Priorities:  ${config.strategicPriorities.join(', ')}`);

  // Load preferences for suppression/weighting
  const preferences = loadPreferences();
  if (preferences && preferences.suppressedTopics.length > 0) {
    console.log(`Suppressing:  ${preferences.suppressedTopics.join(', ')}`);
  }
  if (preferences && preferences.weightedTopics.length > 0) {
    console.log(`Weighting:    ${preferences.weightedTopics.join(', ')}`);
  }

  // Build search plan
  const searchPlan = buildSearchPlan(config, preferences);
  console.log(`\nSearch plan: ${searchPlan.length} queries across ${config.sectors.length} sectors × ${config.geographies.length} markets\n`);

  // Execute searches
  const searchResults = await executeSearchBatch(searchPlan);

  const successCount = searchResults.filter(
    (r) => !r.content.startsWith('[Search failed')
  ).length;

  console.log(
    `\n✓ Scan complete: ${successCount}/${searchResults.length} searches successful`
  );

  return {
    config,
    preferences,
    searchResults,
    totalSearches: searchResults.length,
    timestamp: new Date().toISOString(),
  };
}
