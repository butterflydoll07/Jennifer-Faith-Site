// christ-guard.js — exact KJV quotes only; lazy load + robust parsing + "Christ Test"
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_PATH = path.resolve(__dirname, 'en_kjv.json');
const KNOWN_HASH = ''; // optional integrity lock

// Abbreviations (lowercased keys)
const BASE_ABBREVIATIONS = {
  // Pentateuch
  'gen':'Genesis','ge':'Genesis','gn':'Genesis',
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
  'zeph':'Zephaniah','zep':'Zephaniah','hag':'Haggai',
  'zech':'Zechariah','zec':'Zechariah','mal':'Malachi',
  // Gospels & Acts
  'mt':'Matthew','matt':'Matthew','mk':'Mark','lk':'Luke','jn':'John','acts':'Acts',
  // Paul
  'rom':'Romans',
  '1cor':'1 Corinthians','1 cor':'1 Corinthians','i cor':'1 Corinthians',
  '2cor':'2 Corinthians','2 cor':'2 Corinthians','ii cor':'2 Corinthians',
  'gal':'Galatians','eph':'Ephesians','phil':'Philippians','col':'Colossians',
  '1thess':'1 Thessalonians','1 thess':'1 Thessalonians','i thess':'1 Thessalonians',
  '2thess':'2 Thessalonians','2 thess':'2 Thessalonians','ii thess':'2 Thessalonians',
  '1tim':'1 Timothy','1 tim':'1 Timothy','i tim':'1 Timothy',
  '2tim':'2 Timothy','2 tim':'2 Timothy','ii tim':'2 Timothy',
  'tit':'Titus','phlm':'Philemon','philem':'Philemon',
  // General & Revelation
  'heb':'Hebrews','jas':'James',
  '1pet':'1 Peter','1 pet':'1 Peter','i pet':'1 Peter',
  '2pet':'2 Peter','2 pet':'2 Peter','ii pet':'2 Peter',
  '1jn':'1 John','1 jn':'1 John','i jn':'1 John',
  '2jn':'2 John','2 jn':'2 John','ii jn':'2 John',
  '3jn':'3 John','3 jn':'3 John','iii jn':'3 John',
  'jude':'Jude','rev':'Revelation','re':'Revelation','apoc':'Revelation'
};

// -------------------- Loader (supports multiple JSON shapes) -----------------
function normalizeStore(data) {
  // Already nested object?
  if (!Array.isArray(data)) return data;

  const first = data[0] || {};

  // Row-per-verse: [{book,chapter,verse,text}, ...]
  if ('book' in first && 'chapter' in first && 'verse' in first) {
    const store = {};
    for (const row of data) {
      const book = String(row.book || '').trim();
      const c = String(row.chapter);
      const v = String(row.verse);
      const t = typeof row.text === 'string' ? row.text : '';
      if (!book || !c || !v) continue;
      (store[book] ||= {})[c] ||= {};
      store[book][c][v] = t;
    }
    return store;
  }

  // Book-per-entry: {abbrev, chapters:[[v1,v2,...],[...],...]}
  if ('abbrev' in first || 'chapters' in first) {
    const ABBR_TO_CANON = {
      gn:'Genesis', ex:'Exodus', lv:'Leviticus', nu:'Numbers', dt:'Deuteronomy',
      jos:'Joshua', jdg:'Judges', ru:'Ruth',
      '1sa':'1 Samuel', '2sa':'2 Samuel',
      '1ki':'1 Kings', '2ki':'2 Kings',
      '1ch':'1 Chronicles', '2ch':'2 Chronicles',
      ezr:'Ezra', ne:'Nehemiah', es:'Esther',
      job:'Job', ps:'Psalms', pr:'Proverbs', ec:'Ecclesiastes', so:'Song of Solomon',
      is:'Isaiah', je:'Jeremiah', la:'Lamentations', ek:'Ezekiel', da:'Daniel',
      ho:'Hosea', jl:'Joel', am:'Amos', ob:'Obadiah', jon:'Jonah', mi:'Micah',
      na:'Nahum', hb:'Habakkuk', zep:'Zephaniah', hg:'Haggai', zec:'Zechariah', mal:'Malachi',
      mt:'Matthew', mr:'Mark', lu:'Luke', jn:'John', ac:'Acts',
      ro:'Romans', '1co':'1 Corinthians', '2co':'2 Corinthians',
      ga:'Galatians', ep:'Ephesians', php:'Philippians', col:'Colossians',
      '1th':'1 Thessalonians', '2th':'2 Thessalonians',
      '1ti':'1 Timothy', '2ti':'2 Timothy',
      tit:'Titus', phm:'Philemon', heb:'Hebrews', jas:'James',
      '1pe':'1 Peter', '2pe':'2 Peter',
      '1jn':'1 John', '2jn':'2 John', '3jn':'3 John',
      jude:'Jude', re:'Revelation'
    };

    const store = {};
    for (const b of data) {
      const ab = String(b.abbrev || b.abbr || '').toLowerCase();
      const canonical = ABBR_TO_CANON[ab] || b.name || b.title || b.book || ab;
      const chapters = {};
      (b.chapters || []).forEach((verses, ci) => {
        const vobj = {};
        (verses || []).forEach((text, vi) => { vobj[String(vi + 1)] = String(text || ''); });
        chapters[String(ci + 1)] = vobj;
      });
      store[canonical] = chapters;
    }
    return store;
  }

  throw new Error('Unrecognized en_kjv.json structure');
}

