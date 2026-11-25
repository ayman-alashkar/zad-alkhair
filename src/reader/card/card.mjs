/* بطاقة الكلمة: تُفتح بالضغط المطوّل على كلمة في المصحف.
   ثلاثة مستويات (الكلمة، الآية، الصفحة والسورة)، ولكل مستوى أقسام مسجّلة في card/sections/.
   القسم كائن: { id, level, label, order, available(ctx) → bool، render(ctx) → عنصر،
                 shareText?(ctx) → نص يُشارك }
   ctx: { page, gi, riwaya, surah, ayah, pos, i, Q } (يُكمَّل من locate في data.mjs).

   الاستعمال:
     import { openCard } from "./card/card.mjs";
     openCard({ page, gi, riwaya }, { onTool(kind, ctx) {…}, onNavigate(page, gi) {…} });
   الأدوات (تظليل، تعليق، علامة، استماع) يملكها القارئ؛ البطاقة تستدعي onTool فقط. */
import { locate, wordIndex } from "./data.mjs";
import { injectStyles } from "./style.mjs";
import { reportButton, reportTarget } from "./report.mjs";

export const LEVELS = [
  { id: "word", label: "الكلمة" },
  { id: "ayah", label: "الآية" },
  { id: "page", label: "الصفحة والسورة" },
];
const SECTIONS = [];
export function registerSection(s) {
  SECTIONS.push(s);
  SECTIONS.sort((a, b) => a.order - b.order);
}

const ICONS = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>', prev: '<path d="M9 6l6 6-6 6"/>', next: '<path d="M15 6l-6 6 6 6"/>',
  warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  share: '<circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.9l7.6-4.7M8.2 13.1l7.6 4.7"/>',
  pen: '<path d="M4 20l4-1 10-10-3-3L5 16z"/><path d="M13 6l3 3"/>', note: '<path d="M5 5h14v10H9l-4 4z"/>',
  mark: '<path d="M7 4h10v16l-5-4-5 4z"/>', play: '<path d="M8 5l11 7-11 7z"/>',
};
export const icon = (k, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

let current = null;   // { root, ctx, level, tab, report, opts }

export async function openCard(where, opts = {}) {
  injectStyles();
  const loc = await locate(where);
  if (!loc) return null;
  const ctx = { riwaya: "hafs", ...where, ...loc };
  closeCard();
  const root = el("div", "zc-backdrop");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "بطاقة الكلمة");
  root.addEventListener("click", e => { if (e.target === root) closeCard(); });
  document.body.appendChild(root);
  current = { root, ctx, level: opts.level || "word", tab: {}, report: false, opts };
  document.addEventListener("keydown", onKey);
  await render();
  return current;
}

export function closeCard() {
  if (!current) return;
  current.root.remove();
  document.removeEventListener("keydown", onKey);
  const done = current.opts.onClose;
  current = null;
  if (done) done();
}
const onKey = e => { if (e.key === "Escape") closeCard(); };

async function availableSections(level, ctx) {
  const out = [];
  for (const s of SECTIONS.filter(s => s.level === level)) if (await s.available(ctx)) out.push(s);
  return out;
}

async function render() {
  const C = current, { ctx } = C;
  const card = el("div", "zc-card");
  // المستويات
  const seg = el("div", "zc-levels");
  for (const L of LEVELS) {
    const b = el("button", "zc-level" + (L.id === C.level ? " on" : ""), L.label);
    b.type = "button";
    b.onclick = () => { C.level = L.id; render(); };
    seg.appendChild(b);
  }
  card.appendChild(seg);
  // الأقسام
  const secs = await availableSections(C.level, ctx);
  if (C !== current) return;
  let active = secs.find(s => s.id === C.tab[C.level]) || secs[0];
  const tabs = el("div", "zc-tabs");
  tabs.setAttribute("role", "tablist");
  for (const s of secs) {
    const b = el("button", "zc-tab" + (s === active ? " on" : ""), s.label);
    b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", s === active ? "true" : "false");
    b.onclick = () => { C.tab[C.level] = s.id; render(); };
    tabs.appendChild(b);
  }
  card.appendChild(tabs);
  const body = el("div", "zc-body" + (C.report ? " reporting" : ""));
  card.appendChild(body);
  if (active) {
    body.appendChild(el("div", "zc-loading", "…"));
    const node = await active.render(ctx);
    if (C !== current) return;
    body.replaceChildren(node);
    if (C.report) for (const t of body.querySelectorAll("[data-report]")) t.appendChild(reportButton(ctx, active, t));
  } else body.appendChild(el("div", "zc-none", "لا شيء هنا لهذه الكلمة"));
  // التنقل والمشاركة والإبلاغ
  const nav = el("div", "zc-nav");
  const btn = (k, label, fn, on) => { const b = el("button", "zc-icon" + (on ? " on" : ""), icon(k, 21)); b.type = "button"; b.setAttribute("aria-label", label); b.onclick = fn; nav.appendChild(b); };
  btn("x", "إغلاق", closeCard);
  btn("prev", "الكلمة السابقة", () => step(-1));
  btn("next", "الكلمة التالية", () => step(1));
  if (active && active.shareText) btn("share", "مشاركة", () => share(active));
  btn("warn", "الإبلاغ عن خطأ", () => { C.report = !C.report; render(); }, C.report);
  card.appendChild(nav);
  if (C.report) card.appendChild(el("div", "zc-toast", "اضغط على العلامة بجانب النص للإبلاغ عن خطأ فيه"));
  // أدوات الحافظ (مستوى الكلمة)
  if (C.level === "word") {
    const tools = el("div", "zc-tools");
    for (const [k, label, kind] of [["pen", "تظليل", "highlight"], ["note", "تعليق", "note"], ["mark", "علامة", "bookmark"], ["play", "استماع", "listen"]]) {
      const b = el("button", "zc-tool", icon(k, 19) + `<span>${label}</span>`);
      b.type = "button";
      b.onclick = () => C.opts.onTool && C.opts.onTool(kind, ctx);
      tools.appendChild(b);
    }
    card.appendChild(tools);
  }
  C.root.replaceChildren(card);
}

async function step(d) {
  const C = current, I = await wordIndex();
  const gi = C.ctx.gi + d;
  if (!I || gi < 0 || gi >= I.count) return;
  let page = C.ctx.page;
  while (page < 604 && I.page_starts[page] <= gi) page++;
  while (page > 1 && I.page_starts[page - 1] > gi) page--;
  const loc = await locate({ page, gi });
  if (!loc || C !== current) return;
  Object.assign(C.ctx, { page, gi }, loc);
  if (C.opts.onNavigate) C.opts.onNavigate(page, gi);
  render();
}

async function share(section) {
  const text = await section.shareText(current.ctx);
  if (!text) return;
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); current.opts.toast && current.opts.toast("تم نسخ المحتوى للمشاركة"); }
  } catch (e) { /* أغلق المستخدم نافذة المشاركة */ }
}

/** انتقال إلى موضع آخر في المصحف (من المتشابهات مثلًا): يغلق البطاقة ويطلب من القارئ فتح الصفحة. */
export function goTo(page, gi) {
  const go = current && current.opts.onNavigate;
  closeCard();
  if (go) go(page, gi);
}

export { reportTarget };
