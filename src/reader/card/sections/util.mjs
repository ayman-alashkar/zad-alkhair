/* أدوات مشتركة للأقسام. كل نص من البيانات يُهرَّب قبل إدخاله في الصفحة. */
import { wordIndex } from "../data.mjs";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const AR = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
export const RIWAYA_NAMES = {
  qalun: "قالون", warsh: "ورش", bazzi: "البزي", qunbul: "قنبل", duri: "الدوري عن أبي عمرو", susi: "السوسي",
  hisham: "هشام", dhakwan: "ابن ذكوان", shubah: "شعبة", hafs: "حفص", khalaf: "خلف عن حمزة", khallad: "خلاد",
  harith: "أبو الحارث", durik: "الدوري عن الكسائي", wardan: "ابن وردان", jammaz: "ابن جماز",
  ruwais: "رويس", rawh: "روح", ishaq: "إسحاق", idris: "إدريس",
};
export const SOURCE_CENTER = "مركز تفسير للدراسات القرآنية";

export function node(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.childElementCount === 1 ? t.content.firstElementChild : wrap(t.content);
}
const wrap = frag => { const d = document.createElement("div"); d.style.display = "contents"; d.appendChild(frag); return d; };

/** فقرة قابلة للإبلاغ عنها. */
export const para = (text, where, cls = "") => `<p data-report="${esc(where)}"${cls ? ` class="${cls}"` : ""}>${text}</p>`;
export const src = s => `<div class="zc-src">${esc(s)}</div>`;

export async function surahName(s) {
  const I = await wordIndex();
  return I && I.surah_names ? I.surah_names[s - 1] : `سورة ${AR(s)}`;
}
export async function ref(ctx) {
  return `${await surahName(ctx.surah)} ${AR(ctx.ayah)}`;
}
export const ayahLink = (s, a) => {
  const u = new URL(`/quran-read/${s}/`, location.origin);
  u.searchParams.set("ayah", String(a));
  return u.href;
};
/** نص المشاركة: العنوان، ثم النص، ثم المصدر والرابط. */
export async function shareBlock(title, body, source, ctx) {
  return `${title} (${await ref(ctx)})\n${body}\nالمصدر: ${source}\n${ayahLink(ctx.surah, ctx.ayah)}`;
}
