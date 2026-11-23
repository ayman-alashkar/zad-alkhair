// يبني data/qiraat/ من بيانات مركز تفسير (data/qiraat-src/) وكلمات صفحات المصحف (data/mushaf/pages/).
//   node scripts/build-qiraat.mjs           يكتب الملفات
//   node scripts/build-qiraat.mjs --check   يتأكد أن الملفات المولّدة مطابقة، ويفشل إن لم تكن
//
// المنهج: بيانات المركز كما هي، وفوقها ملف corrections.json («قاعدة»): أخطاء تدل عليها بيانات المركز
// نفسها، مصحَّحة بنص المركز من نظائر الكلمة. لا يضيف البرنامج خلافًا من عنده.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { SEP, ALL, RIWAYAT, statements, readers, perRiwaya, differs, understand, waqfPart, buildWord } from './qiraat/engine.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data/qiraat-src');
const OUT = path.join(ROOT, 'data/qiraat');
const CHECK = process.argv.includes('--check');

const keyOf = (s, a, w) => `${s}:${a}:${w}`;
const split = (c) => {
  const i = c.indexOf(SEP);
  return i < 0 ? [c.trim(), ''] : [c.slice(0, i).trim(), c.slice(i + SEP.length).trim()];
};
const norm = (c) => split(c).map((x) => x.replace(/\s+/g, ' ').trim()).join(` ${SEP} `);

// ---------- بيانات المركز ----------
const center = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(SRC, 'qeraat-info.json.gz'))));
const rows = new Map();
for (const [s, a, w, c] of center.rows) {
  const k = keyOf(s, a, w);
  if (!rows.has(k)) rows.set(k, []);
  rows.get(k).push(c || '');
}
const content = new Map([...rows].map(([k, v]) => [k, v[0]]));

// ---------- القاعدة (corrections.json) ----------
const corrections = JSON.parse(fs.readFileSync(path.join(SRC, 'corrections.json'), 'utf8'));
const fixed = new Map();      // المفتاح ← النص بعد التصحيح
for (const c of corrections) {
  const k = keyOf(...c.key);
  const prev = fixed.has(k) ? [fixed.get(k)] : (rows.get(k) || ['']);
  if (!prev.some((p) => norm(p) === norm(c.before))) {
    throw new Error(`corrections.json: «before» لا يطابق بيانات المركز في ${k} (${c.word}). هل تغيّرت نسخة المركز؟`);
  }
  fixed.set(k, c.after);
}
for (const [k, v] of fixed) content.set(k, v);

// ---------- كلمات المصحف بالترتيب ----------
const pageFiles = fs.readdirSync(path.join(ROOT, 'data/mushaf/pages')).filter((f) => /^\d{3}\.json$/.test(f)).sort();
const words = [];      // {gi, s, a, p, text, page}
for (const f of pageFiles) {
  const pg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mushaf/pages', f), 'utf8'));
  for (const [gi, s, a, , text] of pg.tokens) {
    if (gi < 0) continue;
    const last = words[words.length - 1];
    const p = last && last.s === s && last.a === a ? last.p + 1 : 1;
    words.push({ gi, s, a, p, text, page: pg.page });
  }
}
// ترقيم المركز للكلمة داخل الآية يتبع ترتيبها، إلا في فواتح السور (مثل «الٓمٓ» البقرة 1 = الكلمة 5)،
// فنطابق بالترتيب داخل الآية لا بالرقم.
const perAyah = new Map();
for (const k of content.keys()) {
  const [s, a, w] = k.split(':').map(Number);
  const ak = `${s}:${a}`;
  if (!perAyah.has(ak)) perAyah.set(ak, []);
  perAyah.get(ak).push(w);
}
for (const v of perAyah.values()) v.sort((x, y) => x - y);
for (const w of words) {
  const list = perAyah.get(`${w.s}:${w.a}`) || [];
  w.key = list.length >= w.p ? keyOf(w.s, w.a, list[w.p - 1]) : null;
}
const counts = new Map();
for (const w of words) counts.set(`${w.s}:${w.a}`, (counts.get(`${w.s}:${w.a}`) || 0) + 1);
const misaligned = [...counts].filter(([ak, n]) => (perAyah.get(ak) || []).length !== n);
if (misaligned.length) throw new Error(`عدد الكلمات يختلف بين المصحف والمركز في: ${misaligned.slice(0, 5).map(([ak]) => ak).join('، ')}`);

// ---------- لكل كلمة ورواية ----------
const parsed = words.map((w) => {
  const k = w.key;
  const [a, b] = split(content.get(k));
  return { word: perRiwaya(a).full, wasl: perRiwaya(b).full, a, b, k };
});
const res = {};          // رواية ← مصفوفة لكل كلمة
const cov = { words: words.length, riwayat: {} };
const violations = [];
for (const r of RIWAYAT) {
  const out = new Array(words.length);
  const c = (cov.riwayat[r] = { diffs: 0, coloured: 0, sound: 0, waqf: 0, unknown: 0, silent: 0 });
  let prevWasl = null;
  for (let i = 0; i < words.length; i++) {
    const P = parsed[i];
    const wd = differs(P.word, r), wl = differs(P.wasl, r);
    const bw = buildWord(words[i].text, wd, wl, words[i + 1] ? words[i + 1].text : null, prevWasl, P.word && P.word.hafs, P.wasl && P.wasl.hafs);
    prevWasl = bw.wasl;
    const waqf = [[wd, P.word], [wl, P.wasl]].some(([x, full]) => x && waqfPart(x) !== waqfPart(full ? full.hafs : ''));
    // خلاف عند المركز لم يُنتج البرنامج له علامة (فُهم الوصف ولا أثر له في الكتابة، كـ«بالإظهار»):
    // تُلوَّن الكلمة كلها ويُعرض نص المركز، فلا يضيع خلاف.
    const silent = (wd || wl) && !bw.segs && !bw.sound && !waqf;
    const unk = !bw.ok || silent;
    // وصف لم يُفهم كله: لا نعرض تلوينًا جزئيًا قد يوهم، بل الكلمة كلها ونص المركز
    out[i] = { segs: unk ? null : bw.segs, s: bw.sound && !bw.segs && !unk, u: unk, w: waqf };
    if (wd || wl) {
      c.diffs++;
      if (unk) {} else if (bw.segs) c.coloured++; else if (bw.sound) c.sound++; else if (waqf) c.waqf++;
      if (unk) c.unknown++;
      if (silent) c.silent++;
      // كل خلاف عند المركز يجب أن تكون له علامة
      if (!bw.segs && !bw.sound && !waqf && !unk) violations.push(`${P.k} ${words[i].text} ${r}: خلاف عند المركز بلا علامة`);
    }
  }
  res[r] = out;
}
if (violations.length) throw new Error(`${violations.length} خلافًا بلا علامة، منها:\n${violations.slice(0, 15).join('\n')}`);

