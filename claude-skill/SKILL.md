---
name: kite-portfolio
description: >
  Analyses a Zerodha Kite stock portfolio OR performs on-demand stock deep-dive.
  Main entry for kite-portfolio. Use when the user says /portfolio or wants to choose
  which analysis to run. For direct sub-skill invocations use /kite-portfolio:performance,
  /kite-portfolio:stage, /kite-portfolio:full, or /kite-portfolio:stock <TICKER>.
---

# Kite Portfolio Analysis Skill

## MCP Tools used by this skill
- `mcp__kite__login`
- `mcp__kite__get_profile`
- `mcp__kite__get_holdings`
- `mcp__kite__get_historical_data`
- `mcp__kite__search_instruments` (stock-analyser only)
- `mcp__kite__get_ltp` (stock-analyser only)

## Modules
Three modules — choose based on user intent:

1. **Module 1 — Performance vs Benchmarks** → `performance.md`
2. **Module 2 — Stage & Earnings Analysis (Fundamental Scoring)** → `stage-analysis.md`
3. **Module 3 — Stock Analyser (on-demand deep-dive)** → `stock-analyser.md`

For **full portfolio review**: Module 1 writes HTML Parts 1–2, Module 2 appends Parts 3–4 + Tab 5 shell.

For **`/kite-portfolio:stock <TICKER>`**: Run Module 3 standalone. Does NOT require holdings data.

---

## Module Routing — Read FIRST

**If the invocation is `/kite-portfolio:stock <TICKER>` or any "analyse TICKER / deep dive on TICKER / research TICKER" request:**
→ Module 3 V3. MCP calls happen HERE (in this session). `analyse.mjs` only handles the web-research + JSON-schema Claude call — it has no MCP access.

### Step A — Cache check
```bash
ls ~/.portfolio/cache/<TICKER>-*.json 2>/dev/null | head -1
```
If a file exists and is <7 days old (and no `--refresh`): print cache hit, open browser, done.

### Step B — Resolve ticker + fetch candles (THIS session, via MCP)
```
mcp__kite__search_instruments(query="<TICKER>", exchange="NSE")   # try BSE if not found
mcp__kite__get_ltp(instruments=["<EXCHANGE>:<TRADINGSYMBOL>"])
mcp__kite__get_historical_data(instrument_token=<token>, from_date="<2Y ago> 00:00:00", to_date="<TODAY> 23:59:59", interval="day")
```

### Step C — Compute technicals inline (Python via Bash)
Run this Python snippet to compute MAs, RSI, stage, and derived metrics from the candle data saved to a temp file:

```bash
python3 << 'PYEOF'
import json, sys
candles = json.load(open('/tmp/<TICKER>-candles.json'))
closes  = [c['close'] for c in candles]
volumes = [c['volume'] for c in candles]
n = len(closes)

def ma(d): sl = closes[-d:] if n>=d else closes; return round(sum(sl)/len(sl),2)
ma50,ma150,ma200 = ma(50),ma(150),ma(200)
closes30ago = closes[:-30] if n>30 else closes
ma200_30ago = round(sum(closes30ago[-200:])/min(200,len(closes30ago)),2)
slope200 = round(ma200-ma200_30ago,2)

close_today = closes[-1]
high_1y = max(closes[-252:] if n>=252 else closes)
low_1y  = min(closes[-252:] if n>=252 else closes)

def rsi14(cl):
    if len(cl)<15: return 50
    g=l=0
    for i in range(len(cl)-13,len(cl)):
        d=cl[i]-cl[i-1]
        if d>0: g+=d
        else: l+=abs(d)
    ag,al=g/13,l/13
    return 100 if al==0 else round(100-100/(1+ag/al))

rsi = rsi14(closes)
vol_avg_30d = round(sum(volumes[-30:])/30)

if ma50>ma150>ma200 and close_today>ma50 and slope200>0: stage='Stage 2B'
elif close_today>ma200 and slope200>0: stage='Stage 2A'
elif close_today>ma200 and abs(slope200)<0.5: stage='Stage 1'
elif close_today<ma200 and slope200>0: stage='Stage 3'
else: stage='Stage 4'

h = {'Stage 2B':30,'Stage 2A':25,'Stage 1':15,'Stage 3':8,'Stage 4':0}[stage]
pct_from_high = round((close_today-high_1y)/high_1y*100,2)
pct_above_200 = round((close_today-ma200)/ma200*100,2)
vol_ratio = round(volumes[-1]/vol_avg_30d,2) if vol_avg_30d else 1

print(json.dumps({"stage":stage,"rsi14":rsi,"h_score":h,"ma50":ma50,"ma150":ma150,"ma200":ma200,"slope200":slope200,"close_today":close_today,"high_1y":high_1y,"low_1y":low_1y,"pct_from_high":pct_from_high,"pct_above_200ma":pct_above_200,"volume_ratio":vol_ratio,"closes_14d":closes[-14:],"volume_avg_30d":vol_avg_30d,"volume_today":volumes[-1]}))
PYEOF
```

