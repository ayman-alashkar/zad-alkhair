const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

/* search-text.mjs كما يعمل في القارئ (بعد حذف كلمة export). */
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src/reader/search-text.mjs"), "utf8").replace(/^export /gm, "") +
  "\n;Object.assign(globalThis,{searchNormalize,searchMatcher});", context);
const finds = (query, text) => context.searchMatcher(query).test(context.searchNormalize(text));

/* أمثلة من النص المرافق لخطوط المصحف كما هو في بيانات الصفحات. */
test("ordinary spelling finds the mushaf's spelling", () => {
  assert.ok(finds("الصلاة", "وَيُقِيمُونَ الصَّلَواةَ وَمِمَّا رَزَقْنَاهُمْ"));
  assert.ok(finds("الصلاه", "وَيُقِيمُونَ الصَّلَواةَ"));
  assert.ok(finds("الزكاة", "وَءَاتُوا الزَّكَواةَ"));
  assert.ok(finds("آمنوا", "يَا أَيُّهَا الَّذِينَ ءَامَنُوا"));
  assert.ok(finds("امنوا", "يَا أَيُّهَا الَّذِينَ ءَامَنُوا"));
  assert.ok(finds("يا أيها الذين آمنوا", "يَا أَيُّهَا الَّذِينَ ءَامَنُوا"));
  assert.ok(finds("يأيها", "يَٰٓأَيُّهَا النَّاسُ"));
  assert.ok(finds("الرحمن", "الرَّحْمَانِ الرَّحِيمِ"));
  assert.ok(finds("القرآن", "شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْءَانُ"));
  assert.ok(finds("السموات", "خَلَقَ السَّمَٰوَٰتِ وَالْأَرْضَ"));
  assert.ok(finds("هذه", "وَلَا تَقْرَبَا هَٰذِهِ الشَّجَرَةَ"));
  assert.ok(finds("إسرائيل", "يَا بَنِي إِسْرَٰٓءِيلَ"));
  assert.ok(finds("اسرائيل", "يَا بَنِي إِسْرَٰٓءِيلَ"));
  assert.ok(finds("رؤوف", "إِنَّ اللَّهَ بِالنَّاسِ لَرَءُوفٌ رَّحِيمٌ"));
  assert.ok(finds("اللؤلؤ", "كَأَمْثَالِ اللُّؤْلُو&#1621;ِ الْمَكْنُونِ"));
});

test("without finding what was not written", () => {
  assert.ok(!finds("آمنوا", "الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ"), "«آمنوا» is not «يؤمنون»");
  assert.ok(!finds("إله", "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ"));
  assert.ok(!finds("آية", "يَا أَيُّهَا النَّاسُ"), "«آية» is not «أيها»");
  assert.ok(!finds("اله", "قَالَ هُوَ"), "a word does not run into the next one");
});
