# Portfolio Data Schema — v3.0

This is the **master data contract** between the Claude skill (writer) and `report/report.html` (reader).

Claude writes one JSON file per run: `~/.portfolio/data/portfolio-YYYY-MM-DD.json`
The static report reads it via `GET /data/latest` from the bridge server.

**Never put HTML, CSS, or JS in this JSON. Pure data only.**

---

## Top-level structure

```json
{
  "meta":       { ... },
  "portfolio":  { ... },
  "benchmarks": { ... },
  "holdings":   [ ... ]
}
```

---

## `meta` object

| Field | Type | Description |
|---|---|---|
| `generated_at` | ISO 8601 string | UTC timestamp when JSON was written |
| `report_date` | `"YYYY-MM-DD"` | Date of the analysis |
| `user_name` | string | From `mcp__kite__get_profile()` |
| `schema_version` | `"2.0"` | Hard-coded — bump if schema changes |
| `modules_run` | array of strings | e.g. `["performance", "stage"]` or `["stage"]` |

---

## `portfolio` object

| Field | Type | Description |
|---|---|---|
| `total_invested` | number | Σ (qty × avg_buy) across all holdings |
| `total_current` | number | Σ (qty × ltp) |
| `total_pnl` | number | total_current − total_invested |
| `total_return_pct` | number | (total_pnl / total_invested) × 100, 1dp |
| `day_change_abs` | number | Σ (ltp × day_change_pct/100 × qty) |
| `day_change_pct` | number | (day_change_abs / total_current) × 100, 2dp |
| `num_stocks` | integer | Count of holdings |
| `stage1_pct` | number | % of total_current in Stage 1 stocks |
| `stage2_pct` | number | % of total_current in Stage 2 stocks |
| `stage3_pct` | number | % of total_current in Stage 3 stocks |
| `stage4_pct` | number | % of total_current in Stage 4 stocks |
| `atrisk_pct` | number | stage3_pct + stage4_pct |
| `accel_pct` | number | % of total_current where earnings_trend = "accelerating" |
| `avg_mgmt_stars` | number | Average of holdings[].concall.mgmt_stars, 1dp |
| `top_priority_actions` | array | Top 3 action items for Overview snapshot |

### `top_priority_actions` item

| Field | Type | Description |
|---|---|---|
| `symbol` | string | Stock symbol |
| `action` | string | `"EXIT"` / `"TRIM"` / `"WATCH"` / `"HOLD"` / `"ADD"` / `"STRONG ADD"` |
| `reason` | string | 1-line rationale for the action |

---

## `benchmarks` object

Each benchmark key contains a returns object plus optional metadata:

```json
{
  "nifty50":    { "1m": 2.1, "3m": -1.2, "6m": 4.5, "1y": 12.3 },
  "nifty500":   { "1m": 2.4, "3m": -0.8, "6m": 5.1, "1y": 14.1 },
  "smlcap250":  { "1m": 3.1, "3m":  1.2, "6m": 7.2, "1y": 18.4 },
  "flexicap_mf": {
    "1m": 1.9, "3m": -1.0, "6m": 4.2, "1y": 13.7,
    "source": "Parag Parikh Flexi Cap Direct Growth",
    "verified": true,
    "verify_note": "2 sources agree within ±0.5%"
  },
  "smallcap_mf": {
    "1m": 2.8, "3m": 0.9, "6m": 6.1, "1y": 16.2,
    "source": "Nippon India Small Cap Direct Growth",
    "verified": true
  },
  "portfolio": { "1m": 1.2, "3m": -2.1, "6m": 3.8, "1y": 11.4 }
}
```

**Return values**: percentage with 1dp. Null if data unavailable.

---

## `holdings` array

Each element is one holding. Sort by `weight` descending before writing.

### Core fields

| Field | Type | Description |
|---|---|---|
| `symbol` | string | NSE/BSE tradingsymbol |
| `exchange` | string | `"NSE"` or `"BSE"` |
| `instrument_token` | integer | From get_holdings |
| `qty` | integer | Quantity held |
| `avg_buy` | number | Average buy price (₹) |
| `ltp` | number | Last traded price (₹) |
| `cost_value` | number | qty × avg_buy |
| `current_value` | number | qty × ltp |
| `pnl` | number | current_value − cost_value |
| `return_pct` | number | (pnl / cost_value) × 100 |
| `day_change_pct` | number | From get_holdings day_change_percentage |
| `weight` | number | current_value / total_current × 100 |
| `tracking` | boolean | true if weight ≤ 0.2% |
| `is_sme` | boolean | true if tradingsymbol ends with `-SM` |
| `color` | string | Hex color from palette (assigned by weight rank) |

