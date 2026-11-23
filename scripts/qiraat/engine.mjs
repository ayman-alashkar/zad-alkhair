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
  ['imala', 'بالإمالة|بإمالة (?!هاء التأنيث)|مع الإمالة'],
  ['taqlil', 'بالتقليل|بتقليل|بين اللفظين|مع التقليل'],
  ['sakt', '(?<!بترك )(?<!ترك )بالسكت'],
  ['naql', 'بالنقل|بنقل حركة'],
  ['ibdal', 'بإبدال الهمزة الساكنة'],
  ['ha_sukun', 'بإسكان الهاء'],
  ['idgham_k', 'بالإدغام الكبير'],
  ['ha_damm', 'بضم هاء الضمير|بضم الهاء(?! والميم)'],
  ['ha_kasr', 'بكسر هاء الضمير|بكسر الهاء(?! والميم)'],
  ['ya_fath', 'بفتح ياء الإضافة'],
  ['ya_sukun', 'بإسكان ياء الإضافة'],
  ['ya_ithbat', 'بإثبات الياء الزائدة|مع إثبات الياء'],
  ['hm_damm', 'بضم الهاء والميم'],
  ['hm_kasr', 'بكسر الهاء والميم'],
  ['ghayb', 'بياء الغيب'],
  ['khitab', 'بتاء الخطاب'],
  ['idgham_s', 'أدغم \\S+ في \\S+|بإدغام \\S+ في \\S+|بالإدغام(?! الكبير)(?! مع)'],
].map(([n, rx]) => [n, rx, new RegExp(rx)]);
const NEUTRAL = /مع تحقيقها|مع تسهيلها|في الحالين|قرأ|قرؤوا|وصلاً|وصلا|ووقفا|ووقفاً|وقفا|في الحالين|بلا خلاف عنهم?|بخلف عنهم?|بلا خلاف|خلافا لجمهور القراء|باتفاق|وعدمه|مع|وله|وجه|،|\.|:|\(.*?\)/g;
const NEG = /(?:مع |و)?فتح هاء التأنيث|على الأصل|وله إبدالها[^،.]*|ويمتنع[^،.]*|ب?ترك [^،.]*|ب?تحقيق [^،.]*|بالفتح[^،.]*|بفتح هاء التأنيث|بالإظهار[^،.]*|بالإدغام مع (ترك )?الغنة|بقصر [^،.]*|بإسكان ميم الجمع[^،.]*|بضم ميم الجمع/g;
const SOUND_RX = new RegExp(SOUND);
const SOUND_STRIP = new RegExp(`[بو]?\\S*(?:${SOUND})[^،.]*`, 'g');
const FEATURE_STRIP = FEATURES.map(([, rx]) => new RegExp(`ب?(?:${rx})[^،.]*`, 'g'));

/** ما يُقرأ في الوصل: يحذف ما يخص الوقف وحده. */
export function waslPart(d) {
  if (d.includes('السورتين')) return '';
  d = d.split(/،? ووقف (?=ب|على|من)|^وقف /)[0];   // «ووقف بالإبدال» جملة وقف، أما «وصلاً ووقفاً» فللحالين
  return d.split(/،\s*/).filter((c) => !(/وقف/.test(c) && !/وصل|الحالين/.test(c))).join('، ');
}

/** ما يخص الوقف وحده (يقابل waslPart). «ترك» و«تحقيق» هما ما عليه حفص فلا يُعدّان. */
export function waqfPart(d) {
  if (!d) return '';
  const parts = [...d.matchAll(/(?:^|،\s*)(و?وقف[^.]*)/g)].map((m) => m[1]);
  for (const c of d.split(/،\s*/)) if (/وقف/.test(c) && !/وصل|الحالين|^و?وقف/.test(c.trim())) parts.push(c);
  const empty = (p) => !p.replace(/^و?وقف/, '').replace(/(?:ب|و|مع )?(?:ترك|تحقيق|بالتحقيق)[^،]*/g, '').replace(/[\s،.]/g, '');
  return parts.filter((p) => !empty(p)).map((p) => p.trim()).join(' | ');
}

