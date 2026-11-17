/*
  يبني صفحات المصحف الـ604 مرسومةً مسبقًا: لكل صفحة شكل كل حرف وموضعه.

  المصادر (data/mushaf-src/، ومصدر كلٍّ وترخيصه في README.md هناك):
    hafs.json              نص مصحف المدينة 1441هـ برواية حفص، كلمةً كلمة، مع بدايات الصفحات
                           والسطور والآيات وعلامات الوقف (مجمع الملك فهد، عبر quran-ws/quran-text).
    print-1441-lines.json  نوع كل سطر في الصفحة (عنوان سورة، بسملة، نص) وعرض السطور القصيرة.
  الخط: fonts/digitalkhatt/madina.otf (DigitalKhatt، SIL OFL 1.1).
  ضبط السطر: محرك DigitalKhatt (scripts/mushaf/digitalkhatt، MIT) فوق HarfBuzz.

  المخرجات (data/mushaf/):
    glyphs.json   شكل كل حرف مستعمل، مسارًا بوحدات الخط (المحور الصادي إلى أعلى).
    meta.json     إصدار البيانات، والآية ← الصفحة، وبيانات السور.
    pages/NNN.json  سطور الصفحة: لكل حرف رقم شكله وموضعه ورقم كلمته في الصفحة.

  node scripts/build-mushaf.mjs           يكتب المخرجات
  node scripts/build-mushaf.mjs --check   يتحقق أن المخرجات مطابقة للمصادر دون كتابة
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initHb, HarfBuzzBlob, HarfBuzzFace, HarfBuzzFont, HarfBuzzBuffer, getWidth, hb } from "./mushaf/digitalkhatt/harfbuzz.mjs";
import { analyzeLineForJust, justifyLine, FONTSIZE, SpaceType, JustStyle } from "./mushaf/digitalkhatt/just.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const SRC = path.join(root, "data/mushaf-src"), OUT = path.join(root, "data/mushaf");
const FORMAT = 1;

/* عرض السطر الكامل بوحدات الخط عند حجم 1000. اختير ليقارب حجم الخط في QCF4 على الشاشة نفسها. */
const LINE_UNITS = 17600;
/* أقصى تضييق أفقي يُقبل في سطر أطول من غيره قبل أن يصغُر خط الصفحة كلها قليلًا. */
const MAX_SQUEEZE = 0.92;
const MIN_PAGE_SCALE = 0.86;

const AR = d => String(d).replace(/\d/g, c => "٠١٢٣٤٥٦٧٨٩"[c]);
/* ترميز نص المجمع إلى ترميز خط DigitalKhatt: السكون عند المجمع U+06E1 وعند الخط U+0652،
   وعلامة الحرف الزائد عند المجمع U+0652 وعند الخط U+06DF. الشكل المرسوم واحد. */
const toFont = w => w.replace(/ْ/g, "۟").replace(/ۡ/g, "ْ");
const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