### `returns` object (Module 1 — performance)

| Field | Type | Description |
|---|---|---|
| `1m` | number \| null | 1-month return % |
| `3m` | number \| null | 3-month return % |
| `6m` | number \| null | 6-month return % |
| `1y` | number \| null | 1-year return % |
| `since_buy` | number | Since avg buy price (same as return_pct) |
| `vs_nifty50` | object | `{ "1m": bool, "3m": bool, "6m": bool, "1y": bool }` — true = beat |

### `technical` object (Module 2 — stage)

| Field | Type | Description |
|---|---|---|
| `stage` | string | `"2B"` / `"2A"` / `"1"` / `"3"` / `"4"` / `"INSUFFICIENT"` |
| `stage_label` | string | `"Stage 2B"` etc. (display string) |
| `ma50` | number \| null | 50-day MA (₹) |
| `ma150` | number \| null | 150-day MA (₹) |
| `ma200` | number \| null | 200-day MA (₹), approx if <200 days data |
| `ma200_approx` | boolean | true if computed on <200 trading days |
| `slope200` | number | ma200[today] − ma200[30d ago] |
| `slope_direction` | string | `"rising"` / `"falling"` / `"flat"` |
| `high_1y` | number | Max close in 365-day dataset |
| `low_1y` | number | Min close in 365-day dataset |
| `pct_from_high` | number | ((ltp − high_1y) / high_1y) × 100, always ≤ 0 |
| `pct_above_200ma` | number \| null | ((ltp − ma200) / ma200) × 100 |
| `pct_from_low` | number | ((ltp − low_1y) / low_1y) × 100, always ≥ 0 |

### `fundamental_score` object (Module 2)

| Field | Type | Description |
|---|---|---|
| `total` | integer | 0–100 total score |
| `action` | string | `"STRONG ADD"` / `"ADD"` / `"STRONG HOLD"` / `"HOLD"` / `"WATCH"` / `"TRIM"` / `"EXIT"` / `"TRACKING"` |
| `action_css` | string | CSS class: `"action-strong-add"` / `"action-add"` / `"action-strong"` / `"action-hold"` / `"action-watch"` / `"action-trim"` / `"action-exit"` / `"action-tracking"` |
| `earnings` | integer | 0–10 (dimension A) |
| `mgmt` | integer | 0–10 (dimension B) |
| `moat` | integer | 0–10 (dimension C) |
| `balance_sheet` | integer | 0–10 (dimension D) |
| `sector` | integer | 0–10 (dimension E) |
| `competitive` | integer | 0–10 (dimension F) |
| `valuation` | integer | 0–10 (dimension G) |
| `stage_score` | integer | 0–30 (dimension H) |

### `earnings` object (Module 2)

| Field | Type | Description |
|---|---|---|
| `ttm_pe` | number \| null | Trailing 12-month P/E |
| `de_ratio` | number \| null | Debt-to-equity |
| `roe` | number \| null | Return on equity % |
| `quarters` | array | Last 4 quarters (oldest first) |
| `earnings_trend` | string | `"accelerating"` / `"growing"` / `"flat"` / `"slowing"` / `"declining"` |

#### `quarters` item

| Field | Type | Description |
|---|---|---|
| `label` | string | `"Q1FY25"` etc. |
| `revenue` | number \| null | Revenue in ₹ Cr |
| `pat` | number \| null | Profit after tax in ₹ Cr |
| `yoy_rev` | number \| null | YoY revenue growth % |
| `yoy_pat` | number \| null | YoY PAT growth % |

### `risk_flags` array

Each item:

| Field | Type | Description |
|---|---|---|
| `type` | string | `"valuation"` / `"concentration"` / `"stage"` / `"sme"` / `"earnings_momentum"` / `"debt"` / `"near_high"` / `"near_low"` / `"debt_free"` / `"ok_stage"` |
| `label` | string | Display text e.g. `"High PE 42x"` |
| `class` | string | `"risk"` or `"ok"` — drives CSS colour |

### `concall` object (Module 2)

| Field | Type | Description |
|---|---|---|
| `source_url` | string | URL of primary source |
| `quarter` | string | e.g. `"Q4 FY25"` |
| `company_overview` | array of strings | 8–10 bullet points |
| `one_liner` | string | Single most important insight from latest concall |
| `guidance` | array of strings | 8–10 guidance bullets |
| `strategic_updates` | array of strings | 8–10 strategic move bullets |
| `earnings_triggers` | array of strings | 8–10 re-rating trigger bullets |
| `risks` | array of strings | 8–10 risk bullets |
| `qa` | array of `{q, a}` objects | 8–10 key Q&A exchanges |
| `consistency` | array of `{promise, actual, status}` objects | Last 4–8Q guidance vs actual. `status`: `"beat"` / `"met"` / `"missed"` |
| `mgmt_stars` | integer | 1–5 |
| `credibility_label` | string | e.g. `"Beats own guidance consistently"` |
| `investor_verdict` | string | 3–5 sentence synthesis |

