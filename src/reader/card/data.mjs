/* بيانات بطاقة الكلمة: تحميل الملفات عند الحاجة، وحفظها في الذاكرة.
   كل الملفات ثابتة في data/، ويخزّنها Service Worker في ذاكرة البطاقة (zad-card-…)،
   فالتحميل هنا لا يعرف شيئًا عن الاتصال: fetch، وإن فشل رجعت الدالة null.

   مفتاح الكلمة في كل مكان: رقمها العام gi في hafs.json (الفهرس الموحّد). */

const BASE = (globalThis.ZAD_DATA_BASE || "/data/");
const pad = n => String(n).padStart(3, "0");
const cache = new Map();

async function getJson(path) {
  if (cache.has(path)) return cache.get(path);
  const p = fetch(BASE + path, { cache: "force-cache" })
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);
  cache.set(path, p);
  const v = await p;
  if (v === null) cache.delete(path);   // يُعاد المحاولة لاحقًا
  return v;
}

/* ---------- الصفحة والكلمة ---------- */

/** كلمات الصفحة من ملف القراءات: [[gi, سورة، آية، ترتيبها في الآية]…] مع خلافات كل رواية وبطاقاتها. */
export const qiraatPage = page => getJson(`qiraat/pages/${pad(page)}.json`);
export const qiraatIndex = () => getJson("qiraat/index.json");
export const statements = () => getJson("qiraat/statements.json");
/** صفحة مصحف القراءات المرسومة (فيها أشكال الكلمات بكل رواية للبطاقة)، ومسارات الحروف. */
export const drawnPage = page => getJson(`qiraat-mushaf/pages/${pad(page)}.json`);
export const drawnMeta = () => getJson("qiraat-mushaf/meta.json");

export const wordIndex = () => getJson("words/index.json");
const wordsPage = page => getJson(`words/pages/${pad(page)}.json`);

/** موضع الكلمة: الصفحة، والسورة والآية، وترتيبها في الصفحة. */
export async function locate(ctx) {
  const Q = await qiraatPage(ctx.page);
  if (!Q) return null;
  const i = ctx.gi - Q.words[0][0];
  const w = Q.words[i];
  if (!w || w[0] !== ctx.gi) return null;
  return { page: ctx.page, i, surah: w[1], ayah: w[2], pos: w[3], Q };
}

/** معنى الكلمة وإعرابها وتصريفها: {meaning, irab, sarf} أو null. */
export async function wordLayers(page, gi) {
  const P = await wordsPage(page);
  const row = P && P.words.find(w => w[0] === gi);
  return row ? { text: row[1], meaning: row[2], irab: row[3], sarf: row[4] } : null;
}

/** كلمات الآية كلها بترتيبها (قد تمتد إلى الصفحة السابقة أو اللاحقة): [{gi, page}…]. */
export async function ayahWords(page, surah, ayah) {
  const out = [];
  for (const p of [page - 1, page, page + 1]) {
    if (p < 1 || p > 604) continue;
    const Q = await qiraatPage(p);
    if (!Q) continue;
    for (const w of Q.words) if (w[1] === surah && w[2] === ayah) out.push({ gi: w[0], page: p });
  }
  return out.sort((a, b) => a.gi - b.gi);
}

/** أول كلمة في الآية السابقة (d = -1) أو التالية (d = 1) لآية ctx، أو null عند طرف المصحف. */
export async function ayahFirstGi(ctx, d) {
  const key = w => w[1] * 1000 + w[2], here = ctx.surah * 1000 + ctx.ayah;
  if (d > 0) {
    for (let p = ctx.page; p <= Math.min(604, ctx.page + 2); p++) {
      const Q = await qiraatPage(p);
      const w = Q && Q.words.find(w => key(w) > here);
      if (w) return w[0];
    }
    return null;
  }
  // السابقة: آخر كلمة قبل الآية الحالية، ثم أول كلمة في آيتها
  let prev = null;
  for (let p = ctx.page; p >= Math.max(1, ctx.page - 2) && !prev; p--) {
    const Q = await qiraatPage(p);
    if (Q) prev = [...Q.words].reverse().find(w => key(w) < here) || null;
  }
  if (!prev) return null;
  const words = await ayahWords(ctx.page, prev[1], prev[2]);
  return words.length ? words[0].gi : prev[0];
}

