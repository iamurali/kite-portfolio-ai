# HTML Report Generator

## CRITICAL: 4-Part Chunked Write Pattern

**Never write the full HTML in one string — it will exceed the output token limit and fail.**
**Always write in exactly 4 sequential Bash calls using `>>` append.**

### Part 1 — Head + Styles + Nav + Tab 1 (Overview)
```bash
cat > ~/Desktop/portfolio-report-YYYY-MM-DD.html << 'EOF'
<!DOCTYPE html><html lang="en"><head>...styles...nav...</head><body>
<!-- TAB 1: OVERVIEW content here (snapshot banner + stat grid + holdings table + allocation) -->
EOF
```

### Part 2 — Tab 2 (Performance)
```bash
cat >> ~/Desktop/portfolio-report-YYYY-MM-DD.html << 'EOF'
<!-- TAB 2: PERFORMANCE content here (benchmark table + bar chart + stock returns + insights) -->
EOF
```

### Part 3 — Tab 3 (Stage Analysis) — sidebar + ALL stock cards
```bash
cat >> ~/Desktop/portfolio-report-YYYY-MM-DD.html << 'EOF'
<!-- TAB 3: STAGE ANALYSIS content here (summary table + sidebar + all stock detail cards) -->
EOF
```

### Part 4 — Tab 4 (Rebalancing) + closing script + </body></html>
```bash
cat >> ~/Desktop/portfolio-report-YYYY-MM-DD.html << 'EOF'
<!-- TAB 4: REBALANCING content here (priority list + reallocation table + health scores) -->
<script>function showTab(n,b){...}</script></body></html>
EOF
```

Then open:
```bash
open ~/Desktop/portfolio-report-YYYY-MM-DD.html
```

**Keep each Part under 200 lines of HTML.** If Tab 3 (stock cards) is large, split it: Part 3a = first 5 stocks, Part 3b = remaining stocks, Part 4 = rebalancing + close.

---

## When to generate
After completing Module 1 (Performance) and/or Module 2 (Stage Analysis), generate automatically.

## Output path
Save to: `~/Desktop/portfolio-report-[YYYY-MM-DD].html`
Then run: `open ~/Desktop/portfolio-report-[YYYY-MM-DD].html`

---

## Full HTML Template

