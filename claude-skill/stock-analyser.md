---
name: kite-portfolio
subcommand: stock
description: >
  Sub-skill of kite-portfolio. Invoked as "/kite-portfolio:stock <TICKER>" or
  "kite-portfolio:stock <TICKER>". Use when the user says "/kite-portfolio:stock TICKER",
  "analyse ZAGGLE", "analyse NETWEB", "analyse HDFCBANK", "deep dive on TICKER",
  "research TICKER fundamentals", "stock deep dive TICKER", "analyse TICKER stock",
  or when triggered from Tab 5 of the portfolio report via the bridge server.
  Does NOT call get_holdings — resolves ticker via search_instruments only.
  Generates an institutional-grade 8-section analysis: quarterly earnings, concall
  intelligence, financial forensics, competitive landscape, sector intelligence,
  growth triggers, management integrity, and final verdict with bull/base/bear cases.
  Output: standalone HTML to ~/Desktop + bridge result file for Tab 5 injection.
---

# Stock Analyser — Sub-skill of `/portfolio`

**Invocation:** `/kite-portfolio:stock <TICKER>` or "analyse TICKER" or "deep dive on TICKER"

This is Module 3 of the kite-portfolio skill. It does NOT require holdings data.

## MCP Tools used
- `mcp__kite__search_instruments`
- `mcp__kite__get_ltp`
- `mcp__kite__get_historical_data`
- `mcp__kite__login` (on session error)

## Prompt Library Reference
See `docs/prompt-library-index.md` for framing instructions and query patterns for each section.

---

## Step 0 — Resolve Ticker

```
mcp__kite__search_instruments(query="<TICKER>", exchange="NSE")
```

- Extract: `instrument_token`, `tradingsymbol`, `name` (company full name), `exchange`
- If not found on NSE, try BSE: `mcp__kite__search_instruments(query="<TICKER>", exchange="BSE")`
- If still not found: show "Symbol not found. Try the full NSE/BSE symbol e.g. HDFCBANK, TATAMOTORS" and stop.

```
mcp__kite__get_ltp(instruments=["<EXCHANGE>:<TRADINGSYMBOL>"])
```

Extract: `last_price` (current price), `change` (day change %), `open`, `high`, `low`, `close`

**Check cache first** (bridge integration):
- Before running full analysis, check if `~/.portfolio/cache/<TICKER>-*.json` exists and is <7 days old
- If yes AND no `?refresh=true` → return cached result immediately (skip Steps 1–5)
- If no or expired → proceed with full analysis

---

## Step 1 — Parallel Data Fetch (Subagent A)

**SPAWN SUBAGENT A** with the following parallel tasks. Subagent A returns only structured summaries — not raw search results — to keep the main context lean.

```
SUBAGENT A TASKS (all parallel):

Task 1: Historical candles
  mcp__kite__get_historical_data(
    instrument_token=<token>,
    from_date="<TODAY minus 730 days> 00:00:00",
    to_date="<TODAY> 23:59:59",
    interval="day"
  )
  # 2 years for richer MA and trend analysis

Task 2: Quarterly earnings (last 4 quarters)
  WebSearch("[COMPANY] quarterly results Q4 FY26 Q3 FY26 Q2 FY26 Q1 FY26 revenue PAT EBITDA EPS site:screener.in OR site:moneycontrol.com")

Task 3: Concall transcript
  WebSearch("[COMPANY] concall transcript Q4 FY26 management commentary guidance site:trendlyne.com OR site:screener.in")

Task 4: Annual report / 5-year financials
  WebSearch("[COMPANY] annual report 5 year financials balance sheet cash flow ROE ROCE site:screener.in")

Task 5: Sector macro outlook
  WebSearch("[SECTOR] India sector outlook 2025 2026 growth drivers government policy tailwinds headwinds site:economictimes.indiatimes.com OR site:businessstandard.com OR site:livemint.com")

Task 6: Peer comparison
  WebSearch("[COMPANY] vs peers comparison P/E EV/EBITDA revenue margins market share site:tickertape.in OR site:screener.in")

Task 7: Red flags / governance
  WebSearch("[COMPANY] red flags accounting promoter pledge governance concerns site:capitalmind.in OR site:valuepickr.com OR site:thehindu.com")
```

