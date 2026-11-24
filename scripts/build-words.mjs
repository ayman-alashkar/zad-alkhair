// يبني الفهرس الموحّد للكلمات وطبقة المعنى والإعراب والتصريف.
//   node scripts/build-words.mjs           يكتب data/words/
//   node scripts/build-words.mjs --check   يتأكد أن الملفات المولّدة مطابقة، ويفشل إن لم تكن
//
// المعرّف الموحّد لكل كلمة هو رقمها العام gi في data/mushaf-src/hafs.json (0..77431).
// الربط بكل مصدر آخر بترتيب الكلمة داخل آيتها، لأن عدد كلمات كل آية واحد في المصادر الثلاثة
// (يتحقق منه هذا البرنامج ويفشل إن اختلف):
//   - مركز تفسير: مفتاحه سورة:آية:رقم الكلمة. رقمه يخالف الترتيب في فواتح السور وحدها
//     (2:1 «الٓمٓ» رقمها 5)، فتُحفظ هذه في center_wno.
//   - QCF V4 (القارئ الحالي): الصفحة والسطر وموضع الكلمة في words[] كما في data/qcf-v4/pages.
//     علامة السجدة (#1969) ليست كلمة فتُتخطّى، وفي موضعين يختلف التقسيم (QCF_SPLIT أدناه).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data/words');
const CHECK = process.argv.includes('--check');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const pad = (p) => String(p).padStart(3, '0');
const fail = (m) => { console.error('build-words: ' + m); process.exit(1); };

const H = read('data/mushaf-src/hafs.json');
const N = H.words.length;

// مفتاح الآية لكل كلمة
const ayahOf = new Array(N);
{
  const starts = [...H.ayah_starts, N];
  let ai = 0;
  for (const s of H.surahs) for (let a = 1; a <= s.ayah_count; a++, ai++)
    for (let g = starts[ai]; g < starts[ai + 1]; g++) ayahOf[g] = `${s.number}:${a}`;
  if (ai !== H.ayah_starts.length) fail('عدد الآيات في hafs.json غير متسق');
}
const hafsByAyah = new Map();
for (let g = 0; g < N; g++) {
  const k = ayahOf[g];
  if (!hafsByAyah.has(k)) hafsByAyah.set(k, []);
  hafsByAyah.get(k).push(g);
}

// صفحة المصحف المرسوم
const page = new Array(N);
for (let p = 1; p <= 604; p++)
  for (const t of read(`data/mushaf/pages/${pad(p)}.json`).tokens) if (t[0] >= 0) page[t[0]] = p;

// QCF V4
// موضعان يختلف فيهما تقسيم الكلمات عن hafs.json (at = ترتيب الكلمة في الآية من 0):
//   15:7  «لَّوۡمَا» كلمة واحدة في hafs.json، ومحرفان في QCF («لَّوْ» «مَا»): الثاني في qcf_extra.
//   37:130 «إِلۡ» «يَاسِينَ» كلمتان في hafs.json، ومحرف واحد في QCF: تشيران إليه كلتاهما.
const QCF_SPLIT = { '15:7': { at: 0, qcf: +1 }, '37:130': { at: 2, qcf: -1 } };
const qcfExtra = {};
const qcf = new Array(N);
{
  const byAyah = new Map();
  for (let p = 1; p <= 604; p++) {
    read(`data/qcf-v4/pages/${pad(p)}.json`).lines.forEach((l, li) => (l.words || []).forEach((w, wi) => {
      if (w.type !== 'word' || w.text === '#1969') return;
      if (!byAyah.has(w.verse_key)) byAyah.set(w.verse_key, []);
      byAyah.get(w.verse_key).push([p, li, wi]);
    }));
  }
  for (const [k, gs] of hafsByAyah) {
    let q = byAyah.get(k) || [];
    const fix = QCF_SPLIT[k];
    if (fix) {
      if (q.length !== gs.length + fix.qcf) fail(`QCF ${k}: الاستثناء الموثّق لم يعد ينطبق`);
      if (fix.qcf > 0) { qcfExtra[gs[fix.at]] = q[fix.at + 1]; q = q.filter((_, i) => i !== fix.at + 1); }
      else q = [...q.slice(0, fix.at + 1), q[fix.at], ...q.slice(fix.at + 1)];
    }
    if (q.length !== gs.length) fail(`QCF ${k}: ${q.length} كلمة، وفي hafs.json ${gs.length}`);
    gs.forEach((g, i) => { qcf[g] = q[i]; });
  }
}

