export const meta = {
  name: 'stock-analyser-v2',
  description: 'Institutional stock deep-dive with schema-validated eval gates at every step',
  phases: [
    { title: 'Resolve',       detail: 'Resolve ticker via Kite instruments + cache check' },
    { title: 'Fetch',         detail: 'Parallel: historical candles + 6 web searches' },
    { title: 'Technicals',    detail: 'Compute stage, RSI, MA stats from candle data' },
    { title: 'Score',         detail: 'Apply 0-100 rubric across 8 dimensions' },
    { title: 'Deep Analysis', detail: '8 sections in parallel: earnings, concall, forensics, moat, sector, triggers, integrity, verdict' },
    { title: 'Assemble',      detail: 'Write JSON to stock-reports + cache + symlink' },
  ],
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const TickerSchema = {
  type: 'object',
  required: ['instrument_token', 'tradingsymbol', 'company_name', 'exchange', 'last_price', 'cache_hit'],
  properties: {
    instrument_token: { type: 'number' },
    tradingsymbol:    { type: 'string' },
    company_name:     { type: 'string' },
    exchange:         { type: 'string', enum: ['NSE', 'BSE'] },
    last_price:       { type: 'number' },
    day_change_pct:   { type: 'number' },
    open:             { type: 'number' },
    high:             { type: 'number' },
    low:              { type: 'number' },
    sector:           { type: 'string' },
    cache_hit:        { type: 'boolean' },
    cache_path:       { type: 'string' },
  },
}

const CandlesSchema = {
  type: 'object',
  required: ['close_today', 'ma50', 'ma150', 'ma200', 'slope200', 'high_1y', 'low_1y'],
  properties: {
    close_today:     { type: 'number' },
    close_30d:       { type: 'number' },
    close_90d:       { type: 'number' },
    close_180d:      { type: 'number' },
    close_365d:      { type: 'number' },
    high_1y:         { type: 'number' },
    low_1y:          { type: 'number' },
    high_2y:         { type: 'number' },
    ma50:            { type: 'number' },
    ma150:           { type: 'number' },
    ma200:           { type: 'number' },
    slope200:        { type: 'number' },
    volume_avg_30d:  { type: 'number' },
    volume_today:    { type: 'number' },
    closes_14d:      { type: 'array', items: { type: 'number' }, minItems: 14 },
  },
}

const EarningsSchema = {
  type: 'object',
  required: ['quarters', 'ttm_pe', 'de_ratio', 'roe', 'roce'],
  properties: {
    quarters: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['label', 'revenue_cr', 'pat_cr'],
        properties: {
          label:        { type: 'string' },
          revenue_cr:   { type: 'number' },
          ebitda_cr:    { type: 'number' },
          pat_cr:       { type: 'number' },
          eps:          { type: 'number' },
          yoy_rev_pct:  { type: 'number' },
          yoy_pat_pct:  { type: 'number' },
        },
      },
    },
    ttm_pe:      { type: 'number' },
    de_ratio:    { type: 'number' },
    roe:         { type: 'number' },
    roce:        { type: 'number' },
    fcf_positive: { type: 'boolean' },
  },
}

const FetchSchema = {
  type: 'object',
  required: ['candles', 'earnings', 'concall_raw', 'financials_raw', 'sector_raw', 'peers_raw', 'red_flags_raw'],
  properties: {
    candles:        CandlesSchema,
    earnings:       EarningsSchema,
    concall_raw:    { type: 'string', minLength: 50 },
    financials_raw: { type: 'string', minLength: 50 },
    sector_raw:     { type: 'string', minLength: 50 },
    peers_raw:      { type: 'string', minLength: 50 },
    red_flags_raw:  { type: 'string' },
  },
}

const ScoreSchema = {
  type: 'object',
  required: ['total', 'action', 'breakdown'],
  properties: {
    total:  { type: 'number', minimum: 0, maximum: 100 },
    action: { type: 'string', enum: ['STRONG ADD', 'ADD', 'STRONG HOLD', 'HOLD', 'WATCH', 'TRIM', 'EXIT'] },
    breakdown: {
      type: 'object',
      required: ['earnings', 'mgmt', 'moat', 'balance_sheet', 'sector', 'competitive', 'valuation', 'stage'],
      properties: {
        earnings:     { type: 'number', minimum: 0, maximum: 10 },
        mgmt:         { type: 'number', minimum: 0, maximum: 10 },
        moat:         { type: 'number', minimum: 0, maximum: 10 },
        balance_sheet:{ type: 'number', minimum: 0, maximum: 10 },
        sector:       { type: 'number', minimum: 0, maximum: 10 },
        competitive:  { type: 'number', minimum: 0, maximum: 10 },
        valuation:    { type: 'number', minimum: 0, maximum: 10 },
        stage:        { type: 'number', minimum: 0, maximum: 30 },
      },
    },
    score_notes: { type: 'string' },
  },
}

