---
name: stock-researcher
subcommand: full
description: >
  Full portfolio review: runs Module 1 (benchmark comparison) then Module 2 (stage + fundamental scoring).
  Use when the user says "/stock-researcher:full", "full portfolio review", "complete analysis",
  "analyse my portfolio", "portfolio review", or "run everything". Writes complete JSON and opens report.
---

# Full Portfolio Review

Run Module 1 then Module 2 in sequence:

1. Follow all steps in `stock-researcher-performance` sub-skill completely — writes performance fields to JSON.
2. Follow all steps in `stock-researcher-stage` sub-skill completely — reads JSON, merges stage fields, overwrites.
3. Open report after Module 2 completes:
   ```bash
   open "$(dirname "$0")/../../../../report/report.html" 2>/dev/null \
     || echo "Report at ~/.portfolio/data/latest.json — open report/report.html"
   ```

**Speed note:** The candle data fetched by Module 1 covers all stocks + benchmarks. Module 2 reuses this data — do NOT re-fetch candles. Only the WebSearches for earnings/concall run fresh in Module 2.