// مركز تفسير
const center = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'data/words-src/center-words.json.gz'))));
const COL = Object.fromEntries(center.columns.map((c, i) => [c, i]));
const centerRow = new Array(N);
const centerWno = {};
{
  const byAyah = new Map();
  for (const r of center.rows) {
    const k = `${r[COL.surah]}:${r[COL.ayah]}`;
    if (!byAyah.has(k)) byAyah.set(k, []);
    byAyah.get(k).push(r);
  }
  for (const [k, gs] of hafsByAyah) {
    const rs = (byAyah.get(k) || []).sort((a, b) => a[COL.word] - b[COL.word]);
    if (rs.length !== gs.length) fail(`مركز تفسير ${k}: ${rs.length} كلمة، وفي hafs.json ${gs.length}`);
    gs.forEach((g, i) => {
      centerRow[g] = rs[i];
      if (rs[i][COL.word] !== i + 1) centerWno[g] = rs[i][COL.word];
    });
  }
  if (center.rows.length !== N) fail(`صفوف المركز ${center.rows.length} لا ${N}`);
}

const ATTR = {
  source: 'مركز تفسير للدراسات القرآنية — قاعدة بيانات القرآن الكريم (quran.db)',
  license: 'CC BY 4.0',
  sha256: center.sha256,
};

const files = new Map();
const json = (o) => JSON.stringify(o) + '\n';

// الفهرس: مصفوفات بطول عدد الكلمات، الموضع فيها هو gi
const qcfPageDiff = {};
for (let g = 0; g < N; g++) if (qcf[g][0] !== page[g]) qcfPageDiff[g] = qcf[g][0];
files.set('index.json', json({
  format: 1,
  count: N,
  note: 'الموضع في كل مصفوفة هو رقم الكلمة العام gi في hafs.json. مفتاح المركز = آية الكلمة + (center_wno[gi] أو ترتيبها في الآية). صفحة QCF هي page إلا ما في qcf_page.',
  page_starts: H.page_starts,
  center_wno: centerWno,
  qcf_page: qcfPageDiff,
  qcf_line: qcf.map((q) => q[1]),
  qcf_word: qcf.map((q) => q[2]),
  qcf_extra: qcfExtra,
}));

// طبقة المعنى والإعراب والتصريف: ملف لكل صفحة
for (let p = 1; p <= 604; p++) {
  const words = [];
  for (let g = 0; g < N; g++) if (page[g] === p) {
    const r = centerRow[g];
    words.push([g, r[COL.meaning], r[COL.irab], r[COL.sarf]]);
  }
  files.set(`pages/${pad(p)}.json`, json({ format: 1, page: p, ...ATTR, columns: ['gi', 'meaning', 'irab', 'sarf'], words }));
}

if (CHECK) {
  const stale = [...files].filter(([f, d]) => {
    const fp = path.join(OUT, f);
    return !fs.existsSync(fp) || fs.readFileSync(fp, 'utf8') !== d;
  }).map(([f]) => f);
  if (stale.length) fail(`ملفات غير محدّثة (${stale.length}): ${stale.slice(0, 5).join(', ')} — شغّل node scripts/build-words.mjs`);
  console.log(`build-words: ${files.size} ملفًا مطابقًا`);
} else {
  fs.mkdirSync(path.join(OUT, 'pages'), { recursive: true });
  for (const [f, d] of files) fs.writeFileSync(path.join(OUT, f), d);
  console.log(`build-words: ${N} كلمة، ${Object.keys(centerWno).length} رقمًا مخالفًا في المركز، ${Object.keys(qcfPageDiff).length} صفحة QCF مخالفة`);
}