const SectionSchema = {
  type: 'object',
  required: ['section_id', 'section_name', 'html_fragment', 'summary_text'],
  properties: {
    section_id:    { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] },
    section_name:  { type: 'string' },
    html_fragment: { type: 'string', minLength: 100 },
    summary_text:  { type: 'string', minLength: 20 },
    score_refinement: {
      type: 'object',
      properties: {
        dimension: { type: 'string', enum: ['earnings', 'mgmt', 'moat', 'balance_sheet', 'sector', 'competitive', 'valuation', 'stage'] },
        delta:     { type: 'number' },
        reason:    { type: 'string' },
      },
    },
  },
}

// ─── Pure helper functions ────────────────────────────────────────────────────

function computeStage(c) {
  const { close_today, ma50, ma150, ma200, slope200 } = c
  if (!ma50 || !ma150 || !ma200) return 'Stage 4'
  if (close_today > ma50 && ma50 > ma150 && ma150 > ma200 && slope200 > 0) return 'Stage 2B'
  if (close_today > ma200 && slope200 > 0) return 'Stage 2A'
  if (close_today > ma200 && Math.abs(slope200) < 0.5) return 'Stage 1'
  if (close_today < ma200 && slope200 > 0) return 'Stage 3'
  return 'Stage 4'
}

function computeRSI(closes) {
  if (!closes || closes.length < 14) return 50
  let gains = 0, losses = 0
  for (let i = 1; i < 14; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }
  const avgGain = gains / 13
  const avgLoss = losses / 13
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Math.round(100 - 100 / (1 + rs))
}

function stageToScore(stage) {
  const map = { 'Stage 2B': 30, 'Stage 2A': 25, 'Stage 1': 15, 'Stage 3': 8, 'Stage 4': 0 }
  return map[stage] ?? 0
}

function scoreToAction(score) {
  if (score >= 85) return 'STRONG ADD'
  if (score >= 70) return 'ADD'
  if (score >= 55) return 'STRONG HOLD'
  if (score >= 40) return 'HOLD'
  if (score >= 30) return 'WATCH'
  if (score >= 15) return 'TRIM'
  return 'EXIT'
}

function buildFetchPrompt(ticker, company, token, sector) {
  return `You are a data-fetching agent. Fetch all 7 data sources for ${company} (${ticker}, NSE token: ${token}, sector: ${sector || 'unknown'}).

Run ALL tasks simultaneously in parallel — do not wait for one before starting another:

TASK 1 — Historical candles:
  Call mcp__kite__get_historical_data with:
    instrument_token: ${token}
    from_date: "2 years ago (YYYY-MM-DD format) 00:00:00"
    to_date: "today 23:59:59"
    interval: "day"
  Compute from candle array:
    - close_today = last candle close
    - close_30d, close_90d, close_180d, close_365d = closes ~30/90/180/365 trading days back
    - ma50 = average of last 50 closes
    - ma150 = average of last 150 closes
    - ma200 = average of last 200 closes (or available if <200 days)
    - slope200 = ma200[today] minus ma200[30 days ago]
    - high_1y = max close over last 252 trading days
    - low_1y = min close over last 252 trading days
    - high_2y = max close over full dataset
    - volume_avg_30d = avg volume last 30 days
    - volume_today = last candle volume
    - closes_14d = array of last 14 closing prices (for RSI)

TASK 2 — Quarterly earnings:
  WebSearch: "${company} quarterly results Q4 FY26 Q3 FY26 Q2 FY26 revenue PAT EBITDA EPS site:screener.in OR site:moneycontrol.com"
  Extract: last 4 quarters of revenue, EBITDA, PAT, EPS + YoY% changes + TTM P/E, D/E ratio, ROE, ROCE, FCF status.
  Compress to a structured earnings JSON (see schema). Max 400 words of raw notes.

TASK 3 — Concall transcript:
  WebSearch: "${company} concall transcript Q4 FY26 management commentary guidance site:trendlyne.com OR site:screener.in"
  Extract: management statements on growth, risks, guidance, capital allocation, key decisions.
  Compress to 800 words max.

TASK 4 — Annual report / 5-year financials:
  WebSearch: "${company} annual report 5 year financials balance sheet cash flow ROE ROCE site:screener.in"
  Extract: 3-5 year P&L trends, balance sheet strength, cash flow quality, capital allocation ratios.
  Compress to 500 words max.

TASK 5 — Sector macro outlook:
  WebSearch: "${sector || company} India sector outlook 2025 2026 growth drivers government policy tailwinds headwinds site:economictimes.indiatimes.com OR site:businessstandard.com OR site:livemint.com"
  Extract: sector size, growth rate, structural drivers, govt policy, PLI schemes, cycle stage.
  Compress to 400 words max.

TASK 6 — Peer comparison:
  WebSearch: "${company} vs peers comparison P/E EV/EBITDA revenue margins market share site:tickertape.in OR site:screener.in"
  Extract: top 3-5 peers, valuation multiples, margin comparison, market share context.
  Compress to 400 words max.

TASK 7 — Red flags / governance:
  WebSearch: "${company} promoter pledge governance accounting concerns red flags site:capitalmind.in OR site:valuepickr.com"
  Extract: any accounting issues, promoter pledge %, governance concerns, management departures.
  Compress to 300 words max.

CRITICAL: Return ONLY the FetchSchema JSON. Never include raw search snippets. Compress all text fields.
If a web search returns no results, set that field to "No data found" (do not leave it null).`
}

