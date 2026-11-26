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
function update(gi, patch) {
  const m = load(), cur = { ...(m[gi] || {}), ...patch, t: Date.now() };
  if (!cur.c) delete cur.c;
  if (!cur.n) delete cur.n;
  if (cur.c || cur.n) m[gi] = cur; else delete m[gi];
  save(gi);
}

export const markOf = gi => load()[gi] || null;
export const setHighlight = (gi, c) => update(gi, { c: c || 0 });
export const setNote = (gi, text) => update(gi, { n: String(text || "").trim().slice(0, 2000) });
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