### Step D — Run web research + scoring as a subagent (PRIMARY PATH)

**Do NOT use `analyse.mjs` or `claude --print` subprocess — they time out. Always use Agent tool directly.**

Spawn a subagent with this prompt (fill in the actual technical values from Step C):

```
You are a stock analyst. Perform a comprehensive deep-dive on <COMPANY NAME> (NSE: <TICKER>).
Return ONLY a valid JSON object in the EXACT schema below — no markdown, no commentary.

Technical context (do NOT recompute):
- Stage: <stage>, RSI14: <rsi14>, MA50: <ma50>, MA150: <ma150>, MA200: <ma200>
- Close: <close_today> | 52W High: <high_1y> | 52W Low: <low_1y>
- % from 52W high: <pct_from_high>% | % above 200MA: <pct_above_200ma>%
- Slope200: <slope200> | Volume ratio: <volume_ratio>x

Search these sources only (WebSearch): screener.in, trendlyne.com, tickertape.in,
moneycontrol.com, economictimes.indiatimes.com, businessstandard.com, livemint.com,
bseindia.com, nseindia.com, valueresearchonline.com

Run these 6 WebSearches in parallel:
1. "<TICKER> NSE quarterly results PAT revenue FY25 FY26 screener.in"
2. "<TICKER> Q4 FY26 concall management commentary order book"
3. "<TICKER> moat competitive advantage business model"
4. "<TICKER> balance sheet debt FCF ROE FY25 FY26"
5. "<TICKER> sector outlook 2025 2026"
6. "<TICKER> valuation PE ratio peers comparison"

SCORING RUBRIC (0–100):
A. Earnings Growth (0–10): accelerating PAT YoY = 9-10, stable growth = 6-8, flat = 4-5, declining = 0-3
B. Management Credibility (0–10): concall quality, guidance accuracy, promoter holding
C. Moat Strength (0–10): pricing power, switching costs, IP
D. Balance Sheet (0–10): D/E, FCF, ROE >15%
E. Sector Tailwind (0–10): policy, cycle
F. Competitive Position (0–10): market share trend
G. Valuation (0–10): P/E vs 3Y avg — cheap=8-10, fair=5-7, expensive=0-4
H. Technical Stage (0–30): Stage 2B=30, 2A=25, 1=15, 3=8, 4=0 → USE <h_score> (already computed)

Action: 85-100=STRONG ADD, 70-84=ADD, 55-69=STRONG HOLD, 40-54=HOLD, 30-39=WATCH, 15-29=TRIM, 0-14=EXIT

REQUIRED JSON SCHEMA (schema_version 3.0 — this exact structure, no deviations):
{
  "meta": { "ticker": "...", "company": "...", "exchange": "NSE", "generated_at": "...", "report_date": "YYYY-MM-DD", "expires_at": "...", "ttl_days": 7, "schema_version": "3.0" },
  "price": { "last_price": 0.0, "day_change_pct": null, "high_1y": 0.0, "low_1y": 0.0, "pct_from_high": 0.0 },
  "technical": { "stage": "...", "stage_emoji": "🟢/🟡/🔴", "ma50": 0.0, "ma150": 0.0, "ma200": 0.0, "slope200": 0.0, "pct_above_200ma": 0.0, "rsi_14": 0, "volume_ratio": 0.0 },
  "score": {
    "total": 0, "action": "...", "action_css": "action-add/action-hold/action-trim/action-watch/action-exit",
    "score_label": "...",
    "dimensions": {
      "earnings_growth":  { "score": 0, "max": 10, "label": "Earnings Growth",       "color": "green/amber/red" },
      "mgmt_credibility": { "score": 0, "max": 10, "label": "Management Credibility", "color": "green/amber/red" },
      "moat":             { "score": 0, "max": 10, "label": "Moat Strength",           "color": "green/amber/red" },
      "balance_sheet":    { "score": 0, "max": 10, "label": "Balance Sheet",           "color": "green/amber/red" },
      "sector_tailwind":  { "score": 0, "max": 10, "label": "Sector Tailwind",         "color": "green/amber/red" },
      "competitive":      { "score": 0, "max": 10, "label": "Competitive Position",    "color": "green/amber/red" },
      "valuation":        { "score": 0, "max": 10, "label": "Valuation",               "color": "green/amber/red" },
      "technical_stage":  { "score": 0, "max": 30, "label": "Technical Stage",         "color": "green/amber/red" }
    }
  },
  "earnings": {
    "quarters": [
      { "label": "Q3FY26", "revenue_cr": 0.0, "revenue_est_cr": 0.0, "ebitda_cr": 0.0, "pat_cr": 0.0, "pat_est_cr": 0.0, "eps": 0.0, "yoy_rev_pct": 0.0, "yoy_pat_pct": 0.0, "beat_miss_rev": "BEAT/MISS/IN-LINE", "beat_miss_pat": "BEAT/MISS/IN-LINE", "market_reaction_pct": null, "analyst_sentiment": "POSITIVE/NEUTRAL/NEGATIVE" }
    ],
    "ttm_pe": 0.0, "de_ratio": 0.0, "roe": 0.0, "roce": 0.0, "fcf_positive": false,
    "sector_pe_avg": null, "sector_rev_growth_avg": null, "earnings_trend": "accelerating/stable/decelerating"
  },
  "concall": {
    "quarter": "...", "source_url": "...", "attendees": ["..."],
    "overall_sentiment": "POSITIVE/CAUTIOUSLY_POSITIVE/NEUTRAL/NEGATIVE",
    "summary": "...",
    "analyst_pulse": { "sentiment": "...", "consensus": "...", "target_range_low": null, "target_range_high": null, "analyst_count": null },
    "sections": {
      "strategic_updates":    { "sentiment": "...", "heading": "Strategic Updates",    "points": [{ "text": "...", "polarity": "positive/neutral/negative" }] },
      "guidance_outlook":     { "sentiment": "...", "heading": "Guidance Outlook",     "near_term": [{ "text": "...", "polarity": "...", "timeline": "..." }], "medium_term": [], "long_term": [] },
      "risk_analysis":        { "sentiment": "...", "heading": "Risk Analysis",        "points": [{ "text": "...", "polarity": "negative" }] },
      "qa_summary":           { "sentiment": "...", "heading": "Q&A Summary",          "exchanges": [{ "q": "...", "a": "...", "assessment": "DIRECT/PARTIALLY DIRECT/EVASIVE — reason", "polarity": "..." }] },
      "earning_triggers":     { "sentiment": "...", "heading": "Earning Triggers",     "points": [{ "text": "...", "polarity": "...", "timeline": "...", "probability": "HIGH/MEDIUM/LOW" }] },
      "management_consistency": { "sentiment": "...", "heading": "Management Consistency", "follow_up_questions": ["..."] }
    }
  },
  "management_integrity": {
    "composite_grade": "A/B+/B/C+/C/D", "delivery_rate_pct": 0, "transparency_on_misses": "...", "analyst_treatment": "...", "tone_consistency": "...", "grade_rationale": "...",
    "quarters": [{ "quarter": "...", "promise": "...", "delivered": "BEAT/IN-LINE/MISSED/PENDING", "actual": "...", "red_flags": [], "green_flags": [] }]
  },
  "forensics": {
    "pl_3year": [{ "year": "FY24", "revenue_cr": 0.0, "ebitda_margin_pct": 0.0, "pat_cr": 0.0, "pat_margin_pct": 0.0, "roe_pct": 0.0, "roce_pct": 0.0, "eps": 0.0 }],
    "cashflow_3year": [{ "year": "FY24", "cfo_cr": 0.0, "capex_cr": 0.0, "fcf_cr": 0.0, "cfo_pat_ratio": 0.0 }],
    "balance_sheet": { "current_ratio": 0.0, "de_ratio": 0.0, "cash_cr": 0.0, "total_debt_cr": 0.0, "intangibles_cr": 0.0, "intangibles_flag": false, "intangibles_note": "...", "working_capital_days": 0 },
    "red_flags": [{ "category": "...", "rating": "RED/AMBER/GREEN", "finding": "...", "watchlist": "..." }],
    "ratios_12": [{ "name": "P/E (TTM)", "value": "...", "trend": "improving/stable/deteriorating", "traffic_light": "GREEN/AMBER/RED" }],
    "forensics_verdict": "..."
  },
  "competitive": {
    "industry_overview": "...", "company_positioning": "...", "player_type": "innovation-led/cost-led/scale-led", "position_trend": "GAINING/STABLE/LOSING",
    "peers": [{ "name": "...", "market_cap_cr": 0, "revenue_cr": 0, "pat_cr": 0, "ebitda_margin_pct": 0.0, "pe": 0.0, "ev_revenue": 0.0, "roe_pct": 0.0, "market_share": "..." }],
    "moat_radar": [{ "dimension": "...", "rating": 0, "max": 3, "label": "...", "note": "..." }]
  },
  "triggers": [{ "name": "...", "type": "...", "revenue_impact": "...", "timeline": "...", "probability": "HIGH/MEDIUM/LOW" }],
  "sector": {
    "name": "...",
    "definition": "2-3 sentence plain-English description of what this sector does and why it matters",
    "tam_usd_bn": 0,
    "india_share_pct": 0.0,
    "cagr_pct": 0.0,
    "cycle": "Early Upcycle/Mid Cycle/Late Cycle/Downcycle",
    "cycle_rationale": "...",
    "positive_triggers": [{ "trigger": "...", "timeline": "...", "impact": "HIGH/MEDIUM/LOW" }],
    "negative_triggers": [{ "trigger": "...", "timeline": "...", "impact": "HIGH/MEDIUM/LOW" }],
    "company_position": "...",
    "watchlist_metrics": ["...", "..."],
    "sector_attractiveness": "⭐ Sector Rating: HIGH/MEDIUM/LOW — one line reason"
  },
  "verdict": {
    "score": 0, "action": "...", "key_insight": "...",
    "target_high": 0, "target_low": 0, "upside_pct": 0.0, "downside_pct": 0.0,
    "entry_zone": "₹X–₹Y", "support": 0, "resistance": 0, "stop_loss": 0,
    "key_monitorable": "...",
    "valuation_check": "...",
    "action_rationale": "...",
    "bull_case": { "probability_pct": 0, "target": 0, "assumptions": ["...", "..."] },
    "base_case": { "probability_pct": 0, "target": 0, "assumptions": ["...", "..."] },
    "bear_case": { "probability_pct": 0, "target": 0, "assumptions": ["...", "..."] }
  },
  "references": [
    { "section": "earnings/concall/forensics/sector/competitive/management/technical", "source": "Screener.in", "url": "https://...", "note": "what was extracted" }
  ]
}
```

