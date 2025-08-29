const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ChristGuard } = require('./christ-guard');
const { renderWeekHTML, htmlToPDF } = require('./printables');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static frontend
const WEB_DIR = path.resolve(__dirname, '../../web');
app.use('/', express.static(WEB_DIR));

// Journal data
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const JOURNAL_FILE = path.join(DATA_DIR, 'journal.json');
if (!fs.existsSync(JOURNAL_FILE)) fs.writeFileSync(JOURNAL_FILE, '[]', 'utf-8');

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Verse
app.get('/api/verse', (req, res) => {
  try {
    const ref = String(req.query.ref || '').trim();
    if (!ref) return res.status(400).json({ error: 'Missing ref' });
    const text = ChristGuard.quote(ref);
    return res.json({ ref, version: 'KJV', text });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

// Christ Test
app.post('/api/check', (req, res) => {
  const text = String(req.body.text || '');
  res.json(ChristGuard.christTest(text));
});

// Journal
app.get('/api/journal', (req, res) => {
  const arr = JSON.parse(fs.readFileSync(JOURNAL_FILE, 'utf-8'));
  res.json(arr);
});
app.post('/api/journal', async (req, res) => {
  try {
    const userText = String(req.body.text || '');
    const saved = await ChristGuard.enforce({ userText, generate: async () => userText });
    const entry = { id: Date.now(), text: saved, at: new Date().toISOString() };
    const arr = JSON.parse(fs.readFileSync(JOURNAL_FILE, 'utf-8'));
    arr.unshift(entry);
    fs.writeFileSync(JOURNAL_FILE, JSON.stringify(arr, null, 2));
    res.json({ ok: true, entry });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Printables
app.post('/api/printables/week', async (req, res) => {
  try {
    const { week=1, title="Weekly Session", refs=[], theme="Family" } = req.body || {};
    await ChristGuard.enforce({ userText: `${title} ${theme}`, generate: async () => `${title} ${theme}` });
    const html = renderWeekHTML({ week, title, refs, theme });
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/printables/week.pdf', async (req, res) => {
  try {
    const { week=1, title="Weekly Session", refs=[], theme="Family" } = req.body || {};
    await ChristGuard.enforce({ userText: `${title} ${theme}`, generate: async () => `${title} ${theme}` });
    const html = renderWeekHTML({ week, title, refs, theme });
    const pdf = await htmlToPDF(html);
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-disposition', `attachment; filename="week-${week}.pdf"`);
    res.send(pdf);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Jennifer running on http://localhost:${PORT}`));

module.exports = app;
