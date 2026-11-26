/* أقسام مستوى الكلمة: القراءات، والمعنى والإعراب (المعنى والتصريف والإعراب معًا). */
import { registerSection } from "../card.mjs";
import { qiraatIndex, statements, wordLayers } from "../data.mjs";
import { formElement } from "../forms.mjs";
import { esc, node, para, ref, shareBlock, RIWAYA_NAMES, SOURCE_CENTER } from "./util.mjs";

const NO_DIFF = "لا خلاف بين القراء العشرة في هذه الكلمة";

/* ---------- القراءات: بطاقة النموذج كما راجعتها المجموعة ---------- */
async function qiraatData(ctx) {
  const [IDX, ST, L] = await Promise.all([qiraatIndex(), statements(), wordLayers(ctx.page, ctx.gi)]);
  const unpack = segs => segs.map(s => (typeof s === "string" ? [s, null] : [s[0], IDX.cats[s[1]]]));
  const formOf = keys => {
    for (const k of keys) { const x = ctx.Q.riwayat[IDX.riwayat[k]]; if (x && x.c[ctx.i]) return unpack(x.c[ctx.i]); }
    return [[L ? L.text : "", null]];
  };
  const [inw, wasl] = ctx.Q.cards[ctx.i] || [[], []];
  const rows = ids => ids.map(id => { const [who, d, keys] = ST[id >> 1]; return { who, d, keys, fix: id & 1, form: formOf(keys) }; });
  const mine = ctx.Q.riwayat[ctx.riwaya] && ctx.Q.riwayat[ctx.riwaya].c[ctx.i];
  return { IDX, inw: rows(inw), wasl: rows(wasl), word: mine ? unpack(mine) : [[L ? L.text : "", null]] };
}

registerSection({
  id: "qiraat", level: "word", label: "القراءات", order: 10, nav: "word",
  available: () => true,
  source: () => SOURCE_CENTER,
  async render(ctx) {
    const D = await qiraatData(ctx);
    const meKey = D.IDX.riwayat.indexOf(ctx.riwaya);
    const all = D.inw.concat(D.wasl);
    const box = node(`<div class="zc-stack"></div>`);
    const big = node(`<div class="zc-form"></div>`);
    big.appendChild(await formElement(ctx.page, D.word, { height: 60, ink: "var(--ui-accent)" }));
    box.appendChild(big);
    box.appendChild(node(`<div class="ref">${esc(await ref(ctx))} · برواية ${esc(RIWAYA_NAMES[ctx.riwaya] || ctx.riwaya)}</div>`));
    const group = async (title, rows) => {
      if (!rows.length) return;
      box.appendChild(node(`<div class="zc-h">${title}</div>`));
      for (const r of rows) {
        const me = r.keys.includes(meKey) || (!r.keys.length && !all.some(x => x.keys.includes(meKey)));
        const row = node(`<div class="zc-grp${me ? " me" : ""}" data-report="القراءات: ${esc(r.who)}"><div class="q"></div><div class="who"><b>${esc(r.who)}${r.fix ? '<span class="zc-fix">قاعدة</span>' : ""}</b><small>${esc(r.d.replace(/\.$/, ""))}</small></div></div>`);
        row.querySelector(".q").appendChild(await formElement(ctx.page, r.form, { height: 40 }));
        box.appendChild(row);
      }
    };
    await group("الخلاف في الكلمة", D.inw);
    await group("عند وصلها بما بعدها", D.wasl);
    if (!all.length) box.appendChild(node(para(NO_DIFF, "القراءات: لا خلاف", "zc-none")));
    if (all.some(r => r.fix)) box.appendChild(node(`<div class="zc-note">ما عليه «قاعدة» صُحِّح بنص المركز نفسه من نظائر الكلمة.</div>`));
    return box;
  },
  async shareText(ctx) {
    const D = await qiraatData(ctx), all = D.inw.concat(D.wasl);
    const body = all.length ? all.map(r => `${r.who}: ${r.d}`).join("\n") : NO_DIFF + ".";
    return shareBlock(`القراءات في «${D.word.map(s => s[0]).join("")}»`, body, SOURCE_CENTER, ctx);
  },
});

/* ---------- المعنى والإعراب: المعنى ثم التصريف ثم الإعراب، من مركز تفسير ---------- */
const PARTS = [["meaning", "المعنى"], ["sarf", "التصريف"], ["irab", "الإعراب"]];
registerSection({
  id: "meaning", level: "word", label: "المعنى والإعراب", order: 20, nav: "word",
  async available(ctx) { const L = await wordLayers(ctx.page, ctx.gi); return !!(L && (L.meaning || L.sarf || L.irab)); },
  source: () => SOURCE_CENTER,
  async render(ctx) {
    const L = await wordLayers(ctx.page, ctx.gi);
    const parts = PARTS.filter(([f]) => L[f]).map(([f, label]) => `<div class="zc-h">${label}</div>${para(esc(L[f]), label)}`).join("");
    return node(`<div class="zc-stack"><div class="zc-word">${esc(L.text)}</div><div class="ref">${esc(await ref(ctx))}</div>${parts}</div>`);
  },
  async shareText(ctx) {
    const L = await wordLayers(ctx.page, ctx.gi);
    const body = PARTS.filter(([f]) => L[f]).map(([f, label]) => `${label}: ${L[f]}`).join("\n");
    return shareBlock(`«${L.text}»`, body, SOURCE_CENTER, ctx);
  },
});
