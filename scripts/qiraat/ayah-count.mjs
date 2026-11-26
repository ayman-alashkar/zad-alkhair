// عدّ الآي لكل رواية: أين تنتهي الآية، على كلمات مصحف حفص.
// البيانات في data/qiraat-src/ayah-count.json (مصادرها مذكورة فيه).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const SRC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/qiraat-src/ayah-count.json'), 'utf8'));
const HAFS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mushaf-src/hafs.json'), 'utf8'));

export const MADHHABS = SRC.madhhabs;
export const RIWAYA_COUNT = SRC.riwayat;

const N = HAFS.words.length;
const AYAH_STARTS = HAFS.ayah_starts;
/** رؤوس آي حفص: آخر كلمة في كل آية. */
const HAFS_ENDS = AYAH_STARTS.map((s, i) => (i + 1 < AYAH_STARTS.length ? AYAH_STARTS[i + 1] : N) - 1);

/** مجموعة أرقام الكلمات التي تنتهي عندها الآية في مذهب (A..D). */
export function madhhabEnds(m) {
  const ends = new Set(HAFS_ENDS);
  for (const [w, who] of SRC.boundaries) (who.includes(m) ? ends.add(w) : ends.delete(w));
  return ends;
}

/** مجموعة رؤوس الآي لرواية (qalun، warsh…). */
export function riwayaEnds(r) {
  const spec = SRC.riwayat[r];
  if (!spec) throw new Error(`رواية غير معروفة: ${r}`);
  if (!spec.startsWith('print:')) return madhhabEnds(spec);
  const p = SRC.prints[spec.slice(6)];
  const ends = madhhabEnds(p.base);
  for (const w of p.add) ends.add(w);
  for (const w of p.drop) ends.delete(w);
  return ends;
}

/** عدد الآي في كل سورة (مصفوفة من 114) لمجموعة رؤوس آي. */
export function surahTotals(ends) {
  const starts = [...HAFS.surah_starts, N];
  const t = new Array(114).fill(0);
  for (const w of ends) {
    let s = 0;
    while (starts[s + 1] <= w) s++;
    t[s]++;
  }
  return t;
}

/** رقم الآية التي تنتهي عند كل كلمة رأس آية، لرواية: Map(word → number). */
export function ayahNumbers(r) {
  const ends = [...riwayaEnds(r)].sort((a, b) => a - b);
  const starts = HAFS.surah_starts;
  const out = new Map();
  let s = 0, n = 0;
  for (const w of ends) {
    while (s + 1 < starts.length && starts[s + 1] <= w) { s++; n = 0; }
    out.set(w, ++n);
  }
  return out;
}

export const SURAH_TOTALS = SRC.surah_totals;
