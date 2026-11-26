"use strict";
/* طبقة القراءات (data/qiraat/): بيانات مركز تفسير كما هي، وفوقها ملف القاعدة.
   هذه الاختبارات تثبّت المواضع التي راجعناها مع المجموعة، وتمنع أن يُنشر خلاف بلا علامة
   أو علامة بلا أصل. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const Q = path.join(root, "data/qiraat");
const page = n => JSON.parse(fs.readFileSync(path.join(Q, "pages", String(n).padStart(3, "0") + ".json"), "utf8"));
const statements = JSON.parse(fs.readFileSync(path.join(Q, "statements.json"), "utf8"));
const index = JSON.parse(fs.readFileSync(path.join(Q, "index.json"), "utf8"));
const corrections = JSON.parse(fs.readFileSync(path.join(root, "data/qiraat-src/corrections.json"), "utf8"));
const rules = JSON.parse(fs.readFileSync(path.join(root, "data/qiraat-src/rules.json"), "utf8"));

function find(s, a, nth = 1) {          // أول صفحة فيها الكلمة رقم nth من الآية
  for (let p = 1; p <= 604; p++) {
    const d = page(p);
    const i = d.words.findIndex(([, ss, aa, pos]) => ss === s && aa === a && pos === nth);
    if (i >= 0) return { d, i };
  }
  throw new Error(`${s}:${a}:${nth} not found`);
}
const marks = (d, r, i) => {
  const x = d.riwayat[r];
  if (!x) return [];
  return [[x.c[i] ? "c" : ""], x.s.includes(i) ? "s" : "", x.u.includes(i) ? "u" : "", x.w.includes(i) ? "w" : ""].flat().filter(Boolean);
};
const cardText = (d, i) => (d.cards[i] || [[], []]).flat().map(id => ({ st: statements[id >> 1], rule: id & 1 }));

test("the generated qira'at data is up to date", () => {
  execFileSync(process.execPath, [path.join(root, "scripts/build-qiraat.mjs"), "--check"], { stdio: "pipe" });
});

test("every page of the mushaf has qira'at data, with the source credited", () => {
  assert.equal(index.pages, 604);
  assert.match(index.source, /مركز تفسير/);
  assert.equal(index.riwayat.length, 20);
});

test("Ya'qub on page 11: «هِيَ» carries the waqf mark, «وَإِنَّآ» carries nothing (as in the Tafsir Center / Surah app)", () => {
  const d = page(11);
  const hiya = d.words.findIndex(([, s, a, p]) => s === 2 && a === 70 && p === 8);
  const wainna = d.words.findIndex(([, s, a, p]) => s === 2 && a === 70 && p === 13);
  for (const r of ["ruwais", "rawh"]) {
    assert.deepEqual(marks(d, r, hiya), ["w"], r);
    assert.deepEqual(marks(d, r, wainna), [], r);
  }
});

test("«شَآءَ» (2:70) shows Hamza's imala, flagged as a rule (قاعدة) in the card", () => {
  const { d, i } = find(2, 70, 15);
  assert.equal(d.riwayat.khalaf.c[i].find(x => Array.isArray(x))[1], index.cats.indexOf("imala"));
  assert.ok(cardText(d, i).some(({ st, rule }) => rule && /بالإمالة/.test(st[1])));
});

test("the present tense «يَشَآءُ» has no imala (the center's misplaced imala is removed)", () => {
  const { d, i } = find(2, 90, 12);
  assert.equal(d.riwayat.khalaf && d.riwayat.khalaf.c[i], undefined);
  assert.ok(!cardText(d, i).some(({ st }) => /بالإمالة/.test(st[1])));
});

test("every rule (قاعدة) says why, and on what basis", () => {
  assert.ok(corrections.length > 100);
  for (const c of corrections) {
    assert.ok(c.reason && c.basis && c.after && c.kind, JSON.stringify(c.key));
    assert.equal(c.key.length, 3);
    const r = rules[c.rule];
    assert.ok(r, `rule ${c.rule} of ${JSON.stringify(c.key)} is in rules.json`);
  }
  for (const [id, r] of Object.entries(rules)) {
    assert.ok(r.title && r.sources.length, id);
    for (const s of r.sources) assert.match(s.url, /^https:\/\/shamela\.ws\/book\/\d+\/\d+$/, id);
  }
});

test("a card statement names known riwayat only", () => {
  for (const [who, , keys] of statements) {
    if (/^باقي/.test(who)) assert.equal(keys.length, 0);
    else assert.ok(keys.length && keys.every(k => k >= 0 && k < 20), who);
  }
});

/* عدّ الآي لكل رواية (data/qiraat-src/ayah-count.json) */
test("ayah counts: every surah matches the six counting madhhabs, and each riwaya its mushaf", async () => {
  const ac = await import(path.join(root, "scripts/qiraat/ayah-count.mjs"));
  const T = ac.SURAH_TOTALS;
  [...T.order].forEach((m, i) => {
    const t = ac.surahTotals(ac.madhhabEnds(m));
    for (let s = 1; s <= 114; s++) assert.equal(t[s - 1], T.by_surah[s][i], `${m} surah ${s}`);
  });
  const sum = (r) => ac.surahTotals(ac.riwayaEnds(r)).reduce((a, b) => a + b, 0);
  const want = { qalun: 6214, warsh: 6214, duri: 6217, susi: 6217, bazzi: 6220, qunbul: 6220, shubah: 6236, hafs: 6236,
    hisham: 6226, dhakwan: 6226, ruwais: 6204, rawh: 6204, wardan: 6214, jammaz: 6214, khalaf: 6236, ishaq: 6236 };
  for (const [r, n] of Object.entries(want)) assert.equal(sum(r), n, r);
  for (const r of Object.keys(ac.RIWAYA_COUNT)) assert.ok(sum(r) > 6200, r);
});

test("ayah counts: known boundaries (الم، نذير، قريبا، مصلحون)", async () => {
  const ac = await import(path.join(root, "scripts/qiraat/ayah-count.mjs"));
  const hafs = JSON.parse(fs.readFileSync(path.join(root, "data/mushaf-src/hafs.json"), "utf8"));
  const surah = (s) => hafs.surah_starts[s - 1];
  const word = (s, a, i) => hafs.ayah_starts[hafs.surahs[s - 1].first_ayah + a - 1] + i;
  assert.ok(!ac.riwayaEnds("warsh").has(surah(2)), "«الم» is not an ayah for Warsh");
  assert.ok(ac.riwayaEnds("hafs").has(surah(2)));
  assert.ok(ac.riwayaEnds("warsh").has(word(67, 9, 4)), "«قد جاءنا نذير» ends an ayah for Warsh");
  assert.ok(ac.riwayaEnds("ruwais").has(word(78, 40, 3)) && !ac.riwayaEnds("wardan").has(word(78, 40, 3)), "«قريبا» is Basri only");
  assert.ok(!ac.riwayaEnds("hisham").has(word(2, 11, 3)), "«مصلحون» is not an ayah for the Shami count");
});
