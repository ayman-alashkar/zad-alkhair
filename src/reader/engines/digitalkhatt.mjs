/* محرّك DigitalKhatt للروايات غير حفص: الصفحة نفسها (سطور طبعة المدينة 1441)، كل سطر
   صورة SVG مرسومة مسبقًا بخط DigitalKhatt (data/qiraat-mushaf، يبنيها
   scripts/build-qiraat-mushaf.mjs). ملف كل صفحة فيه سطور حفص كاملة، ولكل رواية السطور
   التي تخالف فيها حفصًا وحدها؛ ومسارات الحروف كلها في meta.json.

   عنوان السورة والبسملة يرسمهما محرّك QCF كما هما (السطور نفسها في الطبعتين)، ثم تُستبدل
   أسطر النص بأسطر DigitalKhatt بالترتيب. علامات العناصر كما تطلبها ayah-marks.mjs:
   data-ayah وdata-gi على مجموعة حروف كل كلمة، فالضغطات والتحديد تعمل كما في حفص. */

const SVGNS = "http://www.w3.org/2000/svg";
const ASC = 1000, LH = 1330;
const pad = n => String(n).padStart(3, "0");
let metaPromise = null;

function loadMeta() {
  if (!metaPromise) metaPromise = fetch("/data/qiraat-mushaf/meta.json", { cache: "force-cache" })
    .then(r => { if (!r.ok) throw new Error("meta " + r.status); return r.json(); })
    .then(meta => { installGlyphs(meta); return meta; })
    .catch(e => { metaPromise = null; throw e; });
  return metaPromise;
}

/* مسارات الحروف مرة واحدة في المستند، وكل سطر يستعملها بـ <use>. */
function installGlyphs(meta) {
  if (document.getElementById("dk-glyphs")) return;
  const svg = document.createElementNS(SVGNS, "svg");
  svg.id = "dk-glyphs";
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  const defs = document.createElementNS(SVGNS, "defs");
  for (const [gid, d] of Object.entries(meta.glyphs)) {
    const p = document.createElementNS(SVGNS, "path");
    p.id = "dkg" + gid;
    p.setAttribute("d", d);
    defs.appendChild(p);
  }
  svg.appendChild(defs);
  document.body.appendChild(svg);
}

/* حدود كل كلمة: يمينها من L.e، ويسارها أقصى يسار لأصول حروفها (كما في النموذج). */
function spans(L) {
  const left = {};
  for (let j = 0; j < L.t.length; j++) { const t = L.t[j], x = L.g[3 * j + 1]; if (!(t in left) || x < left[t]) left[t] = x; }
  const out = [];
  for (let k = 0; k < L.e.length; k += 2) { const t = L.e[k]; out.push({ t, r: L.e[k + 1], l: left[t] ?? L.e[k + 1] }); }
  return out;
}