function buildSectionPrompt(section, ticker, company, sector, fetchData, scoreResult, technicals) {
  const base = `You are an institutional equity analyst. Generate Section ${section.id} (${section.name}) for ${company} (${ticker}, sector: ${sector}).

Available data:
- Technical stage: ${technicals.stage}, RSI: ${technicals.rsi14}, ${technicals.pct_from_high.toFixed(1)}% from 52W high
- Score: ${scoreResult.total}/100 → ${scoreResult.action}
- Score breakdown: ${JSON.stringify(scoreResult.breakdown)}`

  const sectionPrompts = {
    A: `${base}

QUARTERLY EARNINGS ANALYSIS — Use framing: quarterly-earnings-analysis-engine

Input data (earnings JSON):
${JSON.stringify(fetchData.earnings, null, 2)}

Generate a comprehensive earnings analysis HTML fragment covering:
1. Quarter-by-quarter table: Revenue, EBITDA, PAT, EPS with YoY% and QoQ%
2. Beat/miss streak assessment (last 4 quarters vs estimates if available)
3. Margin trend analysis (EBITDA margin %, PAT margin %)
4. Revenue mix and segment performance (if multi-segment)
5. Earnings momentum: accelerating / stable / decelerating
6. Quick verdict: is earnings momentum a thesis strengthener or weakener?

Use dark-mode CSS vars: --bg, --surface, --surface2, --border, --text, --muted, --green, --red, --yellow, --blue.
Return structured HTML table with beats in green, misses in red.`,

    B: `${base}

CONCALL INTELLIGENCE — Use framing: concall-intelligence-report

Input data (concall summary):
${fetchData.concall_raw}

Generate a 13-section concall intelligence card HTML covering:
1. Growth & Strategy narrative (management's story + credibility check)
2. Risks & Market Dynamics (stated vs hidden risks)
3. Financial consistency (guidance vs actual across calls)
4. Management quality signals (direct/evasive/factual tone)
5. Key decisions announced (capex, acquisitions, geographic expansion)
6. Guidance for next quarter / year (revenue, margins, order book)
7. Management credibility rating (⭐ to ⭐⭐⭐⭐⭐)
8. Investment thesis update (strengthens / neutral / weakens)
9. 3 follow-up questions a sharp investor should ask
10. Bull signals from concall (positive surprises)
11. Bear signals from concall (concerns, evasions, guide-downs)
12. Sentiment overall: Bullish / Neutral / Cautious
13. One-line summary

Use polarity chips: <span class="polarity-chip positive">+ve</span> for positives, <span class="polarity-chip negative">-ve</span> for risks, <span class="polarity-chip neutral">neu</span> for neutral.`,

    C: `${base}

FINANCIAL FORENSICS — Use framing: 3-statement-financial-forensics + red-flag-detector + financial-health-check-12-ratio-diagnostic

Input data (5-year financials):
${fetchData.financials_raw}

Earnings for cross-reference:
${JSON.stringify(fetchData.earnings)}

Generate a forensics panel HTML covering:
1. 3-year P&L table (Revenue, EBITDA margin%, PAT, EPS + YoY trends)
2. Balance sheet health (D/E trend, interest coverage, current ratio)
3. Cash flow quality (OCF vs PAT gap — flag if OCF consistently < PAT)
4. Capital allocation (ROE, ROCE, capex intensity, dividend payout)
5. Red flag scan — 5 categories with traffic lights (🟢/🟡/🔴):
   - Accounting quality (revenue recognition, one-offs, related-party)
   - Cash flow quality (working capital deterioration, FCF negative)
   - Balance sheet stress (D/E, interest coverage, contingent liabilities)
   - Business momentum (revenue deceleration, margin compression)
   - Management/governance (auditor change, promoter pledge, SEBI notices)
6. 12-ratio dashboard in a table with healthy range and 🟢/🟡/🔴 status
7. Financial health verdict: Excellent / Good / Fair / Weak

Use class="forensics-grid" for 3-column layout.`,

    D: `${base}

COMPETITIVE LANDSCAPE & MOAT — Use framing: competitive-landscape-decoder

Input data (peer comparison):
${fetchData.peers_raw}

Generate a competitive analysis HTML covering:
1. Industry overview (size, growth, structure)
2. Company positioning (market share rank)
3. Peer comparison table (top 3-5 peers: Revenue, PAT margin, ROE, D/E, P/E, EV/EBITDA)
4. Moat dimension ratings (0=none, 1=weak, 2=moderate, 3=strong):
   Brand Strength | Distribution Network | Scale Advantage | Manufacturing | Technology/R&D
   Customer Switching Costs | Regulatory Advantage | Cost Leadership | Network Effects | Pricing Power
5. Market share dynamics: Gaining / Stable / Losing
6. Strategic risks (disruption, new entrants, substitutes)
7. Valuation vs peers: Premium/Discount and whether justified
8. Competitive position verdict: Strengthening / Stable / Weakening

Render moat as a visual bar chart using inline CSS.`,

    E: `${base}

SECTOR INTELLIGENCE — Use framing: institutional-sector-intelligence-report

Input data (sector outlook):
${fetchData.sector_raw}

Generate a sector intelligence report HTML covering:
1. Sector overview (size, growth rate, cycle stage)
2. Value chain position (where does this company sit)
3. Structural growth drivers (3-5 tailwinds with timeline)
4. Headwinds and risks (regulatory, global, competitive)
5. Government policy context (PLI schemes, import duties, sector policy)
6. Competitive landscape (fragmented vs consolidated)
7. Sector valuation (P/E range, cycle position)
8. 1-3 year outlook: Bullish / Neutral / Bearish with reasoning
9. Trigger map:
   - Positive triggers → upside scenarios
   - Negative triggers → downside scenarios
10. Key sector monitorable (the ONE metric to watch)`,

    F: `${base}

GROWTH TRIGGERS — Use framing: mega-stock-research-framework Part 11

Input data:
Concall summary: ${fetchData.concall_raw}
Financials: ${fetchData.financials_raw}

Generate a growth triggers table HTML covering:
1. Trigger table with columns: Trigger Name | Type | Potential Revenue Impact | Timeline (months) | Probability
   - Types: Operational / Strategic / Regulatory / Macro / Product
   - Probability: High / Medium / Low (color-coded: green/yellow/muted)
2. Operating leverage analysis: at what capacity utilisation does margin expand?
3. Upside scenario: if 3 highest-probability triggers all fire, what is the total revenue/EPS impact?
4. Timeline view: which triggers materialise in 6m / 12m / 24m?
5. Key risk to the trigger thesis

Use class="trigger-table" for the table.`,

    G: `${base}

MANAGEMENT INTEGRITY SCORE — Use framing: mega-stock-research-framework Part 8

Input data (concall summary, use last 4+ quarters):
${fetchData.concall_raw}

Generate a management integrity analysis HTML covering:
1. Promise vs delivery matrix (as many quarters as data allows, up to 12):
   Columns: Quarter | Key Promise | Actual Outcome | Status (✅/⚠️/❌)
2. Red flag incidents: specific cases of over-promise, narrative change, blame-shifting
3. Management tone trend: is management becoming more bullish or more cautious over time?
4. Guidance track record: consecutive beats/misses count
5. Integrity grade:
   - A: Highly trustworthy (>80% delivery rate, transparent on misses)
   - B: Mostly reliable (60-80% delivery, occasional narrative softening)
   - C: Mixed (40-60%, frequent guide-downs)
   - D: Poor track record (<40%, consistent over-promise)
6. One-line integrity summary

Use class="integrity-row" + delivered/partial/missed modifiers. Show grade with class="integrity-grade A/B/C/D".`,

    H: `${base}

FINAL VERDICT — Use framing: mega-stock-research-framework Part 12

All section summaries:
- Earnings: ${fetchData.earnings.quarters?.length || 0} quarters analyzed
- Concall: ${fetchData.concall_raw?.substring(0, 200)}...
- Forensics data: ${fetchData.financials_raw?.substring(0, 200)}...
- Peers: ${fetchData.peers_raw?.substring(0, 200)}...
- Red flags: ${fetchData.red_flags_raw?.substring(0, 200)}...

Final score: ${scoreResult.total}/100 → ${scoreResult.action}
Breakdown: Earnings ${scoreResult.breakdown.earnings}/10, Mgmt ${scoreResult.breakdown.mgmt}/10, Moat ${scoreResult.breakdown.moat}/10, Balance Sheet ${scoreResult.breakdown.balance_sheet}/10, Sector ${scoreResult.breakdown.sector}/10, Competitive ${scoreResult.breakdown.competitive}/10, Valuation ${scoreResult.breakdown.valuation}/10, Stage ${scoreResult.breakdown.stage}/30

Generate a final verdict HTML covering:
1. Valuation check:
   - Current P/E vs 3Y historical average
   - EV/EBITDA vs historical range
   - Price-to-Sales, Price-to-Book
   - Verdict: Overvalued / Fairly valued / Undervalued
2. Bull case: key assumptions + target price + timeline (12-18 months)
3. Base case: key assumptions + target price + timeline
4. Bear case: key assumptions + downside target + timeline
5. Key monitorable: the ONE most important number/event to watch
6. Suggested action with price levels:
   - Buy zone (accumulate below)
   - Add zone (add on dips)
   - Trim zone (reduce exposure above)
   - Stop-loss level
7. Position sizing guidance: Core / Satellite / Tracking
8. Score summary card (repeat score ring context + final one-liner)

Make this section the most decision-useful — concrete numbers, not vague ranges.`,
  }

  return (sectionPrompts[section.id] || `${base}\n\nGenerate analysis for ${section.name}.`) +
    `\n\nReturn ONLY the SectionSchema JSON with a complete html_fragment and summary_text. Use only dark-mode CSS vars. No external resources.`
}

