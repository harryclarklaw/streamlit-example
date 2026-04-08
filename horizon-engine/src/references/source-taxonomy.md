# Source Taxonomy — Horizon Engine

A structured taxonomy of source types for regulatory and policy monitoring. Each category includes parameterised query patterns, signal descriptions, and reliability assessments.

---

## 1. Government Legislative Trackers & Bills Databases

### 1.1 UK Parliament Bills Tracker & Hansard

- **Query patterns:**
  - `site:parliament.uk bills {sector} {year}`
  - `site:hansard.parliament.uk {sector} regulation debate`
  - `UK Parliament bill {sector} {geography} amendment`
- **Signal:** Early-stage legislative intent, amendment directions, cross-party positions, ministerial statements on policy direction.
- **Reliability:** HIGH — Primary source, authoritative. Low noise but requires interpretation of parliamentary language and procedural context.

### 1.2 EU Legislative Observatory (EUR-Lex / European Commission)

- **Query patterns:**
  - `site:eur-lex.europa.eu {sector} regulation directive`
  - `European Commission consultation {sector} {year}`
  - `EUR-Lex {sector} directive proposal`
  - `EU legislative observatory {sector} procedure`
- **Signal:** EU-wide regulatory direction, single market implications, harmonisation trends, implementation timelines.
- **Reliability:** HIGH — Primary source. Dense and technical; requires filtering by procedure stage (proposal vs. adopted).

### 1.3 US Congress.gov & Federal Register

- **Query patterns:**
  - `site:congress.gov {sector} bill`
  - `site:federalregister.gov {sector} proposed rule`
  - `Federal Register {sector} final rule {year}`
  - `Congress {sector} legislation hearing`
- **Signal:** US regulatory momentum, bipartisan vs. partisan dynamics, federal vs. state jurisdiction signals. Important for extraterritorial impact analysis.
- **Reliability:** HIGH — Primary source. High volume; filter by stage (introduced, committee, floor vote, enacted).

### 1.4 Singapore Government Gazette & MAS Notices

- **Query patterns:**
  - `site:mas.gov.sg {sector} notice consultation`
  - `Singapore government gazette {sector} regulation`
  - `MAS {sector} guidelines {year}`
  - `site:sso.agc.gov.sg {sector} act`
- **Signal:** APAC regulatory direction, fintech-friendly vs. tightening signals, cross-border implications for Singapore-headquartered operations.
- **Reliability:** HIGH — Primary source. Low volume, high signal-to-noise.

---

## 2. Regulatory Body Announcements & Consultations

### 2.1 UK Regulatory Bodies

#### FCA (Financial Conduct Authority)
- **Query patterns:**
  - `site:fca.org.uk {sector} consultation paper`
  - `FCA {sector} policy statement {year}`
  - `FCA Dear CEO letter {sector}`
- **Signal:** Financial services regulatory direction, conduct expectations, authorisation regime changes.
- **Reliability:** HIGH — Direct regulatory source. Consultation papers signal 6–18 month implementation horizons.

#### Ofcom
- **Query patterns:**
  - `site:ofcom.org.uk {sector} consultation`
  - `Ofcom Online Safety Act {sector} code of practice`
  - `Ofcom {sector} enforcement`
- **Signal:** Telecoms, media, and online safety regulation. Increasingly relevant to interactive entertainment and digital platforms.
- **Reliability:** HIGH — Codes of practice under Online Safety Act are binding.

#### CMA (Competition and Markets Authority)
- **Query patterns:**
  - `site:gov.uk CMA {sector} investigation`
  - `CMA market study {sector}`
  - `CMA merger {sector} decision`
- **Signal:** Competition dynamics, merger control, market study outcomes that reshape sector structure.
- **Reliability:** HIGH — Decisions are definitive. Market studies signal 12–24 month regulatory shaping.

#### ICO (Information Commissioner's Office)
- **Query patterns:**
  - `site:ico.org.uk {sector} enforcement`
  - `ICO {sector} guidance data protection`
  - `ICO reprimand {sector} {year}`
- **Signal:** Data protection enforcement trends, compliance expectations, cross-sector data processing guidance.
- **Reliability:** HIGH — Enforcement notices are definitive. Guidance is authoritative but non-binding.

#### ASA (Advertising Standards Authority)
- **Query patterns:**
  - `ASA ruling {sector} advertising`
  - `ASA {sector} misleading advertising`
- **Signal:** Advertising standards enforcement, particularly relevant to consumer-facing sectors.
- **Reliability:** MEDIUM — Rulings are sector-specific and may not indicate broader trends without pattern analysis.

#### UKGC (UK Gambling Commission)
- **Query patterns:**
  - `site:gamblingcommission.gov.uk {sector} consultation`
  - `UKGC {sector} licence condition`
  - `Gambling Commission loot box {year}`
- **Signal:** Gambling and interactive entertainment regulation, loot box and in-game purchase oversight, age verification requirements.
- **Reliability:** HIGH — Directly binding on licensees. Consultation outcomes typically implemented within 12 months.