### `action` object (Module 2)

| Field | Type | Description |
|---|---|---|
| `label` | string | Same as fundamental_score.action |
| `css_class` | string | Same as fundamental_score.action_css |
| `priority` | string | `"high"` / `"medium"` / `"low"` / `"add"` — drives rebalancing list colour |
| `rationale` | string | 1–2 sentence rationale with price levels |
| `suggested_weight` | number | Current weight (if hold/watch) or recommended new weight |
| `target_weight` | number | Target weight after rebalancing |

---

## Color palette (assign by weight rank, descending)

```
Rank 1:  #6366f1
Rank 2:  #22c55e
Rank 3:  #f59e0b
Rank 4:  #ef4444
Rank 5:  #60a5fa
Rank 6:  #a78bfa
Rank 7:  #2dd4bf
Rank 8:  #fb923c
Rank 9:  #f472b6
Rank 10: #34d399
Rank 11: #94a3b8
Rank 12+: cycle back with 99 opacity suffix e.g. #6366f199
```

---

## Module-only runs

When only one module runs, omit the other module's fields entirely (don't write nulls):

- **Module 1 only**: omit `technical`, `fundamental_score`, `concall`, `action`, `risk_flags` per holding. Set `modules_run: ["performance"]`.
- **Module 2 only**: omit `returns`, `benchmarks`. Set `modules_run: ["stage"]`.
- **Full run**: all fields present. Set `modules_run: ["performance", "stage"]`.

The frontend gracefully handles missing sections (shows "Run `/kite-portfolio:full` to populate" placeholder).

---

## Write pattern

```bash
mkdir -p ~/.portfolio/data

# Write to temp then rename (atomic)
cat > ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).tmp.json << 'EOF'
{...complete JSON...}
EOF
mv ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).tmp.json \
   ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).json

# Update latest symlink
ln -sf ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).json \
        ~/.portfolio/data/latest.json
```

## Token budget

Target: entire JSON write ≤ 3,000 tokens output.
- Compact JSON (no extra whitespace in final write)
- Strings concise — no markdown formatting inside JSON values
- Concall bullets: plain text, no `•` or `**bold**` markup inside JSON strings

---

## Module 3 — Stock Analyser Schema (v3.0)

**Written to:** `~/.portfolio/stock-reports/<TICKER>/<TICKER>-YYYY-MM-DD.json`
**Symlink:** `~/.portfolio/stock-reports/<TICKER>/latest.json`
**Served by:** `GET /stock/:ticker` bridge endpoint
**Never put HTML, CSS, or JS in this JSON. Pure data only.**

See `docs/sample-stock-data.json` for a complete ZAGGLE example.

### Top-level keys

| Key | Description |
|---|---|
| `meta` | Ticker, company, dates, schema version |
| `price` | Last price, day change, 52W high/low, pct from high |
| `technical` | Stage, MAs, RSI, slope, volume ratio |
| `score` | Total 0-100, action, label, 8 dimension breakdown |
| `earnings` | 4-quarter table with Est/Act/Beat-Miss, TTM ratios, segment breakdown |
| `concall` | Quarter, sentiment, analyst pulse, 6 structured sections |
| `forensics` | 3-year P&L, cash flows, balance sheet, 5-category red flags, 12-ratio table |
| `competitive` | Peer comparison table, 10-dimension moat radar |
| `sector` | Overview, growth drivers, risks, bull/bear triggers |
| `triggers` | Growth trigger table with probability and revenue impact |
| `management_integrity` | Composite grade A-D, 12-quarter promise/delivery matrix |
| `verdict` | Bull/base/bear cases, valuation check, price levels, action |

---

### `meta` object (Module 3)

| Field | Type | Description |
|---|---|---|
| `ticker` | string | NSE/BSE symbol |
| `company` | string | Full legal name |
| `exchange` | `"NSE"` or `"BSE"` | Primary exchange |
| `generated_at` | ISO 8601 | UTC timestamp |
| `report_date` | `"YYYY-MM-DD"` | Date of analysis |
| `expires_at` | ISO 8601 | generated_at + 7 days |
| `ttl_days` | 7 | Hard-coded |
| `schema_version` | `"3.0"` | Bump if schema changes |

---

