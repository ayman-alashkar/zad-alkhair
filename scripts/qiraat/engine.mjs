// محرك القراءات: يقرأ وصف مركز تفسير لكل كلمة، ويحدّد في كلمة حفص الحرف الذي تخالف فيه كل رواية.
//
// المخرجات لكل (كلمة، رواية):
//   segs  أجزاء الكلمة [نص، نوع أو null]، أو null إن لم تختلف كتابتها عن حفص
//   sound خلاف في الأداء لا يظهر في الكتابة (ترقيق، غنة، بدل…)
//   ok    هل فُهم الوصف كله (false: تُلوَّن الكلمة كاملة ويُعرض نص المركز)
//
// المعلومة كلها من المركز؛ هذا الملف لا يضيف خلافًا، بل يحدّد موضعه في الكلمة فقط.

export const SEP = '---{عند الوصل}---';
export const NONE = 'لا خلاف بين القراء في هذا الموضع';

export const IMAMS = [
  ['نافع', 'qalun', 'قالون', 'warsh', 'ورش'],
  ['ابن كثير', 'bazzi', 'البزي', 'qunbul', 'قنبل'],
  ['أبو عمرو', 'duri', 'الدوري', 'susi', 'السوسي'],
  ['ابن عامر', 'hisham', 'هشام', 'dhakwan', 'ابن ذكوان'],
  ['عاصم', 'shubah', 'شعبة', 'hafs', 'حفص'],
  ['حمزة', 'khalaf', 'خلف', 'khallad', 'خلاد'],
  ['الكسائي', 'harith', 'أبو الحارث', 'durik', 'الدوري'],
  ['أبو جعفر', 'wardan', 'ابن وردان', 'jammaz', 'ابن جماز'],
  ['يعقوب', 'ruwais', 'رويس', 'rawh', 'روح'],
  ['خلف العاشر', 'ishaq', 'إسحاق', 'idris', 'إدريس'],
];
export const ALL = IMAMS.flatMap((im) => [im[1], im[3]]);
export const RIWAYAT = ALL.filter((k) => k !== 'hafs');

const GEN = {
  'نافع': 'نافع', 'ابن كثير': 'ابن كثير', 'أبو عمرو': 'أبي عمرو', 'ابن عامر': 'ابن عامر', 'عاصم': 'عاصم',
  'حمزة': 'حمزة', 'الكسائي': 'الكسائي', 'أبو جعفر': 'أبي جعفر', 'يعقوب': 'يعقوب', 'خلف العاشر': 'خلف',
};
const NAMES = {};
for (const [im, k1, n1, k2, n2] of IMAMS) {
  NAMES[im] = [k1, k2];
  NAMES[`${n1} عن ${GEN[im]}`] = [k1];
  NAMES[`${n2} عن ${GEN[im]}`] = [k2];
}
// صيغ أخرى يكتب بها المركز الأسماء أحيانًا (ينظر تقرير الفحص، البند ٣)
Object.assign(NAMES, {
  'ورش': ['warsh'], 'حفص': ['hafs'], 'أبوجعفر': ['wardan', 'jammaz'], 'أبوعمرو': ['duri', 'susi'],
  'كل الرواة': ALL, 'السوسي': ['susi'], 'رويس': ['ruwais'], 'روح': ['rawh'],
  'قالون': ['qalun'], 'البزي': ['bazzi'], 'قنبل': ['qunbul'], 'هشام': ['hisham'], 'ابن ذكوان': ['dhakwan'],
  'شعبة': ['shubah'], 'خلاد': ['khallad'], 'أبو الحارث': ['harith'], 'ابن وردان': ['wardan'], 'ابن جماز': ['jammaz'],
  'إسحاق': ['ishaq'], 'إدريس': ['idris'],
});
const ORDER = Object.keys(NAMES).sort((a, b) => b.length - a.length);