function loadRaw() {
  const raw = fs.readFileSync(STORE_PATH);
  if (KNOWN_HASH) {
    const runtimeHash = crypto.createHash('sha256').update(raw).digest('hex');
    if (runtimeHash !== KNOWN_HASH) throw new Error('[ChristGuard] Scripture store integrity failed.');
  }
  return normalizeStore(JSON.parse(raw.toString('utf8')));
}

// Lazy cache (filled on first use or via prewarm)
let STORE = null;
function ensureStore() {
  if (!STORE) STORE = loadRaw();
  return STORE;
}

// -------------------- Book index (abbrevs + canonical) ----------------------
const BOOK_INDEX = (() => {
  const idx = Object.create(null);
  const add = (k, c) => { idx[k] = c; };
  const norm = s => String(s).toLowerCase().replace(/\./g,'').replace(/\s+/g,' ').trim();

  // Build later, after STORE exists
  function build() {
    const store = ensureStore();
    for (const canonical of Object.keys(store)) {
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
  }

  return { map: idx, norm, build };
})();

// -------------------- Lookups --------------------
function parseRef(ref) {
  const m = String(ref || '').trim().match(/^([1-3]?\s?[A-Za-z. ]+?)\s+(\d+)?(?::(\d+))?$/);
  if (!m) return null;
  const rawBook = m[1].replace(/\s+/g,' ').replace(/\.$/,'').trim();
  const chapter = m[2] ? parseInt(m[2],10) : null;
  const verse   = m[3] ? parseInt(m[3],10) : null;

  if (!Object.keys(BOOK_INDEX.map).length) BOOK_INDEX.build();

  const canonical = BOOK_INDEX.map[BOOK_INDEX.norm(rawBook)];
  if (!canonical) return null;
  return { book: canonical, chapter, verse };
}

function getFromStore(ref) {
  const store = ensureStore();
  const p = parseRef(ref);
  if (!p) return null;
  const { book, chapter, verse } = p;

  const b = store[book];           if (!b) return null;
  if (chapter == null) return null;
  const c = b[String(chapter)];    if (!c) return null;
  if (verse == null) return c;
  const v = c[String(verse)];
  return typeof v === 'string' ? v : null;
}

// -------------------- Christ Test helpers --------------------
const paraphrasePattern =
  /(?!^)\b(paraphrase|reword|rewrite|moderniz(e|e)|simplif(ied|y)|put.*(own|other).*words|make.*easier|retell)\b/i;

const mentionsNewGospel = t =>
  /(new\s+gospel|updated\s+gospel|different\s+gospel|extra\s+revelation|extra\s+salvation)/i.test(t);

const deniesIncarnation = t =>
  /(jesus\s+did\s+not\s+come\s+in\s+the\s+flesh|jesus\s+was\s+not\s+incarnate|no\s+incarnation)/i.test(t);

// -------------------- Public API --------------------
const ChristGuard = {
  // load the store now (non-blocking for startup if called after listen)
  prewarm() { ensureStore(); BOOK_INDEX.build(); },

  loadStore() { return ensureStore(); },

  quote(ref) {
    const found = getFromStore(ref);
    if (!found) throw new Error(`Verse not found: ${ref}`);
    return found;
  },

  isParaphraseAsk(text) { return paraphrasePattern.test(String(text || '')); },

  christTest(text) {
    const t = String(text || '');
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
