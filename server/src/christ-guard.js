// christ-guard.js — exact KJV quotes only; robust verse parsing + "Christ Test"
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Locations
const MONO_PATH  = path.resolve(__dirname, 'en_kjv.json');         // optional fallback
const BIBLE_DIR  = path.resolve(__dirname, 'bible');                // preferred (66 files)

// Abbreviations (lowercased keys)
const BASE_ABBREVIATIONS = {
  // Pentateuch
  'gen': 'Genesis','ge': 'Genesis','gn': 'Genesis',
  'ex': 'Exodus','exod': 'Exodus',
  'lev': 'Leviticus','lv': 'Leviticus',
  'num': 'Numbers','nu': 'Numbers','nm': 'Numbers','nb': 'Numbers',
  'deut': 'Deuteronomy','dt': 'Deuteronomy',
  // History
  'josh': 'Joshua','jos': 'Joshua',
  'judg': 'Judges','jdg': 'Judges','jg': 'Judges',
  'ruth': 'Ruth',
  '1sam': '1 Samuel','1 sam': '1 Samuel','i sam': '1 Samuel',
  '2sam': '2 Samuel','2 sam': '2 Samuel','ii sam': '2 Samuel',
  '1kgs': '1 Kings','1 kgs': '1 Kings','1ki': '1 Kings','i kgs': '1 Kings',
  '2kgs': '2 Kings','2 kgs': '2 Kings','2ki': '2 Kings','ii kgs': '2 Kings',
  '1chr': '1 Chronicles','1 chr': '1 Chronicles','i chr': '1 Chronicles',
  '2chr': '2 Chronicles','2 chr': '2 Chronicles','ii chr': '2 Chronicles',
  'ezra': 'Ezra','neh': 'Nehemiah','esth': 'Esther','est': 'Esther',
  // Poetry/Wisdom
  'job': 'Job',
  'ps': 'Psalms','psa': 'Psalms','psal': 'Psalms',
  'prov': 'Proverbs','pr': 'Proverbs','prv': 'Proverbs',
  'eccl': 'Ecclesiastes','ecc': 'Ecclesiastes','qoh': 'Ecclesiastes',
  'song': 'Song of Solomon','song of sol': 'Song of Solomon','cant': 'Song of Solomon',
  // Major Prophets
  'isa': 'Isaiah','jer': 'Jeremiah','lam': 'Lamentations',
  'ezek': 'Ezekiel','eze': 'Ezekiel','dan': 'Daniel','dn': 'Daniel',
  // Minor Prophets
  'hos': 'Hosea','joel': 'Joel','amos': 'Amos','obad': 'Obadiah','ob': 'Obadiah',
  'jon': 'Jonah','mic': 'Micah','nah': 'Nahum','hab': 'Habakkuk',
  'zeph': 'Zephaniah','zep': 'Zephaniah','hag': 'Haggai',
  'zech': 'Zechariah','zec': 'Zechariah','mal': 'Malachi',
  // Gospels & Acts
  'mt': 'Matthew','matt': 'Matthew','mk': 'Mark','lk': 'Luke','jn': 'John','acts': 'Acts',
  // Pauline
  'rom': 'Romans',
  '1cor': '1 Corinthians','1 cor': '1 Corinthians','i cor': '1 Corinthians',
  '2cor': '2 Corinthians','2 cor': '2 Corinthians','ii cor': '2 Corinthians',
  'gal': 'Galatians','eph': 'Ephesians','phil': 'Philippians','col': 'Colossians',
  '1thess': '1 Thessalonians','1 thess': '1 Thessalonians','i thess': '1 Thessalonians',
  '2thess': '2 Thessalonians','2 thess': '2 Thessalonians','ii thess': '2 Thessalonians',
  '1tim': '1 Timothy','1 tim': '1 Timothy','i tim': '1 Timothy',
  '2tim': '2 Timothy','2 tim': '2 Timothy','ii tim': '2 Timothy',
  'tit': 'Titus','phlm': 'Philemon','philem': 'Philemon',
  // General & Revelation
  'heb': 'Hebrews','jas': 'James',
  '1pet': '1 Peter','1 pet': '1 Peter','i pet': '1 Peter',
  '2pet': '2 Peter','2 pet': '2 Peter','ii pet': '2 Peter',
  '1jn': '1 John','1 jn': '1 John','i jn': '1 John',
  '2jn': '2 John','2 jn': '2 John','ii jn': '2 John',
  '3jn': '3 John','3 jn': '3 John','iii jn': '3 John',
  'jude': 'Jude','rev': 'Revelation','re': 'Revelation','apoc': 'Revelation'
};

// Optional integrity lock
const KNOWN_HASH = ''; // provide sha256 if you want

// ---------- Helpers for shapes ----------
function arrayToNested(rows) {
  const store = {};
  for (const r of rows) {
    const book = String(r.book).trim();
    const c = String(r.chapter);
    const v = String(r.verse);
    const t = String(r.text);
    if (!book || !c || !v || typeof t !== 'string') continue;
    store[book] ??= {};
    store[book][c] ??= {};
    store[book][c][v] = t;
  }
  return store;
}

