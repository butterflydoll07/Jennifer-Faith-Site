// christ-guard.js — exact KJV quotes only; robust verse parsing + "Christ Test"
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------- Where the full KJV JSON lives (book -> chapter -> verse) ----------
const STORE_PATH = path.resolve(__dirname, 'en_kjv.json');

// ---------- Abbreviations (seed set); we’ll also add canonical names from JSON ----------
const BASE_ABBREVIATIONS = {
  // Pentateuch
  'gen': 'Genesis', 'ge': 'Genesis', 'gn': 'Genesis',
  'ex': 'Exodus', 'exod': 'Exodus',
  'lev': 'Leviticus', 'lv': 'Leviticus',
  'num': 'Numbers', 'nu': 'Numbers', 'nm': 'Numbers', 'nb': 'Numbers',
  'deut': 'Deuteronomy', 'dt': 'Deuteronomy',

  // History
  'josh': 'Joshua', 'jos': 'Joshua',
  'judg': 'Judges', 'jdg': 'Judges', 'jg': 'Judges',
  'ruth': 'Ruth',
  '1sam': '1 Samuel', '1 sam': '1 Samuel', 'i sam': '1 Samuel',
  '2sam': '2 Samuel', '2 sam': '2 Samuel', 'ii sam': '2 Samuel',
  '1kgs': '1 Kings', '1 kgs': '1 Kings', '1ki': '1 Kings', 'i kgs': '1 Kings',
  '2kgs': '2 Kings', '2 kgs': '2 Kings', '2ki': '2 Kings', 'ii kgs': '2 Kings',
  '1chr': '1 Chronicles', '1 chr': '1 Chronicles', 'i chr': '1 Chronicles',
  '2chr': '2 Chronicles', '2 chr': '2 Chronicles', 'ii chr': '2 Chronicles',
  'ezra': 'Ezra',
  'neh': 'Nehemiah',
  'esth': 'Esther', 'est': 'Esther',

  // Poetry/Wisdom
  'job': 'Job',
  'ps': 'Psalms', 'psa': 'Psalms', 'psal': 'Psalms',
  'prov': 'Proverbs', 'pr': 'Proverbs', 'prv': 'Proverbs',
  'eccl': 'Ecclesiastes', 'ecc': 'Ecclesiastes', 'qoh': 'Ecclesiastes',
  'song': 'Song of Solomon', 'song of sol': 'Song of Solomon', 'cant': 'Song of Solomon',

  // Major Prophets
  'isa': 'Isaiah',
  'jer': 'Jeremiah',
  'lam': 'Lamentations',
  'ezek': 'Ezekiel', 'eze': 'Ezekiel',
  'dan': 'Daniel', 'dn': 'Daniel',

  // Minor Prophets
  'hos': 'Hosea',
  'joel': 'Joel',
  'amos': 'Amos',
  'obad': 'Obadiah', 'ob': 'Obadiah',
  'jon': 'Jonah',
  'mic': 'Micah',
  'nah': 'Nahum',
  'hab': 'Habakkuk',
  'zeph': 'Zephaniah', 'zep': 'Zephaniah',
  'hag': 'Haggai',
  'zech': 'Zechariah', 'zec': 'Zechariah',
  'mal': 'Malachi',

  // Gospels & Acts
  'mt': 'Matthew', 'matt': 'Matthew',
  'mk': 'Mark',
  'lk': 'Luke',
  'jn': 'John',
  'acts': 'Acts',

  // Pauline Epistles
  'rom': 'Romans',
  '1cor': '1 Corinthians', '1 cor': '1 Corinthians', 'i cor': '1 Corinthians',
  '2cor': '2 Corinthians', '2 cor': '2 Corinthians', 'ii cor': '2 Corinthians',
  'gal': 'Galatians',
  'eph': 'Ephesians',
  'phil': 'Philippians',
  'col': 'Colossians',
  '1thess': '1 Thessalonians', '1 thess': '1 Thessalonians', 'i thess': '1 Thessalonians',
  '2thess': '2 Thessalonians', '2 thess': '2 Thessalonians', 'ii thess': '2 Thessalonians',
  '1tim': '1 Timothy', '1 tim': '1 Timothy', 'i tim': '1 Timothy',
  '2tim': '2 Timothy', '2 tim': '2 Timothy', 'ii tim': '2 Timothy',
  'tit': 'Titus',
  'phlm': 'Philemon', 'philem': 'Philemon',

  // General Epistles & Revelation
  'heb': 'Hebrews',
  'jas': 'James',
  '1pet': '1 Peter', '1 pet': '1 Peter', 'i pet': '1 Peter',
  '2pet': '2 Peter', '2 pet': '2 Peter', 'ii pet': '2 Peter',
  '1jn': '1 John', '1 jn': '1 John', 'i jn': '1 John',
  '2jn': '2 John', '2 jn': '2 John', 'ii jn': '2 John',
  '3jn': '3 John', '3 jn': '3 John', 'iii jn': '3 John',
  'jude': 'Jude',
  'rev': 'Revelation', 're': 'Revelation', 'apoc': 'Revelation'
};