**IMPORTANT — after writing JSON, add candle data via Python patch (Step E below).**

After the subagent returns, write the JSON then run Step E, then open the report.

### Step E — Patch candles + QoQ into JSON (after subagent returns)

```bash
python3 << 'PYEOF'
import json
import os; base = os.path.expanduser('~/.portfolio/stock-reports')
data = json.load(open(f'{base}/<TICKER>/latest.json'))
# Inject candles from temp file (saved in Step B)
candles = json.load(open('/tmp/<TICKER>-candles.json'))
data['candles'] = [{'date': c['date'][:10], 'open': c['open'], 'high': c['high'], 'low': c['low'], 'close': c['close'], 'volume': c['volume']} for c in candles]
# Compute QoQ for each quarter from sequential data
qs = data['earnings']['quarters']
for i, q in enumerate(qs):
    if i + 1 < len(qs):
        prev = qs[i + 1]
        q['qoq_rev_pct'] = round((q['revenue_cr'] - prev['revenue_cr']) / prev['revenue_cr'] * 100, 1) if prev['revenue_cr'] else None
        q['qoq_pat_pct'] = round((q['pat_cr'] - prev['pat_cr']) / prev['pat_cr'] * 100, 1) if prev['pat_cr'] else None
    else:
        q['qoq_rev_pct'] = None; q['qoq_pat_pct'] = None
json.dump(data, open(f'{base}/<TICKER>/latest.json', 'w'), indent=2)
print(f"Patched. Candles: {len(data['candles'])}")
PYEOF
```

