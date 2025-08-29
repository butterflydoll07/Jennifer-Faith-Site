// christ-guard.js — exact KJV quotes only; basic "Christ Test" guards
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------- Where the full KJV JSON lives (book -> chapter -> verse) ----------
const STORE_PATH = path.resolve(__dirname, 'en_kjv.json');

// ---------- Common book abbreviations -> canonical book names ----------
const ABBREVIATIONS = {
  // Pentateuch
  'Gen': 'Genesis', 'Ge': 'Genesis', 'Gn': 'Genesis',
  'Ex': 'Exodus', 'Exod': 'Exodus',
  'Lev': 'Leviticus', 'Lv': 'Leviticus',
  'Num': 'Numbers', 'Nu': 'Numbers', 'Nm': 'Numbers', 'Nb': 'Numbers',
  'Deut': 'Deuteronomy', 'Dt': 'Deuteronomy',

  // History
  'Josh': 'Joshua', 'Jos': 'Joshua',
  'Judg': 'Judges', 'Jdg': 'Judges', 'Jg': 'Judges',
  'Ruth': 'Ruth',
  '1Sam': '1 Samuel', '1 Sam': '1 Samuel', 'I Sam': '1 Samuel',
  '2Sam': '2 Samuel', '2 Sam': '2 Samuel', 'II Sam': '2 Samuel',
  '1Kgs': '1 Kings', '1 Kgs': '1 Kings', '1Ki': '1 Kings', 'I Kgs': '1 Kings',
  '2Kgs': '2 Kings', '2 Kgs': '2 Kings', '2Ki': '2 Kings', 'II Kgs': '2 Kings',
  '1Chr': '1 Chronicles', '1 Chr': '1 Chronicles', 'I Chr': '1 Chronicles',
  '2Chr': '2 Chronicles', '2 Chr': '2 Chronicles', 'II Chr': '2 Chronicles',
  'Ezra': 'Ezra',
  'Neh': 'Nehemiah',
  'Esth': 'Esther', 'Est': 'Esther',

  // Poetry/Wisdom
  'Job': 'Job',
  'Ps': 'Psalms', 'Psa': 'Psalms', 'Psal': 'Psalms',
  'Prov': 'Proverbs', 'Pr': 'Proverbs', 'Prv': 'Proverbs',
  'Eccl': 'Ecclesiastes', 'Ecc': 'Ecclesiastes', 'Qoh': 'Ecclesiastes',
  'Song': 'Song of Solomon', 'Song of Sol': 'Song of Solomon',
  'Cant': 'Song of Solomon',

  // Major Prophets
  'Isa': 'Isaiah',
  'Jer': 'Jeremiah',
  'Lam': 'Lamentations',
  'Ezek': 'Ezekiel', 'Eze': 'Ezekiel',
  'Dan': 'Daniel', 'Dn': 'Daniel',

  // Minor Prophets
  'Hos': 'Hosea',
  'Joel': 'Joel',
  'Amos': 'Amos',
  'Obad': 'Obadiah', 'Ob': 'Obadiah',
  'Jon': 'Jonah',
  'Mic': 'Micah',
  'Nah': 'Nahum',
  'Hab': 'Habakkuk',
  'Zeph': 'Zephaniah', 'Zep': 'Zephaniah',
  'Hag': 'Haggai',
  'Zech': 'Zechariah', 'Zec': 'Zechariah',
  'Mal': 'Malachi',

  // Gospels & Acts
  'Mt': 'Matthew', 'Matt': 'Matthew',
  'Mk': 'Mark',
  'Lk': 'Luke',
  'Jn': 'John',
  'Acts': 'Acts',

  // Pauline Epistles
  'Rom': 'Romans',
  '1Cor': '1 Corinthians', '1 Cor': '1 Corinthians', 'I Cor': '1 Corinthians',
  '2Cor': '2 Corinthians', '2 Cor': '2 Corinthians', 'II Cor': '2 Corinthians',
  'Gal': 'Galatians',
  'Eph': 'Ephesians',
  'Phil': 'Philippians',
  'Col': 'Colossians',
  '1Thess': '1 Thessalonians', '1 Thess': '1 Thessalonians', 'I Thess': '1 Thessalonians',
  '2Thess': '2 Thessalonians', '2 Thess': '2 Thessalonians', 'II Thess': '2 Thessalonians',
  '1Tim': '1 Timothy', '1 Tim': '1 Timothy', 'I Tim': '1 Timothy',
  '2Tim': '2 Timothy', '2 Tim': '2 Timothy', 'II Tim': '2 Timothy',
  'Tit': 'Titus', 'Titus': 'Titus',
  'Phlm': 'Philemon', 'Philem': 'Philemon',

  // General Epistles & Revelation
  'Heb': 'Hebrews',
  'Jas': 'James',
  '1Pet': '1 Peter', '1 Pet': '1 Peter', 'I Pet': '1 Peter',
  '2Pet': '2 Peter', '2 Pet': '2 Peter', 'II Pet': '2 Peter',
  '1Jn': '1 John', '1 Jn': '1 John', 'I Jn': '1 John',
  '2Jn': '2 John', '2 Jn': '2 John', 'II Jn': '2 John',
  '3Jn': '3 John', '3 Jn': '3 John', 'III Jn': '3 John',
  'Jude': 'Jude',
  'Rev': 'Revelation', 'Re': 'Revelation', 'Apoc': 'Revelation'
};

