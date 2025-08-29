// christ-guard.js — exact KJV quotes only; basic “Christ Test” guards
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// FULL BIBLE STORE (book -> chapter -> verse)
const STORE_PATH = path.resolve(__dirname, 'en_kjv.json');
// Common book abbreviations → full names
const ABBREVIATIONS = {
  Gen: "Genesis",
  Exod: "Exodus", Ex: "Exodus",
  Lev: "Leviticus",
  Num: "Numbers",
  Deut: "Deuteronomy", Deu: "Deuteronomy",
  Josh: "Joshua",
  Judg: "Judges",
  Ruth: "Ruth",
  1Sam: "1 Samuel", 2Sam: "2 Samuel",
  1Kgs: "1 Kings", 2Kgs: "2 Kings",
  1Chr: "1 Chronicles", 2Chr: "2 Chronicles",
  Ezra: "Ezra",
  Neh: "Nehemiah",
  Esth: "Esther",
  Job: "Job",
  Ps: "Psalms", Psa: "Psalms",
  Prov: "Proverbs",
  Eccl: "Ecclesiastes",
  Song: "Song of Solomon", SS: "Song of Solomon",
  Isa: "Isaiah",
  Jer: "Jeremiah",
  Lam: "Lamentations",
  Ezek: "Ezekiel",
  Dan: "Daniel",
  Hos: "Hosea",
  Joel: "Joel",
  Amos: "Amos",
  Obad: "Obadiah",
  Jonah: "Jonah",
  Mic: "Micah",
  Nah: "Nahum",
  Hab: "Habakkuk",
  Zeph: "Zephaniah",
  Hag: "Haggai",
  Zech: "Zechariah",
  Mal: "Malachi",
  Matt: "Matthew",
  Mk: "Mark",
  Lk: "Luke",
  Jn: "John",
  Acts: "Acts",
  Rom: "Romans",
  1Cor: "1 Corinthians", 2Cor: "2 Corinthians",
  Gal: "Galatians",
  Eph: "Ephesians",
  Phil: "Philippians",
  Col: "Colossians",
  1Thess: "1 Thessalonians", 2Thess: "2 Thessalonians",
  1Tim: "1 Timothy", 2Tim: "2 Timothy",
  Titus: "Titus",
  Phlm: "Philemon",
  Heb: "Hebrews",
  Jas: "James",
  1Pet: "1 Peter", 2Pet: "2 Peter",
  1Jn: "1 John", 2Jn: "2 John", 3Jn: "3 John",
  Jude: "Jude",
  Rev: "Revelation"
};
// Optional integrity lock (leave blank for now)
const KNOWN_HASH = ''; // e.g., 'abc123...' (sha256 of the file)

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
  // supports: 'John 3:16', '1 John 4:2', 'Leviticus 2:3', 'Leviticus 2'
  const m = ref.match(/^([\dA-Za-z][\dA-Za-z\s]*?)\s+(\d+)(?::(\d+))?$/);
  if (!m) return null;
  const book = m[1].replace(/\s+/g, ' ').trim(); // normalize spaces
  const chapter = String(parseInt(m[2], 10));
  const verse = m[3] ? String(parseInt(m[3], 10)) : null;
  return { book, chapter, verse };
}

function getFromStore(ref) {
  const p = parseRef(ref);
  if (!p) return null;
  const { book, chapter, verse } = p;

  const bookNode = STORE[book];
  if (!bookNode) return null;

  const chapNode = bookNode[chapter];
  if (!chapNode) return null;

  if (verse) {
    const v = chapNode[verse];
    return (typeof v === 'string') ? v : null;
  }

  // No verse provided: return whole chapter object (verse-number -> text)
  return chapNode;
}

// --------------------------------------------------------------------------
// Very simple pattern checks — you can expand later as needed
const paraphrasePattern =
  /(?:paraphrase|reword|rewrite|moderniz(e|e)|simplif(y|ied)|put.*(own|other).*words|make.*easier|retell)/i;

function mentionsNewGospel(text) {
  return /(new\s+gospel|updated\s+gospel|different\s+gospel|extra\s+revelation|extra\s+salvation)/i.test(text);
}

function deniesIncarnation(text) {
  return /(jesus\s+did\s+not\s+come\s+in\s+the\s+flesh|jesus\s+was\s+not\s+incarnate|no\s+incarnation)/i.test(text);
}

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
    if (deniesIncarnation(t)) {
      return { ok: false, reason: "Fails 1 John 4:2-3 (denies Christ come in the flesh)" };
    }
    if (mentionsNewGospel(t)) {
      return { ok: false, reason: "Fails Galatians 1:8 (another gospel)" };
    }
    return { ok: true, reason: 'Pass' };
  },

  // For guarded generation (not used on your frontend yet, but handy)
  async enforce(ctx) {
    const userText = String(ctx.userText || '');
    if (this.isParaphraseAsk(userText)) {
      throw new Error("This assistant will not paraphrase or rewrite Scripture. It only quotes exact KJV text.");
    }
    const inCheck = this.christTest(userText);
    if (!inCheck.ok) throw new Error(`Blocked input: ${inCheck.reason}`);
    const raw = await ctx.generate();      // <- your generator
    const outCheck = this.christTest(raw);
    if (!outCheck.ok) throw new Error(`Blocked output: ${outCheck.reason}`);
    return raw;
  }
};

module.exports = { ChristGuard };
