// server/src/printables.js
// Lightweight printable generator for weekly studies (exact KJV quotes)

const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Turn a verse payload (string or { "1": "...", "2": "..." }) into <li> items
function renderVerseBlock(ref, payload) {
  const safeRef = escapeHtml(ref);

  // Chapter (object of verseNumber -> text)
  if (payload && typeof payload === 'object') {
    const lines = Object.entries(payload)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([n, t]) => `<li><span class="vnum">${n}</span> ${escapeHtml(t)}</li>`)
      .join('');
    return `
      <section class="passage">
        <h3>${safeRef}</h3>
        <ol class="verses">
          ${lines}
        </ol>
      </section>`;
  }

  // Single verse (string)
  return `
    <section class="passage">
      <h3>${safeRef}</h3>
      <p class="single-verse">${escapeHtml(payload || '')}</p>
    </section>`;
}

// Build the full HTML for the week
async function renderWeekHTML({ week, theme, refs = [], quote }) {
  const wk = String(week || '').trim();
  const th = String(theme || '').trim();

  // Resolve verses (never paraphrase; `quote` must return exact KJV)
  const blocks = [];
  for (const ref of refs) {
    if (!ref) continue;
    try {
      const payload = quote(ref); // string or chapter-object
      blocks.push(renderVerseBlock(ref, payload));
    } catch (e) {
      blocks.push(`
        <section class="passage error">
          <h3>${escapeHtml(ref)}</h3>
          <p class="err">Error: ${escapeHtml(e.message || String(e))}</p>
        </section>
      `);
    }
  }

  const title = `Weekly Study${wk ? ` • Week ${escapeHtml(wk)}` : ''}`;
  const subtitle = th ? `Theme: ${escapeHtml(th)}` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  :root {
    --ink:#111; --muted:#666; --rule:#ddd; --brand:#1b4d89;
  }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; }
  body {
    font-family: "Georgia", serif;
    color: var(--ink);
    line-height: 1.5;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  header {
    padding: 24px 24px 10px;
    border-bottom: 1px solid var(--rule);
  }
  h1 {
    margin: 0 0 6px 0;
    font-size: 22px;
    letter-spacing: .3px;
  }
  .subtitle {
    margin: 0 0 4px 0;
    color: var(--muted);
    font-size: 14px;
  }
  .version {
    color: var(--muted);
    font-size: 12px;
  }

  main { padding: 18px 24px 28px; }
  .passage {
    padding: 14px 0;
    border-bottom: 1px dashed var(--rule);
  }
  .passage:last-child { border-bottom: 0; }
  h3 {
    margin: 0 0 6px 0;
    font-size: 16px;
    color: var(--brand);
  }
  .verses {
    margin: 0;
    padding-left: 22px;
  }
  .verses li { margin: 2px 0; }
  .vnum {
    display: inline-block;
    min-width: 1.2em;
    color: var(--muted);
    font-size: 12px;
    vertical-align: top;
  }
  .single-verse { margin: 0; }

  .notes {
    margin-top: 18px;
    padding: 10px 12px;
    border: 1px solid var(--rule);
    border-radius: 8px;
  }
  .notes h4 {
    margin: 0 0 6px 0;
    font-size: 14px;
    color: var(--muted);
  }
  .notes .lines {
    min-height: 120px;
    border-top: 1px dashed var(--rule);
    margin-top: 8px;
    padding-top: 8px;
  }

  @media print {
    header { page-break-after: avoid; }
    .passage { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ``}
    <p class="version">Scripture quoted exactly (KJV)</p>
  </header>

  <main>
    ${blocks.join('\n')}

    <section class="notes">
      <h4>Journal / Prayer</h4>
      <div class="lines">
        <!-- blank space for handwriting -->
      </div>
    </section>
  </main>
</body>
</html>`;
}

// Make a PDF from HTML (lazy-require puppeteer so server startup is fast)
async function makePDF(html) {
  // Lazy load to avoid slowing cold start
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.6in', left: '0.5in' }
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

module.exports = { renderWeekHTML, makePDF };
