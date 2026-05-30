# JSON Output Spec

Claude writes one JSON file per run. The static `report/report.html` renders it.
**Never generate HTML in the skill output. Write JSON only.**

---

## Output path

```
~/.portfolio/data/portfolio-YYYY-MM-DD.json   ← daily file
~/.portfolio/data/latest.json                  ← symlink to most recent
```

---

## Write pattern (atomic)

```bash
mkdir -p ~/.portfolio/data

cat > ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).tmp.json << 'EOF'
{...compact JSON, no extra whitespace...}
EOF

mv ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).tmp.json \
   ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).json

ln -sf ~/.portfolio/data/portfolio-$(date +%Y-%m-%d).json \
        ~/.portfolio/data/latest.json
```

**Always write to `.tmp.json` first, then rename.** Prevents partially-written files from being served.

---

## Schema reference

Full field spec: `docs/portfolio-data-schema.md`
Sample data: `docs/sample-portfolio-data.json`

---

## What each module writes

### Module 1 (performance.md) writes:

```json
{
  "meta": {
    "generated_at": "<ISO>", "report_date": "<YYYY-MM-DD>",
    "user_name": "<from get_profile>", "schema_version": "2.0",
    "modules_run": ["performance"]
  },
  "portfolio": {
    "total_invested": 1079456, "total_current": 1081461, "total_pnl": 2005,
    "total_return_pct": 0.19, "day_change_abs": -875, "day_change_pct": -0.08,
    "num_stocks": 11,
    "stage1_pct": null, "stage2_pct": null, "stage3_pct": null,
    "stage4_pct": null, "atrisk_pct": null, "accel_pct": null,
    "avg_mgmt_stars": null, "top_priority_actions": null
  },
  "benchmarks": {
    "nifty50":    {"1m": 2.1, "3m": -1.2, "6m": 4.5, "1y": 12.3},
    "nifty500":   {"1m": 2.4, "3m": -0.8, "6m": 5.1, "1y": 14.1},
    "smlcap250":  {"1m": 3.1, "3m": 1.2,  "6m": 7.2, "1y": 18.4},
    "flexicap_mf":{"1m": 1.9, "3m": -1.0, "6m": 4.2, "1y": 13.7,
                   "source": "Parag Parikh Flexi Cap Direct", "verified": true},
    "smallcap_mf":{"1m": 2.8, "3m": 0.9,  "6m": 6.1, "1y": 16.2,
                   "source": "Nippon India Small Cap Direct", "verified": true},
    "portfolio":  {"1m": -0.8, "3m": -3.1, "6m": 1.2, "1y": 11.4}
  },
  "holdings": [
    {
      "symbol": "NETWEB", "exchange": "BSE", "instrument_token": 3906049,
      "qty": 52, "avg_buy": 2458, "ltp": 3841,
      "cost_value": 127816, "current_value": 199732, "pnl": 71916,
      "return_pct": 56.3, "day_change_pct": -1.73, "weight": 18.5,
      "tracking": false, "is_sme": false, "color": "#6366f1",
      "returns": {
        "1m": 3.2, "3m": -5.1, "6m": 18.4, "1y": 72.6, "since_buy": 56.3,
        "vs_nifty50": {"1m": true, "3m": false, "6m": true, "1y": true}
      }
    }
  ]
}
```

### Module 2 (stage-analysis.md) merges into same file:

