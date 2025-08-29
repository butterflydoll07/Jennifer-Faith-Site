// christ-guard.js — exact KJV quotes only; Christ Test per 1Jn4, Isa8, Gal1, 2Cor11
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_PATH = path.resolve(__dirname, 'scripture-kjv.json');

// Optional integrity lock: compute SHA-256 and paste here later
const KNOWN_HASH = ""; // keep empty for now

function loadStore() {
  const raw = fs.readFileSync(STORE_PATH);
  if (KNOWN_HASH) {
    const runtimeHash = crypto.createHash('sha256').update(raw).digest('hex');
    if (runtimeHash !== KNOWN_HASH) throw new Error('[ChristGuard] Scripture store integrity failed.');
  }
  return JSON.parse(raw);
}

const STORE = loadStore();
const VERSES = STORE.verses || {};
const paraphrasePattern =
  /(paraphrase|reword|rewrite|moderniz(e|e)|simplif(y|ied)|put.*(own|other).*words|make.*easier|retell)/i;

function mentionsNewGospel(text) {
  return /(new\s+gospel|updated\s+gospel|different\s+salvation|extra\s+revelation\s+for\s+salvation)/i.test(text);
}
function deniesIncarnation(text) {
  return /(jesus\s+did\s+not\s+come\s+in\s+the\s+flesh|christ\s+was\s+not\s+incarnate|no\s+incarnation)/i.test(text);
}

const ChristGuard = {
  quote(ref) {
    if (!VERSES[ref]) throw new Error(`Verse not found: ${ref}`);
    return VERSES[ref];
  },
  isParaphraseAsk(text) {
    return paraphrasePattern.test(String(text || ''));
  },
  christTest(text) {
    const t = String(text || '');
    if (deniesIncarnation(t)) return { ok: false, reason: "Fails 1 John 4:2-3 (denies Christ come in the flesh)" };
    if (mentionsNewGospel(t)) return { ok: false, reason: "Fails Galatians 1:8 (another gospel)" };
    // Isaiah 8:20 policy: all quotes must come from this store.
    return { ok: true, reason: "Pass" };
  },
  async enforce(ctx) {
    if (this.isParaphraseAsk(ctx.userText)) {
      throw new Error("This assistant will not paraphrase or rewrite Scripture. It only quotes exact KJV text.");
    }
    const inCheck = this.christTest(ctx.userText);
    if (!inCheck.ok) throw new Error(`Blocked input: ${inCheck.reason}`);
    const raw = await ctx.generate();
    const outCheck = this.christTest(raw);
    if (!outCheck.ok) throw new Error(`Blocked output: ${outCheck.reason}`);
    return raw;
  }
};

module.exports = { ChristGuard };
