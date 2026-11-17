# مصادر المصحف المرسوم

يبني `scripts/build-mushaf.mjs` من هذه الملفات صفحات `data/mushaf/`. لا تُعدَّل يدويًا.

| الملف | المحتوى | المصدر والترخيص |
| --- | --- | --- |
| `hafs.json` | نص مصحف المدينة 1441هـ برواية حفص كلمةً كلمة، وبدايات الصفحات والسطور والآيات، وعلامات الوقف | نص مجمع الملك فهد لطباعة المصحف الشريف (UthmanicHafs v3.0)، يُستعمل وفق حقوق الاستخدام التي نشرها المجمع. الترتيب كلمةً كلمة من quran-text by quran-ws — https://github.com/quran-ws/quran-text — CC BY 4.0، الإيداع 7b0e14874644ad7372694251910ea7c71fa98fb3، دون تعديل. |
| `surah-names.json` | أسماء السور كما يعرضها القارئ اليوم | من index.json في quran-qcf4 1.0.3 (MIT). |
| `surah-titles.json` | سطر «سورة كذا» لكل سورة بترميز خط DigitalKhatt | من quran_text_madina.ts في digitalkhatt-js (MIT). |
| `print-1441-lines.json` | نوع كل سطر في الصفحة (عنوان سورة، بسملة، نص)، وعرض السطور الأقصر من السطر الكامل | مشتق من بيانات صفحات quran-qcf4 1.0.3 (MIT) بـ`scripts/mushaf/extract-print-lines.py`. لا يحوي شيئًا من الخطوط. |

الخط `fonts/digitalkhatt/madina.otf`: DigitalKhatt New Madina، أمين عنان وترتيل، SIL Open Font License 1.1، من https://github.com/DigitalKhatt/madinafont الإيداع 9aeb02c26d8dae4c032820733466c1ee9137e6d6. يُستعمل عند البناء فقط؛ لا يُنزَّل إلى المستخدم.

محرك ضبط السطر `scripts/mushaf/digitalkhatt/`: من https://github.com/DigitalKhatt/digitalkhatt-js (MIT)، وHarfBuzz من harfbuzzjs 1.6.4 في `scripts/mushaf/vendor/harfbuzzjs/`.