After writing JSON, open both URLs:
```bash
open http://localhost:7891/stock/<TICKER>
open "http://localhost:7891/report/stock/<TICKER>"
```

Report the summary to the user:
```
Stock: <TICKER> — <company>
Score: <N>/100 → <ACTION>
Stage: <stage> | RSI: <rsi>
Opened: http://localhost:7891/report/stock/<TICKER>
```

Do NOT call `get_profile()` or `get_holdings()` for this path.

**If the invocation is `/portfolio`, `/kite-portfolio:performance`, `/kite-portfolio:stage`, or `/kite-portfolio:full`:**
→ Continue to Step 0 below.

---

## Step 0 — ALWAYS FIRST for portfolio analysis (parallel)

```
mcp__kite__get_profile()
mcp__kite__get_holdings()
```

Extract per stock: `tradingsymbol`, `exchange`, `instrument_token`, `quantity`,
`average_price`, `last_price`, `pnl`, `day_change_percentage`

Compute once and reuse:
- `cost_value = quantity × average_price`
- `current_value = quantity × last_price`
- `total_invested = Σ cost_value`
- `total_current = Σ current_value`
- `total_pnl = total_current − total_invested`
- `total_return_pct = (total_pnl / total_invested) × 100`
- `day_change_abs = last_price × (day_change_percentage/100) × quantity` per stock
- `total_day_change = Σ day_change_abs`
- `weight = current_value / total_current` per stock
- **tracking** = True if `weight ≤ 0.002` (0.2%)