// ---------- Optional integrity lock (leave blank for now) ----------
const KNOWN_HASH = ''; // e.g., sha256 of the file

// ----- EXTRA: support array-shaped JSON (abbrev + chapters[]) by normalizing ---
const RAW_ABBR_TO_CANON = {
  // (covers common KJV export abbrevs; extend if your source uses others)
  gn: 'Genesis', ex: 'Exodus', lv: 'Leviticus', nu: 'Numbers', dt: 'Deuteronomy',
  jos: 'Joshua', jdg: 'Judges', ru: 'Ruth',
  '1sa': '1 Samuel', '2sa': '2 Samuel',
  '1ki': '1 Kings', '2ki': '2 Kings',
  '1ch': '1 Chronicles', '2ch': '2 Chronicles',
  ezr: 'Ezra', ne: 'Nehemiah', es: 'Esther',
  job: 'Job', ps: 'Psalms', pr: 'Proverbs', ec: 'Ecclesiastes', so: 'Song of Solomon',
  isa: 'Isaiah', jer: 'Jeremiah', la: 'Lamentations', eze: 'Ezekiel', da: 'Daniel',
  ho: 'Hosea', joe: 'Joel', am: 'Amos', ob: 'Obadiah', jon: 'Jonah', mic: 'Micah',
  na: 'Nahum', hab: 'Habakkuk', zep: 'Zephaniah', hag: 'Haggai', zec: 'Zechariah', mal: 'Malachi',
  mt: 'Matthew', mr: 'Mark', lu: 'Luke', joh: 'John', ac: 'Acts',
  ro: 'Romans',
  '1co': '1 Corinthians', '2co': '2 Corinthians',
  ga: 'Galatians', eph: 'Ephesians', php: 'Philippians', col: 'Colossians',
  '1th': '1 Thessalonians', '2th': '2 Thessalonians',
  '1ti': '1 Timothy', '2ti': '2 Timothy', tit: 'Titus', phm: 'Philemon',
  heb: 'Hebrews', jas: 'James',
  '1pe': '1 Peter', '2pe': '2 Peter',
  '1jo': '1 John', '2jo': '2 John', '3jo': '3 John',
  jude: 'Jude', re: 'Revelation'
};

function normalizeStore(parsed) {
  // If it's already an object map, return as-is.
  if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') return parsed;

  // If it's an array like [{abbrev, chapters: [[v1, v2, ...], ...]}, ...]
  if (Array.isArray(parsed)) {
    const out = {};
    for (const b of parsed) {
      const ab = String(b.abbrev || '').toLowerCase();
      const canonical = RAW_ABBR_TO_CANON[ab] || b.name || b.title || ab;
      const chapters = b.chapters || [];
      const bookObj = {};
      chapters.forEach((versesArr, i) => {
        const chNum = String(i + 1);
        const chObj = {};
        (versesArr || []).forEach((text, j) => {
          chObj[String(j + 1)] = text;
        });
        bookObj[chNum] = chObj;
      });
      out[canonical] = bookObj;
    }
    return out;
  }

  throw new Error('[ChristGuard] Unsupported Scripture JSON shape.');
}

