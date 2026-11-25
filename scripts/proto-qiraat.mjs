/* نموذج القراءات: الصفحة 11 من البقرة بكل رواية، مرسومة بمحرّك DigitalKhatt.
   الكلمات وسطورها من مصحف المدينة لحفص؛ الكلمة المختلفة تُكتب كما في الرواية ويُعاد ضبط سطرها.
   لكل شكل: رقم كلمته في الصفحة (-1 لرقم الآية)، ونوع الخلاف للحرف الذي يرسمه (0 لا خلاف).
   node scripts/proto-qiraat.mjs <tc_page11.json> <page11.json> <out.json> */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initHb, HarfBuzzBlob, HarfBuzzFace, HarfBuzzFont, HarfBuzzBuffer, getWidth, hb } from "./mushaf/digitalkhatt/harfbuzz.mjs";
import { analyzeLineForJust, justifyLine, FONTSIZE, SpaceType, JustStyle } from "./mushaf/digitalkhatt/just.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [tcPath, pagePath, outPath] = process.argv.slice(2);
const LINE_UNITS = 17600, SHRINK = "shr1", MIN_SPACE = 0.6;
const AR = d => String(d).replace(/\d/g, c => "٠١٢٣٤٥٦٧٨٩"[c]);
const toFont = w => w.replace(/ْ/g, "۟").replace(/ۡ/g, "ْ");
const CATS = ["", "imala", "taqlil", "silah", "madd", "hamz", "idgham", "sakt", "farsh"];
const catId = c => c === "naql" ? CATS.indexOf("hamz") : Math.max(0, CATS.indexOf(c || ""));

await initHb(fs.readFileSync(path.join(root, "scripts/mushaf/vendor/harfbuzzjs/harfbuzz.wasm")));
const font = new HarfBuzzFont(new HarfBuzzFace(new HarfBuzzBlob(new Uint8Array(fs.readFileSync(path.join(root, "fonts/digitalkhatt/madina.otf")))), 0));
const H = JSON.parse(fs.readFileSync(path.join(root, "data/mushaf-src/hafs.json"), "utf8"));
const T = JSON.parse(fs.readFileSync(tcPath, "utf8"));
const P = JSON.parse(fs.readFileSync(pagePath, "utf8"));
const spaceWidth = getWidth(" ", font, FONTSIZE, null);

const first = H.page_starts[10], last = H.page_starts[11];
const lineStarts = H.line_starts.filter(s => s >= first && s < last);
const words = P.words;                                 // 141 كلمة، بترتيب الصفحة
const marks = new Map();
for (const [wi, ti] of H.marks) { const t = H.mark_types[ti]; if (wi >= first && wi < last) { if (!marks.has(wi)) marks.set(wi, []); marks.get(wi).push(t); } }
const KUFI = new Set(["shubah", "hafs", "khalaf", "khallad", "harith", "durik", "ishaq", "idris"]);
const glyphPaths = new Map();
const pathOf = gid => { if (!glyphPaths.has(gid)) glyphPaths.set(gid, font.glyphToSvgPath(gid)); return glyphPaths.get(gid); };

/* السطر: نص بترميز الخط، ولكل حرف كلمته ونوع خلافه. */
function lineText(key, s, e) {
  let text = ""; const owner = [], cat = [];
  const add = (segs, tok) => {
    if (text) { text += " "; owner.push(-1); cat.push(0); }
    for (const [str, c] of segs) { const f = toFont(str); for (let i = 0; i < f.length; i++) { owner.push(tok); cat.push(catId(c)); } text += f; }
  };
  for (let w = s; w < e; w++) {
    const i = w - first, segs = (T.F[key] && T.F[key][i]) || [[H.words[w], null]];
    let before = "", after = "";
    for (const t of marks.get(w) || []) { if (t.kind === "sajdah_line") continue; if (t.side === "before") before += t.sign; else after += t.sign; }
    add([[before, null], ...segs, [after, null]], i);
    if (words[i].end) {
      const n = KUFI.has(key) ? words[i].a : words[i].a - 1;
      add([["۝" + AR(n), null]], -1);
    }
  }
  return { text, owner, cat };
}

function shapeLine({ text, owner, cat }, desired, key) {
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

/* صفحة كل رواية: حجم الخط واحد لكل الروايات (من صفحة حفص)، والسطر الأطول يضيق وحده. */
const out = { cats: CATS, pages: {}, cards: {} };
let lineKey = 900000; // مفتاح فريد لكل سطر في ذاكرة analyzeLineForJust
for (const key of Object.keys(T.F).concat("hafs")) {
  if (out.pages[key]) continue;
  out.pages[key] = lineStarts.map((s, li) => {
    const e = li + 1 < lineStarts.length ? lineStarts[li + 1] : last;
    return shapeLine(lineText(key, s, e), LINE_UNITS, ++lineKey);
  });
}
/* أشكال الكلمة في البطاقة: كل نص مختلف يُرسم مرة واحدة بعرضه الطبيعي. */
const formKey = segs => JSON.stringify(segs);
const addForm = segs => {
  const k = formKey(segs);
  if (out.cards[k]) return;
  let text = ""; const owner = [], cat = [];
  for (const [str, c] of segs) { const f = toFont(str); for (let i = 0; i < f.length; i++) { owner.push(0); cat.push(catId(c)); } text += f; }
  out.cards[k] = run(text, [], null, { simpleSpacing: spaceWidth, ayaSpacing: spaceWidth, xScale: 1 }, owner, cat);
};
for (const X of ["F", "G"]) for (const key in T[X]) for (const segs of T[X][key]) if (segs) addForm(segs);
for (let i = 0; i < words.length; i++) addForm([[words[i].forms.hafs, null]]);
out.glyphs = Object.fromEntries([...glyphPaths].filter(([, d]) => d).map(([gid, d]) => [gid, d.replace(/-?\d+\.\d+/g, n => String(Math.round(+n)))]));
out.upem = font.unitsPerEM; out.lineUnits = LINE_UNITS;
fs.writeFileSync(outPath, JSON.stringify(out));
console.log("riwayat", Object.keys(out.pages).length, "forms", Object.keys(out.cards).length, "glyphs", Object.keys(out.glyphs).length,
  "squeezed", Object.values(out.pages).flat().filter(l => l.x < .999).length);
