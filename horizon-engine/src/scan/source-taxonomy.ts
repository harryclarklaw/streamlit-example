export interface SourceCategory {
  id: string;
  name: string;
  description: string;
  queryPatterns: string[];
  signalType: string;
  reliability: 'HIGH' | 'MEDIUM-HIGH' | 'MEDIUM';
}

export const SOURCE_CATEGORIES: SourceCategory[] = [
  {
    id: 'uk_parliament',
    name: 'UK Parliament Bills & Hansard',
    description: 'UK legislative tracker, parliamentary debates, and ministerial statements',
    queryPatterns: [
      'site:parliament.uk bills {sector} {year}',
      'site:hansard.parliament.uk {sector} regulation debate',
      'UK Parliament bill {sector} amendment {year}',
    ],
    signalType: 'Early-stage legislative intent, amendment directions, cross-party positions',
    reliability: 'HIGH',
  },
  {
    id: 'eu_legislative',
    name: 'EU Legislative Observatory (EUR-Lex / European Commission)',
    description: 'EU regulations, directives, and Commission consultations',
    queryPatterns: [
      'site:eur-lex.europa.eu {sector} regulation directive {year}',
      'European Commission consultation {sector} {year}',
      'EU legislative observatory {sector} procedure',
    ],
    signalType: 'EU-wide regulatory direction, single market implications, harmonisation trends',
    reliability: 'HIGH',
  },
  {
    id: 'us_congress',
    name: 'US Congress.gov & Federal Register',
    description: 'US federal legislation and rulemaking',
    queryPatterns: [
      'site:congress.gov {sector} bill {year}',
      'site:federalregister.gov {sector} proposed rule {year}',
      'Federal Register {sector} final rule {year}',
    ],
    signalType: 'US regulatory momentum, bipartisan dynamics, extraterritorial impact',
    reliability: 'HIGH',
  },
  {
    id: 'singapore_gov',
    name: 'Singapore Government Gazette & MAS',
    description: 'Singapore regulatory notices and monetary authority guidance',
    queryPatterns: [
      'site:mas.gov.sg {sector} notice consultation {year}',
      'Singapore government gazette {sector} regulation {year}',
      'MAS {sector} guidelines {year}',
    ],
    signalType: 'APAC regulatory direction, fintech signals, cross-border implications',
    reliability: 'HIGH',
  },
  {
    id: 'uk_regulators',
    name: 'UK Regulatory Bodies (FCA, Ofcom, CMA, ICO, ASA, UKGC)',
    description: 'UK sector regulators — announcements, consultations, and enforcement',
    queryPatterns: [
      'FCA {sector} consultation policy statement {year}',
      'Ofcom {sector} consultation enforcement {year}',
      'CMA {sector} investigation market study {year}',
      'ICO {sector} enforcement guidance {year}',
      'UKGC {sector} consultation licence {year}',
    ],
    signalType: 'Sector-specific regulatory direction, conduct expectations, enforcement trends',
    reliability: 'HIGH',
  },
  {
    id: 'eu_regulators',
    name: 'EU Regulatory Bodies (ESMA, EDPB, DG COMP)',
    description: 'EU-level regulatory authorities and competition enforcement',
    queryPatterns: [
      'ESMA {sector} guidelines consultation {year}',
      'EDPB {sector} guidelines opinion {year}',
      'European Commission competition {sector} investigation {year}',
    ],
    signalType: 'EU regulatory harmonisation, competition enforcement, data protection interpretation',
    reliability: 'HIGH',
  },
  {
    id: 'enforcement',
    name: 'Enforcement Actions & Fines',
    description: 'Regulatory enforcement actions, fines, and penalty databases',
    queryPatterns: [
      '{sector} regulatory fine penalty {geography} {year}',
      'GDPR fine {sector} {year}',
      'competition fine {sector} {geography} {year}',
      '{sector} enforcement action {geography} {year}',
    ],
    signalType: 'Regulatory priorities, penalty benchmarks, areas of intensifying scrutiny',
    reliability: 'HIGH',
  },
  {
    id: 'committees_speeches',
    name: 'Select Committees & Government Speeches',
    description: 'Parliamentary inquiries, committee reports, and ministerial speeches',
    queryPatterns: [
      'select committee inquiry {sector} {geography} {year}',
      'government speech {sector} regulation policy {year}',
      'parliamentary report {sector} {geography} {year}',
    ],
    signalType: 'Political direction-setting, pre-legislative positioning, consensus signals',
    reliability: 'MEDIUM-HIGH',
  },
  {
    id: 'industry_trade',
    name: 'Industry Body Publications & Trade Press',
    description: 'Trade associations, industry bodies, and specialist trade publications',
    queryPatterns: [
      '{sector} industry association regulatory response {geography} {year}',
      '{sector} trade body consultation response {year}',
      '{sector} regulation analysis news {geography} {year}',
    ],
    signalType: 'Industry positioning, compliance readiness, lobbying direction',
    reliability: 'MEDIUM',
  },
];

/**
 * Geography-to-source-category relevance mapping.
 * Determines which source categories are most relevant for each geography.
 */
const GEOGRAPHY_SOURCE_MAP: Record<string, string[]> = {
  UK: ['uk_parliament', 'uk_regulators', 'enforcement', 'committees_speeches', 'industry_trade'],
  EU: ['eu_legislative', 'eu_regulators', 'enforcement', 'industry_trade'],
  US: ['us_congress', 'enforcement', 'committees_speeches', 'industry_trade'],
  Singapore: ['singapore_gov', 'enforcement', 'industry_trade'],
};

/**
 * Select the most relevant source categories for a given geography.
 * Falls back to a default set for unrecognised geographies.
 */
export function getSourcesForGeography(geography: string): SourceCategory[] {
  const normalised = geography.toUpperCase().trim();

  // Try exact match first
  for (const [key, sourceIds] of Object.entries(GEOGRAPHY_SOURCE_MAP)) {
    if (normalised === key.toUpperCase()) {
      return SOURCE_CATEGORIES.filter((s) => sourceIds.includes(s.id));
    }
  }

  // Default: use enforcement, industry/trade, and committees as universally applicable
  return SOURCE_CATEGORIES.filter((s) =>
    ['enforcement', 'committees_speeches', 'industry_trade'].includes(s.id)
  );
}

/**
 * Generate concrete search queries by substituting sector and geography
 * into a source category's query patterns.
 */
export function generateQueries(
  source: SourceCategory,
  sector: string,
  geography: string
): string[] {
  const year = new Date().getFullYear().toString();
  return source.queryPatterns.map((pattern) =>
    pattern
      .replace(/\{sector\}/g, sector)
      .replace(/\{geography\}/g, geography)
      .replace(/\{year\}/g, year)
      .replace(/\{regulatory_body\}/g, '')
      .replace(/\{country\}/g, geography)
      .trim()
  );
}
