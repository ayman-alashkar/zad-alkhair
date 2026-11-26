/* أدوات الحافظ على الكلمة: تظليل بلون فاتح، وتعليق. في المتصفح الآن (localStorage)، مفتاحها
   رقم الكلمة gi مع وقت آخر تعديل، لتُزامَن مع الحساب لاحقًا.
   ألوانها فاتحة مستطيلة كقلم التظليل، مختلفة تمامًا عن ألوان القراءات المشبعة. */
const KEY = "zad:hafiz-words";
export const HIGHLIGHTS = [
  { id: 1, name: "أصفر" },
  { id: 2, name: "أخضر" },
  { id: 3, name: "أزرق" },
  { id: 4, name: "وردي" },
];
let marks = null;
const listeners = new Set();

function load() {
  if (marks) return marks;
  try { marks = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { marks = {}; }
  return marks;
}
function save(gi) {
  try { localStorage.setItem(KEY, JSON.stringify(marks)); } catch {}
  for (const fn of listeners) fn(gi);
}
/* meta: {p: الصفحة، k: «سورة:آية»، w: نص الكلمة} ليُعرض التظليل والتعليق في قائمتها دون حساب. */
function update(gi, patch, meta = {}) {
  const m = load(), cur = { ...(m[gi] || {}), ...meta, ...patch, t: Date.now() };
  if (!cur.c) delete cur.c;
  if (!cur.n) delete cur.n;
  if (cur.c || cur.n) m[gi] = cur; else delete m[gi];
  save(gi);
}

export const markOf = gi => load()[gi] || null;
export const setHighlight = (gi, c, meta) => update(gi, { c: c || 0 }, meta);
export const setNote = (gi, text, meta) => update(gi, { n: String(text || "").trim().slice(0, 2000) }, meta);
/** كل التظليل والتعليقات بترتيب المصحف: [{gi, c, n, p, k, w, t}…]. */
export const allMarks = () => Object.entries(load()).map(([gi, v]) => ({ gi: Number(gi), ...v })).sort((a, b) => a.gi - b.gi);
export const onMarksChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

/** يضع أصناف التظليل والتعليق على كلمات العنصر (صفحة أو سطر)، في المحركين. */
export function decorateMarks(root) {
  const m = load();
  for (const el of root.querySelectorAll("[data-gi]")) {
    const k = m[el.dataset.gi];
    for (const h of HIGHLIGHTS) el.classList.toggle("hz-c" + h.id, !!k && k.c === h.id);
    el.classList.toggle("hz-note", !!(k && k.n));
  }
}