Per holding, add:
```json
{
  "technical": {
    "stage": "2B", "stage_label": "Stage 2B",
    "ma50": 3620, "ma150": 3100, "ma200": 2850, "ma200_approx": false,
    "slope200": 45.2, "slope_direction": "rising",
    "high_1y": 4200, "low_1y": 1950,
    "pct_from_high": -8.5, "pct_above_200ma": 34.8, "pct_from_low": 97.0
  },
  "fundamental_score": {
    "total": 82, "action": "STRONG HOLD", "action_css": "action-strong",
    "earnings": 8, "mgmt": 10, "moat": 8, "balance_sheet": 9,
    "sector": 9, "competitive": 8, "valuation": 0, "stage_score": 30
  },
  "earnings": {
    "ttm_pe": 42, "de_ratio": 0.0, "roe": 28.4,
    "quarters": [
      {"label": "Q1FY25", "revenue": 280, "pat": 32, "yoy_rev": null, "yoy_pat": null},
      {"label": "Q4FY25", "revenue": 420, "pat": 52, "yoy_rev": 34.2, "yoy_pat": 40.1}
    ],
    "earnings_trend": "accelerating"
  },
  "risk_flags": [
    {"type": "valuation", "label": "High PE 42x", "class": "risk"},
    {"type": "debt_free", "label": "Debt-free",   "class": "ok"}
  ],
  "concall": {
    "source_url": "https://trendlyne.com/equity/concall/NETWEB/",
    "quarter": "Q4 FY25",
    "company_overview": ["Designs and manufactures HPC servers for BFSI, govt, defence", "...8 more bullets"],
    "one_liner": "Data centre demand driving 40%+ growth with strong order book into FY26.",
    "guidance": ["Revenue FY26: 1800 Cr (~40% growth)", "...more bullets"],
    "strategic_updates": ["Entering hyperscale data centre segment", "..."],
    "earnings_triggers": ["First hyperscale order win = re-rating event", "..."],
    "risks": ["Dependent on govt and BFSI spending cycles", "..."],
    "qa": [
      {"q": "Can margins sustain at 14%+ with hyperscale?", "a": "Yes, hyperscale margins are higher"},
      {"q": "Order book concentration?", "a": "Top 3 = 45%, diversifying actively"}
    ],
    "consistency": [
      {"promise": "Q3 guided 400 Cr Q4 revenue", "actual": "420 Cr delivered", "status": "beat"},
      {"promise": "FY25 margin 13-14%", "actual": "14.2%", "status": "beat"}
    ],
    "mgmt_stars": 5,
    "credibility_label": "Beats own guidance consistently",
    "investor_verdict": "Conservative management, consistently beats. AI infra structural tailwind. Risk: 42x PE."
  },
  "action": {
    "label": "STRONG HOLD", "css_class": "action-strong", "priority": "low",
    "rationale": "Stage 2B, earnings accelerating, management credible. Add on 8-10% dip to 50MA (3620).",
    "suggested_weight": 18.5, "target_weight": 18.5
  }
}
```

Also update portfolio-level fields:
```json
{
  "meta": {"modules_run": ["performance", "stage"]},
  "portfolio": {
    "stage1_pct": 2.3, "stage2_pct": 64.0, "stage3_pct": 4.5, "stage4_pct": 29.2,
    "atrisk_pct": 33.7, "accel_pct": 45.0, "avg_mgmt_stars": 3.8,
    "top_priority_actions": [
      {"symbol": "ZAGGLE",    "action": "EXIT",  "reason": "Stage 4 · PAT loss · thesis broken"},
      {"symbol": "FLYSBS-SM", "action": "TRIM",  "reason": "15.3% SME · Stage 3/4 · low liquidity"},
      {"symbol": "BAJAJHLDNG","action": "WATCH", "reason": "Stage 3 · below 200MA · trim if no recovery"}
    ]
  }
}
```

---

## Merge pattern (full review)

When Module 2 runs after Module 1:
1. Read `~/.portfolio/data/portfolio-TODAY.json` (has core + returns from Module 1)
2. For each holding: add `technical`, `fundamental_score`, `earnings`, `concall`, `action`, `risk_flags`
3. Update portfolio-level stage/accel/stars/top_priority fields
4. Update `meta.modules_run` to `["performance","stage"]`
5. Write complete merged JSON atomically

Match holdings by `symbol` field. Keep weight-descending order from Module 1.

---

## Token budget

| Run | Max tokens |
|---|---|
| Module 1 only | 1,500 |
| Module 2 only | 2,000 |
| Full review (merged) | 3,000 |

Keep JSON compact — no indentation in final output. Plain text strings — no markdown inside JSON values.

---

## After writing

```bash
curl -s --max-time 1 http://localhost:7891/health > /dev/null 2>&1 \
  && open http://localhost:7891/report \
  || echo "Bridge not running. Start: cd portfolio-bridge && npm start"
```

In chat: show stage summary table + top 3 rebalancing actions only.

---

## Color palette (assign by weight rank descending)

```
#6366f1  #22c55e  #f59e0b  #ef4444  #60a5fa
#a78bfa  #2dd4bf  #fb923c  #f472b6  #34d399  #94a3b8
12+: append "99" for 60% opacity e.g. #6366f199
```
