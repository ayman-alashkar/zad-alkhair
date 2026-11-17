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
    index.json    بيانات السور (بشكل index.json في حزمة QCF4).
    verses.json   الآية ← الصفحة (بشكل verses.json في حزمة QCF4).
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
/* السطر الأطول من مكانه يُضيَّق أولًا كما يضيّقه الخطاط: بأشكال الحروف الأضيق في الخط (ميزة shr1،
   نحو 5٪)، ثم بتقليل المسافات بين الكلمات حتى MIN_SPACE من عرضها، ولا يُضغط أفقيًّا إلا ما بقي. */
const SHRINK_FEATURE = "shr1";
const MIN_SPACE = 0.6;

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
  const names = readJson(path.join(SRC, "surah-names.json")).names;
  if (names.length !== 114) throw Error("surah names");
  const plainName = n => names[H.surahs.findIndex(x => x.name_ar === n)];
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
  /* أضيق عرض يبلغه السطر دون ضغط أفقي: بالأشكال الأضيق وأقل المسافات. */
  const tightWidth = text => getWidth(text, font, FONTSIZE, [{ tag: SHRINK_FEATURE, value: 1, start: 0, end: -1 }]) - (text.split(" ").length - 1) * spaceWidth * (1 - MIN_SPACE);
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
      const sajda = new Set(); // كلمات خط السجدة في السطر (رقمها في الصفحة)
      for (let w = s; w < e; w++) {
        let str = toFont(W[w]), before = "";
        for (const t of marks.get(w) || []) {
          if (t.kind === "sajdah_line") { sajda.add(tokens.length); continue; }
          if (t.side === "before") before += t.sign; else str += t.sign;
        }
        const tok = tokens.push({ w, a: ayahOfWord[w] }) - 1;
        add(before + str, tok);
        const endsAyah = w + 1 === W.length || ayahStarts[ayahOfWord[w] + 1] === w + 1;
        if (endsAyah) { const t2 = tokens.push({ w: -1, a: ayahOfWord[w] }) - 1; add("۝" + AR(numOfAyah[ayahOfWord[w]]), t2); }
      }
      return { text, owner, sajda };
    });

    // حجم الخط في الصفحة: واحد للمصحف كله، ويصغُر قليلًا في صفحة فيها سطر يتجاوز حدّ التضييق.
    let pageScale = 1;
    let ti = 0;
    for (const k of kinds) {
      if (k.k !== "text") continue;
      const want = LINE_UNITS * (k.w || 1), tight = tightWidth(built[ti++].text);
      if (tight * MAX_SQUEEZE > want) pageScale = Math.min(pageScale, want / (tight * MAX_SQUEEZE));
    }
    pageScale = Math.max(MIN_PAGE_SCALE, pageScale);
    if (pageScale < 1) scaledPages++;

    const linesOut = [];
    ti = 0;
    for (const k of kinds) {
      if (k.k === "sura") { linesOut.push({ k: "s", s: k.s }); continue; }
      const isBism = k.k === "bism";
      const { text, owner, sajda } = isBism ? { text: BASMALA, owner: [], sajda: new Set() } : built[ti++];
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
        if (jr.xScale < 1) {
          // أطول من مكانه: أشكال أضيق، ثم مسافات أقل، ثم ضغط أفقي لما بقي.
          const shrunk = getWidth(text, font, FONTSIZE, [{ tag: SHRINK_FEATURE, value: 1, start: 0, end: -1 }]);
          const n = info.spaces.size, room = n * spaceWidth * (1 - MIN_SPACE);
          let space = spaceWidth, xScale = 1;
          if (shrunk - room <= desired) space = spaceWidth - (shrunk - desired) / Math.max(1, n);
          else { space = spaceWidth * MIN_SPACE; xScale = desired / (shrunk - room); }
          space = Math.min(space, spaceWidth);
          jr = { fontFeatures: new Map(), simpleSpacing: space, ayaSpacing: space, xScale };
          features.push({ tag: SHRINK_FEATURE, value: 1, start: 0, end: -1 });
        }
      }
      jr.fontFeatures.forEach((fs_, i) => fs_.forEach(f => features.push({ tag: f.name, value: f.value, start: i, end: i + 1 })));
      const buf = new HarfBuzzBuffer();
      buf.setDirection("rtl"); buf.setLanguage(hb.arabLanguage); buf.setScript(hb.arabScript); buf.setClusterLevel(1);
      buf.addText(text); buf.shape(font, features);
      const res = buf.json(); buf.destroy();
      const g = [], tok = [], edges = [];
      let x = 0, lastTok = -2, sjRight = null, sjLeft = null;
      for (let i = res.length - 1; i >= 0; i--) {
        const gl = res[i], sp = info.spaces.get(gl.Cluster);
        const t = isBism ? -1 : owner[gl.Cluster];
        if (!sp && t !== lastTok) { edges.push(t, Math.round(x)); lastTok = t; }
        x -= sp === SpaceType.Aya ? jr.ayaSpacing : sp === SpaceType.Simple ? jr.simpleSpacing : gl.XAdvance;
        if (sp) continue;
        if (!glyphPaths.has(gl.GlyphId)) glyphPaths.set(gl.GlyphId, font.glyphToSvgPath(gl.GlyphId));
        if (!glyphPaths.get(gl.GlyphId)) continue;
        g.push(gl.GlyphId, Math.round(x + gl.XOffset), Math.round(gl.YOffset));
        tok.push(t);
        if (sajda.has(t)) { sjRight ??= Math.round(x + gl.XAdvance); sjLeft = Math.min(sjLeft ?? 0, Math.round(x + gl.XOffset)); }
      }
      const width = Math.round(-x);
      if (jr.xScale < 0.999) squeezed++;
      // e: لكل كلمة في السطر رقمها في الصفحة وحافتها اليمنى، ليُقسَّم السطر إلى أجزاء الآيات.
      const line = { k: isBism ? "b" : "t", x: +jr.xScale.toFixed(4), n: width, g, t: tok, e: edges };
      if (k.w) line.w = k.w;
      if (sjRight !== null) line.sj = [sjRight, sjLeft]; // خط السجدة فوق كلماتها: من الحافة اليمنى إلى اليسرى
      linesOut.push(line);
    }
    for (const t of tokens) { const key = `${surahOfAyah[t.a]}:${numOfAyah[t.a]}`; verseToPage[key] ??= p; }
    pagesOut.push({
      format: FORMAT, page: p, scale: +pageScale.toFixed(4), lineUnits: LINE_UNITS,
      surahs: [...new Set(tokens.map(t => surahOfAyah[t.a]))].map(id => ({ id, name_arabic: plainName(H.surahs[id - 1].name_ar) })),
      // لكل كلمة: رقمها العام (-1 لرقم الآية)، والسورة، والآية، ولفظ الجلالة، ونصها للبحث والمقتطفات.
      tokens: tokens.map(t => [t.w, surahOfAyah[t.a], numOfAyah[t.a], t.w >= 0 && isAllah(t.w) ? 1 : 0, t.w >= 0 ? plainText(W[t.w]) : ""]),
      lines: linesOut
    });
  }

  const glyphs = {};
  [...glyphPaths.keys()].sort((a, b) => a - b).forEach(id => { const d = glyphPaths.get(id); if (d) glyphs[id] = roundPath(d); });
  // بشكل index.json وverses.json في حزمة QCF4 نفسه، فيقرؤهما القارئ دون تغيير.
  const lastPageOf = id => { let last = 0; for (const [k, pg] of Object.entries(verseToPage)) if (+k.split(":")[0] === id) last = Math.max(last, pg); return last; };
  const meta = {
    meta: { format: FORMAT, total_pages: 604, total_chapters: 114, total_verses: 6236, line_units: LINE_UNITS, upem: font.unitsPerEM },
    chapters: H.surahs.map((s, i) => ({
      id: i + 1, name_arabic: plainName(s.name_ar), verses_count: s.ayah_count,
      pages: [verseToPage[`${i + 1}:1`], lastPageOf(i + 1)], bismillah_pre: s.has_basmalah && i !== 0,
      revelation_place: s.revelation === "madani" ? "madinah" : "makkah"
    }))
  };
  const verses = Object.fromEntries(Object.entries(verseToPage).map(([k, pg]) => [k, { page: pg }]));

  const files = new Map();
  files.set("glyphs.json", JSON.stringify(glyphs));
  files.set("index.json", JSON.stringify(meta));
  files.set("verses.json", JSON.stringify(verses));
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

/* نص الكلمة للبحث والمقتطفات: نص المجمع، والتنوين المفتوح بصورته المعتادة ليقرأه أي خط. */
function plainText(w) { return w.replace(/\u08F0/g, "\u064B").replace(/\u08F1/g, "\u064C").replace(/\u08F2/g, "\u064D"); }

/* المسار بأعداد صحيحة: يختصر الحجم دون فرق يُرى، فوحدة الخط جزء من ألف من حجمه. */
function roundPath(d) { return d.replace(/-?\d+\.\d+/g, n => String(Math.round(+n))); }

main().catch(e => { console.error(e); process.exit(1); });
