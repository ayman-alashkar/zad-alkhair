/* رسم صفحة من مصحف القراءات بكل الروايات بمحرّك DigitalKhatt.
   مأخوذ من scripts/proto-qiraat-pages.mjs (برنامج النموذج)، مقسومًا ليرسم صفحة واحدة في كل استدعاء
   فيعمل في عدة خيوط، ومعه مقاييس المراجعة لكل سطر.

   الناتج لكل صفحة:
     lines.hafs     السطور كلها لحفص
     lines[r]       {رقم السطر: السطر} للسطور التي تخالف فيها الرواية حفصًا وحدها
     data           بيانات القالب (الكلمات، الفروق، علامات الآي، البطاقات)
     cards          أشكال كلمات الصفحة مرسومة منفردة (للبطاقة)
     qa             [رواية، رقم السطر، xScale، نسبة المسافة] لكل سطر ضُغط
   السطر: {x: ضغط أفقي (1 = بلا ضغط)، s: المسافة نسبةً إلى الطبيعية، n: العرض، g: [محرف، س، ص]...، t، c، e}. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initHb, HarfBuzzBlob, HarfBuzzFace, HarfBuzzFont, HarfBuzzBuffer, getWidth, hb } from "../mushaf/digitalkhatt/harfbuzz.mjs";
import { analyzeLineForJust, justifyLine, FONTSIZE, SpaceType, JustStyle } from "../mushaf/digitalkhatt/just.mjs";
import { ayahNumbers } from "./ayah-count.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = f => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
export const LINE_UNITS = 17600;
const SHRINK = "shr1", MIN_SPACE = 0.6;
export const MK = 100000;   // رمز علامة الآية: MK + ترتيب الكلمة التي قبلها في الصفحة
export const CATS = ["", "imala", "taqlil", "silah", "madd", "hamz", "idgham", "sakt", "farsh"];
const AR = d => String(d).replace(/\d/g, c => "٠١٢٣٤٥٦٧٨٩"[c]);
const toFont = w => w.replace(/ْ/g, "۟").replace(/ۡ/g, "ْ");

let IDX, ST, H, font, spaceWidth, AYAH;
const glyphPaths = new Map();
const NUMS = {};
const numsOf = r => (NUMS[r] ??= ayahNumbers(r));

export async function init() {
  IDX = readJson("data/qiraat/index.json");
  ST = readJson("data/qiraat/statements.json");
  H = readJson("data/mushaf-src/hafs.json");
  await initHb(fs.readFileSync(path.join(root, "scripts/mushaf/vendor/harfbuzzjs/harfbuzz.wasm")));
  font = new HarfBuzzFont(new HarfBuzzFace(new HarfBuzzBlob(new Uint8Array(fs.readFileSync(path.join(root, "fonts/digitalkhatt/madina.otf")))), 0));
  spaceWidth = getWidth(" ", font, FONTSIZE, null);
  return { riwayat: IDX.riwayat, upem: font.unitsPerEM };
}

/** مسارات المحارف التي رُسمت منذ آخر استدعاء (ليجمعها الخيط الرئيسي). */
const sent = new Set();
export function newGlyphs() {
  const o = {};
  for (const [gid, d] of glyphPaths) if (d && !sent.has(gid)) { o[gid] = d.replace(/-?\d+\.\d+/g, n => String(Math.round(+n))); sent.add(gid); }
  return o;
}
const pathOf = gid => { if (!glyphPaths.has(gid)) glyphPaths.set(gid, font.glyphToSvgPath(gid)); return glyphPaths.get(gid); };
const catIndex = c => (c ? Math.max(0, CATS.indexOf(c === "naql" ? "hamz" : c)) : 0);

