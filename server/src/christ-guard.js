// christ-guard.js — exact KJV quotes only; flexible loaders + "Christ Test"
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------- Where the book JSON files live ----------
const BIBLE_DIR = path.resolve(__dirname, 'bible');     // <--- folder with 66 JSON files

// ---------- Optional integrity lock (leave blank) ----------
const KNOWN_HASH = ''; // sha256 of concatenated files if you ever want to lock

// ---------- Abbreviations (lowercased keys) ----------
const BASE_ABBREVIATIONS = {
  // Pentateuch
  'gen': 'Genesis','ge':'Genesis','gn':'Genesis',
  'ex':'Exodus','exod':'Exodus',
  'lev':'Leviticus','lv':'Leviticus',
  'num':'Numbers','nu':'Numbers','nm':'Numbers','nb':'Numbers',
  'deut':'Deuteronomy','dt':'Deuteronomy',
  // History
  'josh':'Joshua','jos':'Joshua',
  'judg':'Judges','jdg':'Judges','jg':'Judges',
  'ruth':'Ruth',
  '1sam':'1 Samuel','1 sam':'1 Samuel','i sam':'1 Samuel',
  '2sam':'2 Samuel','2 sam':'2 Samuel','ii sam':'2 Samuel',
  '1kgs':'1 Kings','1 kgs':'1 Kings','1ki':'1 Kings','i kgs':'1 Kings',
  '2kgs':'2 Kings','2 kgs':'2 Kings','2ki':'2 Kings','ii kgs':'2 Kings',
  '1chr':'1 Chronicles','1 chr':'1 Chronicles','i chr':'1 Chronicles',
  '2chr':'2 Chronicles','2 chr':'2 Chronicles','ii chr':'2 Chronicles',
  'ezra':'Ezra','neh':'Nehemiah','esth':'Esther','est':'Esther',
  // Poetry/Wisdom
  'job':'Job','ps':'Psalms','psa':'Psalms','psal':'Psalms',
  'prov':'Proverbs','pr':'Proverbs','prv':'Proverbs',
  'eccl':'Ecclesiastes','ecc':'Ecclesiastes','qoh':'Ecclesiastes',
  'song':'Song of Solomon','song of sol':'Song of Solomon','cant':'Song of Solomon',
  // Major Prophets
  'isa':'Isaiah','jer':'Jeremiah','lam':'Lamentations',
  'ezek':'Ezekiel','eze':'Ezekiel','dan':'Daniel','dn':'Daniel',
  // Minor Prophets
  'hos':'Hosea','joel':'Joel','amos':'Amos','obad':'Obadiah','ob':'Obadiah',
  'jon':'Jonah','mic':'Micah','nah':'Nahum','hab':'Habakkuk',
  'zeph':'Zephaniah','zep':'Zephaniah','hag':'Haggai','zech':'Zechariah','zec':'Zechariah','mal':'Malachi',
  // Gospels & Acts
  'mt':'Matthew','matt':'Matthew','mk':'Mark','lk':'Luke','jn':'John','acts':'Acts',
  // Pauline Epistles
  'rom':'Romans','1cor':'1 Corinthians','1 cor':'1 Corinthians','i cor':'1 Corinthians',
  '2cor':'2 Corinthians','2 cor':'2 Corinthians','ii cor':'2 Corinthians',
  'gal':'Galatians','eph':'Ephesians','phil':'Philippians','col':'Colossians',
  '1thess':'1 Thessalonians','1 thess':'1 Thessalonians','i thess':'1 Thessalonians',
  '2thess':'2 Thessalonians','2 thess':'2 Thessalonians','ii thess':'2 Thessalonians',
  '1tim':'1 Timothy','1 tim':'1 Timothy','i tim':'1 Timothy',
  '2tim':'2 Timothy','2 tim':'2 Timothy','ii tim':'2 Timothy',
  'tit':'Titus','phlm':'Philemon','philem':'Philemon',
  // General Epistles & Revelation
  'heb':'Hebrews','jas':'James',
  '1pet':'1 Peter','1 pet':'1 Peter','i pet':'1 Peter',
  '2pet':'2 Peter','2 pet':'2 Peter','ii pet':'2 Peter',
  '1jn':'1 John','1 jn':'1 John','i jn':'1 John',
  '2jn':'2 John','2 jn':'2 John','ii jn':'2 John',
  '3jn':'3 John','3 jn':'3 John','iii jn':'3 John',
  'jude':'Jude','rev':'Revelation','re':'Revelation','apoc':'Revelation'
};

// ---------- Helpers ----------
const norm = s => String(s).toLowerCase().replace(/\./g,'').replace(/\s+/g,' ').trim();

// Convert any supported source JSON for one book → nested { [chapter]: { [verse]: text } }
function normalizeOneBook(json, fallbackBookName) {
  // aruljohn: { book: "Leviticus", chapters: [ [ "1:1", ...], [ ... ] ] }
  if (json && Array.isArray(json.chapters)) {
    const book = json.book || fallbackBookName;
    const out = {};
    json.chapters.forEach((chapterArr, i) => {
      const chapNo = String(i + 1);
      out[chapNo] = {};
      chapterArr.forEach((verseText, j) => {
        const vNo = String(j + 1);
        out[chapNo][vNo] = String(verseText);
      });
    });
    return { book, map: out };
  }

  // farskipper: [ { book, chapter, verse, text }, ... ]
  if (Array.isArray(json)) {
    const out = {};
    let book = fallbackBookName;
    for (const row of json) {
      book = row.book || book;
      const c = String(row.chapter);
      const v = String(row.verse);
      if (!out[c]) out[c] = {};
      out[c][v] = String(row.text || '');
    }
    return { book, map: out };
  }

  // already-nested: { "Leviticus": { "2": { "3": "..." } } }
  if (json && typeof json === 'object') {
    const onlyKey = Object.keys(json)[0] || fallbackBookName;
    return { book: onlyKey, map: json[onlyKey] || json };
  }

  throw new Error('Unsupported book JSON shape');
}