// ─── Main workflow ────────────────────────────────────────────────────────────

const ticker = (args?.ticker || '').toUpperCase()
const forceRefresh = args?.refresh === true
const runDate = args?.run_date || 'today'

if (!ticker) throw new Error('No ticker provided. Pass args: { ticker: "SYMBOL" }')

// ─── Phase 0: Resolve ─────────────────────────────────────────────────────────
phase('Resolve')
log(`Resolving ${ticker}...`)

const resolved = await agent(
  `Resolve the NSE/BSE ticker "${ticker}" and check the cache.

Steps:
1. Call mcp__kite__search_instruments(query="${ticker}", exchange="NSE")
   - If no result, retry with exchange="BSE"
   - If still not found, return { cache_hit: false, instrument_token: null }
2. Call mcp__kite__get_ltp(instruments=["<EXCHANGE>:<TRADINGSYMBOL>"])
   - Extract: last_price, day_change_pct (change %), open, high, low
3. Run Bash: ls ~/.portfolio/cache/${ticker}-*.json 2>/dev/null | head -1
   - If a file exists, check its mtime (ls -l output). If modified within last 7 days: set cache_hit=true, cache_path=<path>
   - Otherwise cache_hit=false

Return ONLY the TickerSchema JSON. Include the sector/industry if visible in the instrument search result.`,
  { schema: TickerSchema, phase: 'Resolve', label: `resolve:${ticker}` }
)

