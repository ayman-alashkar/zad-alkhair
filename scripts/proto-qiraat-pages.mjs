/* نموذج القراءات بعدة صفحات: يرسم كل صفحة بكل رواية بمحرّك DigitalKhatt من data/qiraat/.
   للتجربة فقط (لا يدخل البناء). node scripts/proto-qiraat-pages.mjs <out.json> 11 54 204 ... */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initHb, HarfBuzzBlob, HarfBuzzFace, HarfBuzzFont, HarfBuzzBuffer, getWidth, hb } from "./mushaf/digitalkhatt/harfbuzz.mjs";
import { analyzeLineForJust, justifyLine, FONTSIZE, SpaceType, JustStyle } from "./mushaf/digitalkhatt/just.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [outPath, ...pageArgs] = process.argv.slice(2);
const PAGES = pageArgs.map(Number);
const LINE_UNITS = 17600, SHRINK = "shr1", MIN_SPACE = 0.6;
const AR = d => String(d).replace(/\d/g, c => "٠١٢٣٤٥٦٧٨٩"[c]);
const toFont = w => w.replace(/ْ/g, "۟").replace(/ۡ/g, "ْ");
const IDX = JSON.parse(fs.readFileSync(path.join(root, "data/qiraat/index.json"), "utf8"));
const CATS = ["", "imala", "taqlil", "silah", "madd", "hamz", "idgham", "sakt", "farsh"];
const catOf = id => { const c = IDX.cats[id]; return c === "naql" ? CATS.indexOf("hamz") : Math.max(0, CATS.indexOf(c || "")); };
import { ayahNumbers, riwayaEnds, RIWAYA_COUNT, MADHHABS } from "./qiraat/ayah-count.mjs";
const MK = 100000;   // رمز علامة الآية: MK + رقم الكلمة التي قبلها في الصفحة
const ST = JSON.parse(fs.readFileSync(path.join(root, "data/qiraat/statements.json"), "utf8"));

await initHb(fs.readFileSync(path.join(root, "scripts/mushaf/vendor/harfbuzzjs/harfbuzz.wasm")));
const font = new HarfBuzzFont(new HarfBuzzFace(new HarfBuzzBlob(new Uint8Array(fs.readFileSync(path.join(root, "fonts/digitalkhatt/madina.otf")))), 0));
const H = JSON.parse(fs.readFileSync(path.join(root, "data/mushaf-src/hafs.json"), "utf8"));
const spaceWidth = getWidth(" ", font, FONTSIZE, null);
const glyphPaths = new Map();
const pathOf = gid => { if (!glyphPaths.has(gid)) glyphPaths.set(gid, font.glyphToSvgPath(gid)); return glyphPaths.get(gid); };

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
  return { x: +jr.xScale.toFixed(4), n: Math.round(-x), g, t, c, e };
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

const out = { cats: CATS, lineUnits: LINE_UNITS, pages: {}, cards: {}, data: {} };
const addForm = segs => {
  const k = JSON.stringify(segs);
  if (out.cards[k]) return;
  let text = ""; const owner = [], cat = [];
  for (const [str, c] of segs) { const f = toFont(str); for (let i = 0; i < f.length; i++) { owner.push(0); cat.push(c ? Math.max(0, CATS.indexOf(c === "naql" ? "hamz" : c)) : 0); } text += f; }
  out.cards[k] = run(text, [], null, { simpleSpacing: spaceWidth, ayaSpacing: spaceWidth, xScale: 1 }, owner, cat);
};
const AYAH_START = new Set(H.ayah_starts);
const NUMS = {};   // لكل رواية: رقم الآية عند كل كلمة هي رأس آية في عدّها
const numsOf = r => (NUMS[r] ??= ayahNumbers(r));
/** رقم الآية التي فيها الكلمة w في عدّ الرواية r. */
const ayahOf = (r, w) => { const m = numsOf(r); for (let x = w; x < H.words.length; x++) if (m.has(x)) return m.get(x); return 0; };
const juzOf = gi => H.juz_starts.filter(s => s <= gi).length;