function run(text, features, info, jr, owner, cat) {
  const buf = new HarfBuzzBuffer();
  buf.setDirection("rtl"); buf.setLanguage(hb.arabLanguage); buf.setScript(hb.arabScript); buf.setClusterLevel(1);
  buf.addText(text); buf.shape(font, features);
  const res = buf.json(); buf.destroy();
  const g = [], t = [], c = [], e = [];
  let x = 0, lastTok = -2, notdef = 0;
  for (let i = res.length - 1; i >= 0; i--) {
    const gl = res[i], sp = info ? info.spaces.get(gl.Cluster) : (text[gl.Cluster] === " " ? SpaceType.Simple : 0);
    const tok = owner[gl.Cluster];
    if (!sp && tok !== lastTok) { e.push(tok, Math.round(x)); lastTok = tok; }
    x -= sp === SpaceType.Aya ? jr.ayaSpacing : sp === SpaceType.Simple ? jr.simpleSpacing : gl.XAdvance;
    if (sp) continue;
    if (gl.GlyphId === 0) notdef++;
    if (!pathOf(gl.GlyphId)) continue;
    g.push(gl.GlyphId, Math.round(x + gl.XOffset), Math.round(gl.YOffset));
    t.push(tok); c.push(cat[gl.Cluster] || 0);
  }
  if (notdef) throw Error(`missing glyph in «${text}»`);
  return { x: +jr.xScale.toFixed(4), s: +(jr.simpleSpacing / spaceWidth).toFixed(3), n: Math.round(-x), g, t, c, e };
}

