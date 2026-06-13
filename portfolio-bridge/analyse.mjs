#!/usr/bin/env node
/**
 * analyse.mjs — Stock analysis runner (analysis-only, no MCP)
 *
 * Usage:  node analyse.mjs <TICKER> --data=<base64-json> [--refresh]
 *
 * The --data flag carries pre-computed market data (resolved ticker + technicals)
 * as a base64-encoded JSON string. The caller (skill/Claude session) must resolve
 * the ticker and compute technicals via MCP directly, then pass them here.
 *
 * Why: `claude --print` subprocesses do not inherit the parent session's MCP
 * connections — each subprocess starts a cold MCP handshake. Steps that need
 * MCP (search_instruments, get_historical_data) must run in the calling session.
 * This script only needs WebSearch, which works fine in a subprocess.
 *
 * What it does:
 *   1. Read pre-computed market data from --data flag
 *   2. Call Claude ONCE (WebSearch only) → returns exact report.html JSON schema
 *   3. Write result to ~/.portfolio/stock-reports/<TICKER>/latest.json
 *   4. Write cache metadata to ~/.portfolio/cache/<TICKER>-<date>.json
 *
 * Token cost: ~1 Claude call (~15-25K tokens). No subagents. No MCP in subprocess.
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, symlinkSync, unlinkSync, readdirSync, statSync, renameSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

const TICKER = (process.argv[2] || '').toUpperCase();
const REFRESH = process.argv.includes('--refresh');
const CACHE_TTL_DAYS = 7;

// --data=<base64> carries pre-computed {resolved, candles, stage, rsi14, ...}
const dataArg = process.argv.find(a => a.startsWith('--data='));
let precomputed = null;
if (dataArg) {
  try {
    precomputed = JSON.parse(Buffer.from(dataArg.slice(7), 'base64').toString('utf8'));
  } catch (e) {
    console.error('[analyse] ERROR: --data flag is not valid base64 JSON');
    process.exit(1);
  }
}
const HOME = homedir();
const CACHE_DIR = join(HOME, '.portfolio', 'cache');
const REPORTS_DIR = join(HOME, '.portfolio', 'stock-reports');
const TODAY = new Date().toISOString().slice(0, 10);

if (!TICKER) {
  console.error('Usage: node analyse.mjs <TICKER> [--refresh]');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDirs() {
  [CACHE_DIR, join(REPORTS_DIR, TICKER)].forEach(d => mkdirSync(d, { recursive: true }));
}

function freshCachePath() {
  const files = existsSync(CACHE_DIR)
    ? readdirSync(CACHE_DIR).filter(f => f.startsWith(TICKER + '-'))
    : [];
  for (const f of files) {
    const fp = join(CACHE_DIR, f);
    const stat = statSync(fp);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs < CACHE_TTL_DAYS * 86400 * 1000) return fp;
  }
  return null;
}

function computeStage(c) {
  if (!c.ma50 || !c.ma150 || !c.ma200) return 'Stage 4';
  if (c.close_today > c.ma50 && c.ma50 > c.ma150 && c.ma150 > c.ma200 && c.slope200 > 0) return 'Stage 2B';
  if (c.close_today > c.ma200 && c.slope200 > 0) return 'Stage 2A';
  if (c.close_today > c.ma200 && Math.abs(c.slope200) < 0.5) return 'Stage 1';
  if (c.close_today < c.ma200 && c.slope200 > 0) return 'Stage 3';
  return 'Stage 4';
}

function computeRSI(closes) {
  if (!closes || closes.length < 14) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - 13; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  const ag = gains / 13, al = losses / 13;
  if (al === 0) return 100;
  return Math.round(100 - 100 / (1 + ag / al));
}

function stageScore(stage) {
  return { 'Stage 2B': 30, 'Stage 2A': 25, 'Stage 1': 15, 'Stage 3': 8, 'Stage 4': 0 }[stage] ?? 0;
}

function computeMAs(closes) {
  const last = (n) => closes.slice(-n).reduce((a, b) => a + b, 0) / Math.min(n, closes.length);
  return {
    ma50: Math.round(last(50) * 100) / 100,
    ma150: Math.round(last(150) * 100) / 100,
    ma200: Math.round(last(200) * 100) / 100,
  };
}

// ─── Step 1: Check cache ──────────────────────────────────────────────────────

ensureDirs();

const latestPath = join(REPORTS_DIR, TICKER, 'latest.json');
if (!REFRESH && existsSync(latestPath)) {
  const cacheMeta = freshCachePath();
  if (cacheMeta) {
    console.log(JSON.stringify({ status: 'cache_hit', path: latestPath }));
    process.exit(0);
  }
}

// Portfolio repo root — cwd for the analysis subprocess
const REPO_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

function runClaude(prompt, label) {
  console.error(`[analyse] Claude call: ${label}`);
  try {
    const raw = execSync(
      `claude --print`,
      {
        input: prompt,
        encoding: 'utf8',
        timeout: 240000,
        cwd: REPO_ROOT,
        env: { ...process.env },
      }
    );
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
    }
    try { return JSON.parse(raw.trim()); } catch { /* fall through */ }
    throw new Error(`No JSON found in output: ${raw.slice(0, 300)}`);
  } catch (err) {
    console.error(`[analyse] Claude call failed (${label}): ${err.message.slice(0, 200)}`);
    return null;
  }
}

