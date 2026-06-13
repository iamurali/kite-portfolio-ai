---
name: stock-researcher
subcommand: stock
description: >
  Module 3: On-demand institutional deep-dive on any NSE/BSE stock. 8 analysis sections:
  quarterly earnings, concall intelligence, financial forensics, competitive landscape,
  sector intelligence, growth triggers, management integrity, and final verdict with
  bull/base/bear cases. Outputs JSON to ~/.portfolio/stock-reports/<TICKER>/latest.json.
  Use when the user says "/stock-researcher:stock <TICKER>", "deep dive on TICKER",
  "analyse TICKER", "research TICKER fundamentals", or "stock analysis TICKER".
  Does NOT require holdings. Resolves ticker via Kite search_instruments.
---

# Stock Researcher — Module 3: Stock Deep-Dive

**Invocation:** `/stock-researcher:stock <TICKER>` or "deep dive on TICKER"

## MCP Tools used
- `mcp__kite__search_instruments`
- `mcp__kite__get_ltp`
- `mcp__kite__get_historical_data`
- `mcp__kite__login` (on session error)

## Prompt Library Reference
See `../../docs/prompt-library-index.md` for framing instructions and search query patterns for each section.

## Output Schema Reference
See `../../docs/sample-stock-data.json` for the EXACT JSON structure this skill must produce.
The report.html renderer reads these exact field names — any deviation causes "No data available" sections.

---

## Step 0 — Cache Check + Ticker Resolution

**Check cache first:**
```bash
ls ~/.portfolio/cache/<TICKER>-*.json 2>/dev/null | head -1
```
If a file exists and was modified within the last 7 days → return cached result immediately (skip Steps 1–4).

**If no fresh cache, resolve the ticker:**
```
mcp__kite__search_instruments(query="<TICKER>", exchange="NSE")
```
If no NSE result: try `exchange="BSE"`.
If still not found: show "Symbol not found. Try the full NSE/BSE symbol e.g. HDFCBANK, TATAMOTORS" and stop.

```
mcp__kite__get_ltp(instruments=["<EXCHANGE>:<TRADINGSYMBOL>"])
```
Extract: `instrument_token`, `tradingsymbol`, `company_name` (from name field), `exchange`, `last_price`, `change` (day change %)

---

## Step 1 — Fetch Historical Candles (2 years)

```
mcp__kite__get_historical_data(
  instrument_token=<token>,
  from_date="<TODAY minus 730 days> 00:00:00",
  to_date="<TODAY> 23:59:59",
  interval="day"
)
```

From the candle array, compute immediately:
- `close_today` = last candle close
- `close_30d`, `close_90d`, `close_180d`, `close_365d` = closes ~30/90/180/252 trading days back
- `ma50` = avg of last 50 closes
- `ma150` = avg of last 150 closes
- `ma200` = avg of last 200 closes (or all available if <200 days)
- `slope200` = ma200[today] − ma200[30 days ago]
- `high_1y` = max close over last 252 trading days
- `low_1y` = min close over last 252 trading days
- `high_2y` = max close over full 2-year dataset
- `volume_avg_30d` = avg volume last 30 candles
- `volume_today` = last candle volume
- `closes_14d` = last 14 closing prices (for RSI)

### Compute technicals locally (deterministic — do not let LLM score these):

**Stage classification:**
```
if close_today > ma50 > ma150 > ma200 AND slope200 > 0:
  stage = "Stage 2B"   (if all MAs aligned 20+ candles)
  stage = "Stage 2A"   (if ma50 rose above ma200 within last 20 candles)
elif close_today > ma200 AND slope200 > 0:
  stage = "Stage 2A"
elif close_today > ma200 AND abs(slope200) < 0.5:
  stage = "Stage 1"
elif close_today < ma200 AND slope200 > 0:
  stage = "Stage 3"
else:
  stage = "Stage 4"
```

**RSI-14:**
```
gains = sum of positive closes[i]-closes[i-1] over last 13 diffs
losses = sum of abs(negative diffs) over last 13 diffs
avg_gain = gains/13, avg_loss = losses/13
rsi14 = 100 − 100/(1 + avg_gain/avg_loss)
```