### `score` object (Module 3)

| Field | Type | Description |
|---|---|---|
| `total` | 0–100 | Sum of all dimensions |
| `action` | string | `"STRONG ADD"` / `"ADD"` / `"STRONG HOLD"` / `"HOLD"` / `"WATCH"` / `"TRIM"` / `"EXIT"` |
| `action_css` | string | CSS class e.g. `"action-watch"` |
| `score_label` | string | Display label e.g. `"Neutral · Stage 4 override"` |
| `dimensions` | object | 8 keys: `earnings_growth`, `mgmt_credibility`, `moat`, `balance_sheet`, `sector_tailwind`, `competitive`, `valuation`, `technical_stage` |

Each dimension: `{ score, max, label, color }` where `color` is `"green"` / `"amber"` / `"red"`.

---

### `earnings.quarters[]` item (Module 3 additions)

| Field | Type | Description |
|---|---|---|
| `revenue_est_cr` | number or null | Analyst consensus revenue estimate |
| `pat_est_cr` | number or null | Analyst consensus PAT estimate |
| `beat_miss_rev` | `"BEAT"` / `"MISS"` / `"IN-LINE"` / null | Revenue vs estimate |
| `beat_miss_pat` | `"BEAT"` / `"MISS"` / `"IN-LINE"` / null | PAT vs estimate |
| `market_reaction_pct` | number or null | Stock % move on results day |
| `analyst_sentiment` | `"POSITIVE"` / `"NEGATIVE"` / `"NEUTRAL"` / `"MIXED"` | Analyst tone post-results |

---

### `concall.sections` keys

| Key | Contents |
|---|---|
| `strategic_updates` | `{ sentiment, heading, points[] }` — each point: `{ text, polarity }` |
| `guidance_outlook` | `{ sentiment, heading, near_term[], medium_term[], long_term[] }` — each item: `{ text, polarity, timeline }` |
| `risk_analysis` | `{ sentiment, heading, points[] }` — each point: `{ text, polarity }` |
| `qa_summary` | `{ sentiment, heading, exchanges[] }` — each: `{ q, a, assessment, polarity }` |
| `earning_triggers` | `{ sentiment, heading, points[] }` — each point: `{ text, polarity, timeline, probability }` |
| `management_consistency` | `{ sentiment, heading, promises[], integrity_grade, delivery_rate, follow_up_questions[] }` — each promise: `{ quarter, promise, delivered, actual, red_flags[], green_flags[] }` |

`polarity` values: `"positive"` / `"negative"` / `"neutral"`
`delivered` values: `"BEAT"` / `"MISSED"` / `"IN-LINE"` / `"PENDING"`

---

### `management_integrity` object

| Field | Type | Description |
|---|---|---|
| `composite_score` | 0–10 | Weighted integrity score |
| `composite_grade` | `"A"` / `"B"` / `"C"` / `"C+"` / `"D"` | Overall grade |
| `delivery_rate_pct` | 0–100 | % of promises fully delivered |
| `transparency_on_misses` | `"HIGH"` / `"MEDIUM"` / `"LOW"` | Proactive about misses? |
| `proactive_disclosure` | `"HIGH"` / `"MEDIUM"` / `"LOW"` | Discloses before market finds out? |
| `analyst_treatment` | `"POSITIVE"` / `"NEUTRAL"` / `"NEGATIVE"` | How management handles tough Q&A |
| `tone_consistency` | `"CONSISTENT"` / `"INCONSISTENT"` | Tone stable across quarters? |
| `grade_rationale` | string | 2-3 sentence explanation of grade |
| `quarters[]` | array | Per-quarter promise/delivery records |

---

### Cache metadata file (Module 3)

`~/.portfolio/cache/<TICKER>-YYYY-MM-DD.json` — lightweight metadata only:

```json
{
  "ticker": "ZAGGLE",
  "company": "Zaggle Prepaid Ocean Services",
  "generated_at": "2026-05-30T14:11:50Z",
  "expires_at": "2026-06-06T14:11:50Z",
  "ttl_days": 7,
  "score": 44,
  "action": "WATCH",
  "stage": "Stage 4",
  "last_price": 220.19,
  "pct_from_high": -53.13,
  "score_breakdown": {
    "earnings_growth": 8, "mgmt_credibility": 5, "moat": 6, "balance_sheet": 6,
    "sector_tailwind": 7, "competitive": 5, "valuation": 7, "technical_stage": 0
  },
  "data_path": "~/.portfolio/stock-reports/ZAGGLE/latest.json"
}
```

**No `html_fragment` field** — bridge reads full JSON from `data_path` via `GET /stock/:ticker`.