// Load all *.json files from BIBLE_DIR and build STORE = { Book -> Chapter -> Verse }
function loadStore() {
  const files = fs.existsSync(BIBLE_DIR) ? fs.readdirSync(BIBLE_DIR) : [];
  if (files.length === 0) {
    throw new Error(`[ChristGuard] No book files found in ${BIBLE_DIR}. Add 66 JSON files.`);
  }

  const parts = [];
  const STORE = {};

  for (const fname of files.filter(f => f.toLowerCase().endsWith('.json'))) {
    const full = path.join(BIBLE_DIR, fname);
    const raw = fs.readFileSync(full);
    parts.push(raw); // optional integrity concat
    const json = JSON.parse(raw.toString('utf8'));

    const fallbackName = path.basename(fname, '.json');
    const { book, map } = normalizeOneBook(json, fallbackName);

    if (!STORE[book]) STORE[book] = {};
    // merge chapters
    for (const c of Object.keys(map || {})) {
      if (!STORE[book][c]) STORE[book][c] = {};
      Object.assign(STORE[book][c], map[c]);
    }
  }

  if (KNOWN_HASH) {
    const hash = crypto.createHash('sha256').update(Buffer.concat(parts)).digest('hex');
    if (hash !== KNOWN_HASH) throw new Error('[ChristGuard] Scripture store integrity failed.');
  }

  return STORE;
}

const STORE = loadStore();

// Build BOOK_INDEX (abbrevs + canonical keys we see)
const BOOK_INDEX = (() => {
  const idx = Object.create(null);
  const add = (k, canon) => { idx[k] = canon; };

  for (const canonical of Object.keys(STORE)) {
    const n = norm(canonical);
    add(n, canonical);
    if (n.includes(' of ')) add(n.replace(' of ', ' '), canonical);
    const m = n.match(/^([123])\s+(.*)$/);
    if (m) add(`${m[1]}${m[2]}`, canonical); // "1john"
  }
  for (const [abbr, canonical] of Object.entries(BASE_ABBREVIATIONS)) {
    const n = norm(abbr);
    add(n, canonical);
    const m = abbr.match(/^([123])\s+(.*)$/i);
    if (m) add(norm(`${m[1]}${m[2]}`), canonical);
  }
  return { map: idx, norm };
})();

// Parse "Book C:V" or "Book C"
function parseRef(ref) {
  const m = String(ref || '').trim().match(/^([1-3]?\s?[A-Za-z. ]+?)\s+(\d+)?(?::(\d+))?$/);
  if (!m) return null;
  const key = BOOK_INDEX.norm(m[1].replace(/\s+/g,' ').replace(/\.$/, ''));
  const book = BOOK_INDEX.map[key];
  const chapter = m[2] ? parseInt(m[2], 10) : null;
  const verse   = m[3] ? parseInt(m[3], 10) : null;
  if (!book) return null;
  return { book, chapter, verse };
}

// Lookup
function getFromStore(ref) {
  const p = parseRef(ref);
  if (!p) return null;
  const { book, chapter, verse } = p;

  const b = STORE[book];
  if (!b) return null;
  if (chapter == null) return null;

  const c = b[String(chapter)];
  if (!c) return null;

  if (verse == null) return c; // whole chapter
  const v = c[String(verse)];
  return typeof v === 'string' ? v : null;
}

// --------- Simple "Christ Test" patterns ----------
const paraphrasePattern = /(?!^)\b(paraphrase|reword|rewrite|moderniz(e|e)|simplif(ied|y)|put.*(own|other).*words|make.*easier|retell)\b/i;
const mentionsNewGospel = t => /(new\s+gospel|updated\s+gospel|different\s+gospel|extra\s+revelation|extra\s+salvation)/i.test(t);
const deniesIncarnation = t => /(jesus\s+did\s+not\s+come\s+in\s+the\s+flesh|jesus\s+was\s+not\s+incarnate|no\s+incarnation)/i.test(t);

// --------- Public API ----------
const ChristGuard = {
  loadStore() { return STORE; },
  quote(ref) {
    const found = getFromStore(ref);
    if (!found) throw new Error(`Verse not found: ${ref}`);
    return found;
  },
  isParaphraseAsk(txt) { return paraphrasePattern.test(String(txt || '')); },
  christTest(txt) {
    const t = String(txt || '');
    if (deniesIncarnation(t)) return { ok:false, reason:'Fails 1 John 4:2-3 (denies Christ came in the flesh)' };
    if (mentionsNewGospel(t)) return { ok:false, reason:'Fails Galatians 1:8 (another gospel)' };
    return { ok:true, reason:'Pass' };
  },
  async generate(ctx) {
    if (this.isParaphraseAsk(ctx.userText)) {
      throw new Error('This assistant will not paraphrase or rewrite Scripture. It only quotes exact (KJV) text.');
    }
    return true;
  }
};

module.exports = { ChristGuard };
