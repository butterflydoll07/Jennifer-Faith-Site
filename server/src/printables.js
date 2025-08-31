// printables.js — builds weekly printables (HTML + optional PDF)
const puppeteer = require('puppeteer');

function renderWeekHTML({ week = '', title = 'Weekly Session', refs = [], theme = 'Family', quote }) {
  const verses = refs.map(ref => ({ ref, text: quote(ref) }));
  return `
<!doctype html><html><head><meta charset="utf-8"/>
<title>Week ${week} – ${title}</title>
<style>body{font-family:Georgia,serif;padding:20px} h1,h2{margin:0 0 10px}
footer{margin-top:20px;font-size:12px;color:#666}</style></head><body>
<h1>Week ${week}</h1>
<h2>Theme: ${theme}</h2>
<ul>${verses.map(v => `<li><strong>${v.ref}</strong>: <span>${typeof v.text==='string'?v.text:Object.entries(v.text).map(([n,t])=>`${n}. ${t}`).join(' ')}</span></li>`).join('')}</ul>
<section>
<h3>Reflection Prompts</h3>
<ol>
<li>What did this verse teach me about God?</li>
<li>How can I apply this verse today?</li>
<li>Who can I share this with?</li>
</ol>
</section>
<footer>Christ is King • Scripture quoted exactly (KJV)</footer>
</body></html>`;
}

async function makePDF(html) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'Letter', printBackground: true });
  await browser.close();
  return pdf;
}

module.exports = { renderWeekHTML, makePDF };