/* ---------- المتشابهات ---------- */
let mut = null;
async function mutData() {
  if (!mut) {
    const M = await getJson("words/mutashabihat.json");
    if (!M) return null;
    mut = { ...M, byWord: new Map() };
    for (const [id, occ] of Object.entries(M.phrases))
      for (const [a, b] of occ) for (let g = a; g <= b; g++) {
        if (!mut.byWord.has(g)) mut.byWord.set(g, []);
        mut.byWord.get(g).push(id);
      }
  }
  return mut;
}
/** العبارات التي تقع فيها الكلمة، ولكل عبارة مواضعها كلها:
    [{id, occ: [{a, b, page, surah, ayah, words: [نص كل كلمة]}…]}…]، من ملف واحد صغير. */
export async function mutashabihatFor(gi) {
  const M = await mutData();
  if (!M) return [];
  return (M.byWord.get(gi) || []).map(id => ({
    id,
    occ: M.phrases[id].map(([a, b]) => {
      const [page, surah, ayah] = M.at[a];
      const words = [];
      for (let g = a; g <= b; g++) words.push(M.words[g]);
      return { a, b, page, surah, ayah, words };
    }),
  }));
}

/* ---------- الآية ---------- */
export const TAFSIRS = [
  { id: "al-mukhtasar", label: "المختصر" },
  { id: "al-saadi", label: "السعدي" },
  { id: "al-wajeez", label: "الوجيز" },
];
export async function tafsir(book, surah, ayah) {
  const S = await getJson(`tafsir/${book}/${pad(surah)}.json`);
  return S && S.ayahs[ayah] ? S.ayahs[ayah].text : null;
}
export async function ayahIrab(surah, ayah) {
  const S = await getJson(`i3rab/markaz-tafsir/${pad(surah)}.json`);
  return S && S.ayahs[ayah] ? S.ayahs[ayah].text : null;
}
export async function nuzool(surah, ayah) {
  const N = await getJson("nuzool.json");
  return (N && N.ayahs[`${surah}:${ayah}`]) || null;
}

/* ---------- الصفحة والسورة ---------- */
export async function fawaed(page) {
  const F = await getJson("fawaed.json");
  return (F && F.pages[page]) || [];
}
export async function surahGoals(surah) {
  const G = await getJson("surah-goals.json");
  return (G && G.surahs[surah]) || null;
}
/** رأس آية مختلف فيه عند الكلمة gi: المذاهب التي تعدّه، وهل تعدّه الرواية وحفص، ورقمه فيهما.
    null إن لم يكن موضع خلاف. */
export async function headInfo(gi, riwaya, surah, ayah) {
  const A = await getJson("qiraat-src/ayah-count.json");
  if (!A) return null;
  if (!headInfo.map) headInfo.map = new Map(A.boundaries.map(b => [b[0], b]));
  const b = headInfo.map.get(gi);
  if (!b) return null;
  const who = b[1], spec = A.riwayat[riwaya] || "F";
  let counts, base = spec, print = null;
  if (spec.startsWith("print:")) {
    print = A.prints[spec.slice(6)]; base = print.base;
    counts = print.add.includes(gi) ? true : print.drop.includes(gi) ? false : who.includes(base);
  } else counts = who.includes(spec);
  const order = A.surah_totals.order.split("");
  return {
    word: b[3], ref: b[2], counts, hafs: who.includes("F"), print,
    madhhabs: order.map(m => ({ code: m, name: A.madhhabs[m], counts: who.includes(m), mine: m === base })),
  };
}

/** عدد آيات السورة في المذاهب الستة، والعدّ الذي تتبعه الرواية. */
export async function ayahCounts(surah, riwaya) {
  const [A, I] = await Promise.all([getJson("qiraat-src/ayah-count.json"), wordIndex()]);
  if (!A) return null;
  const order = A.surah_totals.order.split(""), totals = A.surah_totals.by_surah[surah];
  const rows = order.map((m, k) => ({ code: m, name: A.madhhabs[m], count: totals[k] }));
  const spec = A.riwayat[riwaya] || "F";
  let code = spec, count = null, print = false;
  if (spec.startsWith("print:")) {
    const P = A.prints[spec.slice(6)];
    code = P.base; print = true;
    const inSurah = g => I && I.surah_starts[surah - 1] <= g && (surah === 114 || g < I.surah_starts[surah]);
    count = totals[order.indexOf(P.base)] + P.add.filter(inSurah).length - P.drop.filter(inSurah).length;
  } else count = totals[order.indexOf(code)];
  return { rows, riwaya: { code, name: A.madhhabs[code], count, print } };
}

/* ---------- ترقيم آيات الرواية (data/riwaya-audio.json) ---------- */
export const riwayaAudio = () => getJson("riwaya-audio.json");
