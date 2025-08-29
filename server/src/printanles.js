// printables.js — builds weekly printables (HTML) and optional PDF
const puppeteer = require('puppeteer');
const { ChristGuard } = require('./christ-guard');

const BASE_CSS = `
  *{box-sizing:border-box} body{font-family:Georgia,serif;margin:0;color:#111}
  header{padding:18px 22px;border-bottom:2px solid #222}
  h1,h2,h3{margin:8px 0}
  .wrap{padding:18px 22px}
  .verse{background:#f6f7fb;border:1px solid #ddd;padding:12px;border-radius:10px;margin:8px 0;font-size:18px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  .card{border:1px solid #ddd;border-radius:12px;padding:14px}
  .check li{margin:6px 0}
  .doodle{border:2px dashed #999;border-radius:18px;min-height:420px}
  footer{padding:14px 22px;border-top:1px solid #ddd;color:#666;font-size:12px}
  .page-break{page-break-before:always}
`;

function renderWeekHTML({ week=1, title="Weekly Session", refs=[], theme="Family" }) {
  const verses = refs.map(ref => ({ ref, text: ChristGuard.quote(ref) }));

  const devotionBullets = [
    "Read the memory verse aloud together (twice).",
    "Ask: What does this verse say about God? About us?",
    "Short prayer: Thank God for this truth."
  ];
  const journalPrompts = [
    "What is one way you saw God’s goodness this week?",
    "Where do you need Jesus’ help right now?",
    "Who can you encourage with this verse?"
  ];
  const activities = [
    "Copy the memory verse neatly twice.",
    "Draw a picture that matches the verse meaning.",
    "Act it out as a mini skit.",
    "Memorize first half today; second half tomorrow."
  ];
  const checklist = [
    "Read the memory verse daily",
    "Pray together (morning or bedtime)",
    "Journal one sentence per day",
    "Kindness mission: help a sibling/neighbor",
    "Family share time (5 minutes)"
  ];

  return `
  <!doctype html><html><head><meta charset="utf-8"/>
    <title>Week ${week} • ${title}</title>
    <style>${BASE_CSS}</style>
  </head>
  <body>
    <header>
      <h1>Jennifer • ${title}</h1>
      <div>Week ${week} • Theme: ${theme}</div>
    </header>

    <div class="wrap">
      <h2>Memory Verse</h2>
      ${verses.map(v => `<div class="verse"><strong>${v.ref}</strong><br/>${v.text}</div>`).join("")}

      <div class="grid">
        <div class="card"><h3>Devotion Outline</h3><ol>${devotionBullets.map(b=>`<li>${b}</li>`).join("")}</ol></div>
        <div class="card"><h3>Journal Prompts</h3><ol>${journalPrompts.map(b=>`<li>${b}</li>`).join("")}</ol></div>
      </div>

      <div class="grid" style="margin-top:18px">
        <div class="card"><h3>Activities</h3><ul>${activities.map(a=>`<li>${a}</li>`).join("")}</ul></div>
        <div class="card"><h3>Weekly Checklist</h3><ul class="check">${checklist.map(c=>`<li><input type="checkbox"/> ${c}</li>`).join("")}</ul></div>
      </div>
    </div>

    <div class="page-break"></div>

    <div class="wrap">
      <h2>Color / Doodle Page</h2>
      <p>Draw what this verse looks like in your life.</p>
      <div class="doodle"></div>
    </div>

    <footer>Christ is King • Scripture quoted exactly (KJV). No paraphrasing.</footer>
  </body></html>`;
}

async function htmlToPDF(html) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'Letter', printBackground: true, margin: { top:'10mm', bottom:'10mm', left:'10mm', right:'10mm' }});
  await browser.close();
  return pdf;
}

module.exports = { renderWeekHTML, htmlToPDF };
