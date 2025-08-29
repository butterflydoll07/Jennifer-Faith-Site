// printables.js — builds weekly printables (HTML + optional PDF)
const puppeteer = require('puppeteer');
const { ChristGuard } = require('./christ-guard');

function renderWeekHTML({ week=1, title="Weekly Session", refs=[], theme="Family" }) {
  const verses = refs.map(ref => ({ ref, text: ChristGuard.quote(ref) }));

  return `
  <!doctype html><html><head><meta charset="utf-8"/>
  <title>Week ${week} • ${title}</title>
  <style>body{font-family:Georgia,serif;padding:20px}</style>
  </head><body>
    <h1>Week ${week} • ${title}</h1>
    <h2>Theme: ${theme}</h2>
    ${verses.map(v => `<p><strong>${v.ref}</strong>: ${v.text}</p>`).join("")}
    <h3>Journal Prompts</h3>
    <ul>
      <li>What did this verse teach me about God?</li>
      <li>How can I apply this verse today?</li>
      <li>Who can I share this with?</li>
    </ul>
    <footer><small>Christ is King • Scripture quoted exactly (KJV)</small></footer>
  </body></html>`;
}

async function htmlToPDF(html) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'Letter', printBackground: true });
  await browser.close();
  return pdf;
}

module.exports = { renderWeekHTML, htmlToPDF };