// ---------- البطاقات: نص المركز كما هو، وعلامة «قاعدة» لما جاء من corrections.json ----------
// كل جملة («الراوي/الوصف») تُحفظ مرة واحدة في statements.json، والبطاقة أرقامها:
// الرقم × 2، و+1 إن كانت الجملة من القاعدة.
const stIndex = new Map(), stList = [];
function card(text, orig) {
  const old = new Set(statements(orig).map(([w, d]) => `${w}|${d}`));
  return statements(text).map(([who, d]) => {
    const id = `${who}|${d}`;
    if (!stIndex.has(id)) {
      const { keys } = readers(who);
      stIndex.set(id, stList.length);
      stList.push([who, d, Array.isArray(keys) ? keys.map((k) => ALL.indexOf(k)) : []]);
    }
    return stIndex.get(id) * 2 + (old.has(id) ? 0 : 1);
  });
}
const CATS = ['', 'imala', 'taqlil', 'silah', 'madd', 'hamz', 'idgham', 'sakt', 'farsh', 'naql'];
const packSegs = (segs) => segs.map(([t, k]) => (k ? [t, CATS.indexOf(k)] : t));
const indices = (o, f) => o.map((x, i) => (f(x) ? i : -1)).filter((i) => i >= 0);

// ---------- الكتابة ----------
const files = new Map();
const byPage = new Map();
words.forEach((w, i) => { if (!byPage.has(w.page)) byPage.set(w.page, []); byPage.get(w.page).push(i); });
for (const [page, idx] of byPage) {
  const doc = { format: 1, page, words: idx.map((i) => [words[i].gi, words[i].s, words[i].a, words[i].p]), riwayat: {}, cards: [] };
  for (const r of RIWAYAT) {
    const o = idx.map((i) => res[r][i]);
    if (!o.some((x) => x.segs || x.s || x.u || x.w)) continue;
    const c = {};
    o.forEach((x, i) => { if (x.segs) c[i] = packSegs(x.segs); });
    doc.riwayat[r] = {
      c,                                   // رقم الكلمة في الصفحة ← أجزاؤها: نص، أو [نص، رقم النوع في CATS]
      s: indices(o, (x) => x.s),           // أداء فقط
      u: indices(o, (x) => x.u),           // الكلمة كلها ونص المركز
      w: indices(o, (x) => x.w),           // خلاف عند الوقف
    };
  }
  doc.cards = idx.map((i) => {
    const P = parsed[i];
    const orig = rows.get(P.k) ? rows.get(P.k)[0] : '';
    const [oa, ob] = split(orig);
    const cw = card(P.a, oa), cl = card(P.b, ob);
    return cw.length || cl.length ? [cw, cl] : 0;
  });
  files.set(`pages/${String(page).padStart(3, '0')}.json`, JSON.stringify(doc));
}
const total = {};
for (const x of Object.values(cov.riwayat)) for (const [k, v] of Object.entries(x)) total[k] = (total[k] || 0) + v;
cov.total = total;
cov.corrections = { entries: corrections.length, words: fixed.size };
files.set('coverage.json', JSON.stringify(cov, null, 1) + '\n');
files.set('statements.json', JSON.stringify(stList));
files.set('index.json', JSON.stringify({ format: 1, riwayat: ALL, cats: CATS, pages: byPage.size, source: 'مركز تفسير للدراسات القرآنية (tafsir.net)، CC BY 4.0' }) + '\n');

if (CHECK) {
  const bad = [...files].filter(([f, d]) => !fs.existsSync(path.join(OUT, f)) || fs.readFileSync(path.join(OUT, f), 'utf8') !== d).map(([f]) => f);
  if (bad.length) { console.error(`data/qiraat غير محدَّثة (${bad.length} ملفًا، منها ${bad.slice(0, 3).join('، ')}). شغّل: node scripts/build-qiraat.mjs`); process.exit(1); }
  console.log(`data/qiraat مطابقة (${files.size} ملفًا)`);
} else {
  fs.rmSync(path.join(OUT, 'pages'), { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'pages'), { recursive: true });
  for (const [f, d] of files) fs.writeFileSync(path.join(OUT, f), d);
  const pct = (n) => ((100 * n) / total.diffs).toFixed(1) + '%';
  console.log(`القراءات: ${byPage.size} صفحة، ${total.diffs} خلافًا — ملوّن ${pct(total.coloured)}، أداء ${pct(total.sound)}، وقف ${pct(total.waqf)}، الكلمة كلها ونص المركز ${pct(total.unknown)}`);
}