let lineKey = 900000;
function shapeLine({ text, owner, cat }) {
  const key = ++lineKey, desired = LINE_UNITS;
  const info = analyzeLineForJust({ quranText: { [key]: [text] } }, key, 0);
  const features = [];
  let jr = justifyLine(info, font, FONTSIZE / desired, spaceWidth, 1, JustStyle.XScale);
  if (jr.xScale < 1) {
    const shrunk = getWidth(text, font, FONTSIZE, [{ tag: SHRINK, value: 1, start: 0, end: -1 }]);
    const n = info.spaces.size, room = n * spaceWidth * (1 - MIN_SPACE);
    let space = spaceWidth, xScale = 1;
    if (shrunk - room <= desired) space = spaceWidth - (shrunk - desired) / Math.max(1, n);
    else { space = spaceWidth * MIN_SPACE; xScale = desired / (shrunk - room); }
    jr = { fontFeatures: new Map(), simpleSpacing: Math.min(space, spaceWidth), ayaSpacing: Math.min(space, spaceWidth), xScale };
    features.push({ tag: SHRINK, value: 1, start: 0, end: -1 });
  }
  jr.fontFeatures.forEach((fs_, i) => fs_.forEach(f => features.push({ tag: f.name, value: f.value, start: i, end: i + 1 })));
  return run(text, features, info, jr, owner, cat);
}
const unpack = segs => segs.map(s => (typeof s === "string" ? [s, null] : [s[0], IDX.cats[s[1]]]));
const ayahOf = (r, w) => { const m = numsOf(r); for (let x = w; x < H.words.length; x++) if (m.has(x)) return m.get(x); return 0; };
const juzOf = gi => H.juz_starts.filter(s => s <= gi).length;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function renderPage(pg) {
  const Q = readJson(`data/qiraat/pages/${String(pg).padStart(3, "0")}.json`);
  const first = H.page_starts[pg - 1], last = H.page_starts[pg] ?? H.words.length;
  const lineStarts = H.line_starts.filter(s => s >= first && s < last);
  const marks = new Map();
  for (const [wi, ti] of H.marks) { const t = H.mark_types[ti]; if (wi >= first && wi < last) { if (!marks.has(wi)) marks.set(wi, []); marks.get(wi).push(t); } }
  const W = Q.words;   // [gi, s, a, p]
  if (W[0][0] !== first || W.length !== last - first) throw Error(`page ${pg}: word mismatch`);
  const segsOf = (r, i) => (Q.riwayat[r] && Q.riwayat[r].c[i] ? unpack(Q.riwayat[r].c[i]) : null);
  const lineText = (r, s, e) => {
    let text = ""; const owner = [], cat = [];
    const add = (segs, tok) => {
      if (text) { text += " "; owner.push(-1); cat.push(0); }
      for (const [str, c] of segs) { const f = toFont(str); for (let i = 0; i < f.length; i++) { owner.push(tok); cat.push(catIndex(c)); } text += f; }
    };
    for (let w = s; w < e; w++) {
      const i = w - first, segs = segsOf(r, i) || [[H.words[w], null]];
      let before = "", after = "";
      for (const t of marks.get(w) || []) { if (t.kind === "sajdah_line") continue; if (t.side === "before") before += t.sign; else after += t.sign; }
      add([[before, null], ...segs, [after, null]], i);
      if (numsOf(r).has(w)) add([["۝" + AR(numsOf(r).get(w)), null]], MK + i);
      else if (r !== "hafs" && numsOf("hafs").has(w)) add([["۝", null]], MK + i);   // رأس آية عند حفص لا عند الرواية: أثر باهت
    }
    return { text, owner, cat };
  };
  const ends = li => (li + 1 < lineStarts.length ? lineStarts[li + 1] : last);
  const lines = { hafs: lineStarts.map((s, li) => shapeLine(lineText("hafs", s, ends(li)))) };
  const qa = [];
  lines.hafs.forEach((l, li) => { if (l.x < 0.999 || l.s < 0.999) qa.push(["hafs", li, l.x, l.s]); });
  for (const r of IDX.riwayat) {
    if (r === "hafs") continue;
    const diff = {};
    lineStarts.forEach((s, li) => {
      const l = shapeLine(lineText(r, s, ends(li)));
      if (same(l, lines.hafs[li])) return;
      diff[li] = l;
      if (l.x < 0.999 || l.s < 0.999) qa.push([r, li, l.x, l.s]);
    });
    lines[r] = diff;
  }

  // بيانات القالب
  const D = { hafs: W.map(([gi]) => H.words[gi]), ayah: W.map(w => w[2]), surah: W.map(w => w[1]), F: {}, S: {}, U: {}, W: {}, cards: [] };
  for (const r of IDX.riwayat) {
    const x = Q.riwayat[r];
    D.F[r] = W.map((_, i) => (x && x.c[i] ? unpack(x.c[i]) : 0));
    for (const [k, f] of [["S", "s"], ["U", "u"], ["W", "w"]]) { const set = new Set(x ? x[f] : []); D[k][r] = W.map((_, i) => (set.has(i) ? 1 : 0)); }
  }
  // علامات الآي لكل رواية: {i: [رقمها عند الرواية (0 = ليست رأس آية)، رقمها عند حفص (0 = ليست)، النوع]}
  D.AM = {};
  for (const r of IDX.riwayat) {
    const m = {};
    for (let gi = first; gi < last; gi++) {
      const nr = numsOf(r).get(gi) || 0, nh = numsOf("hafs").get(gi) || 0;
      if (nr || nh) m[gi - first] = [nr, nh, nr && !nh ? "+" : !nr && nh ? "-" : ""];
    }
    D.AM[r] = m;
  }
  D.AY = Object.fromEntries(IDX.riwayat.map(r => [r, W.map(([gi]) => ayahOf(r, gi))]));
  D.cards = Q.cards.map(c => (c ? c.map(part => part.map(id => { const [who, d, keys] = ST[id >> 1]; return [who, d, keys.map(k => IDX.riwayat[k]), id & 1 ? "fix" : ""]; })) : [[], []]));
  D.meta = { surah: H.surahs[W[0][1] - 1].name_ar, juz: juzOf(first), page: pg };
  D.first = first;

  const cards = {};
  const addForm = segs => {
    const k = JSON.stringify(segs);
    if (cards[k]) return;
    let text = ""; const owner = [], cat = [];
    for (const [str, c] of segs) { const f = toFont(str); for (let i = 0; i < f.length; i++) { owner.push(0); cat.push(catIndex(c)); } text += f; }
    cards[k] = run(text, [], null, { simpleSpacing: spaceWidth, ayaSpacing: spaceWidth, xScale: 1 }, owner, cat);
  };
  for (const r in D.F) D.F[r].forEach(s => s && addForm(s));
  D.hafs.forEach(h => addForm([[h, null]]));

  return { format: 1, page: pg, lines, data: D, cards, qa };
}
