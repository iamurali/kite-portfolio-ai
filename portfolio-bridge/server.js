/**
 * Portfolio Bridge Server
 * Serves the portfolio HTML report at http://localhost:7891/report and
 * handles /analyse requests from Tab 5 — same-origin, no CORS issues.
 *
 * Flow:
 *   open http://localhost:7891/report  (served by this server, not file://)
 *   Tab 5 → fetch('/analyse?ticker=NETWEB')  (same origin)
 *   → Check 7-day cache in ~/.portfolio/cache/
 *   → If miss: write trigger file to ~/.portfolio/analyse-queue/
 *   → Poll for result in ~/.portfolio/results/ (120s timeout)
 *   → Return HTML fragment to browser for Tab 5 injection
 *
 * Why serve the report here instead of file://?
 *   Browsers (Safari, Chrome) block fetch() from file:// to localhost
 *   regardless of CORS headers. Serving from the same origin eliminates
 *   the restriction entirely.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const app = express();
const PORT = 7891;
const CACHE_TTL_DAYS = 7;

// Paths
const BASE_DIR = path.join(os.homedir(), '.portfolio');
const CACHE_DIR = path.join(BASE_DIR, 'cache');
const RESULTS_DIR = path.join(BASE_DIR, 'results');
const QUEUE_DIR = path.join(BASE_DIR, 'analyse-queue');
const DATA_DIR = path.join(BASE_DIR, 'data');
const STOCK_REPORTS_DIR = path.join(BASE_DIR, 'stock-reports');
const DESKTOP_DIR = path.join(os.homedir(), 'Desktop');
const REPO_REPORT = path.join(__dirname, '..', 'report', 'report.html');

// Ensure directories exist
[BASE_DIR, CACHE_DIR, RESULTS_DIR, QUEUE_DIR, DATA_DIR, STOCK_REPORTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Queue watcher state — tracks in-flight claude spawns
const activeJobs = new Set();
const QUEUE_POLL_INTERVAL = 10000; // 10s
const CLAUDE_BIN = '/opt/homebrew/bin/claude';

app.use(express.json());

/**
 * Root redirect → /report
 */
app.get('/', (req, res) => res.redirect('/report'));

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok', port: PORT, cacheTtlDays: CACHE_TTL_DAYS,
    activeJobs: [...activeJobs], queueWatcher: 'running'
  });
});

/**
 * Serve the static report.html from the repo.
 * Falls back to the latest Desktop HTML if repo file not found.
 */
// Deep-link: /report/stock/:ticker → same report.html, JS reads path and auto-triggers analyser
app.get('/report/stock/:ticker', (req, res) => {
  if (fs.existsSync(REPO_REPORT)) return res.sendFile(REPO_REPORT);
  res.redirect('/report');
});

