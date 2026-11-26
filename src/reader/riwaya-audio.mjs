/* تلاوة الرواية المختارة: قارئ واحد لكل رواية من قرآنبيديا، ملف لكل آية.
   ملفات كل تلاوة مرقّمة على عدّ مذهبها (فحص قرآنبيديا 2026-11-23)، والمصحف والمشغّل
   يتحركان بآيات حفص؛ فلكل آية حفص قائمة ملفات:
   - [n]: ملف واحد.
   - []: الآية داخلة في ملف الآية قبلها (حفص يعدّها والمذهب لا يعدّها)، فتُتجاوز.
   - [n, n+1]: المذهب يعدّ رأس آية داخلها، فيُشغَّل الملفان تباعًا.
   البيانات في data/riwaya-audio.json، يبنيها scripts/build-riwaya-audio.mjs من عدّ الآي. */

let dataPromise = null;
export function loadRiwayaAudio() {
  if (!dataPromise) dataPromise = fetch("/data/riwaya-audio.json", { cache: "force-cache" })
    .then(r => { if (!r.ok) throw new Error("riwaya-audio " + r.status); return r.json(); })
    .catch(e => { dataPromise = null; throw e; });
  return dataPromise;
}

/** قوائم ملفات آيات السورة كلها على مذهب العدّ M. */
export function surahFiles(data, M, s) {
  const ev = (data.events[M] || {})[s] || {};
  const drop = new Set(ev.d || []), inner = ev.i || {}, count = data.hafs[s - 1];
  const out = [];
  let n = 0, open = false;
  for (let a = 1; a <= count; a++) {
    const files = [];
    // البسملة في الفاتحة ليست آية عند من لا يعدّها: لا ملف لها، والعدّ يبدأ بما بعدها.
    if (s === 1 && a === 1 && drop.has(1)) { out.push(files); continue; }
    if (!open) { n++; open = true; files.push(n); }
    for (let k = 0; k < (inner[a] || 0); k++) { n++; files.push(n); }
    if (!drop.has(a)) open = false;
    out.push(files);
  }
  return out;
}

const cache = new Map();
/** ملفات آية حفص s:a في تلاوة الرواية r، روابط كاملة. */
export function riwayaAyahFiles(data, r, s, a) {
  const rec = data.reciters[r];
  if (!rec) return null;
  const key = `${rec.count}:${s}`;
  if (!cache.has(key)) cache.set(key, surahFiles(data, rec.count, s));
  const files = cache.get(key)[a - 1] || [];
  const p = n => String(n).padStart(3, "0");
  return files.map(n => `https://files.quranpedia.net/recitations/${rec.id}/${p(s)}${p(n)}.mp3`);
}

/** رقم آية حفص s:a كما يُعرض في مصحف الرواية r (رقم آية الرواية التي تبدأ فيها). */
export function riwayaAyahNumber(data, r, s, a) {
  const spec = data.display && data.display.spec[r];
  const changes = (spec && data.display.by[spec][s]) || [];
  let d = 0;
  for (const [from, off] of changes) { if (from > a) break; d = off; }
  return a + d;
}