### 2.2 EU Regulatory Bodies

#### ESMA (European Securities and Markets Authority)
- **Query patterns:**
  - `site:esma.europa.eu {sector} guidelines`
  - `ESMA consultation {sector} {year}`
  - `ESMA supervisory briefing {sector}`
- **Signal:** Securities and markets regulation harmonisation, crypto-asset framework (MiCA) implementation.
- **Reliability:** HIGH — Guidelines are effectively binding through comply-or-explain.

#### EDPB (European Data Protection Board)
- **Query patterns:**
  - `site:edpb.europa.eu {sector} guidelines`
  - `EDPB opinion {sector} data transfer`
  - `EDPB enforcement {sector}`
- **Signal:** GDPR interpretation harmonisation, cross-border data transfer frameworks, enforcement coordination.
- **Reliability:** HIGH — Guidelines shape national DPA enforcement. Opinions are authoritative.

#### DG COMP (European Commission — Competition)
- **Query patterns:**
  - `European Commission competition {sector} investigation`
  - `DG COMP {sector} state aid merger`
  - `European Commission antitrust {sector} fine`
- **Signal:** EU competition enforcement, merger control, Digital Markets Act enforcement, state aid decisions.
- **Reliability:** HIGH — Decisions are definitive and set precedent for sector structure.

---

## 3. Enforcement Actions & Fines

- **Query patterns:**
  - `{regulatory_body} enforcement action {sector} {year}`
  - `{sector} regulatory fine penalty {geography} {year}`
  - `GDPR fine {sector} {year}`
  - `competition fine {sector} {geography}`
  - `{sector} enforcement database penalty`
- **Signal:** Regulatory priorities revealed through enforcement patterns, penalty benchmarks, areas of intensifying scrutiny.
- **Reliability:** HIGH — Enforcement actions are factual. Pattern analysis across multiple actions reveals strategic direction.

---

## 4. Select Committee Inquiries & Government Speeches

- **Query patterns:**
  - `UK select committee inquiry {sector}`
  - `House of Commons {sector} committee report`
  - `House of Lords {sector} inquiry evidence`
  - `{minister_title} speech {sector} regulation`
  - `government policy speech {sector} {geography}`
- **Signal:** Political direction-setting, pre-legislative positioning, cross-party consensus or divergence on sector regulation.
- **Reliability:** MEDIUM-HIGH — Committee reports strongly influence subsequent legislation. Speeches signal intent but not commitment.

---

## 5. International Equivalents (by Configured Geography)

- **Query patterns:**
  - `{country} {sector} regulation new law {year}`
  - `{country} regulatory body {sector} announcement`
  - `{international_body} {sector} agreement standard`
  - `OECD {sector} policy recommendation`
  - `G7 G20 {sector} regulation agreement`
- **Signal:** International regulatory convergence/divergence, extraterritorial reach, mutual recognition frameworks.
- **Reliability:** MEDIUM — Varies by source. OECD/G7 outputs are directional rather than binding. National sources vary in accessibility and translation quality.

---

## 6. Industry Body Publications & Trade Press

- **Query patterns:**
  - `{industry_body} {sector} policy position {year}`
  - `{trade_publication} {sector} regulation analysis`
  - `{sector} industry association regulatory response`
  - `{sector} trade body consultation response {geography}`
- **Signal:** Industry positioning, compliance readiness, lobbying direction, practical implementation challenges.
- **Reliability:** MEDIUM — Valuable for commercial interpretation but inherently partial. Trade press adds analysis layer but may reflect industry bias.

### Sector-Specific Trade Bodies (Examples)

| Sector | Bodies | Publications |
|---|---|---|
| Interactive Entertainment | UKIE, ESA, ISFE, IGEA | GamesIndustry.biz, Gamasutra, MCV/Develop |
| Fintech | Innovate Finance, UK Finance, EBF | Finextra, The Block, CoinDesk |
| Life Sciences | ABPI, EFPIA, BIO | Endpoints News, STAT News, Scrip |
| AI / Technology | techUK, DigitalEurope, BSA | The Register, TechCrunch (policy), Wired (policy) |

---

## 7. Court Decisions & Judicial Review

- **Query patterns:**
  - `{court} {sector} ruling judgment {year}`
  - `CJEU {sector} case ruling`
  - `UK Supreme Court {sector} decision`
  - `judicial review {sector} {regulatory_body}`
- **Signal:** Authoritative interpretation of regulatory scope, landmark rulings that redefine sector boundaries, procedural precedents.
- **Reliability:** HIGH — Court decisions are definitive. However, appeals and references to higher courts may alter outcomes.

---

## Search Execution Guidelines

1. **Per sector-geography combination:** Execute 3–5 searches spanning at least 3 different source categories.
2. **Prioritise primary sources** (categories 1–3) over secondary analysis (category 6).
3. **Time-bound queries** to the last 30 days unless scanning for emerging long-term trends.
4. **Cross-reference** findings across source types to validate significance.
5. **Flag conflicting signals** where different sources suggest divergent regulatory directions.
