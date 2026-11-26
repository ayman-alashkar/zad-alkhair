/* نوافذ الكلمة والآية والصفحة، بأسلوب نوافذ زاد الخير (نافذة التفسير).
   - النافذة المركّزة: قسم واحد (القراءات، المعنى، التفسير…) تفتحه القائمة العائمة أو زر التفسير.
   - «المزيد»: النافذة نفسها بكل الأقسام، في ثلاثة مستويات (الكلمة، الآية، الصفحة والسورة).
   القسم كائن مسجّل في card/sections/:
     { id, level, label, order, title?, nav: "word"|"ayah"|"page"|"occ",
       available(ctx) → bool، render(ctx) → عنصر، source(ctx) → نص المصدر،
       sourceMore?: { label, run(ctx) }، shareText?(ctx) → نص، step?(ctx, d) → {page?, gi} }
   ctx: { page, gi, riwaya, surah, ayah, pos, i, Q } (يُكمَّل من locate في data.mjs).

   الاستعمال:
     openCard({ page, gi, riwaya }, { section: "qiraat", onNavigate(page, gi) {…}, toast(msg) {…} }); */
import { locate, wordIndex, ayahFirstGi } from "./data.mjs";
import { injectStyles } from "./style.mjs";
import { reportButton, reportTarget } from "./report.mjs";

export const LEVELS = [
  { id: "word", label: "الكلمة" },
  { id: "ayah", label: "الآية" },
  { id: "page", label: "الصفحة والسورة" },
];
const NAV = {
  word: ["الكلمة السابقة", "الكلمة التالية"],
  ayah: ["الآية السابقة", "الآية التالية"],
  page: ["الصفحة السابقة", "الصفحة التالية"],
  occ: ["الموضع السابق", "الموضع التالي"],
};
const SECTIONS = [];
export function registerSection(s) {
  SECTIONS.push(s);
  SECTIONS.sort((a, b) => a.order - b.order);
}
export const sectionById = id => SECTIONS.find(s => s.id === id);

const ICONS = {
  warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  share: '<circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.9l7.6-4.7M8.2 13.1l7.6 4.7"/>',
  more: '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
};
export const icon = (k, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const escText = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let current = null; // { root, sheet, ctx, full, level, tab, report, opts, seq }

export async function openCard(where, opts = {}) {
  injectStyles();
  const loc = await locate(where);
  if (!loc) return null;
  const ctx = { riwaya: "hafs", ...where, ...loc };
  closeCard(true);
  const first = opts.section && sectionById(opts.section);
  const root = el("div", "backdrop zc-backdrop");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.addEventListener("click", e => { if (e.target === root) closeCard(); });
  const sheet = el("section", "sheet zc-sheet");
  sheet.innerHTML = `<div class="sheethead"><h3></h3><button type="button" class="close-sheet">إغلاق</button></div>
    <div class="zc-switch"></div><div class="zc-body"></div><div class="zc-foot"></div>`;
  sheet.querySelector(".close-sheet").onclick = () => closeCard();
  root.appendChild(sheet);
  const C = {
    root, sheet, ctx, opts, report: false, seq: 0,
    full: !first, level: first ? first.level : (opts.level || "word"), tab: first ? { [first.level]: first.id } : {},
  };
  current = C;
  document.addEventListener("keydown", onKey);
  await render();
  if (current !== C) return null;
  document.body.appendChild(root);
  requestAnimationFrame(() => root.classList.add("in"));
  return C;
}

export function closeCard(instant = false) {
  if (!current) return;
  const C = current, done = C.opts.onClose;
  current = null;
  document.removeEventListener("keydown", onKey);
  if (instant || !C.root.isConnected) C.root.remove();
  else { C.root.classList.remove("in"); setTimeout(() => C.root.remove(), 200); }
  if (done) done();
}
const onKey = e => { if (e.key === "Escape") closeCard(); };

async function availableSections(level, ctx) {
  const out = [];
  for (const s of SECTIONS.filter(s => s.level === level)) if (await s.available(ctx)) out.push(s);
  return out;
}

/* يُبنى المحتوى الجديد كاملًا ثم يُستبدل دفعة واحدة، فلا وميض ولا «جارٍ التحميل» بين قسمين. */
async function render() {
  const C = current;
  if (!C) return;
  const { ctx } = C, seq = ++C.seq;
  const secs = await availableSections(C.level, ctx);
  if (C !== current || seq !== C.seq) return;
  const active = secs.find(s => s.id === C.tab[C.level]) || secs[0];
  if (active) C.tab[C.level] = active.id;

  // المستويات والأقسام (في «المزيد» وحده)
  const sw = el("div", "zc-switch");
  if (C.full) {
    const seg = el("div", "zc-levels");
    for (const L of LEVELS) {
      const b = el("button", "zc-level" + (L.id === C.level ? " on" : ""), L.label);
      b.type = "button";
      b.onclick = () => { C.level = L.id; render(); };
      seg.appendChild(b);
    }
    sw.appendChild(seg);
    if (secs.length > 1) {
      const tabs = el("div", "zc-tabs");
      tabs.setAttribute("role", "tablist");
      for (const s of secs) {
        const b = el("button", "zc-tab" + (s === active ? " on" : ""), s.label);
        b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(s === active));
        b.onclick = () => { C.tab[C.level] = s.id; render(); };
        tabs.appendChild(b);
      }
      sw.appendChild(tabs);
    }
  }

  const body = el("div", "zc-body" + (C.report ? " reporting" : ""));
  if (active) {
    body.appendChild(await active.render(ctx));
    if (C.report) for (const t of body.querySelectorAll("[data-report]")) t.appendChild(reportButton(ctx, active, t));
  } else body.appendChild(el("div", "zc-none", "لا شيء هنا لهذه الكلمة"));
  if (C.report) body.prepend(el("div", "zc-hint", "اضغط العلامة بجانب النص الذي فيه الخطأ"));

  const foot = el("div", "zc-foot");
  if (active && active.nav !== "none") {
    const [p, n] = NAV[active.nav || active.level] || NAV.word;
    const nav = el("div", "tafsir-nav");
    for (const [d, label] of [[-1, "‹ " + p], [1, n + " ›"]]) {
      const b = el("button", "tafsir-nav-btn", escText(label));
      b.type = "button";
      b.onclick = () => step(active, d);
      nav.appendChild(b);
    }
    foot.appendChild(nav);
  }
  const src = el("div", "source zc-source");
  const line = el("div", "source-line");
  const srcText = active && active.source ? active.source(ctx) : "";
  if (srcText) line.appendChild(el("span", "", "المصدر: " + escText(srcText)));
  if (active && active.sourceMore) {
    const m = el("button", "tafsir-more", escText(active.sourceMore.label));
    m.type = "button";
    m.onclick = () => active.sourceMore.run(ctx);
    line.appendChild(m);
  }
  src.appendChild(line);
  const acts = el("div", "zc-acts");
  const act = (k, label, fn, on) => { const b = el("button", "zc-act" + (on ? " on" : ""), icon(k, 19)); b.type = "button"; b.title = label; b.setAttribute("aria-label", label); b.onclick = fn; acts.appendChild(b); };
  if (active && active.shareText) act("share", "مشاركة", () => share(active));
  act("warn", C.report ? "إنهاء الإبلاغ" : "الإبلاغ عن خطأ", () => { C.report = !C.report; render(); }, C.report);
  if (!C.full) {
    const more = el("button", "zc-more", `${icon("more", 16)}<span>المزيد</span>`);
    more.type = "button";
    more.onclick = () => { C.full = true; render(); };
    acts.appendChild(more);
  }
  src.appendChild(acts);
  foot.appendChild(src);

  if (C !== current || seq !== C.seq) return;
  const title = active ? (typeof active.title === "function" ? await active.title(ctx) : active.title || active.label) : "";
  if (C !== current || seq !== C.seq) return;
  C.sheet.querySelector(".sheethead h3").textContent = title;
  C.sheet.querySelector(".zc-switch").replaceWith(sw);
  C.sheet.querySelector(".zc-body").replaceWith(body);
  C.sheet.querySelector(".zc-foot").replaceWith(foot);
  if (body.animate) body.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
  C.sheet.scrollTop = 0;
}