// ─── Step 2: Load pre-computed market data ────────────────────────────────────
// MCP calls (search_instruments, get_historical_data) must be made by the calling
// Claude session — not here — because subprocess claude --print has no MCP session.
// The caller passes pre-computed data via --data=<base64-json>.

if (!precomputed) {
  console.error('[analyse] ERROR: --data flag is required. The calling skill must resolve the ticker and compute technicals via MCP, then pass them as --data=<base64-json>.');
  console.error('[analyse] Expected shape: { resolved: {...}, candles: {...}, stage, rsi14, pct_from_high, pct_above_200ma, volume_ratio, h_score }');
  process.exit(2);
}

const { resolved, candles, stage, rsi14, pct_from_high, pct_above_200ma, volume_ratio, h_score } = precomputed;

if (!resolved?.instrument_token || !candles?.ma200 || !stage) {
  console.error('[analyse] ERROR: --data is missing required fields (resolved.instrument_token, candles.ma200, stage)');
  process.exit(3);
}

console.error(`[analyse] Loaded: ${resolved.tradingsymbol} — ${resolved.company_name}`);
console.error(`[analyse] Technicals: ${stage}, RSI=${rsi14}, ${pct_from_high}% from 52W high, ${pct_above_200ma}% above 200MA`);

// ─── Step 5: ONE Claude call — full analysis with exact schema ───────────────