Write the complete HTML below, substituting all `{{PLACEHOLDER}}` values with real computed data.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Portfolio Report — {{DATE}}</title>
<style>
  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --surface2: #22263a;
    --border: #2e3250;
    --text: #e2e8f0;
    --muted: #8892b0;
    --green: #22c55e;
    --red: #ef4444;
    --yellow: #f59e0b;
    --blue: #60a5fa;
    --purple: #a78bfa;
    --accent: #6366f1;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.6;
  }

  /* ── TOP NAV ── */
  .topnav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #0d0f18;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 24px;
    height: 56px;
    gap: 8px;
  }
  .topnav .logo {
    font-weight: 700;
    font-size: 16px;
    color: var(--accent);
    margin-right: 16px;
    white-space: nowrap;
  }
  .topnav .date-badge {
    font-size: 11px;
    color: var(--muted);
    background: var(--surface2);
    padding: 2px 8px;
    border-radius: 4px;
    margin-right: auto;
  }
  .tab-btn {
    background: none;
    border: none;
    color: var(--muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    padding: 6px 14px;
    border-radius: 6px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .tab-btn:hover { background: var(--surface2); color: var(--text); }
  .tab-btn.active { background: var(--accent); color: #fff; }

  /* ── LAYOUT ── */
  .tab-content { display: none; padding: 24px; max-width: 1400px; margin: 0 auto; }
  .tab-content.active { display: block; }

  /* ── CARDS ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 20px;
  }
  .card-title {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin-bottom: 16px;
  }

  /* ── SUMMARY STAT GRID ── */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }
  .stat-box {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
  }
  .stat-label { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
  .stat-value { font-size: 22px; font-weight: 700; }
  .stat-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .pos { color: var(--green); }
  .neg { color: var(--red); }
  .neu { color: var(--blue); }

  /* ── TABLES ── */
  .tbl-wrap { overflow-x: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    background: var(--surface2);
    color: var(--muted);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 10px 12px;
    text-align: right;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  th:first-child { text-align: left; }
  td {
    padding: 10px 12px;
    text-align: right;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  td:first-child { text-align: left; font-weight: 500; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--surface2); }
  .beat { color: var(--green); font-weight: 600; }
  .lag  { color: var(--red); }
  .bold { font-weight: 700; }

  /* ── BENCHMARK BAR CHART ── */
  .barchart { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
  .bar-row { display: flex; align-items: center; gap: 12px; }
  .bar-label { width: 140px; font-size: 12px; color: var(--muted); flex-shrink: 0; }
  .bar-track { flex: 1; background: var(--surface2); border-radius: 4px; height: 20px; position: relative; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; display: flex; align-items: center; padding-left: 8px; font-size: 11px; font-weight: 600; color: #fff; transition: width 0.4s ease; }
  .bar-fill.green { background: linear-gradient(90deg, #16a34a, #22c55e); }
  .bar-fill.red   { background: linear-gradient(90deg, #b91c1c, #ef4444); }
  .bar-fill.blue  { background: linear-gradient(90deg, #1d4ed8, #60a5fa); }
  .bar-fill.amber { background: linear-gradient(90deg, #b45309, #f59e0b); }
  .bar-fill.purple{ background: linear-gradient(90deg, #6d28d9, #a78bfa); }
  .bar-fill.teal  { background: linear-gradient(90deg, #0f766e, #2dd4bf); }
  .bar-pct { width: 55px; font-size: 12px; font-weight: 600; text-align: right; flex-shrink: 0; }

  /* ── ALLOCATION DONUT (CSS only) ── */
  .alloc-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .alloc-list { display: flex; flex-direction: column; gap: 8px; }
  .alloc-row { display: flex; align-items: center; gap: 10px; }
  .alloc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .alloc-name { flex: 1; font-size: 13px; }
  .alloc-pct { font-size: 13px; font-weight: 600; color: var(--muted); }
  .alloc-bar-track { flex: 1; background: var(--surface2); border-radius: 3px; height: 6px; }
  .alloc-bar-fill { height: 100%; border-radius: 3px; }

  /* ── STOCK STAGE CARDS ── */
  .stock-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(680px, 1fr));
    gap: 20px;
  }
  .stock-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }
  .stock-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    gap: 12px;
    flex-wrap: wrap;
  }
  .stock-symbol { font-size: 18px; font-weight: 700; }
  .stock-meta { font-size: 12px; color: var(--muted); }
  .stage-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }
  .stage-2 { background: #14532d; color: #4ade80; border: 1px solid #16a34a; }
  .stage-1 { background: #1e3a5f; color: #93c5fd; border: 1px solid #2563eb; }
  .stage-3 { background: #451a03; color: #fcd34d; border: 1px solid #d97706; }
  .stage-4 { background: #450a0a; color: #fca5a5; border: 1px solid #dc2626; }
  .action-badge {
    padding: 3px 10px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 700;
  }
  .action-hold    { background: #1e3a5f; color: #93c5fd; }
  .action-trim    { background: #451a03; color: #fcd34d; }
  .action-exit    { background: #450a0a; color: #fca5a5; }
  .action-add     { background: #14532d; color: #4ade80; }
  .action-watch   { background: #1c1c40; color: #a78bfa; }

  .stock-card-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }

  /* MA row */
  .ma-row { display: flex; gap: 16px; flex-wrap: wrap; }
  .ma-item { text-align: center; }
  .ma-label { font-size: 10px; color: var(--muted); text-transform: uppercase; }
  .ma-val { font-size: 14px; font-weight: 600; }
  .ma-divider { width: 1px; background: var(--border); }

  /* Earnings mini table */
  .earnings-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .eq-cell {
    background: var(--surface2);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 11px;
  }
  .eq-q { color: var(--muted); margin-bottom: 3px; }
  .eq-rev { font-weight: 600; }
  .eq-pat { color: var(--green); font-size: 10px; }

  /* Concall sections */
  .concall-section { border-left: 3px solid var(--accent); padding-left: 12px; }
  .concall-section + .concall-section { margin-top: 10px; }
  .concall-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    margin-bottom: 6px;
  }
  .concall-section.guidance { border-color: var(--green); }
  .concall-section.guidance .concall-label { color: var(--green); }
  .concall-section.triggers { border-color: var(--purple); }
  .concall-section.triggers .concall-label { color: var(--purple); }
  .concall-section.risks { border-color: var(--red); }
  .concall-section.risks .concall-label { color: var(--red); }
  .concall-section.qa { border-color: var(--yellow); }
  .concall-section.qa .concall-label { color: var(--yellow); }
  .concall-section.consistency { border-color: var(--muted); }
  .concall-section.consistency .concall-label { color: var(--muted); }
  .concall-section.verdict { border-color: var(--blue); background: #0f1b2d; padding: 10px 12px; border-radius: 0 6px 6px 0; }
  .concall-section.verdict .concall-label { color: var(--blue); }
  .concall-section ul { padding-left: 16px; }
  .concall-section li { margin-bottom: 3px; font-size: 12px; color: var(--text); }
  .concall-section p { font-size: 12px; color: var(--text); }
  .qa-item { margin-bottom: 8px; }
  .qa-q { font-size: 11px; color: var(--yellow); font-weight: 600; }
  .qa-a { font-size: 12px; color: var(--text); padding-left: 12px; }
  .stars { color: var(--yellow); font-size: 14px; }
  .credibility-row { display: flex; align-items: center; gap: 10px; margin-top: 4px; }

  /* Rebalancing priority */
  .priority-list { display: flex; flex-direction: column; gap: 10px; }
  .priority-item {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    background: var(--surface2);
    border-radius: 8px;
    padding: 12px 16px;
    border-left: 4px solid transparent;
  }
  .priority-item.high { border-color: var(--red); }
  .priority-item.medium { border-color: var(--yellow); }
  .priority-item.low { border-color: var(--blue); }
  .priority-item.add { border-color: var(--green); }
  .priority-num { font-size: 18px; font-weight: 800; color: var(--muted); flex-shrink: 0; width: 24px; }
  .priority-stock { font-weight: 700; font-size: 14px; }
  .priority-reason { font-size: 12px; color: var(--muted); margin-top: 2px; }

  /* Pill tags */
  .tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    margin-right: 4px;
  }
  .tag-risk { background: #3b0f0f; color: #fca5a5; }
  .tag-ok   { background: #0f2b1a; color: #4ade80; }

  /* Section headings */
  .section-heading {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    padding: 4px 0 8px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 12px;
  }

  /* Insights */
  .insight-list { display: flex; flex-direction: column; gap: 8px; }
  .insight-item {
    background: var(--surface2);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    border-left: 3px solid var(--accent);
  }

  /* Responsive */
  @media (max-width: 800px) {
    .stock-grid { grid-template-columns: 1fr; }
    .alloc-grid { grid-template-columns: 1fr; }
    .earnings-grid { grid-template-columns: repeat(2, 1fr); }
    .topnav { flex-wrap: wrap; height: auto; padding: 10px 16px; gap: 6px; }
    .tab-content { padding: 16px; }
  }
</style>
</head>
<body>

<!-- TOP NAVIGATION -->
<nav class="topnav">
  <span class="logo">📊 Portfolio</span>
  <span class="date-badge">{{DATE}} · {{USER_NAME}}</span>
  <button class="tab-btn active" onclick="showTab('overview',this)">Overview</button>
  <button class="tab-btn" onclick="showTab('performance',this)">Performance</button>
  <button class="tab-btn" onclick="showTab('stages',this)">Stage Analysis</button>
  <button class="tab-btn" onclick="showTab('rebalance',this)">Rebalancing</button>
</nav>

<!-- ════════════════════════════════════════════
     TAB 1 — OVERVIEW
════════════════════════════════════════════ -->
<div id="tab-overview" class="tab-content active">

  <!-- Summary stats -->
  <div class="stat-grid">
    <div class="stat-box">
      <div class="stat-label">Total Invested</div>
      <div class="stat-value neu">₹{{TOTAL_INVESTED}}</div>
      <div class="stat-sub">{{NUM_STOCKS}} stocks</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Current Value</div>
      <div class="stat-value neu">₹{{TOTAL_CURRENT}}</div>
      <div class="stat-sub">as of {{DATE}}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Total P&L</div>
      <div class="stat-value {{PNL_CLASS}}">{{PNL_SIGN}}₹{{TOTAL_PNL}}</div>
      <div class="stat-sub {{PNL_CLASS}}">{{TOTAL_RETURN_PCT}}% since avg buy</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Today's Change</div>
      <div class="stat-value {{DAY_CLASS}}">{{DAY_SIGN}}₹{{DAY_CHANGE}}</div>
      <div class="stat-sub {{DAY_CLASS}}">{{DAY_CHANGE_PCT}}%</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Stage 2 Capital</div>
      <div class="stat-value pos">{{STAGE2_PCT}}%</div>
      <div class="stat-sub">uptrend only · target >70%</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Stage 1 Capital</div>
      <div class="stat-value neu">{{STAGE1_PCT}}%</div>
      <div class="stat-sub">basing — not uptrend</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">At Risk Capital</div>
      <div class="stat-value neg">{{ATRISK_PCT}}%</div>
      <div class="stat-sub">Stage 3+4 · target &lt;10%</div>
    </div>
  </div>

  <!-- Holdings table -->
  <div class="card">
    <div class="card-title">All Holdings</div>
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>Stock</th>
            <th>Qty</th>
            <th>Avg Buy</th>
            <th>LTP</th>
            <th>Value</th>
            <th>Weight</th>
            <th>P&L</th>
            <th>Return</th>
            <th>Day Chg</th>
            <th>Stage</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <!-- For each holding, insert a row: -->
          {{HOLDINGS_ROWS}}
          <!-- Each row format:
          <tr>
            <td><strong>TATAELXSI</strong><br><span style="font-size:10px;color:var(--muted)">NSE · CNC</span></td>
            <td>100</td>
            <td>₹5,120</td>
            <td>₹7,240</td>
            <td>₹1,86,600</td>
            <td>17.8%</td>
            <td class="pos">+₹54,312</td>
            <td class="pos">+41.2%</td>
            <td class="neg">-0.92%</td>
            <td><span class="stage-badge stage-2">Stage 2B</span></td>
            <td><span class="action-badge action-hold">HOLD</span></td>
          </tr>
          -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- Allocation -->
  <div class="card">
    <div class="card-title">Portfolio Allocation</div>
    <div class="alloc-list">
      {{ALLOCATION_ROWS}}
      <!-- Each row format:
      <div class="alloc-row">
        <div class="alloc-dot" style="background:#6366f1"></div>
        <div class="alloc-name">TATAELXSI</div>
        <div class="alloc-bar-track"><div class="alloc-bar-fill" style="width:17.8%;background:#6366f1"></div></div>
        <div class="alloc-pct">17.8%</div>
      </div>
      -->
    </div>
  </div>

</div>

<!-- ════════════════════════════════════════════
     TAB 2 — PERFORMANCE vs BENCHMARKS
════════════════════════════════════════════ -->
<div id="tab-performance" class="tab-content">

  <div class="card">
    <div class="card-title">Returns vs Benchmarks</div>
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th>Your Portfolio</th>
            <th>Nifty 50</th>
            <th>Nifty 500</th>
            <th>Smallcap 250</th>
            <th>Flexicap MF</th>
            <th>Smallcap MF</th>
          </tr>
        </thead>
        <tbody>
          {{BENCHMARK_ROWS}}
          <!-- Each row format:
          <tr>
            <td class="bold">1 Month</td>
            <td class="pos bold">+X.X% ✅</td>
            <td class="neg">+X.X%</td>
            <td>+X.X%</td>
            <td class="neg">+X.X%</td>
            <td>+X.X%</td>
            <td>+X.X%</td>
          </tr>
          Use class "beat" when portfolio beats that benchmark, "lag" when it doesn't.
          -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- Bar chart for selected period (default 1Y) -->
  <div class="card">
    <div class="card-title">1-Year Returns — Visual</div>
    <div class="barchart">
      {{BENCHMARK_BARS}}
      <!-- Each bar format (scale width to max value = 100%):
      <div class="bar-row">
        <div class="bar-label">Your Portfolio</div>
        <div class="bar-track"><div class="bar-fill green" style="width:{{PCT_SCALED}}%">+XX.X%</div></div>
        <div class="bar-pct class-pos">+XX.X%</div>
      </div>
      Colors: portfolio=green, nifty50=blue, nifty500=teal, smallcap=amber, flexicap=purple, smallcapMF=red
      -->
    </div>
  </div>

  <!-- Stock-wise returns table -->
  <div class="card">
    <div class="card-title">Stock-wise Returns vs Nifty 50</div>
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>Stock</th>
            <th>Weight</th>
            <th>1 Month</th>
            <th>3 Month</th>
            <th>6 Month</th>
            <th>1 Year</th>
            <th>Since Avg Buy</th>
          </tr>
        </thead>
        <tbody>
          {{STOCK_RETURNS_ROWS}}
        </tbody>
      </table>
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--muted)">
      ✅ Beat Nifty 50 &nbsp;|&nbsp; ❌ Lagged Nifty 50 &nbsp;|&nbsp; Returns are price-weighted, not XIRR
    </div>
  </div>

  <!-- Insights -->
  <div class="card">
    <div class="card-title">Key Insights</div>
    <div class="insight-list">
      {{PERFORMANCE_INSIGHTS}}
      <!-- Each insight format:
      <div class="insight-item">Your portfolio has beaten Nifty 50 over 1Y but lagged Smallcap 250 — suggesting stock selection is adding value vs large caps but the basket could do better vs the smallcap index.</div>
      -->
    </div>
  </div>

</div>

<!-- ════════════════════════════════════════════
     TAB 3 — STAGE & EARNINGS ANALYSIS
════════════════════════════════════════════ -->
<div id="tab-stages" class="tab-content">

  <!-- Stage summary table -->
  <div class="card">
    <div class="card-title">Stage Summary</div>
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>Stock</th>
            <th>Stage</th>
            <th>Weight</th>
            <th>Price</th>
            <th>50 MA</th>
            <th>150 MA</th>
            <th>200 MA</th>
            <th>vs 200MA</th>
            <th>52W High</th>
            <th>Earnings</th>
            <th>Mgmt ⭐</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {{STAGE_SUMMARY_ROWS}}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Individual stock cards -->
  <div class="stock-grid">
    {{STOCK_CARDS}}
    <!-- For each stock, generate a card using this structure:

    <div class="stock-card">
      <div class="stock-card-header">
        <div>
          <div class="stock-symbol">TATAELXSI <span style="font-size:13px;color:var(--muted)">BSE</span></div>
          <div class="stock-meta">Weight 17.8% · ₹1,86,600 · +41.2% since buy</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="stage-badge stage-2">✅ Stage 2B</span>
          <span class="action-badge action-hold">HOLD</span>
        </div>
      </div>

      <div class="stock-card-body">

        <!-- Price & MAs -->
        <div>
          <div class="section-heading">Technical</div>
          <div class="ma-row">
            <div class="ma-item"><div class="ma-label">Price</div><div class="ma-val">₹7,240</div></div>
            <div class="ma-divider"></div>
            <div class="ma-item"><div class="ma-label">50 MA</div><div class="ma-val pos">₹6,810</div></div>
            <div class="ma-divider"></div>
            <div class="ma-item"><div class="ma-label">150 MA</div><div class="ma-val pos">₹6,200</div></div>
            <div class="ma-divider"></div>
            <div class="ma-item"><div class="ma-label">200 MA</div><div class="ma-val pos">₹2,980</div></div>
            <div class="ma-divider"></div>
            <div class="ma-item"><div class="ma-label">200MA Slope</div><div class="ma-val pos">Rising ↑</div></div>
            <div class="ma-divider"></div>
            <div class="ma-item"><div class="ma-label">52W High</div><div class="ma-val neg">-6.2%</div></div>
            <div class="ma-divider"></div>
            <div class="ma-item"><div class="ma-label">52W Low</div><div class="ma-val pos">+67%</div></div>
          </div>
        </div>

        <!-- Earnings -->
        <div>
          <div class="section-heading">Earnings (Last 4 Quarters)</div>
          <div class="earnings-grid">
            <div class="eq-cell"><div class="eq-q">Q1 FY25</div><div class="eq-rev">Rev ₹280 Cr</div><div class="eq-pat">PAT ₹32 Cr</div></div>
            <div class="eq-cell"><div class="eq-q">Q2 FY25</div><div class="eq-rev">Rev ₹310 Cr</div><div class="eq-pat">PAT ₹38 Cr</div></div>
            <div class="eq-cell"><div class="eq-q">Q3 FY25</div><div class="eq-rev">Rev ₹375 Cr</div><div class="eq-pat pos">PAT ₹45 Cr ↑</div></div>
            <div class="eq-cell"><div class="eq-q">Q4 FY25</div><div class="eq-rev">Rev ₹420 Cr</div><div class="eq-pat pos">PAT ₹52 Cr ↑↑</div></div>
          </div>
          <div style="margin-top:8px;font-size:11px;color:var(--muted)">YoY: Revenue +34% · PAT +40% · PE 42x · D/E 0.1x</div>
        </div>

        <!-- Concall Summary -->
        <div>
          <div class="section-heading">📞 Concall AI Summary — Q4 FY25</div>

          <div style="background:var(--surface2);border-radius:8px;padding:12px;margin-bottom:10px;font-size:13px;font-weight:600;">
            Netweb is firing on all cylinders — data centre demand driving 40%+ growth with strong order book visibility into FY26.
          </div>

          <div class="concall-section guidance">
            <div class="concall-label">🎯 Guidance & Outlook</div>
            <ul>
              <li>Revenue: ₹1,800 Cr guided for FY26 (~40% growth)</li>
              <li>EBITDA margin: 14–15% maintained</li>
              <li>Order book: ₹1,800 Cr (2.5x TTM), 12-month executable</li>
            </ul>
          </div>

          <div class="concall-section">
            <div class="concall-label">📊 Strategic Updates</div>
            <ul>
              <li>Entering hyperscale data centre segment (new, higher-margin)</li>
              <li>Partnership with global OEM for GPU server assembly</li>
            </ul>
          </div>

          <div class="concall-section triggers">
            <div class="concall-label">📈 Earnings Triggers</div>
            <ul>
              <li>First hyperscale order win = re-rating event</li>
              <li>Capacity utilisation crossing 85% = margin expansion</li>
              <li>Any export order (currently 100% domestic)</li>
            </ul>
          </div>

          <div class="concall-section risks">
            <div class="concall-label">⚠️ Risks</div>
            <ul>
              <li>"Dependent on government and BFSI spending" — concentration</li>
              <li>Component lead times remain elevated</li>
              <li>No moat from pricing — purely execution-driven</li>
            </ul>
          </div>

          <div class="concall-section qa">
            <div class="concall-label">❓ Key Q&A</div>
            <div class="qa-item"><div class="qa-q">Can margins sustain at 14%+ with hyperscale?</div><div class="qa-a">→ Yes, hyperscale margins are higher than traditional servers</div></div>
            <div class="qa-item"><div class="qa-q">Order book concentration?</div><div class="qa-a">→ Top 3 clients = 45%, diversifying actively</div></div>
            <div class="qa-item"><div class="qa-q">Risk of order cancellation?</div><div class="qa-a">→ All backed by POs, no cancellations in history</div></div>
          </div>

          <div class="concall-section consistency">
            <div class="concall-label">🔄 Management Consistency</div>
            <ul>
              <li>Q3 guided ₹400 Cr Q4 revenue → Delivered ₹420 Cr ✅</li>
              <li>FY25 margin guidance 13–14% → Delivered 14.2% ✅</li>
            </ul>
            <div class="credibility-row">
              <span class="stars">⭐⭐⭐⭐⭐</span>
              <span style="font-size:12px;color:var(--muted)">Highly consistent — beats own guidance</span>
            </div>
          </div>

          <div class="concall-section verdict">
            <div class="concall-label">🧭 Investor Verdict</div>
            <p>Management is conservative, consistently delivers or beats. Business is in a structural tailwind (AI infra, data centres). Risk is valuation (42x PE) — any demand slowdown will compress the multiple sharply.</p>
          </div>
        </div>

        <!-- Risks -->
        <div>
          <div class="section-heading">Risk Flags</div>
          <span class="tag tag-risk">High PE 42x</span>
          <span class="tag tag-risk">Client concentration 45%</span>
          <span class="tag tag-ok">Debt-free</span>
          <span class="tag tag-ok">Stage 2B</span>
          <span class="tag tag-ok">Earnings accelerating</span>
        </div>

        <!-- Action -->
        <div style="background:var(--surface2);border-radius:8px;padding:12px;border-left:3px solid var(--green)">
          <div style="font-size:11px;color:var(--green);font-weight:700;margin-bottom:4px">ACTION — HOLD</div>
          <div style="font-size:13px">Strong Stage 2B, management credible, earnings accelerating. Add only on 8–10% dip to 50MA (₹6,810). Don't chase at 52W high.</div>
        </div>

      </div>
    </div>

    -->
  </div>

</div>

<!-- ════════════════════════════════════════════
     TAB 4 — REBALANCING
════════════════════════════════════════════ -->
<div id="tab-rebalance" class="tab-content">

  <div class="card">
    <div class="card-title">Rebalancing Priority List</div>
    <div class="priority-list">
      {{REBALANCING_ITEMS}}
      <!-- Each item format:
      <div class="priority-item high">
        <div class="priority-num">1</div>
        <div>
          <div class="priority-stock">PAYTM <span class="action-badge action-exit" style="margin-left:8px">EXIT</span></div>
          <div class="priority-reason">Stage 4 · Down 32% from avg buy · -5.8% today · Thesis broken. Exit or cut to &lt;1%.</div>
        </div>
      </div>
      Priority classes: high (red), medium (yellow), low (blue), add (green)
      -->
    </div>
  </div>

  <div class="card">
    <div class="card-title">Capital Reallocation Suggestion</div>
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>Stock</th>
            <th>Current Weight</th>
            <th>Suggested Weight</th>
            <th>Action</th>
            <th>Rationale</th>
          </tr>
        </thead>
        <tbody>
          {{REALLOCATION_ROWS}}
        </tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Portfolio Health Score</div>
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-label">Stage 2 Capital</div>
        <div class="stat-value pos">{{STAGE2_PCT}}%</div>
        <div class="stat-sub">Uptrend only · Target: &gt;70%</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Stage 1 Capital</div>
        <div class="stat-value neu">{{STAGE1_PCT}}%</div>
        <div class="stat-sub">Basing — not uptrend</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">At Risk (Stage 3+4)</div>
        <div class="stat-value neg">{{ATRISK_PCT}}%</div>
        <div class="stat-sub">Target: &lt;10%</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Earnings Accelerating</div>
        <div class="stat-value pos">{{ACCEL_PCT}}%</div>
        <div class="stat-sub">of portfolio · N/A if Module 1 only</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Avg Mgmt Credibility</div>
        <div class="stat-value neu">{{AVG_STARS}}⭐</div>
        <div class="stat-sub">across holdings</div>
      </div>
    </div>
  </div>

</div>

<script>
  function showTab(name, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    if (btn) btn.classList.add('active');
  }
  function showStock(symbol) {
    document.querySelectorAll('.stock-detail-panel .stock-card').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.stock-nav-btn').forEach(el => el.classList.remove('active'));
    const card = document.getElementById('stock-' + symbol);
    if (card) card.classList.add('active');
    const btn = document.querySelector('[data-stock="' + symbol + '"]');
    if (btn) btn.classList.add('active');
  }
  document.addEventListener('DOMContentLoaded', () => {
    const first = document.querySelector('.stock-nav-btn');
    if (first) showStock(first.dataset.stock);
  });
</script>

</body>
</html>
```

---

## How to fill placeholders

When generating the HTML file, replace every `{{PLACEHOLDER}}` with computed values:

| Placeholder | Source |
|---|---|
| `{{DATE}}` | Today's date e.g. `16 May 2026` |
| `{{USER_NAME}}` | From `get_profile` — `user_name` field |
| `{{TOTAL_INVESTED}}` | Sum of `quantity × average_price` across all holdings, formatted as Indian lakhs e.g. \`8,42,300\` |
| `{{TOTAL_CURRENT}}` | Sum of `quantity × last_price` |
| `{{TOTAL_PNL}}` | `total_current - total_invested` |
| `{{TOTAL_RETURN_PCT}}` | `(total_pnl / total_invested) × 100`, 1 decimal |
| `{{PNL_CLASS}}` | `pos` if positive, `neg` if negative |
| `{{PNL_SIGN}}` | `+` or empty string |
| `{{DAY_SIGN}}` | `+` if total_day_change > 0, else empty string |
| `{{DAY_CHANGE}}` | `Σ (last_price × day_change_percentage/100 × quantity)` — derives absolute ₹ change from percentage field |
| `{{DAY_CHANGE_PCT}}` | `(total_day_change / total_current) × 100`, 2 decimal |
| `{{DAY_CLASS}}` | `pos` if positive, `neg` if negative |
| `{{NUM_STOCKS}}` | Count of holdings |
| `{{STAGE1_PCT}}` | % of portfolio value in Stage 1 stocks only (basing — NOT uptrend) |
| `{{STAGE2_PCT}}` | % of portfolio value in Stage 2 stocks only (uptrend) |
| `{{ATRISK_PCT}}` | % of portfolio value in Stage 3 + Stage 4 stocks |
| `{{HOLDINGS_ROWS}}` | One `<tr>` per holding |
| `{{ALLOCATION_ROWS}}` | One `.alloc-row` div per holding, sorted by weight descending. Use a different color per stock (cycle through: #6366f1, #22c55e, #f59e0b, #ef4444, #60a5fa, #a78bfa, #2dd4bf, #fb923c, #f472b6, #34d399, #94a3b8) |
| `{{BENCHMARK_ROWS}}` | One `<tr>` per period (1M, 3M, 6M, 1Y) |
| `{{BENCHMARK_BARS}}` | One `.bar-row` per benchmark for 1Y period |
| `{{STOCK_RETURNS_ROWS}}` | One `<tr>` per stock with period returns |
| `{{PERFORMANCE_INSIGHTS}}` | 4-6 `.insight-item` divs |
| `{{STAGE_SUMMARY_ROWS}}` | One `<tr>` per stock |
| `{{STOCK_CARDS}}` | Full card HTML per stock (see template above) |
| `{{REBALANCING_ITEMS}}` | `.priority-item` divs sorted: high → medium → low → add |
| `{{REALLOCATION_ROWS}}` | One `<tr>` per stock showing current vs suggested weight |
| `{{ACCEL_PCT}}` | % portfolio weight where earnings accelerating (2+ quarters of PAT growth) |
| `{{AVG_STARS}}` | Average management credibility score across all stocks (1 decimal) |

## Bar chart scaling
Find the maximum absolute return value across all benchmarks. Scale bars so that max = 95% width.

**Negative bar rendering** — CSS `width` cannot be negative. Use this pattern:
```html
<!-- Positive bar (normal) -->
<div class="bar-fill green" style="width:{{WIDTH}}%">+X.X%</div>

<!-- Negative bar — use right-to-left fill via margin-left trick -->
<div style="display:flex;justify-content:flex-end;height:100%">
  <div class="bar-fill red" style="width:{{ABS_WIDTH}}%;border-radius:4px 0 0 4px;padding-right:8px;justify-content:flex-end">−X.X%</div>
</div>
```
Scale negative bars by their absolute value against the same max.

---

## UI Standardisation Rules (apply every run without exception)

These rules ensure the report looks identical every time it is generated.

### Colour palette — never deviate
```
--bg: #0f1117          (page background)
--surface: #1a1d27     (card background)
--surface2: #22263a    (inner box / table row hover)
--border: #2e3250      (all borders)
--text: #e2e8f0        (primary text)
--muted: #8892b0       (labels, secondary text)
--green: #22c55e       (positive, Stage 2, gains)
--red: #ef4444         (negative, Stage 4, losses)
--yellow: #f59e0b      (warning, Stage 3, watch)
--blue: #60a5fa        (neutral info, Stage 1)
--purple: #a78bfa      (triggers, accents)
--accent: #6366f1      (nav active, headings)
```

### Stage badge colours — always these exact styles
```css
.stage-2 { background:#14532d; color:#4ade80; border:1px solid #16a34a; }
.stage-1 { background:#1e3a5f; color:#93c5fd; border:1px solid #2563eb; }
.stage-3 { background:#451a03; color:#fcd34d; border:1px solid #d97706; }
.stage-4 { background:#450a0a; color:#fca5a5; border:1px solid #dc2626; }
```

### Action badge colours — always these exact styles
```css
.action-hold     { background:#1e3a5f; color:#93c5fd; }
.action-strong   { background:#0f2b1a; color:#4ade80; border:1px solid #16a34a; } /* STRONG HOLD */
.action-trim     { background:#451a03; color:#fcd34d; }
.action-exit     { background:#450a0a; color:#fca5a5; }
.action-add      { background:#14532d; color:#4ade80; }
.action-watch    { background:#1c1c40; color:#a78bfa; }
.action-tracking { background:#1a1a2e; color:#94a3b8; border:1px solid #2e3250; }
```

STRONG HOLD badge HTML: `<span class="action-badge action-strong">✅ STRONG HOLD</span>`

### Concall section colours — always these exact border/background combos
```css
/* Company Overview */  border:#60a5fa;  background:#0d1b2a;
/* One-liner */         border:#6366f1;  background:#12122a;
/* Guidance */          border:#22c55e;  background:#0a1f0f;
/* Strategic */         border:#6366f1;  background:#12122a;
/* Triggers */          border:#a78bfa;  background:#130f2a;
/* Risks */             border:#ef4444;  background:#1f0a0a;
/* Q&A */               border:#f59e0b;  background:#1f1508;
/* Consistency */       border:#8892b0;  background:#22263a;
/* Verdict */           border:#60a5fa;  background:#0f1b2d;
```

### Stock colour palette (same order every time, by portfolio weight descending)
`#6366f1, #22c55e, #f59e0b, #ef4444, #60a5fa, #a78bfa, #2dd4bf, #fb923c, #f472b6, #34d399, #94a3b8`

If portfolio has more than 11 stocks: cycle back to the first colour with 60% opacity (append `99` to hex, e.g., `#6366f199`).


### Typography
- Card titles: `font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted)`
- Section headings inside cards: `font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted)`
- Body text: `font-size:13px; line-height:1.6`
- Small labels: `font-size:11px`
- Stat values: `font-size:22px; font-weight:700`

### Layout
- Max content width: `1400px; margin:0 auto`
- Card padding: `20px 24px`
- Card border-radius: `12px`
- Gap between cards: `20px`
- Tab content padding: `24px`

---

## Stage Analysis Tab — Stock Selector (REQUIRED)

Tab 3 (Stage Analysis) MUST include a stock selector that lets the user navigate between stock cards without scrolling. Implement as a **left sidebar on desktop, dropdown on mobile**.

```html
<!-- Stage Analysis tab layout -->
<div id="tab-stages" class="tab-content">

  <!-- Stage summary table (full width, always shown) -->
  <div class="card">...</div>

  <!-- Two-column layout: sidebar + detail panel -->
  <div class="stage-layout">

    <!-- LEFT SIDEBAR — stock list -->
    <div class="stock-sidebar">
      <div class="sidebar-title">Stocks</div>
      <!-- One button per stock, sorted by weight descending -->
      <button class="stock-nav-btn active" onclick="showStock('TATAELXSI')" data-stock="TATAELXSI">
        <div class="snb-symbol">TATAELXSI</div>
        <div class="snb-meta">17.8% · <span class="stage-dot stage-2-dot"></span> 2B</div>
        <div class="snb-pnl pos">+41.2%</div>
      </button>
      <!-- repeat for each stock -->
    </div>

    <!-- RIGHT PANEL — stock detail cards, one per stock, hidden by default -->
    <div class="stock-detail-panel">
      <div id="stock-TATAELXSI" class="stock-card active">...</div>
      <div id="stock-NH" class="stock-card">...</div>
      <!-- etc -->
    </div>

  </div>

  <!-- MOBILE FALLBACK — dropdown selector (shown only on small screens) -->
  <div class="mobile-stock-selector">
    <select onchange="showStock(this.value)">
      <option value="TATAELXSI">TATAELXSI — 17.8% · Stage 2B</option>
      <!-- etc -->
    </select>
  </div>

</div>
```

### CSS for the layout
```css
.stage-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px;
  align-items: start;
}
.stock-sidebar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 8px;
  position: sticky;
  top: 72px;            /* below topnav */
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}
.sidebar-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  padding: 4px 8px 10px;
}
.stock-nav-btn {
  width: 100%;
  background: none;
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  margin-bottom: 2px;
  transition: background 0.15s;
}
.stock-nav-btn:hover { background: var(--surface2); }
.stock-nav-btn.active { background: var(--accent); }
.stock-nav-btn.active .snb-symbol { color: #fff; }
.stock-nav-btn.active .snb-meta  { color: rgba(255,255,255,0.7); }
.snb-symbol { font-size: 13px; font-weight: 700; color: var(--text); }
.snb-meta   { font-size: 10px; color: var(--muted); margin-top: 2px; }
.snb-pnl    { font-size: 11px; font-weight: 600; margin-top: 2px; }
.stage-dot  { display:inline-block; width:8px; height:8px; border-radius:50%; vertical-align:middle; }
.stage-2-dot { background:#22c55e; }
.stage-1-dot { background:#60a5fa; }
.stage-3-dot { background:#f59e0b; }
.stage-4-dot { background:#ef4444; }

.stock-detail-panel { min-width: 0; }
/* IMPORTANT: .stock-card display:none only applies inside .stock-detail-panel
   so it does not interfere with any other .stock-card usage in the document */
.stock-detail-panel .stock-card { display: none; }
.stock-detail-panel .stock-card.active { display: block; }

.mobile-stock-selector { display: none; }
.mobile-stock-selector select {
  width: 100%;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  margin-bottom: 16px;
}

@media (max-width: 800px) {
  .stage-layout { grid-template-columns: 1fr; }
  .stock-sidebar { display: none; }
  .mobile-stock-selector { display: block; }
}
```

### JavaScript for switching stocks
```javascript
function showStock(symbol) {
  // hide all cards
  document.querySelectorAll('.stock-card').forEach(el => el.classList.remove('active'));
  // deactivate all nav buttons
  document.querySelectorAll('.stock-nav-btn').forEach(el => el.classList.remove('active'));
  // show selected
  const card = document.getElementById('stock-' + symbol);
  if (card) card.classList.add('active');
  const btn = document.querySelector('[data-stock="' + symbol + '"]');
  if (btn) btn.classList.add('active');
}
// show first stock by default on load
document.addEventListener('DOMContentLoaded', () => {
  const first = document.querySelector('.stock-nav-btn');
  if (first) showStock(first.dataset.stock);
});
```

---

## Stock Card Structure — Standardised (use every run)

Every stock card in the detail panel MUST follow this exact section order and use these exact section heading labels:

1. **TECHNICAL** — MA strip + 52W range
2. **EARNINGS** — last 4 quarters table
3. **COMPANY OVERVIEW** — 8–10 bullet points from whitelisted sources
4. **ONE-LINE SUMMARY** — single sentence from concall
5. **GUIDANCE & OUTLOOK** — 8–10 bullets
6. **STRATEGIC UPDATES** — 8–10 bullets
7. **EARNINGS TRIGGERS** — 8–10 bullets
8. **RISKS** — 8–10 bullets
9. **KEY Q&A** — 8–10 exchanges
10. **MANAGEMENT CONSISTENCY** — 8–10 comparison points + ⭐ rating
11. **INVESTOR VERDICT** — 3–5 sentences
12. **RISK FLAGS** — tag pills
13. **ACTION** — coloured action block with rationale and price levels

Each section uses its standardised colour (defined in "Concall section colours" above). Section headings are ALL CAPS, 11px, muted colour.

---

## Tracking Position Rule in HTML

For stocks where weight ≤ 0.2%:
- Show `<span class="action-badge action-tracking">TRACKING</span>` badge
- Add note inside the action block: *"Tracking position — held to monitor thesis. Add to ≥2% on confirmation or exit if thesis fails."*
- Do NOT show EXIT as the action badge based on size alone

## After writing the file
Always run:
```bash
open ~/Desktop/portfolio-report-YYYY-MM-DD.html
```
Then tell the user: "Report saved to Desktop and opened in your browser."