async function main() {
  await initHb(fs.readFileSync(path.join(root, "scripts/mushaf/vendor/harfbuzzjs/harfbuzz.wasm")));
  const fontBytes = fs.readFileSync(path.join(root, "fonts/digitalkhatt/madina.otf"));
  const font = new HarfBuzzFont(new HarfBuzzFace(new HarfBuzzBlob(new Uint8Array(fontBytes)), 0));
  const H = readJson(path.join(SRC, "hafs.json"));
  const print = readJson(path.join(SRC, "print-1441-lines.json")).pages;
  const W = H.words, starts = H.line_starts, pageStarts = H.page_starts, ayahStarts = H.ayah_starts;
  if (W.length !== 77432 || starts.length !== 8820 || pageStarts.length !== 604 || ayahStarts.length !== 6236) throw Error("hafs source shape");

  // الآية لكل كلمة: [سورة، آية]
  const surahOfAyah = new Int16Array(6236), numOfAyah = new Int16Array(6236);
  H.surahs.forEach((s, si) => { for (let a = 0; a < s.ayah_count; a++) { surahOfAyah[s.first_ayah + a] = si + 1; numOfAyah[s.first_ayah + a] = a + 1; } });
  const ayahOfWord = new Int16Array(W.length);
  for (let a = 0, w = 0; a < 6236; a++) { const end = a + 1 < 6236 ? ayahStarts[a + 1] : W.length; for (; w < end; w++) ayahOfWord[w] = a; }
  const marks = new Map();
  for (const [wi, ti] of H.marks) { const t = H.mark_types[ti]; if (!marks.has(wi)) marks.set(wi, []); marks.get(wi).push(t); }
  /* كما في القارئ الحالي (isAllah في mushaf.js): ما فيه «الله» أو «لله» بعد حذف الحركات. */
  const isAllah = w => { const n = H.rasm_imlai[w] || ""; return n.includes("الله") || n.includes("لله"); };

  const spaceWidth = getWidth(" ", font, FONTSIZE, null);
  const glyphPaths = new Map();
  const pagesOut = [];
  const verseToPage = {};
  let squeezed = 0, scaledPages = 0;

  for (let p = 1; p <= 604; p++) {
    const kinds = print[p - 1];
    const textLines = kinds.filter(k => k.k === "text").length;
    const first = pageStarts[p - 1], last = p < 604 ? pageStarts[p] : W.length;
    const lineStarts = starts.filter(s => s >= first && s < last);
    if (lineStarts.length !== textLines) throw Error(`page ${p}: ${lineStarts.length} text lines in hafs, ${textLines} in print`);

    // نص كل سطر بترميز الخط، مع رقم الآية وعلامات الوقف، وخريطة من موضع الحرف إلى الكلمة.
    const tokens = []; // [{w: رقم الكلمة العام أو -1 لرقم الآية, a: رقم الآية العام}]
    const built = lineStarts.map((s, li) => {
      const e = li + 1 < lineStarts.length ? lineStarts[li + 1] : last;
      let text = ""; const owner = []; // owner[charIndex] = token index on page
      const add = (str, tok) => { if (text) { text += " "; owner.push(-1); } for (let i = 0; i < str.length; i++) owner.push(tok); text += str; };
      let sajda = null;
      for (let w = s; w < e; w++) {
        let str = toFont(W[w]), before = "";
        for (const t of marks.get(w) || []) {
          if (t.kind === "sajdah_line") { sajda = sajda || { from: tokens.length }; continue; }
          if (t.side === "before") before += t.sign; else str += t.sign;
        }
        const tok = tokens.push({ w, a: ayahOfWord[w] }) - 1;
        add(before + str, tok);
        const endsAyah = w + 1 === W.length || ayahStarts[ayahOfWord[w] + 1] === w + 1;
        if (endsAyah) { const t2 = tokens.push({ w: -1, a: ayahOfWord[w] }) - 1; add("۝" + AR(numOfAyah[ayahOfWord[w]]), t2); }
      }
      return { text, owner };
    });

    // حجم الخط في الصفحة: واحد للمصحف كله، ويصغُر قليلًا في صفحة فيها سطر يتجاوز حدّ التضييق.
    let pageScale = 1;
    let ti = 0;
    for (const k of kinds) {
      if (k.k !== "text") continue;
      const want = LINE_UNITS * (k.w || 1), nat = getWidth(built[ti++].text, font, FONTSIZE, null);
      if (nat * MAX_SQUEEZE > want) pageScale = Math.min(pageScale, want / (nat * MAX_SQUEEZE));
    }
    pageScale = Math.max(MIN_PAGE_SCALE, pageScale);
    if (pageScale < 1) scaledPages++;

    const linesOut = [];
    ti = 0;
    for (const k of kinds) {
      if (k.k === "sura") { linesOut.push({ k: "s", s: k.s }); continue; }
      const isBism = k.k === "bism";
      const { text, owner } = isBism ? { text: BASMALA, owner: [] } : built[ti++];
      const desired = LINE_UNITS * (k.w || 1) / pageScale;
      const key = p * 100 + linesOut.length; // مفتاح فريد لذاكرة analyzeLineForJust
      const info = analyzeLineForJust({ quranText: { [key]: [text] } }, key, 0);
      const features = [];
      let jr;
      if (isBism) {
        features.push({ tag: "basm", value: 1, start: 0, end: -1 });
        jr = { fontFeatures: new Map(), simpleSpacing: spaceWidth, ayaSpacing: spaceWidth, xScale: 1 };
      } else {
        jr = justifyLine(info, font, FONTSIZE / desired, spaceWidth, 1, JustStyle.XScale);
      }
      jr.fontFeatures.forEach((fs_, i) => fs_.forEach(f => features.push({ tag: f.name, value: f.value, start: i, end: i + 1 })));
      const buf = new HarfBuzzBuffer();
      buf.setDirection("rtl"); buf.setLanguage(hb.arabLanguage); buf.setScript(hb.arabScript); buf.setClusterLevel(1);
      buf.addText(text); buf.shape(font, features);
      const res = buf.json(); buf.destroy();
      const g = [], tok = [];
      let x = 0;
      for (let i = res.length - 1; i >= 0; i--) {
        const gl = res[i], sp = info.spaces.get(gl.Cluster);
        x -= sp === SpaceType.Aya ? jr.ayaSpacing : sp === SpaceType.Simple ? jr.simpleSpacing : gl.XAdvance;
        if (sp) continue;
        if (!glyphPaths.has(gl.GlyphId)) glyphPaths.set(gl.GlyphId, font.glyphToSvgPath(gl.GlyphId));
        if (!glyphPaths.get(gl.GlyphId)) continue;
        g.push(gl.GlyphId, Math.round(x + gl.XOffset), Math.round(gl.YOffset));
        tok.push(isBism ? -1 : owner[gl.Cluster]);
      }
      const width = Math.round(-x);
      if (jr.xScale < 0.999) squeezed++;
      const line = { k: isBism ? "b" : "t", x: +jr.xScale.toFixed(4), n: width, g, t: tok };
      if (k.w) line.w = k.w;
      linesOut.push(line);
    }
    for (const t of tokens) { const key = `${surahOfAyah[t.a]}:${numOfAyah[t.a]}`; verseToPage[key] ??= p; }
    pagesOut.push({
      format: FORMAT, page: p, scale: +pageScale.toFixed(4), lineUnits: LINE_UNITS,
      tokens: tokens.map(t => [t.w, surahOfAyah[t.a], numOfAyah[t.a], t.w >= 0 && isAllah(t.w) ? 1 : 0]),
      lines: linesOut
    });
  }

  const glyphs = {};
  [...glyphPaths.keys()].sort((a, b) => a - b).forEach(id => { const d = glyphPaths.get(id); if (d) glyphs[id] = roundPath(d); });
  const meta = {
    format: FORMAT, pages: 604, lineUnits: LINE_UNITS, upem: font.unitsPerEM,
    surahs: H.surahs.map((s, i) => ({ id: i + 1, name: s.name_ar, verses: s.ayah_count, page: verseToPage[`${i + 1}:1`] })),
    verses: verseToPage
  };

  const files = new Map();
  files.set("glyphs.json", JSON.stringify(glyphs));
  files.set("meta.json", JSON.stringify(meta));
  pagesOut.forEach(pg => files.set(`pages/${String(pg.page).padStart(3, "0")}.json`, JSON.stringify(pg)));

  let stale = 0, bytes = 0;
  for (const [rel, body] of files) {
    bytes += Buffer.byteLength(body);
    const file = path.join(OUT, rel);
    if (check) { if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== body) { stale++; console.error(`stale: data/mushaf/${rel}`); } }
    else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); }
  }
  if (check && stale) { console.error(`${stale} mushaf files differ from their sources; run node scripts/build-mushaf.mjs`); process.exit(1); }
  console.log(`${check ? "Checked" : "Built"} 604 mushaf pages, ${Object.keys(glyphs).length} glyphs, ${(bytes / 1048576).toFixed(1)} MB; ${squeezed} lines squeezed, ${scaledPages} pages scaled down.`);
}

/* المسار بأعداد صحيحة: يختصر الحجم دون فرق يُرى، فوحدة الخط جزء من ألف من حجمه. */
function roundPath(d) { return d.replace(/-?\d+\.\d+/g, n => String(Math.round(+n))); }

main().catch(e => { console.error(e); process.exit(1); });