const analysisPrompt = `You are an institutional equity analyst. Produce a complete analysis of ${resolved.tradingsymbol} (${resolved.company_name}, ${resolved.exchange}).

MARKET DATA (already fetched — use these numbers directly, do not re-fetch candles):
- Current price: ₹${resolved.last_price} (${resolved.day_change_pct > 0 ? '+' : ''}${resolved.day_change_pct}% today)
- Technical stage: ${stage}
- RSI-14: ${rsi14}
- % from 52W high: ${pct_from_high}%
- % above 200MA: ${pct_above_200ma}%
- MA50: ${candles.ma50}, MA150: ${candles.ma150}, MA200: ${candles.ma200}
- 52W High: ₹${candles.high_1y}, 52W Low: ₹${candles.low_1y}
- Volume ratio (today/30d avg): ${volume_ratio}x

NOW DO THESE SEARCHES (run in parallel):
1. WebSearch("${resolved.company_name} quarterly results Q4 FY26 Q3 FY26 revenue PAT EBITDA EPS site:screener.in OR site:moneycontrol.com")
2. WebSearch("${resolved.company_name} concall transcript Q4 FY26 Q3 FY26 management commentary guidance site:trendlyne.com OR site:screener.in")
3. WebSearch("${resolved.company_name} balance sheet cash flow ROE ROCE 5 year financials site:screener.in")
4. WebSearch("${resolved.tradingsymbol} peers comparison P/E EV/EBITDA competitors site:tickertape.in OR site:screener.in")
5. WebSearch("${resolved.sector || resolved.company_name} India sector outlook 2025 2026 growth drivers site:economictimes.indiatimes.com OR site:businessstandard.com")

SCORING RUBRIC (H dimension = ${h_score}/30 for ${stage} — this is fixed):
A. Earnings Growth: 0-10 (10=4Q+ PAT >20% YoY accelerating, 0=declining)
B. Mgmt Credibility: 0-10 (10=consistent delivery ⭐⭐⭐⭐⭐, 0=systematic miss)
C. Moat: 0-10 (10=dominant pricing power, 0=commoditised)
D. Balance Sheet: 0-10 (10=net cash ROE>20%, 0=D/E>2 loss-making)
E. Sector Tailwind: 0-10 (10=structural multi-year PLI support, 0=structural decline)
F. Competitive Position: 0-10 (10=market leader gaining share, 0=marginal player)
G. Valuation: 0-10 (10=significant discount to history+peers, 0=extreme overvaluation)
H. Stage: FIXED = ${h_score}/30 (${stage})

ACTION: 85-100=STRONG ADD, 70-84=ADD, 55-69=STRONG HOLD, 40-54=HOLD, 30-39=WATCH, 15-29=TRIM, 0-14=EXIT
ACTION_CSS: strong-add | add | strong-hold | hold | watch | trim | exit

Return ONLY the following JSON — no markdown fences, no explanation, just the raw JSON object.
Every field shown must be present. Use null for unavailable numbers, empty array [] for unavailable lists.

{
  "meta": {
    "ticker": "${resolved.tradingsymbol}",
    "company": "${resolved.company_name}",
    "exchange": "${resolved.exchange}",
    "sector": "${resolved.sector || 'Unknown'}",
    "generated_at": "${TODAY}",
    "ttl_days": 7,
    "schema_version": "3.0",
    "workflow_version": "v3-local"
  },
  "price": {
    "last_price": ${resolved.last_price},
    "day_change_pct": ${resolved.day_change_pct || 0}
  },
  "technical": {
    "stage": "${stage}",
    "rsi14": ${rsi14},
    "pct_from_high": ${pct_from_high},
    "pct_above_200ma": ${pct_above_200ma},
    "volume_ratio": ${volume_ratio},
    "ma50": ${candles.ma50},
    "ma150": ${candles.ma150},
    "ma200": ${candles.ma200},
    "high_1y": ${candles.high_1y},
    "low_1y": ${candles.low_1y}
  },
  "score": {
    "total": <sum of all 8 dims>,
    "action": "<STRONG ADD|ADD|STRONG HOLD|HOLD|WATCH|TRIM|EXIT>",
    "action_css": "<strong-add|add|strong-hold|hold|watch|trim|exit>",
    "score_label": "<Strong Candidate|Good Candidate|Hold — Solid Business|Neutral|Weak — Watch|Reducing Recommended|Avoid / Exit>",
    "dimensions": {
      "earnings_growth":   { "score": <0-10>, "max": 10, "label": "Earnings Growth",    "color": "<green|amber|red>" },
      "mgmt_credibility":  { "score": <0-10>, "max": 10, "label": "Mgmt Credibility",   "color": "<green|amber|red>" },
      "moat":              { "score": <0-10>, "max": 10, "label": "Moat Strength",       "color": "<green|amber|red>" },
      "balance_sheet":     { "score": <0-10>, "max": 10, "label": "Balance Sheet",       "color": "<green|amber|red>" },
      "sector_tailwind":   { "score": <0-10>, "max": 10, "label": "Sector Tailwind",     "color": "<green|amber|red>" },
      "competitive":       { "score": <0-10>, "max": 10, "label": "Competitive Position","color": "<green|amber|red>" },
      "valuation":         { "score": <0-10>, "max": 10, "label": "Valuation",           "color": "<green|amber|red>" },
      "technical_stage":   { "score": ${h_score}, "max": 30, "label": "Technical Stage (${stage})", "color": "${h_score >= 25 ? 'green' : h_score >= 15 ? 'amber' : 'red'}" }
    }
  },
  "earnings": {
    "quarters": [
      { "label": "<Q4FY26>", "revenue_cr": <number>, "revenue_est_cr": <number|null>, "ebitda_cr": <number|null>, "pat_cr": <number>, "pat_est_cr": <number|null>, "eps": <number|null>, "yoy_rev_pct": <number>, "yoy_pat_pct": <number>, "beat_miss_rev": "<BEAT|MISS|IN-LINE|null>", "beat_miss_pat": "<BEAT|MISS|IN-LINE|null>", "market_reaction_pct": <number|null>, "analyst_sentiment": "<positive|neutral|negative>" },
      { "label": "<Q3FY26>", "revenue_cr": <number>, "revenue_est_cr": <number|null>, "ebitda_cr": <number|null>, "pat_cr": <number>, "pat_est_cr": <number|null>, "eps": <number|null>, "yoy_rev_pct": <number>, "yoy_pat_pct": <number>, "beat_miss_rev": "<BEAT|MISS|IN-LINE|null>", "beat_miss_pat": "<BEAT|MISS|IN-LINE|null>", "market_reaction_pct": <number|null>, "analyst_sentiment": "<positive|neutral|negative>" },
      { "label": "<Q2FY26>", "revenue_cr": <number>, "revenue_est_cr": <number|null>, "ebitda_cr": <number|null>, "pat_cr": <number>, "pat_est_cr": <number|null>, "eps": <number|null>, "yoy_rev_pct": <number>, "yoy_pat_pct": <number>, "beat_miss_rev": null, "beat_miss_pat": null, "market_reaction_pct": null, "analyst_sentiment": "neutral" },
      { "label": "<Q1FY26>", "revenue_cr": <number>, "revenue_est_cr": <number|null>, "ebitda_cr": <number|null>, "pat_cr": <number>, "pat_est_cr": <number|null>, "eps": <number|null>, "yoy_rev_pct": <number>, "yoy_pat_pct": <number>, "beat_miss_rev": null, "beat_miss_pat": null, "market_reaction_pct": null, "analyst_sentiment": "neutral" }
    ],
    "ttm_pe": <number|null>,
    "sector_pe_avg": <number|null>,
    "de_ratio": <number|null>,
    "roe": <number|null>,
    "roce": <number|null>,
    "fcf_positive": <true|false>,
    "earnings_trend": "<accelerating|stable|decelerating>",
    "sector_rev_growth_avg": <number|null>
  },
  "concall": {
    "quarter": "<Q4FY26>",
    "source_url": "<url or null>",
    "attendees": ["<name1>", "<name2>"],
    "overall_sentiment": "<BULLISH|NEUTRAL|CAUTIOUS|BEARISH>",
    "summary": "<2-3 sentence concall summary>",
    "analyst_pulse": "<1 sentence on analyst reaction>",
    "sections": {
      "strategic_updates": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Strategic Updates",
        "points": [
          { "text": "<strategic point>", "polarity": "<positive|negative|neutral>" }
        ]
      },
      "guidance_outlook": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Guidance Outlook",
        "near_term": [ { "text": "<point>", "polarity": "<positive|negative|neutral>", "timeline": "<Q1FY27 or similar>" } ],
        "medium_term": [ { "text": "<point>", "polarity": "<positive|negative|neutral>", "timeline": "<12M>" } ],
        "long_term": [ { "text": "<point>", "polarity": "<positive|negative|neutral>", "timeline": "<2-3Y>" } ]
      },
      "risk_analysis": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Risk Analysis",
        "points": [ { "text": "<risk point>", "polarity": "negative" } ]
      },
      "qa_summary": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Q&A Summary",
        "exchanges": [
          { "q": "<question>", "a": "<answer summary>", "assessment": "<DIRECT|EVASIVE|PARTIAL — reason>", "polarity": "<positive|negative|neutral>" }
        ]
      },
      "earning_triggers": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Earning Triggers",
        "points": [
          { "text": "<trigger>", "polarity": "positive", "timeline": "<timeline>", "probability": "<HIGH|MEDIUM|LOW>" }
        ]
      },
      "management_consistency": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Management Consistency",
        "promises": [
          { "quarter": "<Q4FY26>", "promise": "<what was promised>", "delivered": "<BEAT|MISSED|IN-LINE|PENDING>", "actual": "<what actually happened>", "red_flags": [], "green_flags": [] }
        ],
        "follow_up_questions": ["<q1>", "<q2>", "<q3>"]
      }
    }
  },
  "forensics": {
    "pl_3year": [
      { "year": "<FY24>", "revenue_cr": <number>, "ebitda_margin_pct": <number>, "pat_cr": <number>, "roe_pct": <number|null> },
      { "year": "<FY25>", "revenue_cr": <number>, "ebitda_margin_pct": <number>, "pat_cr": <number>, "roe_pct": <number|null> },
      { "year": "<FY26>", "revenue_cr": <number>, "ebitda_margin_pct": <number>, "pat_cr": <number>, "roe_pct": <number|null> }
    ],
    "cashflow_3year": [
      { "year": "<FY24>", "cfo_cr": <number>, "fcf_cr": <number>, "cfo_pat_ratio": <number|null> },
      { "year": "<FY25>", "cfo_cr": <number>, "fcf_cr": <number>, "cfo_pat_ratio": <number|null> },
      { "year": "<FY26>", "cfo_cr": <number>, "fcf_cr": <number>, "cfo_pat_ratio": <number|null> }
    ],
    "balance_sheet": {
      "current_ratio": <number|null>,
      "de_ratio": <number|null>,
      "cash_cr": <number|null>,
      "total_debt_cr": <number|null>,
      "working_capital_days": <number|null>,
      "intangibles_flag": <true|false>,
      "intangibles_note": "<note or null>"
    },
    "red_flags": [
      { "category": "<Revenue Quality|Cash Flow|Balance Sheet|Business Momentum|Governance>", "rating": "<GREEN|AMBER|RED>", "finding": "<finding>", "watchlist": "<what to monitor>" }
    ],
    "ratios_12": [
      { "name": "Gross Margin", "value": "<X%>", "trend": "<improving|stable|deteriorating>" },
      { "name": "EBITDA Margin", "value": "<X%>", "trend": "<improving|stable|deteriorating>" },
      { "name": "PAT Margin", "value": "<X%>", "trend": "<improving|stable|deteriorating>" },
      { "name": "ROE", "value": "<X%>", "trend": "<improving|stable|deteriorating>" },
      { "name": "ROCE", "value": "<X%>", "trend": "<improving|stable|deteriorating>" },
      { "name": "Current Ratio", "value": "<X.X>", "trend": "<improving|stable|deteriorating>" },
      { "name": "Quick Ratio", "value": "<X.X>", "trend": "<improving|stable|deteriorating>" },
      { "name": "D/E Ratio", "value": "<X.X>", "trend": "<improving|stable|deteriorating>" },
      { "name": "Interest Coverage", "value": "<X.Xx>", "trend": "<improving|stable|deteriorating>" },
      { "name": "Asset Turnover", "value": "<X.X>", "trend": "<improving|stable|deteriorating>" },
      { "name": "Receivables Days", "value": "<X days>", "trend": "<improving|stable|deteriorating>" },
      { "name": "Inventory Days", "value": "<X days or N/A>", "trend": "<improving|stable|deteriorating>" }
    ],
    "forensics_verdict": "<Financially Healthy|Watch|Weak — financial forensics summary>"
  },
  "competitive": {
    "industry_overview": "<1-2 sentence industry overview>",
    "company_positioning": "<company position in market>",
    "player_type": "<Leader|Challenger|Niche|Laggard>",
    "position_trend": "<Gaining|Stable|Losing>",
    "peers": [
      { "name": "<Company Name (NSE)>", "market_cap_cr": <number|null>, "revenue_cr": <number|null>, "pat_cr": <number|null>, "ebitda_margin_pct": <number|null>, "pe": <number|null>, "ev_revenue": <number|null>, "roe_pct": <number|null>, "market_share": "<leader|challenger|niche>" }
    ],
    "moat_radar": [
      { "dimension": "Pricing Power", "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Brand Strength", "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Distribution Network", "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Scale Advantage", "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Technology / R&D", "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Switching Costs", "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Regulatory Advantage", "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Cost Leadership", "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Network Effects", "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Manufacturing Capability", "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" }
    ],
    "moat_overall": "<Narrow|Wide|None>",
    "moat_score": <sum of moat_radar ratings>,
    "moat_max": 30
  },
  "sector": {
    "name": "<sector name>",
    "overview": "<2-3 sentence sector overview>",
    "growth_drivers": [
      { "driver": "<driver>", "type": "<Structural|Cyclical|Policy>", "impact": "<High|Medium|Low>", "timeline": "<timeline>", "beneficiary": "<Direct|Indirect>" }
    ],
    "risks": [ "<risk 1>", "<risk 2>" ],
    "bull_triggers": [ "<positive catalyst 1>", "<positive catalyst 2>" ],
    "bear_triggers": [ "<negative risk 1>", "<negative risk 2>" ],
    "regulatory_direction": "<Favorable|Neutral|Restrictive>",
    "sector_attractiveness": "<Highly Attractive|Attractive|Neutral|Unattractive>"
  },
  "triggers": [
    { "name": "<trigger name>", "type": "<Operational|Strategic|Regulatory|Macro|Product>", "revenue_impact": "<impact description>", "timeline": "<timeline>", "probability": "<HIGH|MEDIUM|LOW>", "operating_leverage_note": "<note>" }
  ],
  "management_integrity": {
    "composite_score": <0-100>,
    "composite_grade": "<A|B|C|D>",
    "delivery_rate_pct": <0-100>,
    "transparency_on_misses": "<High|Medium|Low>",
    "proactive_disclosure": "<Yes|Partial|No>",
    "analyst_treatment": "<Collaborative|Defensive|Evasive>",
    "tone_consistency": "<Consistent|Moderate|Erratic>",
    "grade_rationale": "<1-2 sentence rationale>",
    "quarters": [
      { "quarter": "<Q4FY26>", "promise": "<promise>", "delivered": "<BEAT|MISSED|IN-LINE|PENDING>", "actual": "<outcome>", "red_flags": [], "green_flags": [] }
    ]
  },
  "verdict": {
    "valuation_check": "<Current P/E vs historical avg, EV/EBITDA context — 2-3 sentences>",
    "valuation_verdict": "<Overvalued|Fairly Valued|Undervalued>",
    "fair_value_range": "<₹X - ₹Y>",
    "bull_case": { "probability_pct": <number>, "target": <number>, "horizon": "<12-18 months>", "assumptions": ["<a1>", "<a2>", "<a3>"] },
    "base_case": { "probability_pct": <number>, "target": <number>, "horizon": "<12-18 months>", "assumptions": ["<a1>", "<a2>", "<a3>"] },
    "bear_case": { "probability_pct": <number>, "target": <number>, "horizon": "<12-18 months>", "assumptions": ["<a1>", "<a2>"] },
    "key_monitorable": "<the single most important metric or event to watch>",
    "action": "<same as score.action>",
    "action_rationale": "<2-3 sentence rationale for the action recommendation>",
    "entry_zone": "<₹X - ₹Y or CMP>",
    "support": <number>,
    "resistance": <number>,
    "stop_loss": <number>
  }
}`;