function loadRaw() {
  const raw = fs.readFileSync(STORE_PATH);
  if (KNOWN_HASH) {
    const runtimeHash = crypto.createHash('sha256').update(raw).digest('hex');
    if (runtimeHash !== KNOWN_HASH) throw new Error('[ChristGuard] Scripture store integrity failed.');
  }
  const parsed = JSON.parse(raw);
  return normalizeStore(parsed);
}

const STORE = loadRaw(); // cache in memory

// ---------- Build a flexible BOOK_INDEX (abbrevs + every canonical name variant) ----------
const BOOK_INDEX = (() => {
  const idx = Object.create(null);
  const add = (key, canonical) => { idx[key] = canonical; };
  const norm = (s) => String(s).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();

  // from JSON keys (canonical)
  for (const canonical of Object.keys(STORE)) {
    const n = norm(canonical);
    add(n, canonical);
    if (n.includes(' of ')) add(n.replace(' of ', ' '), canonical);
    const m = n.match(/^([123])\s+(.*)$/);
    if (m) add(`${m[1]}${m[2]}`, canonical); // e.g., "1john"
  }

  // from our base abbrevs
  for (const [abbr, canonical] of Object.entries(BASE_ABBREVIATIONS)) {
    const n = norm(abbr);
    add(n, canonical);
    const m = abbr.match(/^([123])\s+(.*)$/i);
    if (m) add(norm(`${m[1]}${m[2]}`), canonical);
  }

  return { add, norm, map: idx };
})();

// -------- Verse lookup helpers (Book Chapter:Verse or Book Chapter) --------
function parseRef(ref) {
  const m = String(ref || '')
    .trim()
    .match(/^([1-3]?\s?[A-Za-z. ]+?)\s+(\d+)?(?::(\d+))?$/);

  if (!m) return null;

  let rawBook = m[1].replace(/\s+/g, ' ').replace(/\.$/, '').trim();
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
  if (chapter == null) return null; // must have at least a chapter

  const chapNode = bookNode[String(chapter)];
  if (!chapNode) return null;

  if (verse == null) return chapNode; // Whole chapter (object)

  const v = chapNode[String(verse)];
  return typeof v === 'string' ? v : null;
}

// ---------------------------------------------------------------------------
// Very simple pattern checks — you can expand later as needed
const paraphrasePattern =
  /(?!^)\b(paraphrase|reword|rewrite|moderniz(e|e)|simplif(ied|y)|put.*(own|other).*words|make.*easier|retell)\b/i;

function mentionsNewGospel(text) {
  return /(new\s+gospel|updated\s+gospel|different\s+gospel|extra\s+revelation|extra\s+salvation)/i.test(text);
}

function deniesIncarnation(text) {
  return /(jesus\s+did\s+not\s+come\s+in\s+the\s+flesh|jesus\s+was\s+not\s+incarnate|no\s+incarnation)/i.test(text);
}

// ---------------------------------------------------------------------------
// Public API
const ChristGuard = {
  loadStore() { return STORE; },

  // returns a string (single verse) or an object (whole chapter)
  quote(ref) {
    const found = getFromStore(ref);
    if (!found) throw new Error(`Verse not found: ${ref}`);
    return found;
  },

  isParaphraseAsk(text) {
    return paraphrasePattern.test(String(text || ''));
  },

  christTest(text) {
    const t = String(text || '');

    // 1 John 4:2-3 (incarnation)
    if (deniesIncarnation(t)) {
      return { ok: false, reason: "Fails 1 John 4:2-3 (denies Christ came in the flesh)" };
    }

    // Galatians 1:8 (another gospel)
    if (mentionsNewGospel(t)) {
      return { ok: false, reason: "Fails Galatians 1:8 (another gospel)" };
    }

    // Isaiah 8:20 (policy: exact quotes only)
    return { ok: true, reason: "Pass" };
  },

  async generate(ctx) {
    if (this.isParaphraseAsk(ctx.userText)) {
      throw new Error("This assistant will not paraphrase or rewrite Scripture. It only quotes exact (KJV) text.");
    }
    return true;
  }
};

module.exports = { ChristGuard };
