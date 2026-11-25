/* أقسام مستوى الكلمة: القراءات، المعنى، التصريف، الإعراب. */
import { registerSection } from "../card.mjs";
import { qiraatIndex, statements, wordLayers } from "../data.mjs";
import { formElement } from "../forms.mjs";
import { esc, node, para, src, ref, shareBlock, RIWAYA_NAMES, SOURCE_CENTER } from "./util.mjs";

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
  id: "qiraat", level: "word", label: "القراءات", order: 10,
  available: () => true,
  async render(ctx) {
    const D = await qiraatData(ctx);
    const meKey = D.IDX.riwayat.indexOf(ctx.riwaya);
    const all = D.inw.concat(D.wasl);
    const box = node(`<div style="display:contents"></div>`);
    const big = node(`<div class="zc-form"></div>`);
    big.appendChild(await formElement(ctx.page, D.word, { height: 60, ink: "var(--brand,#0F5C50)" }));
    box.appendChild(big);
    box.appendChild(node(`<div class="zc-sub">${esc(await ref(ctx))} · برواية ${esc(RIWAYA_NAMES[ctx.riwaya] || ctx.riwaya)}</div>`));
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
    if (!all.length) box.appendChild(node(`<div class="zc-none">لا خلاف بين القراء العشرة في هذه الكلمة</div>`));
    box.appendChild(node(src(`نص الخلاف من ${SOURCE_CENTER} (tafsir.net)${all.some(r => r.fix) ? "، وما عليه «قاعدة» مصحَّح بنص المركز من نظائر الكلمة" : ""}`)));
    return box;
  },
  async shareText(ctx) {
    const D = await qiraatData(ctx), all = D.inw.concat(D.wasl);
    const body = all.length ? all.map(r => `${r.who}: ${r.d}`).join("\n") : "لا خلاف بين القراء العشرة في هذه الكلمة.";
    return shareBlock(`القراءات — «${D.word.map(s => s[0]).join("")}»`, body, SOURCE_CENTER, ctx);
  },
});

/* ---------- المعنى والتصريف والإعراب: نص واحد من مركز تفسير ---------- */
for (const [id, label, field, order] of [["meaning", "المعنى", "meaning", 20], ["sarf", "التصريف", "sarf", 30], ["irab", "الإعراب", "irab", 40]]) {
  registerSection({
    id, level: "word", label, order,
    async available(ctx) { const L = await wordLayers(ctx.page, ctx.gi); return !!(L && L[field]); },
    async render(ctx) {
      const L = await wordLayers(ctx.page, ctx.gi);
      return node(`<div style="display:contents">
        <div class="zc-word">${esc(L.text)}</div>
        <div class="zc-sub">${esc(await ref(ctx))}</div>
        ${para(esc(L[field]), label)}
        ${src(`من ${SOURCE_CENTER}`)}</div>`);
    },
    async shareText(ctx) {
      const L = await wordLayers(ctx.page, ctx.gi);
      return shareBlock(`${label} — «${L.text}»`, L[field], SOURCE_CENTER, ctx);
    },
  });
}