function normalizeBookJson(objOrArulJohn) {
  // Accept { "1": { "1": "..." } } OR { book:"Genesis", chapters:[[...], ...] }
  if (objOrArulJohn && Array.isArray(objOrArulJohn.chapters)) {
    const out = {};
    objOrArulJohn.chapters.forEach((verses, i) => {
      const chNum = String(i + 1);
      out[chNum] = {};
      verses.forEach((txt, j) => {
        out[chNum][String(j + 1)] = String(txt);
      });
    });
    return out;
  }
  return objOrArulJohn; // already nested
}

// ---------- Loaders ----------
function readJSON(p) {
  const raw = fs.readFileSync(p);
  if (KNOWN_HASH && p.endsWith('en_kjv.json')) {
    const h = crypto.createHash('sha256').update(raw).digest('hex');
    if (h !== KNOWN_HASH) throw new Error('[ChristGuard] integrity mismatch');
  }
  return JSON.parse(raw.toString('utf8'));
}

function loadFromBibleDir() {
  if (!fs.existsSync(BIBLE_DIR)) return null;
  const files = fs.readdirSync(BIBLE_DIR).filter(f => f.endsWith('.json'));
  if (!files.length) return null;

  const store = {};
  for (const file of files) {
    const bookName = file.replace(/\.json$/, '');
    const json = readJSON(path.join(BIBLE_DIR, file));
    store[bookName] = normalizeBookJson(json);
  }
  return store;
}

function loadFromMonolithic() {
  if (!fs.existsSync(MONO_PATH)) return null;
  const data = readJSON(MONO_PATH);
  if (Array.isArray(data)) return arrayToNested(data);
  return data;
}

// Build STORE (prefer 66 files; fallback to monolithic)
const STORE = (loadFromBibleDir() || loadFromMonolithic() || (() => {
  throw new Error('No Bible data found. Put 66 files in server/src/bible/ or en_kjv.json next to christ-guard.js');
})());

// ---------- Build BOOK_INDEX ----------
const BOOK_INDEX = (() => {
  const idx = Object.create(null);
  const add = (key, canonical) => { idx[key] = canonical; };
  const norm = s => String(s).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();

  for (const canonical of Object.keys(STORE)) {
    const n = norm(canonical);
    add(n, canonical);
    if (n.includes(' of ')) add(n.replace(' of ', ' '), canonical);
    const m = n.match(/^([123])\s+(.*)$/);
    if (m) add(`${m[1]}${m[2]}`, canonical);
  }
  for (const [abbr, canonical] of Object.entries(BASE_ABBREVIATIONS)) {
    const n = norm(abbr);
    add(n, canonical);
    const m = abbr.match(/^([123])\s+(.*)$/i);
    if (m) add(norm(`${m[1]}${m[2]}`), canonical);
  }
  return { norm, map: idx };
})();

// ---------- Lookup ----------
function parseRef(ref) {
  const m = String(ref || '')
    .trim()
    .match(/^([1-3]?\s?[A-Za-z. ]+?)\s+(\d+)?(?::(\d+))?$/);
  if (!m) return null;
  const rawBook = m[1].replace(/\s+/g, ' ').replace(/\.$/, '').trim();
  const chapter = m[2] ? parseInt(m[2], 10) : null;
  const verse = m[3] ? parseInt(m[3], 10) : null;

  const key = BOOK_INDEX.norm(rawBook);
  const canonical = BOOK_INDEX.map[key];
  if (!canonical) return null;
  return { book: canonical, chapter, verse };
}

function getFromStore(ref) {
  const p = parseRef(ref);
  if (!p) return null;
  const { book, chapter, verse } = p;
  const bookNode = STORE[book];
  if (!bookNode) return null;
  if (chapter == null) return null;
  const chapNode = bookNode[String(chapter)];
  if (!chapNode) return null;
  if (verse == null) return chapNode;
  const v = chapNode[String(verse)];
  return typeof v === 'string' ? v : null;
}

// ---------- Christ Test ----------
const paraphrasePattern =
  /(?!^)\b(paraphrase|reword|rewrite|moderniz(e|e)|simplif(ied|y)|put.*(own|other).*words|make.*easier|retell)\b/i;
const mentionsNewGospel = t =>
  /(new\s+gospel|updated\s+gospel|different\s+gospel|extra\s+revelation|extra\s+salvation)/i.test(t);
const deniesIncarnation = t =>
  /(jesus\s+did\s+not\s+come\s+in\s+the\s+flesh|jesus\s+was\s+not\s+incarnate|no\s+incarnation)/i.test(t);

// ---------- Public API ----------
const ChristGuard = {
  loadStore() { return STORE; },

  quote(ref) {
    const found = getFromStore(ref);
    if (!found) throw new Error(`Verse not found: ${ref}`);
    return found; // string or whole chapter object
  },

  isParaphraseAsk(text) { return paraphrasePattern.test(String(text || '')); },

  christTest(text) {
    const t = String(text || '');
    if (deniesIncarnation(t)) return { ok: false, reason: 'Fails 1 John 4:2-3 (denies Christ came in the flesh)' };
    if (mentionsNewGospel(t)) return { ok: false, reason: 'Fails Galatians 1:8 (another gospel)' };
    return { ok: true, reason: 'Pass' };
  },

  async generate(ctx) {
    if (this.isParaphraseAsk(ctx.userText)) {
      throw new Error('This assistant will not paraphrase or rewrite Scripture. It only quotes exact (KJV) text.');
    }
    return true;
  }
};

module.exports = { ChristGuard };