/* التنقل بحسب القسم: الكلمة، أو الآية، أو الصفحة، أو موضع المتشابهة. */
async function step(section, d) {
  const C = current, I = await wordIndex();
  if (!C || !I) return;
  let target = null;
  if (section.step) target = await section.step(C.ctx, d);
  else {
    const kind = section.nav || section.level;
    if (kind === "word") {
      const gi = C.ctx.gi + d;
      if (gi >= 0 && gi < I.count) target = { gi };
    } else if (kind === "ayah") {
      const gi = await ayahFirstGi(C.ctx, d);
      if (gi != null) target = { gi };
    } else if (kind === "page") {
      const p = C.ctx.page + d;
      if (p >= 1 && p <= 604) target = { page: p, gi: I.page_starts[p - 1] };
    }
  }
  if (!target || C !== current) return;
  await moveTo(C, target.page, target.gi);
}

async function moveTo(C, page, gi) {
  const I = await wordIndex();
  if (!page) {
    page = C.ctx.page;
    while (page < 604 && I.page_starts[page] <= gi) page++;
    while (page > 1 && I.page_starts[page - 1] > gi) page--;
  }
  const loc = await locate({ page, gi });
  if (!loc || C !== current) return;
  Object.assign(C.ctx, { page, gi }, loc);
  delete C.ctx.marker;   // نافذة علامة الآية لعلامتها وحدها
  if (C.opts.onNavigate) C.opts.onNavigate(page, gi);
  render();
}

async function share(section) {
  const text = await section.shareText(current.ctx);
  if (!text) return;
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); current.opts.toast && current.opts.toast("نُسخ النص للمشاركة"); }
  } catch (e) { /* أغلق المستخدم نافذة المشاركة */ }
}

/** انتقال إلى موضع آخر في المصحف (من المتشابهات مثلًا) مع بقاء النافذة على القسم نفسه. */
export function goTo(page, gi) {
  if (current) return moveTo(current, page, gi);
}

/** إعادة رسم النافذة (بعد تغيير خيار داخل القسم، كاختيار التفسير). */
export function refresh() { if (current) render(); }

export { reportTarget };