for (const pg of PAGES) {
  const Q = JSON.parse(fs.readFileSync(path.join(root, "data/qiraat/pages", String(pg).padStart(3, "0") + ".json"), "utf8"));
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
      for (const [str, c] of segs) { const f = toFont(str); for (let i = 0; i < f.length; i++) { owner.push(tok); cat.push(c ? Math.max(0, CATS.indexOf(c === "naql" ? "hamz" : c)) : 0); } text += f; }
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
  out.pages[pg] = {};
  for (const r of ["hafs", ...IDX.riwayat]) {
    out.pages[pg][r] = lineStarts.map((s, li) => shapeLine(lineText(r, s, li + 1 < lineStarts.length ? lineStarts[li + 1] : last)));
  }
  // بيانات الصفحة للقالب
  const D = { hafs: W.map(([gi]) => H.words[gi]), ayah: W.map(w => w[2]), surah: W.map(w => w[1]), F: {}, S: {}, U: {}, W: {}, cards: [] };
  for (const r of IDX.riwayat) {
    const x = Q.riwayat[r];
    D.F[r] = W.map((_, i) => (x && x.c[i] ? unpack(x.c[i]) : 0));
    for (const [k, f] of [["S", "s"], ["U", "u"], ["W", "w"]]) { const set = new Set(x ? x[f] : []); D[k][r] = W.map((_, i) => (set.has(i) ? 1 : 0)); }
  }
  // علامات الآي لكل رواية: {i: [رقمها عند الرواية (0 = ليست رأس آية)، رقمها عند حفص (0 = ليست)، النوع]}
  D.AM = {};
  for (const r of ["hafs", ...IDX.riwayat]) {
    const m = {};
    for (let gi = first; gi < last; gi++) {
      const nr = numsOf(r).get(gi) || 0, nh = numsOf("hafs").get(gi) || 0;
      if (nr || nh) m[gi - first] = [nr, nh, nr && !nh ? "+" : !nr && nh ? "-" : ""];
    }
    D.AM[r] = m;
  }
  D.AY = Object.fromEntries(["hafs", ...IDX.riwayat].map(r => [r, W.map(([gi]) => ayahOf(r, gi))]));
  D.cards = Q.cards.map(c => (c ? c.map(part => part.map(id => { const [who, d, keys] = ST[id >> 1]; return [who, d, keys.map(k => IDX.riwayat[k]), id & 1 ? "fix" : ""]; })) : [[], []]));
  D.meta = { surah: H.surahs[W[0][1] - 1].name_ar, juz: juzOf(first), page: pg };
  out.data[pg] = D;
  for (const r in D.F) D.F[r].forEach(s => s && addForm(s));
  D.hafs.forEach(h => addForm([[h, null]]));
}
// فروق رؤوس الآي عن حفص في كل سورة من سور الصفحات، لكل رواية: [رقم الكلمة، آية حفص، الكلمة، + أو -]
{
  const surahsOf = new Set(Object.values(out.data).flatMap(D => D.surah));
  const hafsEnds = riwayaEnds("hafs"), hafsNum = ayahOf.bind(null, "hafs");
  const sOf = gi => H.surah_starts.filter(x => x <= gi).length;
  out.sdiff = {}; out.count = {};
  const AC = JSON.parse(fs.readFileSync(path.join(root, "data/qiraat-src/ayah-count.json"), "utf8"));
  for (const r of IDX.riwayat) {
    const ends = riwayaEnds(r), spec = RIWAYA_COUNT[r];
    const base = spec.startsWith("print:") ? AC.prints[spec.slice(6)].base : spec;
    const total = ends.size;
    out.count[r] = `${MADHHABS[base]}${spec.startsWith("print:") ? "، كما في مصحف المجمع للرواية" : r === "qalun" || r === "warsh" || r === "shubah" ? "، وعليه مصحف المجمع للرواية" : ""} (${AR(total)} آية)`;
    const d = {};
    for (const gi of new Set([...ends, ...hafsEnds])) {
      if (ends.has(gi) === hafsEnds.has(gi)) continue;
      const s = sOf(gi); if (!surahsOf.has(s)) continue;
      (d[s] ??= []).push([gi, hafsNum(gi), H.words[gi], ends.has(gi) ? "+" : "-"]);
    }
    for (const s in d) d[s].sort((a, b) => a[0] - b[0]);
    out.sdiff[r] = d;
  }
  out.count.hafs = `${MADHHABS.F} (${AR(6236)} آية)`;
  for (const D of Object.values(out.data)) D.first = H.page_starts[D.meta.page - 1];
}
out.glyphs = Object.fromEntries([...glyphPaths].filter(([, d]) => d).map(([gid, d]) => [gid, d.replace(/-?\d+\.\d+/g, n => String(Math.round(+n)))]));
out.upem = font.unitsPerEM;
fs.writeFileSync(outPath, JSON.stringify(out));
console.log("pages", PAGES.length, "forms", Object.keys(out.cards).length, "glyphs", Object.keys(out.glyphs).length,
  "squeezed", Object.values(out.pages).flatMap(p => Object.values(p)).flat().filter(l => l.x < .999).length, (fs.statSync(outPath).size / 1024 | 0) + "KB");