Subagent A returns a **structured JSON summary**:
```json
{
  "candles": {
    "close_today": 0, "close_30d": 0, "close_90d": 0, "close_180d": 0, "close_365d": 0,
    "high_1y": 0, "low_1y": 0, "high_2y": 0,
    "ma50": 0, "ma150": 0, "ma200": 0, "slope200": 0,
    "pct_from_high": 0, "pct_above_200ma": 0,
    "volume_avg_30d": 0, "volume_today": 0
  },
  "earnings": {
    "quarters": [
      {"label": "Q1FY25", "revenue_cr": 0, "ebitda_cr": 0, "pat_cr": 0, "eps": 0, "yoy_rev_pct": 0, "yoy_pat_pct": 0}
    ],
    "ttm_pe": 0, "de_ratio": 0, "roe": 0, "roce": 0, "fcf_positive": true
  },
  "concall_raw": "[Compressed 800-word concall summary]",
  "financials_raw": "[Compressed 5-year financials summary]",
  "sector_raw": "[Compressed 400-word sector outlook]",
  "peers_raw": "[Compressed peer comparison with P/E and metrics]",
  "red_flags_raw": "[Compressed red flag signals found]"
}
```

---

## Step 2 — Compute Technicals (main context, from candle summary)

From Subagent A's candle data:

```
stage = classify_stage(ma50, ma150, ma200, slope200, close_today, last_20_candles)
pct_from_high = ((close_today − high_1y) / high_1y) × 100   ← always ≤ 0
pct_above_200ma = ((close_today − ma200) / ma200) × 100
rsi_14 = compute_rsi(last_14_closes)                         ← from candle data
volume_ratio = volume_today / volume_avg_30d                 ← surge indicator
```

Stage rules (same as stage-analysis.md):
| Condition | Stage |
|---|---|
| close > ma50 > ma150 > ma200 AND slope200 > 0 | Stage 2 ✅ |
| — fresh (last 20 candles) | Stage 2A |
| — 20+ candles consistent | Stage 2B |
| abs(pct_above_200ma) < 5 AND slope ≈ 0 | Stage 1 🔵 |
| choppy crosses of ma200, slope flat/negative | Stage 3 ⚠️ |
| close < ma50 < ma150 < ma200 AND slope < 0 | Stage 4 🔴 |

---

## Step 3 — Fundamental Scoring (main context)

Apply the same 0–100 scoring rubric from `stage-analysis.md` Step 6 using Subagent A's structured data.

**Use subagent A earnings JSON for dimensions A (Earnings), D (Balance Sheet).**
**Use subagent A raw text summaries for dimensions B (Mgmt credibility), C (Moat), E (Sector), F (Competitive), G (Valuation).**

Compute and record:
```
score_earnings   = A (0–10)
score_mgmt       = B (0–10)
score_moat       = C (0–10)
score_bs         = D (0–10)
score_sector     = E (0–10)
score_competitive= F (0–10)
score_valuation  = G (0–10)
score_stage      = H (0–30)
total_score      = sum of all above
action           = lookup from score→action table
```

---

## Step 4 — Deep Analysis (Subagent B)

**SPAWN SUBAGENT B** with Subagent A's structured output + the raw text summaries.

Subagent B runs the 8 analysis sections using framing from `docs/prompt-library-index.md`. It returns compressed HTML fragments for each section (not raw markdown).