// ---------- Optional integrity lock (leave blank for now) ----------
const KNOWN_HASH = ''; // e.g., sha256 of the file

function loadRaw() {
  const raw = fs.readFileSync(STORE_PATH);
  if (KNOWN_HASH) {
    const runtimeHash = crypto.createHash('sha256').update(raw).digest('hex');
    if (runtimeHash !== KNOWN_HASH) throw new Error('[ChristGuard] Scripture store integrity failed.');
  }
  return JSON.parse(raw);
}

const STORE = loadRaw(); // cache in memory

// -------- Verse lookup helpers (Book Chapter:Verse or Book Chapter) --------
function parseRef(ref) {
  // Accepts: 'John 3:16', '1 John 4:2', 'Leviticus 2:3', 'Lev 2:3', 'Ps 23'
  const m = String(ref || '')
    .trim()
    .match(/^([1-3]?\s?[A-Za-z. ]+?)\s+(\d+)?(?::(\d+))?$/);

  if (!m) return null;

  let book = m[1].replace(/\s+/g, ' ').replace(/\.$/, '').trim();

  // Expand abbreviations (keep spaced numerals like "1 John")
  if (ABBREVIATIONS[book]) {
    book = ABBREVIATIONS[book];
  }

  const chapter = m[2] ? parseInt(m[2], 10) : null;
  const verse = m[3] ? parseInt(m[3], 10) : null;

  return { book, chapter, verse };
}

function getFromStore(ref) {
  const p = parseRef(ref);
  if (!p) return null;
  const { book, chapter, verse } = p;

  const bookNode = STORE[book];
  if (!bookNode) return null;

  if (chapter == null) {
    // Only a book provided -> not allowed (must have at least a chapter)
    return null;
  }

  const chapNode = bookNode[String(chapter)];
  if (!chapNode) return null;

  if (verse == null) {
    // Whole chapter object (verseNumber -> text)
    return chapNode;
  }

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

    // Isaiah 8:20 (policy: all quotes must be exact)
    // We don't detect paraphrase here—your UI already states exact KJV only.
    return { ok: true, reason: "Pass" };
  },

  // Safety gate used by server endpoints (optional helper)
  async generate(ctx) {
    // If user asked to paraphrase/rewrite Scripture, block early.
    if (this.isParaphraseAsk(ctx.userText)) {
      throw new Error("This assistant will not paraphrase or rewrite Scripture. It only quotes exact (KJV) text.");
    }
    return true;
  }
};

module.exports = { ChristGuard };