app.get('/report', (req, res) => {
  if (fs.existsSync(REPO_REPORT)) {
    return res.sendFile(REPO_REPORT);
  }
  // Legacy fallback: serve newest Desktop HTML (old architecture)
  try {
    const files = fs.readdirSync(DESKTOP_DIR)
      .filter(f => f.startsWith('portfolio-report-') && f.endsWith('.html'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(DESKTOP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (!files.length) {
      return res.status(404).send(noDataPage('No report found. Run <code>/portfolio</code> in Claude Code.'));
    }
    let html = fs.readFileSync(path.join(DESKTOP_DIR, files[0].name), 'utf8');
    html = html.replace(/http:\/\/localhost:7891/g, '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

// ─── Portfolio JSON Data Endpoints ───────────────────────────────────────────

/**
 * GET /data/latest — returns the most recent portfolio JSON
 */
app.get('/data/latest', (req, res) => {
  const latest = latestDataFile();
  if (!latest) return res.status(404).json({ error: 'No portfolio data found. Run /portfolio in Claude Code.' });
  try {
    const data = JSON.parse(fs.readFileSync(latest, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to read data: ${err.message}` });
  }
});

/**
 * GET /data/list — returns array of available portfolio data files
 */
app.get('/data/list', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR)
      .filter(f => f.startsWith('portfolio-') && f.endsWith('.json') && !f.includes('tmp'))
      .map(f => {
        const stat = fs.statSync(path.join(DATA_DIR, f));
        const dateMatch = f.match(/portfolio-(\d{4}-\d{2}-\d{2})\.json/);
        return {
          file: f,
          date: dateMatch ? dateMatch[1] : null,
          size_kb: Math.round(stat.size / 1024),
          mtime: stat.mtimeMs
        };
      })
      .filter(f => f.date)
      .sort((a, b) => b.mtime - a.mtime);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /data/:date — returns portfolio JSON for a specific date
 * e.g. GET /data/2026-05-30
 */
app.get('/data/:date', (req, res) => {
  const dateStr = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }
  const filepath = path.join(DATA_DIR, `portfolio-${dateStr}.json`);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: `No data for ${dateStr}` });
  }
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Main analysis endpoint
 * GET /analyse?ticker=NETWEB[&refresh=true]
 */
app.get('/analyse', async (req, res) => {
  const ticker = (req.query.ticker || '').toUpperCase().trim();
  const forceRefresh = req.query.refresh === 'true';

  if (!ticker || !/^[A-Z0-9&-]{1,20}$/.test(ticker)) {
    return res.status(400).json({ error: 'Invalid ticker symbol' });
  }

  try {
    // 1. Check cache (skip if force refresh)
    if (!forceRefresh) {
      const cached = findFreshCache(ticker);
      if (cached) {
        console.log(`[cache hit] ${ticker} — returning cached result`);
        const age = getCacheAgeHours(cached.generated_at);
        return res.json({
          source: 'cache',
          ticker,
          score: cached.score,
          action: cached.action,
          generated_at: cached.generated_at,
          age_hours: Math.round(age),
          html_fragment: cached.html_fragment,
          cache_badge: buildCacheBadge(age)
        });
      }
    }

    // 2. Write trigger file to queue
    const triggerPath = path.join(QUEUE_DIR, `${ticker}.trigger`);
    fs.writeFileSync(triggerPath, JSON.stringify({
      ticker,
      requested_at: new Date().toISOString(),
      refresh: forceRefresh
    }));
    console.log(`[queue] Wrote trigger for ${ticker}`);

    // 3. Poll for result (120 second timeout, check every 3s)
    const result = await pollForResult(ticker, 120000, 3000);

    if (!result) {
      return res.status(504).json({
        error: 'Analysis timed out. Run `/portfolio:stock ' + ticker + '` in Claude Code first, then retry.',
        fallback_command: `/portfolio:stock ${ticker}`
      });
    }

    console.log(`[result] ${ticker} — score ${result.score}, action ${result.action}`);
    return res.json({
      source: 'fresh',
      ticker,
      score: result.score,
      action: result.action,
      generated_at: result.generated_at,
      age_hours: 0,
      html_fragment: result.html_fragment,
      cache_badge: null
    });

  } catch (err) {
    console.error(`[error] ${ticker}:`, err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * List cached tickers (for Tab 5 to show recently analysed)
 */
app.get('/cache/list', (req, res) => {
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    const entries = files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'));
        return {
          ticker: data.ticker,
          company: data.company || '',
          score: data.score,
          action: data.action,
          generated_at: data.generated_at,
          expires_at: data.expires_at,
          fresh: new Date(data.expires_at) > new Date()
        };
      } catch { return null; }
    }).filter(Boolean).filter(e => e.fresh);

    entries.sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Clear cache for a specific ticker
 */
app.delete('/cache/:ticker', (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.startsWith(ticker + '-'));
  files.forEach(f => fs.unlinkSync(path.join(CACHE_DIR, f)));
  res.json({ cleared: files.length, ticker });
});

/**
 * GET /stock/list — must be declared BEFORE /stock/:ticker to avoid route shadowing
 */
app.get('/stock/list', (req, res) => {
  try {
    const tickers = fs.existsSync(STOCK_REPORTS_DIR)
      ? fs.readdirSync(STOCK_REPORTS_DIR).filter(f => {
          try { return fs.statSync(path.join(STOCK_REPORTS_DIR, f)).isDirectory(); }
          catch { return false; }
        })
      : [];
    res.json({ tickers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /stock/:ticker — returns structured stock analysis JSON from stock-reports dir.
 * Primary path: ~/.portfolio/stock-reports/<TICKER>/latest.json
 * Fallback: cache html_fragment (legacy backwards compat)
 */
app.get('/stock/:ticker', (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  if (!/^[A-Z0-9&-]{1,20}$/.test(ticker)) {
    return res.status(400).json({ error: 'Invalid ticker symbol' });
  }
  const tickerDir = path.join(STOCK_REPORTS_DIR, ticker);
  const latestLink = path.join(tickerDir, 'latest.json');
  const cacheMeta = findFreshCache(ticker);

  if (fs.existsSync(latestLink)) {
    try {
      const data = JSON.parse(fs.readFileSync(latestLink, 'utf8'));
      const isFresh = cacheMeta && new Date(cacheMeta.expires_at) > new Date();
      return res.json({ source: isFresh ? 'cache' : 'stale', ...data });
    } catch (err) {
      return res.status(500).json({ error: `Failed to read stock report: ${err.message}` });
    }
  }

  // Legacy fallback: html_fragment in cache
  if (cacheMeta && cacheMeta.html_fragment) {
    return res.json({ source: 'cache_legacy', ticker, ...cacheMeta });
  }

  return res.status(404).json({
    error: `No stock report found for ${ticker}. Run /portfolio:stock ${ticker} in Claude Code.`,
    fallback_command: `/portfolio:stock ${ticker}`
  });
});

/**
 * POST /trigger/bulk — queue multiple tickers for analysis
 * Body: { tickers: ["NETWEB", "ZAGGLE"] }
 */
app.post('/trigger/bulk', (req, res) => {
  const tickers = (req.body.tickers || [])
    .map(t => String(t).toUpperCase().trim())
    .filter(t => /^[A-Z0-9&-]{1,20}$/.test(t));

  if (!tickers.length) {
    return res.status(400).json({ error: 'No valid tickers provided' });
  }

  const queued = [];
  for (const ticker of tickers) {
    if (activeJobs.has(ticker)) continue; // already running — skip
    const triggerPath = path.join(QUEUE_DIR, `${ticker}.trigger`);
    try {
      fs.writeFileSync(triggerPath, JSON.stringify({
        ticker,
        requested_at: new Date().toISOString(),
        refresh: false
      }));
      queued.push(ticker);
      console.log(`[bulk] Queued trigger for ${ticker}`);
    } catch (err) {
      console.error(`[bulk] Failed to write trigger for ${ticker}:`, err.message);
    }
  }

  res.json({ queued, count: queued.length, active: [...activeJobs] });
});

/**
 * GET /trigger/status — show queue state
 */
app.get('/trigger/status', (req, res) => {
  try {
    const pendingFiles = fs.readdirSync(QUEUE_DIR).filter(f => f.endsWith('.trigger'));
    const pending = pendingFiles.map(f => f.replace('.trigger', ''));
    const active = [...activeJobs];

    // "done" = tickers in stock-reports but not pending or active
    const allReported = fs.existsSync(STOCK_REPORTS_DIR)
      ? fs.readdirSync(STOCK_REPORTS_DIR).filter(f => {
          return fs.statSync(path.join(STOCK_REPORTS_DIR, f)).isDirectory();
        })
      : [];

    res.json({ pending, active, done: allReported, pendingCount: pending.length, activeCount: active.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function latestDataFile() {
  if (!fs.existsSync(DATA_DIR)) return null;
  // Prefer symlink latest.json
  const latestLink = path.join(DATA_DIR, 'latest.json');
  if (fs.existsSync(latestLink)) return latestLink;
  // Fall back to newest portfolio-YYYY-MM-DD.json
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('portfolio-') && f.endsWith('.json') && !f.includes('tmp'))
    .map(f => ({ f, mtime: fs.statSync(path.join(DATA_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length ? path.join(DATA_DIR, files[0].f) : null;
}

function noDataPage(msg) {
  return `<html><body style="background:#0f1117;color:#e2e8f0;font-family:sans-serif;padding:40px;text-align:center"><h2 style="color:#6366f1">📊 Portfolio</h2><p style="color:#8892b0;margin-top:12px">${msg}</p></body></html>`;
}

function findFreshCache(ticker) {
  const files = fs.readdirSync(CACHE_DIR)
    .filter(f => f.startsWith(ticker + '-') && f.endsWith('.json'));

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
      if (new Date(data.expires_at) > new Date()) return data;
    } catch { /* skip corrupt files */ }
  }
  return null;
}

function getCacheAgeHours(generatedAt) {
  return (Date.now() - new Date(generatedAt).getTime()) / (1000 * 60 * 60);
}

function buildCacheBadge(ageHours) {
  if (ageHours < 1) return 'Cached · just now';
  if (ageHours < 24) return `Cached · ${Math.round(ageHours)}h ago`;
  const days = Math.floor(ageHours / 24);
  return `Cached · ${days}d ago`;
}

function pollForResult(ticker, timeoutMs, intervalMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const today = new Date().toISOString().slice(0, 10);
    const stockReportPath = path.join(STOCK_REPORTS_DIR, ticker, 'latest.json');
    const resultPath = path.join(RESULTS_DIR, `${ticker}-${today}.html`);
    const cachePath = path.join(CACHE_DIR, `${ticker}-${today}.json`);

    const check = () => {
      // Primary: check new stock-reports JSON path (JSON-first architecture)
      if (fs.existsSync(stockReportPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(stockReportPath, 'utf8'));
          if (data.meta && data.score) {
            const cacheMeta = findFreshCache(ticker);
            return resolve({
              ticker,
              score: data.score ? data.score.total : null,
              action: data.score ? data.score.action : 'VIEW',
              generated_at: data.meta ? data.meta.generated_at : new Date().toISOString(),
              html_fragment: null,
              stock_data: data,
              source: 'stock_reports'
            });
          }
        } catch { /* keep polling */ }
      }
      // Legacy: cache JSON with html_fragment
      if (fs.existsSync(cachePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
          if (data.html_fragment) return resolve(data);
        } catch { /* keep polling */ }
      }
      // Legacy fallback: result HTML file
      if (fs.existsSync(resultPath)) {
        const html = fs.readFileSync(resultPath, 'utf8');
        return resolve({
          ticker,
          score: null,
          action: 'VIEW',
          generated_at: new Date().toISOString(),
          html_fragment: html
        });
      }
      if (Date.now() >= deadline) return resolve(null);
      setTimeout(check, intervalMs);
    };

    check();
  });
}

// ─── Queue Watcher — auto-spawn analyse.mjs for trigger files ────────────────

const ANALYSE_SCRIPT = path.join(__dirname, 'analyse.mjs');

function spawnClaudeAnalysis(ticker, refresh) {
  // V3: run analyse.mjs locally — single Node process, 1 Claude call, exact schema
  const nodeArgs = [ANALYSE_SCRIPT, ticker];
  if (refresh) nodeArgs.push('--refresh');

  console.log(`[queue] Spawning: node ${ANALYSE_SCRIPT} ${ticker}${refresh ? ' --refresh' : ''}`);
  const child = spawn('node', nodeArgs, {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PATH: process.env.PATH + ':/opt/homebrew/bin:/usr/local/bin' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', d => {
    const line = d.toString().trim();
    if (line) console.log(`[analyse:${ticker}] ${line.slice(0, 200)}`);
  });
  child.stderr.on('data', d => {
    const line = d.toString().trim();
    if (line) console.error(`[analyse:${ticker}] ${line.slice(0, 200)}`);
  });
  child.on('close', code => {
    activeJobs.delete(ticker);
    console.log(`[queue] ${ticker} done (exit ${code})`);
  });
  child.on('error', err => {
    activeJobs.delete(ticker);
    console.error(`[queue] ${ticker} spawn error: ${err.message}`);
  });
}

function startQueueWatcher() {
  setInterval(() => {
    let files;
    try { files = fs.readdirSync(QUEUE_DIR).filter(f => f.endsWith('.trigger')); }
    catch { return; }

    for (const file of files) {
      const ticker = file.replace('.trigger', '').toUpperCase();
      if (activeJobs.has(ticker)) continue;

      const triggerPath = path.join(QUEUE_DIR, file);
      let triggerData;
      try { triggerData = JSON.parse(fs.readFileSync(triggerPath, 'utf8')); }
      catch { continue; }

      // Mark active + delete trigger before spawning (prevent double-run)
      activeJobs.add(ticker);
      try { fs.unlinkSync(triggerPath); } catch { /* ignore */ }

      spawnClaudeAnalysis(ticker, triggerData.refresh || false);
    }
  }, QUEUE_POLL_INTERVAL);
  console.log(`  Queue watcher: polling every ${QUEUE_POLL_INTERVAL / 1000}s`);
}

// ─── Skill Sync — keep ~/.claude/skills/kite-portfolio/ in sync with repo ────

function syncSkills() {
  const SKILLS_SRC = path.join(__dirname, '..', 'claude-skill');
  const SKILLS_DST = path.join(os.homedir(), '.claude', 'skills', 'kite-portfolio');

  const FILES = ['SKILL.md', 'stock-analyser-v2.js', 'stock-analyser.md', 'performance.md', 'stage-analysis.md', 'full.md', 'json-output.md'];
  const results = [];

  if (!fs.existsSync(SKILLS_DST)) {
    console.log(`  Skill sync:  ⚠️  dst not found: ${SKILLS_DST}`);
    return;
  }

  for (const file of FILES) {
    const src = path.join(SKILLS_SRC, file);
    // skill.md in dst is lowercase; SKILL.md in repo is uppercase
    const dstFile = file === 'SKILL.md' ? 'skill.md' : file;
    const dst = path.join(SKILLS_DST, dstFile);
    if (!fs.existsSync(src)) continue;
    try {
      const srcContent = fs.readFileSync(src);
      const dstContent = fs.existsSync(dst) ? fs.readFileSync(dst) : null;
      if (!dstContent || !srcContent.equals(dstContent)) {
        fs.writeFileSync(dst, srcContent);
        results.push(`  ✅ synced ${dstFile}`);
      } else {
        results.push(`  — unchanged ${dstFile}`);
      }
    } catch (err) {
      results.push(`  ❌ failed ${dstFile}: ${err.message}`);
    }
  }

  console.log(`  Skill sync:  ${SKILLS_DST}`);
  results.forEach(r => console.log(r));
}

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, '127.0.0.1', () => {
  const hasRepoReport = fs.existsSync(REPO_REPORT);
  const hasData = !!latestDataFile();
  const hasClaudebin = fs.existsSync(CLAUDE_BIN);
  console.log(`\nPortfolio Bridge  http://localhost:${PORT}`);
  console.log(`\n  Report:      http://localhost:${PORT}/report  ${hasRepoReport ? '✅ static' : '⚠️  fallback to Desktop HTML'}`);
  console.log(`  Data:        http://localhost:${PORT}/data/latest  ${hasData ? '✅ found' : '⚠️  no data yet — run /portfolio'}`);
  console.log(`  Health:      http://localhost:${PORT}/health`);
  console.log(`\n  Data dir:    ${DATA_DIR}`);
  console.log(`  Cache dir:   ${CACHE_DIR}`);
  console.log(`  Stock rpts:  ${STOCK_REPORTS_DIR}`);
  console.log(`  Cache TTL:   ${CACHE_TTL_DAYS} days`);
  console.log(`  Claude CLI:  ${hasClaudebin ? '✅ ' + CLAUDE_BIN : '⚠️  not found at ' + CLAUDE_BIN + ' — queue watcher will try PATH'}`);
  console.log(`\n  $ open http://localhost:${PORT}/report\n`);
  syncSkills();
  startQueueWatcher();
});