```
SUBAGENT B INPUT:
  - Subagent A's full JSON output
  - Company name, ticker, sector
  - Scores from Step 3 (to contextualise analysis)
  - Today's date and fiscal quarter

SUBAGENT B TASKS:

Section A — Quarterly Earnings Analysis
  Use prompt: quarterly-earnings-analysis-engine
  Input: earnings JSON (last 4Q)
  Output: earnings table HTML + beat/miss streak + momentum assessment

Section B — Concall Intelligence
  Use prompt: concall-intelligence-report
  Input: concall_raw from Subagent A + existing 13-section concall card structure from stage-analysis.md
  Output: full 13-section concall card HTML

Section C — Financial Forensics
  Use prompt: 3-statement-financial-forensics + red-flag-detector + financial-health-check-12-ratio-diagnostic
  Input: financials_raw from Subagent A
  Output: 3-year P&L table + balance sheet summary + cash flow quality + 5-category red flag traffic lights + 12-ratio dashboard

Section D — Competitive Landscape & Moat
  Use prompt: competitive-landscape-decoder
  Input: peers_raw from Subagent A
  Output: peer comparison table + moat radar (10 dimensions rated 0–3) + valuation vs peers

Section E — Sector Intelligence
  Use prompt: institutional-sector-intelligence-report
  Input: sector_raw from Subagent A
  Output: sector overview + growth drivers + regulatory context + trigger map (bull/bear)

Section F — Growth Triggers
  Use prompt: mega-stock-research-framework Part 11
  Input: concall_raw + financials_raw
  Output: trigger table (name | type | revenue impact | timeline | probability)

Section G — Management Integrity Score
  Use prompt: mega-stock-research-framework Part 8
  Input: concall_raw (last 12Q if available, else last 4Q)
  Output: 12-quarter promise vs delivery matrix + integrity grade A–D

Section H — Final Verdict
  Use prompt: mega-stock-research-framework Part 12
  Input: all above sections + scores
  Output: valuation check + bull/base/bear cases + key monitorable + action with price levels
```

Subagent B returns: `{ sections: { A: "<html>", B: "<html>", ..., H: "<html>" }, score_refinements: {} }`

---

## Step 5 — Score Refinement + HTML Assembly (main context)

Apply any score refinements from Subagent B (e.g., if forensics found D/E > 2 not visible in scraped data, reduce score_bs).

Assemble the full analysis HTML:

```
score_card_html = render_score_card(total_score, action, all_dimensions)
tab_bar_html    = render_sub_tabs(["EARNINGS","CONCALL","FORENSICS","SECTOR","MOAT","TRIGGERS","VERDICT"])
content_html    = sections A through H from Subagent B
```

---

## Step 6 — Output

### Standalone HTML file
```bash
cat > ~/Desktop/stock-analysis-<TICKER>-<YYYY-MM-DD>.html << 'EOF'
<!DOCTYPE html>
[full HTML — same dark-mode palette as portfolio report — see html-report.md for CSS vars]
[score card + sub-tabs + all 8 sections]
EOF
open ~/Desktop/stock-analysis-<TICKER>-<YYYY-MM-DD>.html
```

### Cache write
```bash
# Write structured cache entry
cat > ~/.portfolio/cache/<TICKER>-<YYYY-MM-DD>.json << 'EOF'
{
  "ticker": "<TICKER>",
  "company": "<COMPANY NAME>",
  "generated_at": "<ISO TIMESTAMP>",
  "expires_at": "<ISO TIMESTAMP + 7 days>",
  "ttl_days": 7,
  "score": <TOTAL_SCORE>,
  "action": "<ACTION>",
  "score_breakdown": { ... },
  "html_fragment": "<COMPRESSED HTML FOR TAB 5 INJECTION>"
}
EOF
```

The `html_fragment` field is a self-contained `<div>` that Tab 5 in the portfolio report can inject directly into the analysis panel.

### Bridge result file (for Tab 5 live injection)
```bash
# Write result for bridge server to pick up
mkdir -p ~/.portfolio/results
cat > ~/.portfolio/results/<TICKER>-<YYYY-MM-DD>.html << 'EOF'
<div class="stock-analyser-result">
  [score card + sub-tabs + all 8 sections — same as standalone but without <html>/<head>/<body> wrapper]
</div>
EOF
```

---

## HTML Template for Standalone Report

Use the same CSS variables and dark-mode palette from `html-report.md`. The standalone report has:

### Header
```html
<nav class="topnav">
  <span class="logo">🔍 Stock Analyser</span>
  <span style="font-weight:700;font-size:18px;color:var(--text)"><TICKER></span>
  <span class="date-badge"><COMPANY NAME> · <EXCHANGE> · <DATE></span>
  <!-- Sub-tab buttons -->
  <button class="tab-btn active" onclick="showTab('earnings',this)">Earnings</button>
  <button class="tab-btn" onclick="showTab('concall',this)">Concall</button>
  <button class="tab-btn" onclick="showTab('forensics',this)">Forensics</button>
  <button class="tab-btn" onclick="showTab('sector',this)">Sector</button>
  <button class="tab-btn" onclick="showTab('moat',this)">Moat</button>
  <button class="tab-btn" onclick="showTab('triggers',this)">Triggers</button>
  <button class="tab-btn" onclick="showTab('verdict',this)">Verdict</button>
</nav>
```

### Score Card (below header, always visible)
```html
<div class="analyser-score-card">
  <!-- Score ring (SVG) -->
  <div class="score-ring-wrap">
    <svg viewBox="0 0 80 80" width="80" height="80">
      <!-- Background circle -->
      <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface2)" stroke-width="8"/>
      <!-- Score arc: circumference = 2π×34 ≈ 213.6. Fill = (score/100) × 213.6 -->
      <circle cx="40" cy="40" r="34" fill="none"
        stroke="<GREEN if score≥70, AMBER if 40-69, RED if <40>"
        stroke-width="8"
        stroke-dasharray="<FILL_LEN> 213.6"
        stroke-dashoffset="53.4"  /* rotate to start at top: 213.6×0.25 */
        transform="rotate(-90 40 40)"
        stroke-linecap="round"/>
      <text x="40" y="37" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)"><SCORE></text>
      <text x="40" y="50" text-anchor="middle" font-size="9" fill="var(--muted)">/ 100</text>
    </svg>
  </div>
  <!-- Score label + action -->
  <div class="score-label-wrap">
    <div class="score-action-badge action-<CSS_CLASS>"><ACTION></div>
    <div class="score-headline"><SCORE_LABEL></div>  <!-- e.g. "Strong Candidate · 9 of 10 criteria passed" -->
  </div>
  <!-- Criteria breakdown rows -->
  <div class="criteria-rows">
    <div class="criteria-row"><span class="cr-icon <green/amber/red>">●</span><span class="cr-label">Earnings Growth</span><span class="cr-score">+<A>/10</span></div>
    <div class="criteria-row"><span class="cr-icon">●</span><span class="cr-label">Management Credibility</span><span class="cr-score">+<B>/10</span></div>
    <div class="criteria-row"><span class="cr-icon">●</span><span class="cr-label">Moat Strength</span><span class="cr-score">+<C>/10</span></div>
    <div class="criteria-row"><span class="cr-icon">●</span><span class="cr-label">Balance Sheet</span><span class="cr-score">+<D>/10</span></div>
    <div class="criteria-row"><span class="cr-icon">●</span><span class="cr-label">Sector Tailwind</span><span class="cr-score">+<E>/10</span></div>
    <div class="criteria-row"><span class="cr-icon">●</span><span class="cr-label">Competitive Position</span><span class="cr-score">+<F>/10</span></div>
    <div class="criteria-row"><span class="cr-icon">●</span><span class="cr-label">Valuation</span><span class="cr-score">+<G>/10</span></div>
    <div class="criteria-row"><span class="cr-icon">●</span><span class="cr-label">Technical Stage (<STAGE>)</span><span class="cr-score">+<H>/30</span></div>
  </div>
</div>
```

Score label copy:
- 85–100: "Strong Candidate · X of 10 criteria passed"
- 70–84: "Good Candidate · Fundamentals strong"
- 55–69: "Hold Candidate · Solid business, mixed technicals"
- 40–54: "Neutral · Monitor closely"
- 30–39: "Weak · Reducing recommended"
- 0–29: "Avoid / Exit · Thesis deteriorating"