if (!resolved || !resolved.instrument_token) {
  throw new Error(`Could not resolve ticker "${ticker}". Try the exact NSE/BSE symbol (e.g. HDFCBANK, TATAMOTORS, KMEW).`)
}

log(`Resolved: ${resolved.tradingsymbol} — ${resolved.company_name} (${resolved.exchange}, token: ${resolved.instrument_token})`)

if (resolved.cache_hit && !forceRefresh) {
  log(`Cache hit (< 7 days old) — returning cached result. Pass refresh:true to force re-analysis.`)
  return { ticker, cached: true, cache_path: resolved.cache_path, company: resolved.company_name }
}

// ─── Phase 1: Fetch ───────────────────────────────────────────────────────────
phase('Fetch')
log(`Fetching data for ${resolved.tradingsymbol} (${resolved.company_name})...`)

let fetchData = null
let fetchAttempt = 0

while (!fetchData && fetchAttempt < 2) {
  fetchAttempt++
  if (fetchAttempt > 1) log(`Retrying fetch (attempt ${fetchAttempt})...`)

  fetchData = await agent(
    buildFetchPrompt(resolved.tradingsymbol, resolved.company_name, resolved.instrument_token, resolved.sector),
    { schema: FetchSchema, phase: 'Fetch', label: `fetch:${ticker}:attempt${fetchAttempt}` }
  )
}

if (!fetchData) throw new Error(`Fetch failed after 2 attempts for ${ticker}. Check Kite session and network.`)

// Eval gate: candles are a hard requirement
if (!fetchData.candles?.ma200) {
  throw new Error(`Candle data incomplete for ${ticker} — ma200 missing. Historical data API may have failed.`)
}

// Eval gate: web data soft requirements — warn but continue
const softFields = ['concall_raw', 'sector_raw', 'peers_raw', 'financials_raw']
const missingWeb = softFields.filter(k => !fetchData[k] || fetchData[k].length < 50)
if (missingWeb.length > 2) {
  throw new Error(`Too many web fetch failures (${missingWeb.join(', ')}). Check network connectivity.`)
}
if (missingWeb.length > 0) {
  log(`WARNING: Partial web data — low quality for: ${missingWeb.join(', ')}. Analysis will proceed with available data.`)
}

log(`Fetch complete. Candles: ${fetchData.candles.close_today}, MA200: ${fetchData.candles.ma200}, Earnings: ${fetchData.earnings.quarters?.length || 0}Q`)

// ─── Phase 2: Technicals ──────────────────────────────────────────────────────
phase('Technicals')