const el = (name, attrs) => {
  const n = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

/* لون الكلمة في الخلاف: أول نوع في مقاطعها (النقل مع الهمز)، و«خلاف آخر» بلا تفصيل فرشٌ. */
function wordCat(R, i, cats) {
  const segs = R.F && R.F[i];
  if (segs) {
    const c = segs.map(x => x[1]).filter(Boolean).map(c => (c === "naql" ? "hamz" : c))[0];
    return c ? cats.indexOf(c) : 0;
  }
  return R.U && R.U[i] ? 8 : 0;
}

/* الطبقات داخل مجموعة الكلمة بالترتيب: مساحة الضغط (وتلوين التحديد)، ثم تظليل الخلاف،
   ثم خطوط الأداء والوقف، ثم الحروف. الإحداثيات بعد قلب المحور (الصادي إلى أعلى). */
function lineSvg(L, P, meta, first, R) {
  const W = Math.max(meta.lineUnits, L.n), MK = meta.mk;
  const svg = el("svg", { class: "dk-line", viewBox: `${-W} ${-ASC} ${W} ${LH}`, preserveAspectRatio: "xMidYMid meet" });
  const flip = el("g", { transform: "scale(1,-1)" });
  svg.appendChild(flip);
  const groups = new Map();
  const groupFor = t => {
    if (groups.has(t)) return groups.get(t);
    const g = document.createElementNS(SVGNS, "g");
    const i = t >= MK ? t - MK : t;
    g.dataset.ayah = `${P.data.surah[i]}:${P.data.ayah[i]}`;
    if (t < MK) { g.dataset.gi = String(first + i); g.setAttribute("class", "dk-w"); }
    else g.setAttribute("class", "dk-end" + (P.ghost.has(i) ? " ghost" : "") + (P.added.has(i) ? " added" : ""));
    flip.appendChild(g);
    groups.set(t, g);
    return g;
  };
  const sp = spans(L);
  for (let k = 0; k < sp.length; k++) {
    const { t, l, r } = sp[k];
    if (t < 0) continue;
    const g = groupFor(t);
    const nextR = k + 1 < sp.length ? sp[k + 1].r : -L.n;
    g.appendChild(el("rect", { class: "dk-hit", x: Math.min(nextR, r), y: -(LH - ASC), width: Math.abs(r - nextR), height: LH }));
    if (t >= MK) {
      if (P.added.has(t - MK)) g.appendChild(el("rect", { class: "dk-hl dk-bap", x: l - 40, y: -(LH - ASC - 30), width: r - l + 80, height: LH - 120, rx: 300 }));
      continue;
    }
    const cat = wordCat(R, t, meta.cats);
    if (cat > 0) g.appendChild(el("rect", { class: `dk-hl dk-b${cat}`, x: l - 60, y: -(LH - ASC - 30), width: r - l + 120, height: LH - 120, rx: 120 }));
    const segs = R.F && R.F[t], snd = R.S && R.S[t] && !segs;
    if (snd) g.appendChild(el("line", { class: "dk-snd", x1: l + 60, x2: r - 60, y1: -(LH - ASC - 80), y2: -(LH - ASC - 80) }));
    if (R.W && R.W[t]) { const y = -(LH - ASC - (snd ? 10 : 80)); g.appendChild(el("line", { class: "dk-wq", x1: l + 50, x2: r - 50, y1: y, y2: y })); }
  }
  for (let j = 0; j < L.t.length; j++) {
    const t = L.t[j], c = L.c[j];
    let cls = c ? "dk-c" + c : "";
    if (!cls && t >= 0 && t < MK && R.U && R.U[t] && !(R.F && R.F[t])) cls = "dk-c8";
    if (t >= MK && P.added.has(t - MK)) cls = "dk-amp";
    const u = el("use", { href: "#dkg" + L.g[3 * j], x: L.g[3 * j + 1], y: L.g[3 * j + 2] });
    if (cls) u.setAttribute("class", cls);
    groupFor(t).appendChild(u);
  }
  return svg;
}

/**
 * env: { qcfPrepare(page, data), qcfRender(host, data), riwaya() → رمز الرواية المختارة }
 */
export function createDigitalKhattEngine(env) {
  return {
    id: "digitalkhatt",
    async prepare(page, data) {
      const [meta, P] = await Promise.all([
        loadMeta(),
        fetch(`/data/qiraat-mushaf/pages/${pad(page)}.json`, { cache: "force-cache" }).then(r => { if (!r.ok) throw new Error("page " + r.status); return r.json(); }),
        env.qcfPrepare(page, data),
      ]);
      return { meta, P, data };
    },
    renderLines(host, prepared) {
      const { meta, P, data } = prepared, r = env.riwaya();
      env.qcfRender(host, data);
      const am = P.data.AM[r] || {};
      P.ghost = new Set(Object.entries(am).filter(([, v]) => v[2] === "-").map(([i]) => Number(i)));
      P.added = new Set(Object.entries(am).filter(([, v]) => v[2] === "+").map(([i]) => Number(i)));
      const own = (P.lines[r] && !Array.isArray(P.lines[r])) ? P.lines[r] : {};
      const first = P.data.first;
      const R = { F: P.data.F[r], S: P.data.S[r], U: P.data.U[r], W: P.data.W[r] };
      let li = 0;
      for (const inner of host.querySelectorAll(".line-inner")) {
        if (inner.classList.contains("surah-line") || inner.classList.contains("bismillah-line")) continue;
        const L = own[li] || P.lines.hafs[li];
        li++;
        if (!L) continue;
        inner.replaceChildren(lineSvg(L, P, meta, first, R));
        inner.classList.add("dk");
        inner.style.fontFamily = "";
      }
      host.dataset.riwaya = r;
    },
  };
}