**`instrument_token` is read directly from holdings — never call `search_instruments`.**

---

## Benchmark tokens (hardcoded — do not search)
| Index | Token |
|---|---|
| NIFTY 50 | `256265` |
| NIFTY 500 | `268041` |
| NIFTY SMLCAP 250 | `267273` |

---

## Tracking Position Rule
Weight ≤ 0.2% → label `TRACKING`. Never recommend EXIT based on size alone.
Full stage + concall analysis still applies.

---

## Speed Rules (finish in under 5 minutes)

**Rule 1:** Fire ALL historical data calls in ONE parallel batch (all stocks + benchmarks simultaneously).

**Rule 2:** Use `from_date = today minus 365 days` for ALL fetches. Single dataset serves both modules.

**Rule 3:** Fire ALL WebSearches in parallel with historical data fetches.

**Rule 4:** Write HTML in sequential Bash appends (4 parts, max 200 lines each). Never write full HTML in one string.

**Rule 5:** Extract ONLY these values from each candle dataset:
- `close_today`, `close_30d`, `close_90d`, `close_180d`, `close_365d`
- `ma50`, `ma150`, `ma200` (approx if <200 trading days available)
- `slope200` = ma200[today] − ma200[30d ago]
- `high_1y`, `low_1y`
- `pct_from_high` = ((close_today − high_1y) / high_1y) × 100  ← always ≤ 0
- `pct_above_200ma` = ((close_today − ma200) / ma200) × 100