const c = fetchData.candles
const stage = computeStage(c)
const pct_from_high = c.high_1y ? ((c.close_today - c.high_1y) / c.high_1y) * 100 : 0
const pct_above_200ma = c.ma200 ? ((c.close_today - c.ma200) / c.ma200) * 100 : 0
const rsi14 = computeRSI(c.closes_14d)
const volume_ratio = c.volume_avg_30d ? (c.volume_today / c.volume_avg_30d) : 1

const VALID_STAGES = ['Stage 1', 'Stage 2A', 'Stage 2B', 'Stage 3', 'Stage 4']
if (!VALID_STAGES.includes(stage)) {
  throw new Error(`Invalid stage computed: "${stage}". Candle data may be corrupt.`)
}

const technicals = { stage, pct_from_high, pct_above_200ma, rsi14, volume_ratio }
log(`Technicals: ${stage} | RSI: ${rsi14} | ${pct_from_high.toFixed(1)}% from 52W high | ${pct_above_200ma.toFixed(1)}% above 200MA`)

// ─── Phase 3: Score ───────────────────────────────────────────────────────────
phase('Score')
log(`Scoring ${ticker} on 0-100 rubric...`)

const isSME = resolved.tradingsymbol.endsWith('-SM') || resolved.tradingsymbol.endsWith('SME')
const stageScore = stageToScore(stage)

const scoreResult = await agent(
  `Score ${resolved.tradingsymbol} (${resolved.company_name}) on the institutional 0-100 rubric.

TECHNICALS (already computed — use these exact values for Stage dimension):
  Stage: ${stage}
  RSI-14: ${rsi14}
  % from 52W high: ${pct_from_high.toFixed(1)}%
  % above 200MA: ${pct_above_200ma.toFixed(1)}%

EARNINGS DATA:
${JSON.stringify(fetchData.earnings, null, 2)}

CONCALL SUMMARY (800 words):
${fetchData.concall_raw}

PEERS SUMMARY:
${fetchData.peers_raw}

SECTOR SUMMARY:
${fetchData.sector_raw}

RED FLAGS:
${fetchData.red_flags_raw}

SCORING RUBRIC — score each dimension strictly:

A. Earnings Growth (0-10):
   10: 4Q+ consecutive PAT growth >20% YoY, accelerating margins
   7-9: Steady 15-20% growth, margins stable or expanding
   4-6: Mixed growth (<15% avg), flat margins
   1-3: Declining revenue or PAT in 2+ recent quarters
   0: Negative PAT, revenue contraction

B. Management Credibility (0-10):
   10: Consistent guidance delivery, transparent on misses, ⭐⭐⭐⭐⭐
   7-9: Mostly delivers, acknowledges issues directly
   4-6: Occasional guide-downs, narrative softening
   1-3: Frequent misses, blame external factors
   0: Systematic over-promise, governance concerns

C. Moat Strength (0-10):
   10: Dominant position, pricing power, high switching costs
   7-9: Clear moat in 2+ dimensions, stable share
   4-6: Some differentiation, moderate competitive pressure
   1-3: Commoditised, share losing, limited pricing power
   0: No moat, severe competition

D. Balance Sheet Quality (0-10):
   10: Net cash, ROE>20%, ROCE>18%, FCF positive
   7-9: D/E<0.5, ROE>15%, FCF positive most years
   4-6: D/E 0.5-1.0, adequate coverage, FCF breakeven
   1-3: D/E>1, interest strain, FCF negative
   0: D/E>2, loss-making, solvency risk

E. Sector Tailwind (0-10):
   10: Structural multi-year tailwind, PLI/govt support, early cycle
   7-9: Growing sector with clear policy support
   4-6: Moderate growth sector, neutral policy
   1-3: Headwinds, regulatory risk, mature/declining
   0: Structural decline, severe disruption

F. Competitive Position (0-10):
   10: Market leader, gaining share in growing market
   7-9: Top 3 player, stable or gaining
   4-6: Mid-tier player, holding share
   1-3: Losing share to better-positioned peers
   0: Marginal player, severe disruption threat

G. Valuation (0-10):
   10: Trading at significant discount to historical P/E + peers + growth justified
   7-9: Fairly valued or mild discount
   4-6: Slight premium, earnings need to catch up
   1-3: Significant premium to peers and history
   0: Extreme overvaluation vs growth rate

H. Technical Stage (0-30) — use pre-computed value:
   Stage 2B = 30
   Stage 2A = 25
   Stage 1  = 15
   Stage 3  = 8
   Stage 4  = 0
   → ${stage} = ${stageScore} (USE THIS EXACT VALUE)

OVERRIDES TO APPLY:
${isSME ? '- SME stock: maximum action = TRIM regardless of total score (liquidity/spread risk)' : ''}
- If score 40-54 AND Stage 4 AND D/E > 1: downgrade action to WATCH minimum
- If score >= 70 AND Stage 4: action should include note about awaiting Stage 1/2A base

ACTION LOOKUP:
  85-100: STRONG ADD
  70-84:  ADD
  55-69:  STRONG HOLD
  40-54:  HOLD
  30-39:  WATCH
  15-29:  TRIM
  0-14:   EXIT

Return ONLY the ScoreSchema JSON. breakdown.stage MUST equal ${stageScore}.`,
  { schema: ScoreSchema, phase: 'Score', label: `score:${ticker}` }
)