**Stage score (FIXED — H dimension):**
```
Stage 2B→30, Stage 2A→25, Stage 1→15, Stage 3→8, Stage 4→0
```

**Other derived values:**
```
pct_from_high = (close_today − high_1y) / high_1y × 100   ← always ≤ 0
pct_above_200ma = (close_today − ma200) / ma200 × 100
volume_ratio = volume_today / volume_avg_30d
```

---

## Step 2 — Parallel Web Searches (5 searches, fire simultaneously)

```
WebSearch 1: "<company_name> quarterly results Q4 FY26 Q3 FY26 revenue PAT EBITDA EPS site:screener.in OR site:moneycontrol.com OR site:trendlyne.com")

WebSearch 2: "<company_name> concall transcript Q4 FY26 management commentary guidance site:trendlyne.com OR site:screener.in")

WebSearch 3: "<company_name> annual report 5 year financials balance sheet cash flow ROE ROCE site:screener.in")

WebSearch 4: "<tradingsymbol> peers comparison P/E EV/EBITDA revenue margins competitors site:tickertape.in OR site:screener.in")

WebSearch 5: "<sector> India sector outlook 2025 2026 growth drivers government policy site:economictimes.indiatimes.com OR site:businessstandard.com OR site:livemint.com")
```

**IMPORTANT:** Compress each search result to <400 words. Do NOT use raw search snippets in the analysis prompt. Summarise first.

---

## Step 3 — Full Analysis (ONE inference — exact JSON output)

Using all data gathered above, produce the complete analysis JSON in ONE response.

The output MUST match the schema in `../../docs/sample-stock-data.json` **exactly** — same field names, same nesting, same array shapes. The `report.html` renderer is schema-strict: missing or renamed fields cause "No data available" sections.

**Critical constraints:**
- `score.dimensions.technical_stage.score` MUST equal the deterministically computed H_score (Stage 2B=30, 2A=25, 1=15, 3=8, 4=0) — not LLM-scored
- `score.total` MUST equal sum of all 8 dimension scores
- `score.action` MUST follow the lookup table: 85-100=STRONG ADD, 70-84=ADD, 55-69=STRONG HOLD, 40-54=HOLD, 30-39=WATCH, 15-29=TRIM, 0-14=EXIT
- All 12 top-level keys must be present: `meta`, `price`, `technical`, `score`, `earnings`, `concall`, `forensics`, `competitive`, `sector`, `triggers`, `management_integrity`, `verdict`
- `concall.sections` must have all 6 sub-keys: `strategic_updates`, `guidance_outlook`, `risk_analysis`, `qa_summary`, `earning_triggers`, `management_consistency`

**Scoring rubric (LLM scores A–G only; H is fixed):**

A. Earnings Growth (0-10): 4Q PAT YoY all accelerating→10, 3of4→8, 2of4→5, flat→3, 2+Q decline→1, 3+Q→0
B. Mgmt Credibility (0-10): ⭐⭐⭐⭐⭐→10, ⭐⭐⭐⭐→8, ⭐⭐⭐→5, ⭐⭐→2, ⭐→0
C. Moat (0-10): Strong (pricing + switching + gaining share)→9-10, Moderate→5-8, Weak→1-4, None→0
D. Balance Sheet (0-10): D/E<0.3+FCF++ROE>20%→10, D/E<0.5+FCF+→8, D/E<1+FCF+→6, D/E<1 FCF-→4, D/E>1→2, D/E>2→0
E. Sector Tailwind (0-10): Strong PLI/policy+growing→9-10, Moderate→6-8, Neutral→4-5, Headwind→1-3, Structural decline→0
F. Competitive Position (0-10): Gaining share+pricing power→9-10, Stable→6-8, Slightly losing→3-5, Losing+margin squeeze→1-2, Disrupted→0
G. Valuation (0-10): >40% below 3Y avg+peers→9-10, At avg→7-8, 0-20% above→5-6, 20-40% above→3-4, >40% above→0-2
H. Stage (0-30): FIXED = <computed_h_score>

**SME override:** If tradingsymbol ends in `-SM`, cap action at TRIM regardless of total score.