/** «حمزة وَالكسائي» ← [khalaf, khallad, harith, durik]. يعيد {keys, note}؛ keys = 'REST' أو null. */
export function readers(who) {
  who = who.trim();
  let note = '';
  const m = who.match(/\s*في الوجه (\S+) عنه/);
  if (m) { note = m[0].trim(); who = who.replace(m[0], ''); }
  who = who.replace(/\s*\([^)]*\)/g, '').trim();   // «الدوري عن أبي عمرو (في الوجه الأول عنه)» (الزمر 7)
  if (who.startsWith('باقي الرواة') || who.startsWith('باقي القراء')) return { keys: 'REST', note };
  const keys = [];
  let rest = who.trim();
  while (rest) {
    if (keys.length) rest = rest.replace(/^\s*وَ?\s*/, '');
    const n = ORDER.find((x) => rest.startsWith(x));
    if (!n) return { keys: null, note: who };
    keys.push(...NAMES[n]);
    rest = rest.slice(n.length).trim();
  }
  return { keys, note };
}

export function statements(text) {
  text = (text || '').replace(/"/g, '').trim();
  if (!text || text === NONE || text.startsWith(NONE)) return [];
  const out = [];
  for (const st of text.split('@').slice(1)) {
    const i = st.indexOf('/');
    if (i < 0) continue;
    out.push([st.slice(0, i).trim(), st.slice(i + 1).replace(/\s+/g, ' ').trim()]);
  }
  return out;
}

/** {رواية: وصف} للروايات كلها، و«باقي الرواة» لمن لم يُذكر. */
export function perRiwaya(text) {
  const sts = statements(text);
  if (!sts.length) return { full: null, bad: [] };
  const assigned = {}, bad = [];
  let restDesc = null;
  for (const [who, d] of sts) {
    const { keys, note } = readers(who);
    if (keys === 'REST') { restDesc = d; continue; }
    if (keys === null) { bad.push(who); continue; }
    for (const k of keys) assigned[k] = d + (note ? ` (${note})` : '');
  }
  const full = {};
  for (const k of ALL) full[k] = k in assigned ? assigned[k] : restDesc;
  return { full, bad };
}

/** وصف الرواية إن خالف حفصًا، وإلا null. */
export function differs(full, k) {
  if (!full) return null;
  return full[k] === full.hafs ? null : full[k];
}

// ---------- فهم الوصف ----------
const SOUND = 'ترقيق|تفخيم|تغليظ|الغنة|الإخفاء|البدل|مد اللين|الإشباع|الاختلاس|الروم|السكون المحض|البسملة|السورتين|توسط|المد والقصر|مع القصر|القصر والتوسط|تثليث|إشمام|هاء التأنيث|هاء السكت';
const FEATURES = [
  ['silah_mim', 'صلة ميم الجمع|ووصلها بواو'],
  ['silah_ha', 'بصلة هاء الضمير|بصلة الهاء'],
  ['imala', 'بالإمالة|بإمالة (?!هاء التأنيث)'],
  ['taqlil', 'بالتقليل|بتقليل|بين اللفظين'],
  ['sakt', '(?<!بترك )(?<!ترك )بالسكت'],
  ['naql', 'بالنقل|بنقل حركة'],
  ['ibdal', 'بإبدال الهمزة الساكنة'],
  ['ha_sukun', 'بإسكان الهاء'],
  ['idgham_k', 'بالإدغام الكبير'],
  ['ha_damm', 'بضم هاء الضمير|بضم الهاء(?! والميم)'],
  ['ha_kasr', 'بكسر هاء الضمير|بكسر الهاء(?! والميم)'],
  ['ya_fath', 'بفتح ياء الإضافة'],
  ['ya_sukun', 'بإسكان ياء الإضافة'],
  ['ya_ithbat', 'بإثبات الياء الزائدة'],
  ['hm_damm', 'بضم الهاء والميم'],
  ['hm_kasr', 'بكسر الهاء والميم'],
  ['ghayb', 'بياء الغيب'],
  ['khitab', 'بتاء الخطاب'],
  ['idgham_s', 'أدغم \\S+ في \\S+|بإدغام \\S+ في \\S+|بالإدغام(?! الكبير)(?! مع)'],
].map(([n, rx]) => [n, rx, new RegExp(rx)]);
const NEUTRAL = /قرأ|قرؤوا|وصلاً|وصلا|ووقفا|ووقفاً|وقفا|في الحالين|بلا خلاف عنهم?|بخلف عنهم?|بلا خلاف|خلافا لجمهور القراء|باتفاق|وعدمه|مع|وله|وجه|،|\.|:|\(.*?\)/g;
const NEG = /ب?ترك [^،.]*|ب?تحقيق [^،.]*|بالفتح[^،.]*|بفتح هاء التأنيث|بالإظهار[^،.]*|بالإدغام مع (ترك )?الغنة|بقصر [^،.]*|بإسكان ميم الجمع[^،.]*|بضم ميم الجمع/g;
const SOUND_RX = new RegExp(SOUND);
const SOUND_STRIP = new RegExp(`[بو]?\\S*(?:${SOUND})[^،.]*`, 'g');
const FEATURE_STRIP = FEATURES.map(([, rx]) => new RegExp(`ب?(?:${rx})[^،.]*`, 'g'));

/** ما يُقرأ في الوصل: يحذف ما يخص الوقف وحده. */
export function waslPart(d) {
  if (d.includes('السورتين')) return '';
  d = d.split(/،? ووقف|^وقف/)[0];
  return d.split(/،\s*/).filter((c) => !(/وقف/.test(c) && !/وصل|الحالين/.test(c))).join('، ');
}

/** ما يخص الوقف وحده (يقابل waslPart). «ترك» و«تحقيق» هما ما عليه حفص فلا يُعدّان. */
export function waqfPart(d) {
  if (!d) return '';
  const parts = [...d.matchAll(/(?:^|،\s*)(و?وقف[^.]*)/g)].map((m) => m[1]);
  for (const c of d.split(/،\s*/)) if (/وقف/.test(c) && !/وصل|الحالين|^و?وقف/.test(c.trim())) parts.push(c);
  return parts.filter((p) => !/ترك|بالتحقيق$|بتحقيق/.test(p)).map((p) => p.trim()).join(' | ');
}

/** {feats, sound, ok}: الخصائص المفهومة، وهل فيه أداء، وهل فُهم الوصف كله. */
export function understand(d) {
  if (d == null) return { feats: new Set(), sound: false, ok: true };
  const w = waslPart(d);
  const feats = new Set(FEATURES.filter(([, , rx]) => rx.test(w)).map(([n]) => n));
  const sound = SOUND_RX.test(w);
  let rest = w.replace(NEG, ' ');
  for (const rx of FEATURE_STRIP) rest = rest.replace(rx, ' ');
  rest = rest.replace(SOUND_STRIP, ' ').replace(NEG, ' ').replace(NEUTRAL, ' ').replace(/\s+/g, ' ').trim();
  return { feats, sound, ok: rest === '' };
}

// ---------- تحديد الموضع: من كلمة حفص إلى كلمة الرواية ----------
const V = 'َُِ';
const FATHA = 'َ', DAMMA = 'ُ', KASRA = 'ِ', SUKUN = 'ۡ', SHADDA = 'ّ', IMALA_MARK = 'ٜ', SAKT_MARK = 'ۜ';
const isMark = (c) => {
  const o = c.codePointAt(0);
  return (o >= 0x064b && o <= 0x065f) || (o >= 0x06d6 && o <= 0x06ed) || o === 0x0670 || (o >= 0x08f0 && o <= 0x08f3);
};

export function clusters(t) {
  const out = [];
  for (const ch of t) {
    if (out.length && isMark(ch)) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

class Word {
  constructor(text) { this.c = clusters(text); this.k = this.c.map(() => null); }
  set(i, nw, cat) {
    if (i < 0) i += this.c.length;
    if (i >= 0 && i < this.c.length) { this.c[i] = nw; this.k[i] = cat; }
  }
  base(i) { return [...this.c[i]][0]; }
  segs() {
    const out = [];
    this.c.forEach((t, i) => {
      const k = this.k[i];
      if (out.length && out[out.length - 1][1] === k) out[out.length - 1][0] += t;
      else out.push([t, k]);
    });
    return out;
  }
}

function lastLetter(w) {
  let i = w.c.length - 1;
  if (i > 0 && w.base(i) === 'ا' && w.c[i].includes('ْ')) i -= 1; // ألف زائدة عليها صفر مستدير
  return i;
}

const tSilahMim = (w, ishba) => {
  const i = lastLetter(w);
  if (w.base(i) !== 'م') return false;
  w.set(i, 'مُ' + (ishba ? 'ۥٓ' : 'ۥ'), 'silah'); return true;
};
const tSilahHa = (w) => {
  const i = lastLetter(w);
  if (w.base(i) !== 'ه') return false;
  w.set(i, w.c[i].includes(DAMMA) ? 'هُۥ' : 'هِۦ', 'silah'); return true;
};
function tImala(w, cat) {
  for (let i = w.c.length - 1; i > 0; i--) {
    if ('اى'.includes(w.base(i)) || w.c[i].includes('ٰ')) {
      const j = w.c[i].includes('ٰ') && !'اى'.includes(w.base(i)) ? i : i - 1;
      if (j < 0) return false;
      w.set(j, w.c[j].includes(IMALA_MARK) ? w.c[j] : w.c[j].replace(FATHA, '') + IMALA_MARK, cat);
      return true;
    }
  }
  return false;
}
function tSakt(w, wasl) {
  if (wasl) { const i = lastLetter(w); w.set(i, w.c[i] + SAKT_MARK, 'sakt'); return true; }
  for (let i = 0; i < w.c.length - 1; i++) {
    if ((w.base(i) === 'ل' && i > 0 && w.base(i - 1) === 'ٱ') || (w.base(i) === 'ي' && w.c[i].includes(SUKUN))) {
      if ([...'أإءآٔ'].some((x) => w.c[i + 1].includes(x)) || 'أإءآ'.includes(w.base(i + 1))) {
        w.set(i, w.c[i] + SAKT_MARK, 'sakt'); return true;
      }
    }
  }
  return false;
}
const hamzaVowel = (cl) => [...V].find((v) => cl.includes(v)) || FATHA;
function tNaqlInword(w) {
  for (let i = 1; i < w.c.length - 1; i++) {
    if (w.base(i) === 'ل' && w.base(i - 1) === 'ٱ') {
      const nxt = w.c[i + 1], b = [...nxt][0];
      if ('أإآ'.includes(b) || (b === 'ـ' && nxt.includes('ٔ'))) {
        const v = b === 'إ' ? KASRA : nxt.includes(DAMMA) ? DAMMA : FATHA;
        w.set(i, 'ل' + v, 'naql');
        if (b === 'ـ' && i + 2 < w.c.length && w.base(i + 2) === 'ا') w.set(i + 1, '', 'naql');
        else w.set(i + 1, 'ا', 'naql');
        return true;
      }
    }
  }
  return false;
}
function naqlFrom(w) {
  const cl = w.c[0], b = [...cl][0];
  if ('أإ'.includes(b)) { w.set(0, 'ا', 'naql'); return b === 'إ' ? KASRA : cl.includes(DAMMA) ? DAMMA : FATHA; }
  if (b === 'ء' && w.c.length > 1 && w.base(1) === 'ا') { w.set(0, '', 'naql'); w.k[1] = 'naql'; return hamzaVowel(cl); }
  if (b === 'آ') { w.set(0, 'ا', 'naql'); return FATHA; }
  return null;
}
function tIbdal(w) {
  for (let i = 0; i < w.c.length; i++) {
    const cl = w.c[i], b = [...cl][0];
    if (cl.includes(SUKUN) && 'ئؤأء'.includes(b)) {
      const prev = i ? w.c[i - 1] : '';
      let nw = { 'ئ': 'ي', 'ؤ': 'و', 'أ': 'ا' }[b];
      if (b === 'ء') nw = prev.includes('ٰ') ? '' : 'ا';
      if (nw === '' && i) { w.set(i - 1, prev, 'hamz'); w.c[i] = ''; return true; }
      w.set(i, nw, 'hamz'); return true;
    }
  }
  return false;
}
function tHaSukun(w) {
  for (let i = 0; i < Math.min(3, w.c.length); i++) {
    const cl = w.c[i];
    if ([...cl][0] === 'ه' && (cl.includes(DAMMA) || cl.includes(KASRA))) { w.set(i, 'ه' + SUKUN, 'farsh'); return true; }
  }
  return false;
}
function tHa(w, to) {
  for (let i = w.c.length - 1; i >= 0; i--) {
    if (w.base(i) === 'ه' && [...V].some((v) => w.c[i].includes(v))) {
      if (!w.c[i].includes(to)) w.set(i, w.c[i].replace(/[َُِ]/g, to), 'farsh');
      return true;
    }
  }
  return false;
}
function tHm(w, to) {
  const ok = tHa(w, to);
  const i = lastLetter(w);
  if (w.base(i) === 'م') w.set(i, 'م' + to, 'farsh');
  return ok;
}
const tYa = (w, fath) => {
  const i = lastLetter(w);
  if (w.base(i) !== 'ي') return false;
  w.set(i, fath ? 'يَ' : 'ي', 'farsh'); return true;
};
const tIthbat = (w) => { w.c.push('ي'); w.k.push('farsh'); return true; };
function tPrefixLetter(w, frm, to) {
  for (let i = 0; i < Math.min(3, w.c.length); i++) {
    const cl = w.c[i], b = [...cl][0];
    if (b === frm) { w.set(i, to + cl.slice(b.length), 'farsh'); return true; }
    if (!'وفلأس'.includes(b)) break;
  }
  return false;
}
const tDropLastVowel = (w, cat) => { const i = lastLetter(w); w.set(i, w.c[i].replace(/[َُِۡ]/g, ''), cat); return true; };
function tShaddaFirst(w, cat) {
  const i = w.base(0) === 'ٱ' && w.c.length > 1 ? 1 : 0;
  if (!w.c[i].includes(SHADDA)) { const cl = w.c[i], b = [...cl][0]; w.set(i, b + SHADDA + cl.slice(b.length), cat); }
  else w.k[i] = cat;
  return true;
}

/**
 * يطبّق ما فُهم من الوصف على كلمة حفص.
 * h: كلمة حفص؛ wordD/waslD: وصف الرواية في الكلمة وعند الوصل (null إن وافقت حفصًا)؛
 * next: كلمة حفص التالية؛ prevWaslFeats: خصائص وصل الكلمة السابقة لهذه الرواية.
 */
export function buildWord(h, wordD, waslD, next = null, prevWaslFeats = null) {
  const w = new Word(h);
  const U = understand(wordD), L = understand(waslD);
  const fw = U.feats, fl = L.feats;
  const sound = U.sound || L.sound;
  let ok = U.ok && L.ok;
  const tries = [];
  const either = (f) => fw.has(f) || fl.has(f);
  if (fl.has('silah_mim')) tries.push(tSilahMim(w, (waslD || '').includes('الإشباع')));
  if (either('silah_ha')) tries.push(tSilahHa(w));
  if (fw.has('imala')) tries.push(tImala(w, 'imala'));
  if (fw.has('taqlil')) tries.push(tImala(w, 'taqlil'));
  if (fw.has('naql')) tries.push(tNaqlInword(w));
  else if (fw.has('sakt')) tries.push(tSakt(w, false));
  if (fl.has('sakt') && !fl.has('naql')) tries.push(tSakt(w, true));
  if (fw.has('ibdal')) tries.push(tIbdal(w));
  if (fw.has('ha_sukun')) tries.push(tHaSukun(w));
  if (either('ha_damm')) tries.push(tHa(w, DAMMA));
  if (either('ha_kasr')) tries.push(tHa(w, KASRA));
  if (either('hm_damm')) tries.push(tHm(w, DAMMA));
  if (either('hm_kasr')) tries.push(tHm(w, KASRA));
  if (either('ya_fath')) tries.push(tYa(w, true));
  if (either('ya_sukun')) tries.push(tYa(w, false));
  if (either('ya_ithbat')) tries.push(tIthbat(w));
  if (fw.has('ghayb')) tries.push(tPrefixLetter(w, 'ت', 'ي'));
  if (fw.has('khitab')) tries.push(tPrefixLetter(w, 'ي', 'ت'));
  if (fl.has('idgham_k') || fl.has('idgham_s')) tries.push(tDropLastVowel(w, 'idgham'));
  if (fl.has('naql') && next) {
    const i = lastLetter(w);
    if (w.c[i].includes(SUKUN)) {
      const nx = clusters(next)[0];
      w.set(i, w.base(i) + ([...nx][0] === 'إ' ? KASRA : hamzaVowel(nx)), 'naql');
    }
  }
  if (prevWaslFeats) {
    if (prevWaslFeats.has('naql')) naqlFrom(w);
    if (prevWaslFeats.has('idgham_k') || prevWaslFeats.has('idgham_s')) tShaddaFirst(w, 'idgham');
  }
  if (tries.length && !tries.every(Boolean)) ok = false; // فُهم الوصف ولم يوجد موضع التطبيق
  const segs = w.segs();
  return { segs: segs.some(([, k]) => k) ? segs : null, sound, ok, waslFeats: fl };
}