if (!scoreResult) throw new Error(`Scoring agent returned null for ${ticker}`)
if (scoreResult.total < 0 || scoreResult.total > 100) throw new Error(`Score ${scoreResult.total} out of valid range [0,100]`)
if (!scoreResult.action) throw new Error('Score agent did not return an action')

// Force stage score to be deterministic (computed locally, not by model)
scoreResult.breakdown.stage = stageScore

log(`Score: ${scoreResult.total}/100 → ${scoreResult.action} | Stage dimension: ${stageScore}/30`)

// ─── Phase 4: Deep Analysis ───────────────────────────────────────────────────
phase('Deep Analysis')
log(`Running 8 analysis sections in parallel...`)

const SECTIONS = [
  { id: 'A', name: 'Quarterly Earnings Analysis' },
  { id: 'B', name: 'Concall Intelligence' },
  { id: 'C', name: 'Financial Forensics' },
  { id: 'D', name: 'Competitive Landscape & Moat' },
  { id: 'E', name: 'Sector Intelligence' },
  { id: 'F', name: 'Growth Triggers' },
  { id: 'G', name: 'Management Integrity Score' },
  { id: 'H', name: 'Final Verdict & Valuation' },
]

const sectionResults = await pipeline(
  SECTIONS,
  async (section) => {
    const prompt = buildSectionPrompt(
      section,
      resolved.tradingsymbol,
      resolved.company_name,
      resolved.sector,
      fetchData,
      scoreResult,
      technicals
    )

    const result = await agent(prompt, {
      schema: SectionSchema,
      phase: 'Deep Analysis',
      label: `section:${section.id}:${section.name}`,
    })

    // Per-section eval gate
    if (!result || !result.html_fragment || result.html_fragment.length < 100) {
      log(`WARNING: Section ${section.id} (${section.name}) returned insufficient content — using placeholder`)
      return {
        section_id: section.id,
        section_name: section.name,
        html_fragment: `<div style="padding:24px;color:var(--muted);text-align:center;border:1px dashed var(--border);border-radius:8px;margin:16px 0">
          <div style="font-size:18px;margin-bottom:8px">⚠️</div>
          <div style="font-weight:600;color:var(--text);margin-bottom:4px">Section ${section.id}: ${section.name}</div>
          <div style="font-size:13px">Data unavailable for this run. Re-run with refresh:true for fresh data.</div>
        </div>`,
        summary_text: `${section.name} — data not available for this run`,
        failed: true,
      }
    }

    log(`Section ${section.id} complete (${result.html_fragment.length.toLocaleString()} chars)`)
    return { ...result, section_id: section.id, section_name: section.name }
  }
)

// Aggregate eval: tolerate up to 3 placeholder sections
const goodSections = sectionResults.filter(Boolean)
const failedSections = goodSections.filter(s => s.failed)

if (failedSections.length > 3) {
  throw new Error(`Too many section failures (${failedSections.length}/8): ${failedSections.map(s => s.section_id).join(', ')}. Analysis quality too low.`)
}
if (failedSections.length > 0) {
  log(`${failedSections.length} section(s) used placeholder: ${failedSections.map(s => s.section_id).join(', ')}`)
}

// Apply score refinements from sections (e.g. forensics found D/E > 2)
let refinedBreakdown = { ...scoreResult.breakdown }
let totalRefinement = 0
for (const s of goodSections) {
  if (s.score_refinement?.dimension && s.score_refinement?.delta) {
    const { dimension, delta, reason } = s.score_refinement
    if (refinedBreakdown[dimension] !== undefined) {
      const before = refinedBreakdown[dimension]
      refinedBreakdown[dimension] = Math.max(0, Math.min(dimension === 'stage' ? 30 : 10, before + delta))
      totalRefinement += delta
      log(`Score refinement: ${dimension} ${before} → ${refinedBreakdown[dimension]} (${reason})`)
    }
  }
}

const refinedTotal = Object.values(refinedBreakdown).reduce((a, b) => a + b, 0)
const refinedAction = isSME && scoreToAction(refinedTotal) === 'STRONG ADD'
  ? 'ADD'
  : scoreToAction(refinedTotal)

const finalScore = {
  total: refinedTotal,
  action: refinedAction,
  breakdown: refinedBreakdown,
  score_notes: totalRefinement !== 0
    ? `Original score: ${scoreResult.total}. Refined by deep analysis: ${totalRefinement > 0 ? '+' : ''}${totalRefinement}`
    : scoreResult.score_notes,
}

log(`Final score after refinements: ${finalScore.total}/100 → ${finalScore.action}`)