**Produce the following JSON (adapt field values to actual data):**

```json
{
  "meta": {
    "ticker": "<TRADINGSYMBOL>",
    "company": "<COMPANY_NAME>",
    "exchange": "<NSE or BSE>",
    "sector": "<sector>",
    "generated_at": "<YYYY-MM-DD>",
    "ttl_days": 7,
    "schema_version": "3.0",
    "workflow_version": "v3-inline"
  },
  "price": {
    "last_price": <number>,
    "day_change_pct": <number>
  },
  "technical": {
    "stage": "<Stage 2B|2A|1|3|4>",
    "rsi14": <number>,
    "pct_from_high": <number>,
    "pct_above_200ma": <number>,
    "volume_ratio": <number>,
    "ma50": <number>,
    "ma150": <number>,
    "ma200": <number>,
    "high_1y": <number>,
    "low_1y": <number>
  },
  "score": {
    "total": <sum of all 8 dims>,
    "action": "<STRONG ADD|ADD|STRONG HOLD|HOLD|WATCH|TRIM|EXIT>",
    "action_css": "<strong-add|add|strong-hold|hold|watch|trim|exit>",
    "score_label": "<Strong Candidate|Good Candidate|Hold — Solid Business|Neutral — Monitor|Weak — Watch|Reducing Recommended|Avoid / Exit>",
    "dimensions": {
      "earnings_growth":   { "score": <0-10>,  "max": 10, "label": "Earnings Growth",     "color": "<green|amber|red>" },
      "mgmt_credibility":  { "score": <0-10>,  "max": 10, "label": "Mgmt Credibility",    "color": "<green|amber|red>" },
      "moat":              { "score": <0-10>,  "max": 10, "label": "Moat Strength",        "color": "<green|amber|red>" },
      "balance_sheet":     { "score": <0-10>,  "max": 10, "label": "Balance Sheet",        "color": "<green|amber|red>" },
      "sector_tailwind":   { "score": <0-10>,  "max": 10, "label": "Sector Tailwind",      "color": "<green|amber|red>" },
      "competitive":       { "score": <0-10>,  "max": 10, "label": "Competitive Position", "color": "<green|amber|red>" },
      "valuation":         { "score": <0-10>,  "max": 10, "label": "Valuation",            "color": "<green|amber|red>" },
      "technical_stage":   { "score": <H_SCORE>, "max": 30, "label": "Technical Stage (<stage>)", "color": "<green|amber|red>" }
    }
  },
  "earnings": {
    "quarters": [
      { "label": "Q4FY26", "revenue_cr": <n>, "revenue_est_cr": null, "ebitda_cr": <n>, "pat_cr": <n>, "pat_est_cr": null, "eps": <n>, "yoy_rev_pct": <n>, "yoy_pat_pct": <n>, "beat_miss_rev": "<BEAT|MISS|IN-LINE|null>", "beat_miss_pat": "<BEAT|MISS|IN-LINE|null>", "market_reaction_pct": <n|null>, "analyst_sentiment": "<positive|neutral|negative>" },
      { "label": "Q3FY26", "revenue_cr": <n>, "revenue_est_cr": null, "ebitda_cr": <n>, "pat_cr": <n>, "pat_est_cr": null, "eps": <n>, "yoy_rev_pct": <n>, "yoy_pat_pct": <n>, "beat_miss_rev": null, "beat_miss_pat": null, "market_reaction_pct": null, "analyst_sentiment": "neutral" },
      { "label": "Q2FY26", "revenue_cr": <n>, "revenue_est_cr": null, "ebitda_cr": <n>, "pat_cr": <n>, "pat_est_cr": null, "eps": <n>, "yoy_rev_pct": <n>, "yoy_pat_pct": <n>, "beat_miss_rev": null, "beat_miss_pat": null, "market_reaction_pct": null, "analyst_sentiment": "neutral" },
      { "label": "Q1FY26", "revenue_cr": <n>, "revenue_est_cr": null, "ebitda_cr": <n>, "pat_cr": <n>, "pat_est_cr": null, "eps": <n>, "yoy_rev_pct": <n>, "yoy_pat_pct": <n>, "beat_miss_rev": null, "beat_miss_pat": null, "market_reaction_pct": null, "analyst_sentiment": "neutral" }
    ],
    "ttm_pe": <n|null>, "sector_pe_avg": <n|null>, "de_ratio": <n|null>,
    "roe": <n|null>, "roce": <n|null>, "fcf_positive": <true|false>,
    "earnings_trend": "<accelerating|stable|decelerating>",
    "sector_rev_growth_avg": <n|null>
  },
  "concall": {
    "quarter": "<Q4FY26>", "source_url": "<url|null>",
    "attendees": ["<name>"],
    "overall_sentiment": "<BULLISH|NEUTRAL|CAUTIOUS|BEARISH>",
    "summary": "<2-3 sentence summary>",
    "analyst_pulse": "<1 sentence analyst reaction>",
    "sections": {
      "strategic_updates": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Strategic Updates",
        "points": [{ "text": "<point>", "polarity": "<positive|negative|neutral>" }]
      },
      "guidance_outlook": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Guidance Outlook",
        "near_term":   [{ "text": "<point>", "polarity": "<positive|negative|neutral>", "timeline": "<Q1FY27>" }],
        "medium_term": [{ "text": "<point>", "polarity": "<positive|negative|neutral>", "timeline": "<12M>" }],
        "long_term":   [{ "text": "<point>", "polarity": "<positive|negative|neutral>", "timeline": "<2-3Y>" }]
      },
      "risk_analysis": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Risk Analysis",
        "points": [{ "text": "<risk>", "polarity": "negative" }]
      },
      "qa_summary": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Q&A Summary",
        "exchanges": [{ "q": "<question>", "a": "<answer>", "assessment": "<DIRECT|EVASIVE|PARTIAL — reason>", "polarity": "<positive|negative|neutral>" }]
      },
      "earning_triggers": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Earning Triggers",
        "points": [{ "text": "<trigger>", "polarity": "positive", "timeline": "<timeline>", "probability": "<HIGH|MEDIUM|LOW>" }]
      },
      "management_consistency": {
        "sentiment": "<POSITIVE|NEGATIVE|NEUTRAL|MIXED>",
        "heading": "Management Consistency",
        "promises": [{ "quarter": "<Q>", "promise": "<promise>", "delivered": "<BEAT|MISSED|IN-LINE|PENDING>", "actual": "<outcome>", "red_flags": [], "green_flags": [] }],
        "follow_up_questions": ["<q1>", "<q2>", "<q3>"]
      }
    }
  },
  "forensics": {
    "pl_3year": [
      { "year": "FY24", "revenue_cr": <n>, "ebitda_margin_pct": <n>, "pat_cr": <n>, "roe_pct": <n|null> },
      { "year": "FY25", "revenue_cr": <n>, "ebitda_margin_pct": <n>, "pat_cr": <n>, "roe_pct": <n|null> },
      { "year": "FY26", "revenue_cr": <n>, "ebitda_margin_pct": <n>, "pat_cr": <n>, "roe_pct": <n|null> }
    ],
    "cashflow_3year": [
      { "year": "FY24", "cfo_cr": <n>, "fcf_cr": <n>, "cfo_pat_ratio": <n|null> },
      { "year": "FY25", "cfo_cr": <n>, "fcf_cr": <n>, "cfo_pat_ratio": <n|null> },
      { "year": "FY26", "cfo_cr": <n>, "fcf_cr": <n>, "cfo_pat_ratio": <n|null> }
    ],
    "balance_sheet": {
      "current_ratio": <n|null>, "de_ratio": <n|null>, "cash_cr": <n|null>,
      "total_debt_cr": <n|null>, "working_capital_days": <n|null>,
      "intangibles_flag": false, "intangibles_note": null
    },
    "red_flags": [
      { "category": "<Revenue Quality|Cash Flow|Balance Sheet|Business Momentum|Governance>", "rating": "<GREEN|AMBER|RED>", "finding": "<finding>", "watchlist": "<monitor>" }
    ],
    "ratios_12": [
      { "name": "Gross Margin",      "value": "<X%>",     "trend": "<improving|stable|deteriorating>" },
      { "name": "EBITDA Margin",     "value": "<X%>",     "trend": "<improving|stable|deteriorating>" },
      { "name": "PAT Margin",        "value": "<X%>",     "trend": "<improving|stable|deteriorating>" },
      { "name": "ROE",               "value": "<X%>",     "trend": "<improving|stable|deteriorating>" },
      { "name": "ROCE",              "value": "<X%>",     "trend": "<improving|stable|deteriorating>" },
      { "name": "Current Ratio",     "value": "<X.Xx>",   "trend": "<improving|stable|deteriorating>" },
      { "name": "Quick Ratio",       "value": "<X.Xx>",   "trend": "<improving|stable|deteriorating>" },
      { "name": "D/E Ratio",         "value": "<X.Xx>",   "trend": "<improving|stable|deteriorating>" },
      { "name": "Interest Coverage", "value": "<X.Xx>",   "trend": "<improving|stable|deteriorating>" },
      { "name": "Asset Turnover",    "value": "<X.Xx>",   "trend": "<improving|stable|deteriorating>" },
      { "name": "Receivables Days",  "value": "<X days>", "trend": "<improving|stable|deteriorating>" },
      { "name": "Inventory Days",    "value": "<X days>", "trend": "<improving|stable|deteriorating>" }
    ],
    "forensics_verdict": "<Financially Healthy|Watch|Weak — 1-line summary>"
  },
  "competitive": {
    "industry_overview": "<1-2 sentences>",
    "company_positioning": "<company position>",
    "player_type": "<Leader|Challenger|Niche|Laggard>",
    "position_trend": "<Gaining|Stable|Losing>",
    "peers": [
      { "name": "<Company>", "market_cap_cr": <n|null>, "revenue_cr": <n|null>, "pat_cr": <n|null>, "ebitda_margin_pct": <n|null>, "pe": <n|null>, "ev_revenue": <n|null>, "roe_pct": <n|null>, "market_share": "<leader|challenger|niche>" }
    ],
    "moat_radar": [
      { "dimension": "Pricing Power",         "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Brand Strength",         "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Distribution Network",   "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Scale Advantage",        "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Technology / R&D",       "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Switching Costs",        "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Regulatory Advantage",   "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Cost Leadership",        "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Network Effects",        "rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" },
      { "dimension": "Manufacturing Capability","rating": <0-3>, "max": 3, "label": "<None|Weak|Moderate|Strong>", "note": "<brief>" }
    ],
    "moat_overall": "<Narrow|Wide|None>",
    "moat_score": <sum of moat ratings>,
    "moat_max": 30
  },
  "sector": {
    "name": "<sector name>",
    "overview": "<2-3 sentences>",
    "growth_drivers": [
      { "driver": "<driver>", "type": "<Structural|Cyclical|Policy>", "impact": "<High|Medium|Low>", "timeline": "<timeline>", "beneficiary": "<Direct|Indirect>" }
    ],
    "risks": ["<risk 1>", "<risk 2>"],
    "bull_triggers": ["<positive catalyst>"],
    "bear_triggers": ["<negative risk>"],
    "regulatory_direction": "<Favorable|Neutral|Restrictive>",
    "sector_attractiveness": "<Highly Attractive|Attractive|Neutral|Unattractive>"
  },
  "triggers": [
    { "name": "<trigger>", "type": "<Operational|Strategic|Regulatory|Macro|Product>", "revenue_impact": "<impact>", "timeline": "<timeline>", "probability": "<HIGH|MEDIUM|LOW>", "operating_leverage_note": "<note>" }
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
      { "quarter": "<Q>", "promise": "<promise>", "delivered": "<BEAT|MISSED|IN-LINE|PENDING>", "actual": "<outcome>", "red_flags": [], "green_flags": [] }
    ]
  },
  "verdict": {
    "valuation_check": "<P/E vs history and peers — 2-3 sentences>",
    "valuation_verdict": "<Overvalued|Fairly Valued|Undervalued>",
    "fair_value_range": "<₹X - ₹Y>",
    "bull_case": { "probability_pct": <n>, "target": <n>, "horizon": "<12-18 months>", "assumptions": ["<a1>", "<a2>", "<a3>"] },
    "base_case": { "probability_pct": <n>, "target": <n>, "horizon": "<12-18 months>", "assumptions": ["<a1>", "<a2>", "<a3>"] },
    "bear_case": { "probability_pct": <n>, "target": <n>, "horizon": "<12-18 months>", "assumptions": ["<a1>", "<a2>"] },
    "key_monitorable": "<single most important metric or event to watch>",
    "action": "<same as score.action>",
    "action_rationale": "<2-3 sentence rationale>",
    "entry_zone": "<₹X - ₹Y or CMP>",
    "support": <number>,
    "resistance": <number>,
    "stop_loss": <number>
  }
}
```