const result = runClaude(analysisPrompt, 'full-analysis');

if (!result || !result.meta || !result.score) {
  console.error(`[analyse] ERROR: Full analysis failed or returned invalid JSON`);
  process.exit(4);
}

// ─── Step 6: Validate and fix critical fields ─────────────────────────────────

// Ensure technical_stage score is deterministic
if (result.score?.dimensions?.technical_stage) {
  result.score.dimensions.technical_stage.score = h_score;
}

// Ensure total matches sum of dimensions
if (result.score?.dimensions) {
  const dims = result.score.dimensions;
  const computed = Object.values(dims).reduce((s, d) => s + (d.score || 0), 0);
  result.score.total = computed;
  // Re-derive action from total
  const actionMap = [[85,'STRONG ADD'],[70,'ADD'],[55,'STRONG HOLD'],[40,'HOLD'],[30,'WATCH'],[15,'TRIM'],[0,'EXIT']];
  for (const [min, act] of actionMap) {
    if (computed >= min) { result.score.action = act; break; }
  }
  const cssMap = { 'STRONG ADD':'strong-add','ADD':'add','STRONG HOLD':'strong-hold','HOLD':'hold','WATCH':'watch','TRIM':'trim','EXIT':'exit' };
  result.score.action_css = cssMap[result.score.action] || 'hold';
  const labelMap = { 'STRONG ADD':'Strong Candidate','ADD':'Good Candidate','STRONG HOLD':'Hold — Solid Business','HOLD':'Neutral — Monitor','WATCH':'Weak — Watch','TRIM':'Reducing Recommended','EXIT':'Avoid / Exit' };
  result.score.score_label = labelMap[result.score.action] || '';
}