// ─── Phase 5: Assemble ────────────────────────────────────────────────────────
phase('Assemble')
log(`Assembling JSON and writing output files...`)

// Build sections map keyed by section_id
const sectionsMap = {}
for (const s of goodSections) {
  sectionsMap[s.section_id] = {
    section_name: s.section_name,
    html_fragment: s.html_fragment,
    summary_text: s.summary_text,
    failed: s.failed || false,
  }
}

// Final JSON structure (schema v3.0)
const outputJSON = {
  meta: {
    ticker: resolved.tradingsymbol,
    company: resolved.company_name,
    exchange: resolved.exchange,
    sector: resolved.sector || 'Unknown',
    generated_at: runDate,
    ttl_days: 7,
    schema_version: '3.0',
    workflow_version: 'v2',
    sections_failed: failedSections.map(s => s.section_id),
  },
  price: {
    last_price: resolved.last_price,
    day_change_pct: resolved.day_change_pct || 0,
    open: resolved.open || 0,
    high: resolved.high || 0,
    low: resolved.low || 0,
  },
  technical: {
    stage: technicals.stage,
    pct_from_high: technicals.pct_from_high,
    pct_above_200ma: technicals.pct_above_200ma,
    rsi14: technicals.rsi14,
    volume_ratio: technicals.volume_ratio,
    ma50: c.ma50,
    ma150: c.ma150,
    ma200: c.ma200,
    high_1y: c.high_1y,
    low_1y: c.low_1y,
  },
  score: finalScore,
  earnings: fetchData.earnings,
  // Section data — html_fragment rendered by report.html
  sections: sectionsMap,
}

// Write all files via agent
const assembleResult = await agent(
  `Write the stock analysis output files for ${resolved.tradingsymbol} atomically.

JSON to write (full content):
${JSON.stringify(outputJSON)}

Steps:
1. mkdir -p ~/.portfolio/stock-reports/${resolved.tradingsymbol}
2. Write to ~/.portfolio/stock-reports/${resolved.tradingsymbol}/${resolved.tradingsymbol}-${runDate}.json.tmp (using Write tool)
3. Rename: mv ~/.portfolio/stock-reports/${resolved.tradingsymbol}/${resolved.tradingsymbol}-${runDate}.json.tmp ~/.portfolio/stock-reports/${resolved.tradingsymbol}/${resolved.tradingsymbol}-${runDate}.json
4. Create symlink: ln -sf ${resolved.tradingsymbol}-${runDate}.json ~/.portfolio/stock-reports/${resolved.tradingsymbol}/latest.json

5. Write cache metadata to ~/.portfolio/cache/${resolved.tradingsymbol}-${runDate}.json:
{
  "ticker": "${resolved.tradingsymbol}",
  "company": "${resolved.company_name}",
  "generated_at": "${runDate}",
  "expires_at": "7 days from now",
  "ttl_days": 7,
  "score": ${finalScore.total},
  "action": "${finalScore.action}",
  "score_breakdown": ${JSON.stringify(finalScore.breakdown)},
  "data_path": "~/.portfolio/stock-reports/${resolved.tradingsymbol}/${resolved.tradingsymbol}-${runDate}.json"
}

6. Verify: ls -la ~/.portfolio/stock-reports/${resolved.tradingsymbol}/

Return: { files_written: ["...paths..."], verified: true/false, file_size_bytes: <size of main JSON> }`,
  { phase: 'Assemble', label: `assemble:${ticker}` }
)

if (!assembleResult?.verified) {
  log('WARNING: File verification step returned unconfirmed. Bridge server may not immediately serve this result.')
}

// ─── Final summary ────────────────────────────────────────────────────────────

const scoreLabel = {
  'STRONG ADD': 'Strong Candidate',
  'ADD':        'Good Candidate',
  'STRONG HOLD':'Hold — Solid Business',
  'HOLD':       'Neutral — Monitor',
  'WATCH':      'Weak — Watch',
  'TRIM':       'Reducing Recommended',
  'EXIT':       'Avoid / Exit',
}[finalScore.action] || ''

log(`\n✅ Analysis complete: ${resolved.tradingsymbol} — ${resolved.company_name}`)
log(`Score: ${finalScore.total}/100 → ${finalScore.action} (${scoreLabel})`)
log(`Technical: ${technicals.stage} | RSI: ${rsi14} | ${technicals.pct_from_high.toFixed(1)}% from 52W high`)
log(`Sections complete: ${goodSections.length - failedSections.length}/8 (${failedSections.length} placeholder)`)
log(`Result: ~/.portfolio/stock-reports/${resolved.tradingsymbol}/latest.json`)

return {
  ticker: resolved.tradingsymbol,
  company: resolved.company_name,
  score: finalScore.total,
  action: finalScore.action,
  stage: technicals.stage,
  sections_complete: goodSections.length - failedSections.length,
  result_path: `~/.portfolio/stock-reports/${resolved.tradingsymbol}/latest.json`,
}