---

## Step 4 — Eval Gate: Validate + Retry

After producing the JSON, check these 14 required field paths:
1. `score.total` (0-100)
2. `score.action` (valid enum)
3. `score.dimensions` (all 8 keys present)
4. `earnings.quarters` (non-empty array)
5. `concall.sections.strategic_updates.points` (non-empty)
6. `concall.sections.guidance_outlook` (present)
7. `concall.sections.risk_analysis.points` (non-empty)
8. `forensics.pl_3year` (non-empty)
9. `competitive.peers` (non-empty)
10. `competitive.moat_radar` (10 items)
11. `sector.growth_drivers` (non-empty)
12. `management_integrity.quarters` (non-empty)
13. `verdict.bull_case` (present)
14. `verdict.key_monitorable` (non-empty string)

**If more than 3 of these are missing/empty:** produce the JSON again with this instruction prepended:
"RETRY: The following required fields were null or empty in the previous response. You MUST populate them with real data from the search results: [list missing fields]. Do not use null or empty arrays for these."

Maximum 2 attempts total.

---

## Step 5 — Write Output Files

```bash
mkdir -p ~/.portfolio/stock-reports/<TICKER> ~/.portfolio/cache

# Atomic write
cat > ~/.portfolio/stock-reports/<TICKER>/<TICKER>-<YYYY-MM-DD>.json.tmp << 'EOF'
<JSON from Step 3>
EOF
mv ~/.portfolio/stock-reports/<TICKER>/<TICKER>-<YYYY-MM-DD>.json.tmp \
   ~/.portfolio/stock-reports/<TICKER>/<TICKER>-<YYYY-MM-DD>.json

# Symlink latest
ln -sf <TICKER>-<YYYY-MM-DD>.json ~/.portfolio/stock-reports/<TICKER>/latest.json

# Cache metadata (lightweight — no html_fragment)
cat > ~/.portfolio/cache/<TICKER>-<YYYY-MM-DD>.json << 'EOF'
{
  "ticker": "<TICKER>",
  "company": "<COMPANY>",
  "generated_at": "<YYYY-MM-DD>",
  "expires_at": "<YYYY-MM-DD + 7 days>",
  "ttl_days": 7,
  "score": <total>,
  "action": "<action>",
  "score_breakdown": { <dim scores> },
  "data_path": "~/.portfolio/stock-reports/<TICKER>/<TICKER>-<YYYY-MM-DD>.json"
}
EOF
```

---

## Step 6 — Chat Summary

```
Stock: <TICKER> — <COMPANY NAME>
Score: <N>/100 → <ACTION>
Stage: <stage> | RSI: <rsi14> | <pct_from_high>% from 52W high | <pct_above_200ma>% above 200MA
Key insight: <1 sentence from verdict.action_rationale>

Report: open report/report.html → Tab 5 → type <TICKER>
(Report data at ~/.portfolio/stock-reports/<TICKER>/latest.json)
```

---

## Speed & Context Rules

1. **All WebSearches fire in ONE parallel batch** (Step 2) — do not run them sequentially.
2. **Candle computation is inline** — extract all MA/RSI values in Step 1 before moving to Step 2.
3. **Single LLM inference** — Steps 3+4 are one generation call with the full schema template embedded. No sub-agents.
4. **Cache hit path** — if fresh cache exists, skip Steps 1–4 entirely (~5 seconds).
5. **Raw search results never appear in the final JSON** — summarise before embedding in analysis.
