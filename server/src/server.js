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

// -------- Verse API (now supports Book Chapter:Verse or Book Chapter) -------
app.get('/api/verse', (req, res) => {
  try {
    const ref = String(req.query.ref || '').trim();
    if (!ref) return res.status(400).json({ error: 'Missing ref' });

    const result = ChristGuard.quote(ref); // string (verse) or object (chapter)

    // If a whole chapter is requested, return the map { "1": "In the beginning...", ... }
    if (typeof result === 'object') {
      return res.json({ ref, version: 'KJV', text: result });
    }

    // Single verse string
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
    // simple gate using ChristGuard; could expand later
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
    const html = await renderWeekHTML({ week, theme, refs, quote: ChristGuard.quote.bind(ChristGuard) });
    res.type('html').send(html);
  } catch (e) {
    res.status(400).send(String(e.message || e));
  }
});

app.post('/api/printables/week.pdf', async (req, res) => {
  try {
    const { week, theme, refs = [] } = req.body || {};
    const html = await renderWeekHTML({ week, theme, refs, quote: ChristGuard.quote.bind(ChristGuard) });
    const pdf = await makePDF(html);
    res.setHeader('Content-Disposition', `attachment; filename="week-${week || 'study'}.pdf"`);
    res.type('application/pdf').send(pdf);
  } catch (e) {
    res.status(400).send(String(e.message || e));
  }
});

// Start
const PORT = process.env.PORT || 3000;
const ChristGuard = require('./christ-guard');

app.get('/api/debug/has', (req, res) => {
  const { book = '', chapter = '', verse = '' } = req.query;
  const store = ChristGuard.loadStore();
  const b = store[book];
  const c = b && b[chapter];
  const v = c && c[verse];
  res.json({
    hasBook: !!b,
    hasChapter: !!c,
    hasVerse: typeof v === 'string',
    sampleChapters: b ? Object.keys(b).slice(0, 5) : [],
    sampleVerses: c ? Object.keys(c).slice(0, 10) : []
  });
});
app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