// ---------- الفرش وأحكام الهمز: أوصاف تسمّي الحرف وما يتغيّر فيه ----------
// «بكسر الباء»، «بضم النون، وكسر الزاي»، «بتشديد الذال»، «بالرفع»، «تسهيل الهمزة الثانية»…
// كل وصف يصير عملية على حرف بعينه. إن تعدد الحرف في الكلمة ولم يحدده الوصف (الأولى/الثانية)
// لا نخمّن: يبقى الوصف غير مفهوم، فتُلوَّن الكلمة كلها ويُعرض نص المركز.
const LETTERS = {
  'الباء': 'ب', 'التاء': 'ت', 'الثاء': 'ث', 'الجيم': 'ج', 'الحاء': 'ح', 'الخاء': 'خ', 'الدال': 'د', 'الذال': 'ذ',
  'الراء': 'ر', 'الزاي': 'ز', 'السين': 'س', 'الشين': 'ش', 'الصاد': 'ص', 'الضاد': 'ض', 'الطاء': 'ط', 'الظاء': 'ظ',
  'العين': 'ع', 'الغين': 'غ', 'الفاء': 'ف', 'القاف': 'ق', 'الكاف': 'ك', 'اللام': 'ل', 'الميم': 'م', 'النون': 'ن',
  'الهاء': 'ه', 'الواو': 'و', 'الياء': 'ي', 'الهمزة': 'ء',
};
const LNAMES = Object.keys(LETTERS).join('|');
const ORD = { 'الأولى': 1, 'الأول': 1, 'الثانية': 2, 'الثاني': 2, 'الثالثة': 3, 'الأخيرة': -1, 'الأخير': -1 };
const ORDS = Object.keys(ORD).join('|');
const VOWEL = { 'كسر': 'ِ', 'فتح': 'َ', 'ضم': 'ُ', 'إسكان': 'ۡ' };
const OPS = [
  // تسهيل الهمزة الثانية / إبدال الهمزة الأولى ياء / إسقاط الأولى (مع ما يتبعه من وصف الهمزة)
  { rx: new RegExp(`(?:ب|و|مع )?(تسهيل|إبدال|إسقاط|حذف|تحقيق) (?:الهمزة )?(الأولى|الثانية)(?: (?:واوا|ياء|ألفا)(?: (?:مفتوحة|مضمومة|مكسورة|ساكنة|خالصة))?)?(?: مع (?:المد والقصر|القصر والمد|القصر|المد|الإدخال|ترك الإدخال))*`, 'g'),
    op: (m) => ({ kind: 'hamza', act: m[1], nth: ORD[m[2]] }) },
  { rx: /(?:ب|و|مع )?(تسهيل|إبدال|إسقاط|حذف) (?:إحدى )?الهمزتين/g, op: (m) => ({ kind: 'hamza', act: m[1], nth: 0 }) },
  { rx: /وله في الهمزة (الأولى|الثانية):? (?:التسهيل|الإبدال)(?: مع (?:الإدغام|المد والقصر))?(?:،? (?:أو|و)(?:التسهيل|الإبدال| التسهيل| الإبدال)(?: مع (?:الإدغام|المد والقصر))?)?(?: (?:واوا|ياء|ألفا)(?: (?:مفتوحة|مضمومة|مكسورة))?)?/g,
    op: (m) => ({ kind: 'hamza', act: 'تسهيل', nth: ORD[m[1]] }) },
  // همزة واحدة في الكلمة: «بإبدال الهمزة ياء مفتوحة»، «بإبدال الهمزة حرفا مديا من جنس ما قبله»
  { rx: /(?:ب|و|مع )?(تسهيل|إبدال|إسقاط|حذف|قصر) الهمزة(?! الساكنة)(?: وصلاً?)?(?: (?:واوا?|ياءً?|ألفاً?|حرفا مديا|حرف مد)(?: خالصة)?(?: (?:مفتوحة|مضمومة|مكسورة|ساكنة|مدية))?)?(?: من جنس (?:ما قبله|ما قبلها|سابقها))?/g,
    op: (m) => ({ kind: 'hamza', act: m[1], nth: 0, single: true }) },
  { rx: /(?:ب|مع )نون العظمة/g, op: () => ({ kind: 'prefix', to: 'ن' }) },
  { rx: /(?:ب|و|مع )?(ضم|كسر|فتح) التنوين/g, op: () => ({ kind: 'tanween' }) },
  // «بإدغام الذال في التاء»، «أدغم الثاء في التاء»
  { rx: new RegExp(`(?:ب|و|مع )?(?:إدغام|أدغم) (${LNAMES})(?: في (${LNAMES}))?`, 'g'), op: (m) => ({ kind: 'idgham', a: LETTERS[m[1]], b: m[2] ? LETTERS[m[2]] : null }) },
  { rx: /ب?همزتين (?:محققتين )?على الاستفهام|بهمزة واحدة على الخبر|على الاستفهام|على الخبر/g, op: () => null },
  // بكسر الباء، وفتح الياء الأولى، ويجوز «بفتح النون والزاي»
  { rx: new RegExp(`(?:ب|و|مع )?(كسر|فتح|ضم|إسكان) ((?:${LNAMES})(?: (?:${ORDS}))?(?:(?:،)? و(?:${LNAMES})(?: (?:${ORDS}))?)*)`, 'g'),
    op: (m) => [...m[2].matchAll(new RegExp(`(${LNAMES})(?: (${ORDS}))?`, 'g'))].map((x) => ({ kind: 'vowel', letter: LETTERS[x[1]], nth: x[2] ? ORD[x[2]] : 0, mark: VOWEL[m[1]] })) },
  { rx: new RegExp(`(?:ب|و|مع )?(تشديد|تخفيف) (${LNAMES})(?: (${ORDS}))?`, 'g'),
    op: (m) => ({ kind: m[1] === 'تشديد' ? 'shadda' : 'noshadda', letter: LETTERS[m[2]], nth: m[3] ? ORD[m[3]] : 0 }) },
  { rx: /(?:ب|و|مع )?(?:ال)?(رفع|نصب|خفض|جر)(?= |،|\.|$)/g, op: (m) => ({ kind: 'case', mark: { 'رفع': 'ُ', 'نصب': 'َ', 'خفض': 'ِ', 'جر': 'ِ' }[m[1]] }) },
];
const MADD_SOUND = /(?:ب|مع |و)?(?:قصر|توسط|تثليث|إشباع|طول|مد) (?:مد )?(?:البدل|اللين|المنفصل|المتصل)|مع (?:المد والقصر|القصر والمد)|مع الإدخال|بلا إدخال|ترك الإدخال/g;