**Rule 6:** Guards:
- Empty holdings → "No holdings found. Check your Kite session." and stop.
- Stock with <50 trading days → skip MA classification; show "INSUFFICIENT DATA".
- Colour palette exhaustion (>11 stocks) → cycle back with 60% opacity.
- Stage 1 and Stage 2 tracked separately — never merge into "uptrend capital".

---

## Authentication
On session error:
```
mcp__kite__login()
```
Show login URL as markdown link. Wait for user confirmation.

---

## Bridge Server Check

Before opening the portfolio report, check if the bridge server is running:
```bash
curl -s --max-time 2 http://localhost:7891/health
```
- If `{"status":"ok",...}` → open report at `http://localhost:7891/report` (same-origin, Tab 5 works)
- If connection refused → open `~/Desktop/portfolio-report-YYYY-MM-DD.html` directly, and note: "Start `cd portfolio-bridge && npm start` to enable Tab 5 Stock Analyser."

**Why the bridge URL?** Browsers block `fetch()` from `file://` to `localhost` (CORS null-origin restriction). The bridge serves the report at `http://localhost:7891/report` so all Tab 5 fetch calls are same-origin and work without any restrictions.

## JSON Output (replaces HTML generation)

Claude no longer generates HTML. Instead, write a single JSON file per run.
The static `report/report.html` (served by the bridge) reads JSON and renders client-side.

**Module 1 only:** writes `~/.portfolio/data/portfolio-YYYY-MM-DD.json` with `meta`, `portfolio` (partial), `benchmarks`, `holdings[].returns`.
**Module 2 only:** writes same file with `meta`, `portfolio` (full), `holdings[].technical/fundamental_score/earnings/concall/action/risk_flags`.
**Full review:** Module 1 writes first, Module 2 reads, merges, and overwrites with complete data.

JSON data path: `~/.portfolio/data/portfolio-YYYY-MM-DD.json`
Latest symlink: `~/.portfolio/data/latest.json`
Schema reference: `docs/portfolio-data-schema.md`

**Token budget:** Module 1 JSON ≤ 1,500 tokens. Module 2 JSON ≤ 2,000 tokens. Total ≤ 3,000 tokens (vs ~12,000 for HTML generation).

After writing JSON, open the report:
```bash
curl -s --max-time 1 http://localhost:7891/health > /dev/null 2>&1 \
  && open http://localhost:7891/report \
  || echo "Bridge not running. Start: cd portfolio-bridge && npm start"
```

---

## Output (chat — brief)
For portfolio report: current value, total P&L %, top 3 action flags (with scores), and
"Report saved to Desktop and opened in your browser."

For `/kite-portfolio:stock`: ticker, score/100, action, 1-line key insight, standalone HTML path.

## Reference files
- `performance.md` — Module 1: benchmark comparison + JSON write (performance fields)
- `stage-analysis.md` — Module 2: stage classification + fundamental scoring + JSON write (stage/concall fields)
- `stock-analyser-v2.js` — Module 3 V2: Claude Workflow script with 6 phases and eval gates (**active**)
- `stock-analyser.md` — Module 3 V1: reference spec only (not executed directly)
- `json-output.md` — JSON write spec, schema examples, merge pattern, token budget
- `docs/portfolio-data-schema.md` — full JSON field reference (master contract)
- `docs/sample-portfolio-data.json` — complete sample JSON for reference
- `docs/prompt-library-index.md` — prompt ID → section mapping for stock-analyser
- `report/report.html` — static report UI (never modify from skill — managed separately)
