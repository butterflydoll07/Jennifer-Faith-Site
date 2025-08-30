// Global error hooks (helps Render logs show root cause)
process.on('uncaughtException', err => console.error('[uncaughtException]', err));
process.on('unhandledRejection', err => console.error('[unhandledRejection]', err));

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const { ChristGuard } = require('./christ-guard');
const { renderWeekHTML, makePDF } = require('./printables');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static frontend
const WEB_DIR = path.resolve(__dirname, '../../web');
app.use('/', express.static(WEB_DIR));

// Data file for journal
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const JOURNAL_FILE = path.join(DATA_DIR, 'journal.json');
if (!fs.existsSync(JOURNAL_FILE)) fs.writeFileSync(JOURNAL_FILE, '[]', 'utf-8');

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Quick parser/debug endpoint
app.get('/api/parse', (req, res) => {
  try {
    const ref = String(req.query.ref || '');
    const found = ChristGuard.quote(ref); // throws if not found
    res.json({ ref, type: typeof found === 'string' ? 'single-verse' : 'chapter' });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// Store sanity endpoint
app.get('/api/debug/store', (_req, res) => {
  try {
    const store = ChristGuard.loadStore();
    res.json({ ok: true, books: Object.keys(store || {}).length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// -------- Verse API (Book C:V or Book C) ------------------------------------
app.get('/api/verse', (req, res) => {
  try {
    const ref = String(req.query.ref || '').trim();
    if (!ref) return res.status(400).json({ error: 'Missing ref' });
    const result = ChristGuard.quote(ref); // string (verse) or object (chapter)
    return res.json({ ref, version: 'KJV', text: result });
  } catch (e) {
    return res.status(404).json({ error: e.message });
  }
});

// -------- Christ Test --------------------------------------------------------
app.post('/api/check', (req, res) => {
  const text = String(req.body.text || '');
  res.json(ChristGuard.christTest(text));
});

// -------- Journal ------------------------------------------------------------
app.get('/api/journal', (_req, res) => {
  const arr = JSON.parse(fs.readFileSync(JOURNAL_FILE, 'utf-8'));
  res.json(arr);
});

app.post('/api/journal', async (req, res) => {
  try {
    const userText = String(req.body.text || '');
    const entry = { id: Date.now(), text: userText, at: new Date().toISOString() };
    const arr = JSON.parse(fs.readFileSync(JOURNAL_FILE, 'utf-8'));
    arr.unshift(entry);
    fs.writeFileSync(JOURNAL_FILE, JSON.stringify(arr, null, 2));
    res.json({ ok: true, entry });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// -------- Weekly printables (HTML + PDF) ------------------------------------
app.post('/api/printables/week', async (req, res) => {
  try {
    const { week, theme, refs = [] } = req.body || {};
    const html = renderWeekHTML({ week, theme, refs, quote: ChristGuard.quote.bind(ChristGuard) });
    res.type('html').send(html);
  } catch (e) {
    res.status(400).send(String(e.message || e));
  }
});

app.post('/api/printables/week.pdf', async (req, res) => {
  try {
    const { week, theme, refs = [] } = req.body || {};
    const html = renderWeekHTML({ week, theme, refs, quote: ChristGuard.quote.bind(ChristGuard) });
    const pdf = await makePDF(html);
    res.setHeader('Content-Disposition', `attachment; filename="week-${week || 'study'}.pdf"`);
    res.type('application/pdf').send(pdf);
  } catch (e) {
    res.status(400).send(String(e.message || e));
  }
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