function extractOps(w) {
  const ops = [];
  let rest = w.replace(/\([^)]*\)/g, ' ');   // الكلمة المقتبسة بين قوسين: ما بعدها يصفها
  for (const { rx, op } of OPS) {
    rest = rest.replace(rx, (...args) => {
      const r = op(args);
      if (Array.isArray(r)) ops.push(...r); else if (r) ops.push(r);
      return ' ';
    });
  }
  return { ops, rest };
}

/** {feats, ops, sound, ok}: الخصائص المفهومة، وعمليات الفرش، وهل فيه أداء، وهل فُهم الوصف كله. */
export function understand(d) {
  if (d == null) return { feats: new Set(), ops: [], sound: false, ok: true };
  const w0 = waslPart(d);
  const feats = new Set(FEATURES.filter(([, , rx]) => rx.test(w0)).map(([n]) => n));
  const sound = SOUND_RX.test(w0) || MADD_SOUND.test(w0);
  MADD_SOUND.lastIndex = 0;
  const { ops, rest: r0 } = extractOps(w0.replace(MADD_SOUND, ' '));
  let rest = r0.replace(NEG, ' ');
  for (const rx of FEATURE_STRIP) rest = rest.replace(rx, ' ');
  rest = rest.replace(SOUND_STRIP, ' ').replace(NEG, ' ').replace(NEUTRAL, ' ').replace(/\s+/g, ' ').trim();
  return { feats, ops, sound, ok: rest === '' };
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
  constructor(text) { this.c = clusters(text); this.o = [...this.c]; this.k = this.c.map(() => null); }
  set(i, nw, cat) {
    if (i < 0) i += this.c.length;
    if (i >= 0 && i < this.c.length) { this.c[i] = nw; this.k[i] = cat; }
  }
  base(i) { return [...this.c[i]][0] || ''; }
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

// ---------- تطبيق عمليات الفرش والهمز ----------
const HAMZA_BASES = 'أإؤئءآ';
const VOWELS_RX = /[\u064B-\u0650\u0652\u06E1\u08F0-\u08F2]/g;   // الحركات والتنوين والسكون (لا الشدة)
const isHamza = (cl) => HAMZA_BASES.includes([...cl][0]) || cl.includes('\u0654') || cl.includes('\u0655');
const baseOf = (cl) => [...cl][0] || '';
// لواحق الضمير لا تحمل علامة الإعراب: «بُنۡيَٰنَهُۥ» الإعراب على النون
const SUFFIX_RX = /(هُۥ|هِۦ|هُ|هِ|هُمۡ|هِمۡ|هُمَا|هِمَا|كُمۡ|كُمَا|كَ|كِ|هَا|نَا|ي|ىٰ)$/;

function pick(idx, nth) {
  if (!idx.length) return -1;
  if (nth === -1) return idx[idx.length - 1];
  if (nth > 0) return idx[nth - 1] ?? -1;
  return idx.length === 1 ? idx[0] : -1;      // الحرف متعدد ولم يُحدَّد: لا نخمّن
}
function setVowel(cl, mark) {
  const b = baseOf(cl);
  const rest = [...cl].slice(1).join('');
  const hadTanween = /[\u064B-\u064D\u08F0-\u08F2]/.test(rest);
  const kept = rest.replace(VOWELS_RX, '');
  let m = mark;
  if (hadTanween && mark !== SUKUN) m = { [FATHA]: '\u064B', [DAMMA]: '\u064C', [KASRA]: '\u064D' }[mark];
  // الشدة قبل الحركة كما في نص المجمع
  return kept.includes(SHADDA) ? b + SHADDA + m + kept.replace(SHADDA, '') : b + m + kept;
}
function applyOp(w, op, feats, prevSide) {
  if (op.kind === 'hamza') {
    const idx = w.c.map((cl, i) => (isHamza(cl) ? i : -1)).filter((i) => i >= 0);
    if (op.act === 'تحقيق') return true;               // ما عليه حفص
    let i;
    if (prevSide) i = op.nth === 2 || op.single ? idx[0] : -1;   // الهمزة في أول الكلمة التالية
    else if (op.side === 'wasl') i = op.nth === 1 || op.nth === 0 ? idx[idx.length - 1] : -2;
    else if (op.single && op.side === 'wasl' && !idx.length) return true;   // الهمزة في أول الكلمة التالية
    else if (op.single) i = idx.length === 1 ? idx[0] : -1;
    else i = op.nth === 0 ? idx[idx.length - 1] : idx[op.nth - 1];
    if (i === -2) {                                     // الهمزة الثانية في الكلمة التالية: نعلّم الأولى معها
      const j = idx[idx.length - 1];
      if (j == null) return true;                       // «يَٰزَكَرِيَّآ»: الهمزة الأولى غير مرسومة
      w.k[j] = w.k[j] || 'hamz';
      return true;
    }
    if (i == null || i < 0) return false;
    w.k[i] = 'hamz';
    return true;
  }
  if (op.kind === 'case') {
    const base = w.c.map(baseOf).join('');
    const sm = base.replace(/[ٰۥۦ]/g, '').match(SUFFIX_RX);
    let end = w.c.length - 1;
    if (w.base(end) === 'ا' && end > 0) end -= 1;       // ألف تنوين النصب
    if (sm && end > 1) {
      // تخطَّ حروف اللاحقة (بلا علامات المد الصغيرة)
      let n = [...sm[1]].filter((c) => !isMark(c)).length;
      while (n > 0 && end > 0) { if (!'ۥۦ'.includes(w.base(end))) n--; end--; }
    }
    if (end < 0) return false;
    if (![...w.c[end]].some((c) => /[\u064B-\u0650\u08F0-\u08F2]/.test(c))) return false;
    w.set(end, setVowel(w.c[end], op.mark), 'farsh');
    return true;
  }
  if (op.kind === 'prefix') {
    for (let i = 0; i < Math.min(3, w.c.length); i++) {
      const b = baseOf(w.c[i]);
      if (b === 'ي' || b === 'ت') { w.set(i, op.to + [...w.c[i]].slice(1).join(''), 'farsh'); return true; }
      if (!'وفل'.includes(b)) break;
    }
    return false;
  }
  if (op.kind === 'tanween') {
    let j = w.c.length - 1;
    if (w.base(j) === 'ا' && j > 0) j -= 1;
    if (!/[\u064B-\u064D\u08F0-\u08F2]/.test(w.c[j])) return false;
    w.k[j] = 'farsh';
    return true;
  }
  if (op.kind === 'idgham') {
    for (let i = 0; i < w.c.length - 1; i++) {
      if (op.b && baseOf(w.c[i]) === op.a && baseOf(w.c[i + 1]) === op.b) {
        w.set(i, w.c[i].replace(SUKUN, ''), 'idgham'); return true;
      }
    }
    // بين كلمتين: الحرف الأول آخر هذه الكلمة
    const L = lastLetter(w);
    if (op.side === 'wasl' && baseOf(w.c[L]) === op.a) { w.set(L, w.c[L].replace(VOWELS_RX, ''), 'idgham'); return true; }
    return false;
  }
  if (op.letter === 'ه' && (feats.has('ha_sukun') || feats.has('ha_damm') || feats.has('ha_kasr') || feats.has('hm_damm') || feats.has('hm_kasr'))) return true;
  if (op.letter === 'م' && (feats.has('hm_damm') || feats.has('hm_kasr'))) return true;
  const want = op.letter === 'ء' ? null : op.letter;
  let idx = w.c.map((cl, i) => ((want ? baseOf(cl) === want : isHamza(cl)) ? i : -1)).filter((i) => i >= 0);
  if (want === 'ي' && idx.length > 1 && idx[0] === 0 && w.c[0].includes('ٰ')) idx = idx.slice(1);   // ياء النداء «يَٰبُنَيَّ»
  const i = pick(idx, op.nth);
  if (i < 0) return false;
  // ما يوافق فيه الوصفُ كتابةَ حفص لا يُلوَّن («بتشديد الصاد» في «وَوَصَّىٰ» لمن يقرأ كحفص)
  let nw = w.c[i];
  if (op.kind === 'vowel') nw = setVowel(w.c[i], op.mark);
  else if (op.kind === 'shadda' && !w.c[i].includes(SHADDA)) nw = baseOf(w.c[i]) + SHADDA + [...w.c[i]].slice(1).join('').replace(SUKUN, '');
  else if (op.kind === 'noshadda') nw = w.c[i].replace(SHADDA, '');
  if (nw.replace(VOWELS_RX, (c) => c) !== w.c[i] && [...nw].sort().join('') !== [...w.c[i]].sort().join('')) w.set(i, nw, 'farsh');
  return true;
}

// الكلمة المقتبسة بين قوسين في وصف المركز، مثل «(هُزُؤًا)»: إن طابقت كلمة حفص حرفًا بحرف
// إلا في حرف أو حرفين، فهي تبيّن موضع الخلاف وكتابته بلا حاجة إلى فهم بقية الوصف.
const vowelsOf = (cl) => [...cl].filter((c) => /[\u064B-\u0652\u06E1]/.test(c)).map((c) => (c === 'ْ' ? SUKUN : c)).sort().join('');
function formDiff(w, form) {
  const nb = (cl) => (isHamza(cl) || (baseOf(cl) === 'ـ' && cl.includes('\u0654')) ? 'ء' : baseOf(cl).replace('ٱ', 'ا'));
  const F = clusters(form.replace(/\s+/g, '').replace(/ٱ/g, 'ا'));
  const B = w.o.map(nb);
  if (F.length !== B.length) return false;
  const diff = [];
  for (let i = 0; i < F.length; i++) {
    if (nb(F[i]) !== B[i]) diff.push(i);
    else if (vowelsOf(F[i]) && vowelsOf(F[i]).replace('ّ', '') !== vowelsOf(w.o[i]).replace('ّ', '')) diff.push(i);
  }
  if (!diff.length || diff.length > 2) return false;
  for (const i of diff) w.set(i, F[i].replace(/ْ/g, SUKUN), 'farsh');
  return true;
}

/**
 * يطبّق ما فُهم من الوصف على كلمة حفص.
 * h: كلمة حفص؛ wordD/waslD: وصف الرواية في الكلمة وعند الوصل (null إن وافقت حفصًا)؛
 * next: كلمة حفص التالية؛ prevWasl: ما فُهم من وصل الكلمة السابقة لهذه الرواية ({feats, ops}).
 */
/** يحذف من وصف الرواية ما يشاركها فيه حفص حرفيًا («بمد الهمزة» إن قالها الاثنان): ما يوافق حفصًا لا خلاف فيه. */
const clauseNorm = (c) => c.replace(/^(?:قرأ|قرؤوا)\s+/, '').replace(/[.\s]+$/g, '').trim();
export function dropShared(d, hafsD) {
  if (!d || !hafsD) return d;
  const hs = new Set(hafsD.split(/،\s*|\s+مع\s+/).map(clauseNorm).filter(Boolean));
  const parts = d.split(/(،\s*|\s+مع\s+)/);
  let out = '';
  for (let i = 0; i < parts.length; i += 2) {
    const c = parts[i], sep = parts[i - 1] || '';
    if (hs.has(clauseNorm(c))) continue;
    out += (out ? sep : '') + c;
  }
  return out.trim() || d;
}

export function buildWord(h, wordD, waslD, next = null, prevWasl = null, hafsWordD = null, hafsWaslD = null) {
  const w = new Word(h);
  wordD = dropShared(wordD, hafsWordD); waslD = dropShared(waslD, hafsWaslD);
  const U = understand(wordD), L = understand(waslD);
  const prevWaslFeats = prevWasl ? prevWasl.feats : null;
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
    } else {
      // التنوين: تُنقل الحركة إلى نونه، فنلوّن الحرف الأخير
      let j = i;
      if (w.base(j) === 'ا' && j > 0) j -= 1;
      if (/[\u064B-\u064D\u08F0-\u08F2]/.test(w.c[j])) w.k[j] = 'naql';
    }
  }
  for (const op of U.ops) tries.push(applyOp(w, op, fw, false));
  for (const op of L.ops) tries.push(applyOp(w, { ...op, side: 'wasl' }, fl, false));
  if (prevWasl) for (const op of prevWasl.ops) if (op.kind === 'hamza' && (op.nth === 2 || op.single) && op.act !== 'تحقيق') applyOp(w, op, new Set(), true);
  if (prevWaslFeats) {
    if (prevWaslFeats.has('naql')) naqlFrom(w);
    if (prevWaslFeats.has('idgham_k') || prevWaslFeats.has('idgham_s')) tShaddaFirst(w, 'idgham');
  }
  if (tries.length && !tries.every(Boolean)) ok = false; // فُهم الوصف ولم يوجد موضع التطبيق
  if (!ok && wordD && L.ok) {
    const m = wordD.match(/\(([^)]+)\)/);
    if (m && formDiff(w, m[1])) ok = true;
  }
  const segs = w.segs();
  return { segs: segs.some(([, k]) => k) ? segs : null, sound, ok, wasl: { feats: fl, ops: L.ops } };
}