### New CSS additions (add to existing html-report.md CSS):
```css
/* Score Card */
.analyser-score-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 24px;
  margin: 16px auto;
  max-width: 1400px;
  display: flex;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
}
.score-ring-wrap { flex-shrink: 0; }
.score-label-wrap { display: flex; flex-direction: column; gap: 6px; min-width: 160px; }
.score-headline { font-size: 13px; color: var(--muted); }
.score-action-badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
}
.criteria-rows { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 220px; }
.criteria-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  padding: 3px 0;
}
.cr-icon { font-size: 8px; flex-shrink: 0; }
.cr-icon.green { color: var(--green); }
.cr-icon.amber { color: var(--yellow); }
.cr-icon.red   { color: var(--red); }
.cr-label { flex: 1; color: var(--text); }
.cr-score { font-weight: 700; color: var(--muted); white-space: nowrap; }

/* Analyser input widget (Tab 5 in portfolio report) */
.analyser-input-wrap {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.analyser-input {
  flex: 1;
  min-width: 200px;
  max-width: 320px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  padding: 10px 14px;
  outline: none;
}
.analyser-input:focus { border-color: var(--accent); }
.analyser-input::placeholder { color: var(--muted); }
.analyser-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.analyser-btn:hover { opacity: 0.85; }
.analyser-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.analyser-refresh-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--muted);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12px;
  cursor: pointer;
}
.analyser-refresh-btn:hover { border-color: var(--accent); color: var(--accent); }
.cache-badge {
  font-size: 11px;
  color: var(--muted);
  background: var(--surface2);
  border-radius: 4px;
  padding: 4px 8px;
}

/* Score chip in rebalancing table */
.score-chip {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  margin-left: 6px;
  cursor: pointer;
}
.score-chip.high  { background: #14532d; color: #4ade80; }
.score-chip.mid   { background: #451a03; color: #fcd34d; }
.score-chip.low   { background: #450a0a; color: #fca5a5; }

/* Forensics 3-column panel */
.forensics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 800px) { .forensics-grid { grid-template-columns: 1fr; } }

/* Traffic light */
.tl-green { color: var(--green); font-weight: 700; }
.tl-amber { color: var(--yellow); font-weight: 700; }
.tl-red   { color: var(--red); font-weight: 700; }

/* Trigger table */
.trigger-table td.high-prob   { color: var(--green); }
.trigger-table td.med-prob    { color: var(--yellow); }
.trigger-table td.low-prob    { color: var(--muted); }

/* Management integrity grid */
.integrity-row.delivered  { border-left: 3px solid var(--green); }
.integrity-row.partial    { border-left: 3px solid var(--yellow); }
.integrity-row.missed     { border-left: 3px solid var(--red); }
.integrity-grade { font-size: 32px; font-weight: 900; }
.integrity-grade.A { color: var(--green); }
.integrity-grade.B { color: #4ade80; }
.integrity-grade.C { color: var(--yellow); }
.integrity-grade.D { color: var(--red); }
```

---

## Speed & Context Rules

1. **Subagent A isolation**: All WebSearches and MCP calls run inside Subagent A. Only the JSON summary crosses back. This keeps main context ~30% of what it would be running everything inline.

2. **Subagent B isolation**: All 8 analysis sections run inside Subagent B. It receives the JSON summary + raw text blobs. It returns HTML fragments. Raw search results never appear in main context.

3. **Main context work only**: Step 0 (ticker resolve), Step 2 (technicals from JSON), Step 3 (scoring), Step 5 (HTML assembly from fragments), Step 6 (file writes).

4. **Cache hit path**: If cache is fresh (<7 days), skip Subagents entirely. Read from cache, write bridge result file, open HTML. Total time: ~5 seconds.

5. **Token budget per subagent**: Subagent A targets <50K tokens. Subagent B targets <80K tokens. Main context stays <30K tokens throughout.

---

## Chat Output (brief)

After completion:
```
Stock: <TICKER> — <COMPANY NAME>
Score: <X>/100 → <ACTION>
Key insight: <1 sentence from Section H verdict>
Report: ~/Desktop/stock-analysis-<TICKER>-<DATE>.html
```