// ─── Step 7: Write output ─────────────────────────────────────────────────────

const outPath = join(REPORTS_DIR, TICKER, `${TICKER}-${TODAY}.json`);
const tmpPath = outPath + '.tmp';

writeFileSync(tmpPath, JSON.stringify(result, null, 2), 'utf8');
// Atomic rename
try { renameSync(tmpPath, outPath); } catch { writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8'); }

// Symlink latest.json
try {
  if (existsSync(latestPath)) unlinkSync(latestPath);
  symlinkSync(`${TICKER}-${TODAY}.json`, latestPath);
} catch {
  writeFileSync(latestPath, JSON.stringify(result, null, 2), 'utf8');
}

// Cache metadata
const cacheEntry = {
  ticker: resolved.tradingsymbol,
  company: resolved.company_name,
  generated_at: TODAY,
  expires_at: new Date(Date.now() + CACHE_TTL_DAYS * 86400000).toISOString().slice(0, 10),
  ttl_days: CACHE_TTL_DAYS,
  score: result.score.total,
  action: result.score.action,
  score_breakdown: Object.fromEntries(
    Object.entries(result.score.dimensions || {}).map(([k, v]) => [k, v.score])
  ),
  data_path: outPath,
};
writeFileSync(join(CACHE_DIR, `${TICKER}-${TODAY}.json`), JSON.stringify(cacheEntry, null, 2));

// ─── Step 8: Eval — verify required fields present ───────────────────────────

const REQUIRED_PATHS = [
  ['score', 'total'], ['score', 'action'], ['score', 'dimensions'],
  ['earnings', 'quarters'],
  ['concall', 'sections', 'strategic_updates', 'points'],
  ['concall', 'sections', 'guidance_outlook'],
  ['concall', 'sections', 'risk_analysis', 'points'],
  ['forensics', 'pl_3year'],
  ['competitive', 'peers'],
  ['competitive', 'moat_radar'],
  ['sector', 'growth_drivers'],
  ['management_integrity', 'quarters'],
  ['verdict', 'bull_case'],
  ['verdict', 'key_monitorable'],
  ['triggers'],
];

const missing = [];
for (const path of REQUIRED_PATHS) {
  let node = result;
  for (const key of path) {
    node = node?.[key];
    if (node === undefined || node === null) { missing.push(path.join('.')); break; }
  }
  if (Array.isArray(node) && node.length === 0) missing.push(path.join('.') + ' (empty array)');
}

if (missing.length > 0) {
  console.error(`[analyse] WARNING: ${missing.length} fields missing/empty: ${missing.join(', ')}`);
}

// ─── Done ─────────────────────────────────────────────────────────────────────

const fileSize = Buffer.byteLength(JSON.stringify(result), 'utf8');
console.log(JSON.stringify({
  status: 'ok',
  ticker: resolved.tradingsymbol,
  company: resolved.company_name,
  score: result.score.total,
  action: result.score.action,
  stage,
  rsi14,
  path: outPath,
  size_bytes: fileSize,
  missing_fields: missing,
}));
