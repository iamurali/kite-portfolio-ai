---
name: kite-portfolio
subcommand: full
description: >
  Full portfolio review: runs Module 1 (benchmark comparison) then Module 2 (stage + fundamental scoring).
  Use when the user says "/kite-portfolio:full", "full portfolio review", "complete analysis", "analyse my portfolio",
  "portfolio review", or "run everything". Writes complete JSON and opens 5-tab report.
---

# Full Portfolio Review

Run Module 1 then Module 2 in sequence:

1. Follow all steps in `performance.md` completely (writes performance fields to JSON).
2. Follow all steps in `stage-analysis.md` completely (reads JSON, merges stage fields, overwrites).
3. Open report via bridge check (same as SKILL.md § Bridge Server Check).
