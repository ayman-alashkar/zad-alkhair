# التطوير والتحقق والنشر

## دورة العمل

1. ابدأ فرعًا جديدًا من أحدث `main` وسجّل حالة أي عمل سابق قبل تغييره.
2. عدّل المصدر المذكور في README. حافظ على نصوص المستخدم وتصميمه المعتمد.
3. شغّل `npm run build` ثم `npm run check` وراجع الفرق.
4. افتح طلب دمج واحدًا محدد الهدف. يفحص GitHub الشيفرة والبيانات والملفات الناتجة آليًا.
5. بعد نجاح الفحوصات والدمج، تحقق من نتيجة نشر Cloudflare ورابط الميزة المعنية.

لا يتطلب فحص المشروع تنزيل حزم npm. لا يوجد lockfile لأن package.json لا يحتوي أي dependencies. لا تُضف حزمًا دون حاجة فعلية.

## ماذا تفحص الأوامر؟

| الأمر | النتيجة المطلوبة |
| --- | --- |
| `npm run check:syntax` | صلاحية JS وJSON وكتل HTML وJSON-LD، وفحص صياغة TS بعد إزالة الأنواع دون تنفيذ وظائف الخادم |
| `npm run check:generated` | تطابق المصادر مع ملفات النشر، دون تعديل الملفات |
| `npm run validate:tafsir` | عدد السور والآيات وتسلسلها وبصمات النصوص والملفات وفضائل السور |
| `npm test` | اختبارات السلوك: الصوت والمؤقت والقائمة وملاءمة الصفحة والمظهر وSEO والكاش والتحويلات |
| `npm run check` | كل ما سبق |

فحص TypeScript هنا فحص صياغة؛ ليس بديلًا عن فحص أنواع Deno أو اختبارات نشر Edge Functions. اختبارات الصوت الحالية تستخدم سياقات JavaScript معزولة ولا تثبت أداء المتصفح الفعلي وحدها. اختبارات ملاءمة الصفحة والقراء والصوت تحمّل ملفات المصدر كاملة بدل قص شيفرة من HTML حسب أسماء الدوال. علامات @include تُفسَّر في وقت البناء فقط؛ ترتيبها في app.js جزء من عقد التوافق ويجب الحفاظ عليه ما لم يكن التغيير مقصودًا ومختبرًا.

عند تغيير العرض أو التنقل، افحص الهاتف والحاسب والوضعين النهاري والليلي، والتشغيل الأول والتنقل والعودة. عند تغيير Service Worker افحص التحديث من نسخة مثبتة والشبكة المتقطعة وإعادة الفتح دون اتصال. لا تطلب من المستخدم مسح بياناته كخطوة اعتيادية للتحديث.

## إصدار ملفات صفحات الدليل

رقم الإصدار في روابط `seo-pages.css` و`seo-pages.js` و`seo-install.js` يُحسب تلقائيًا من محتواها عند `npm run build`، ويُكتب في الصفحات وفي قائمة التخزين المسبق في `sw.js`. لا تعدّله يدويًا. تعديل أي من الملفات الثلاثة دون إعادة البناء يُفشل `npm run check`.

## ملفات المشاركة

مصادر صور المشاركة في `social/cards/*.html`: الرئيسية والقارئ والتثبيت ودليل المشغّل، وصورة بوت تلغرام. تستعمل الخطوط المحلية و`icons/zad-rosette.svg` وشعار التطبيق. لإعادة توليد الصور كلها: `node scripts/build-share-cards.cjs` (يحتاج Playwright مع Chromium، وهو أداة تصميم اختيارية لا تبعية تشغيل أو CI). تُحفظ الصور بصيغة JPEG لتبقى أقل من 300 كيلوبايت، فواتساب قد يتجاهل الأكبر منها.

بطاقات السور والأجزاء (`social/surah/surah-NNN-v2.jpg` و`social/juz/juz-NN-v2.jpg`) تُبنى من القالب نفسه في السكربت. خط أغلبها مأخوذ من البطاقات الأصلية ومحفوظ طبقاتٍ شفافة في `social/cards/lettering`، استُخرجت مرة واحدة بـ `scripts/extract-card-lettering.py`. وما يُكتب نصًّا معرّف في قائمة `written` داخل السكربت، مع سبب كل بطاقة (الممتحنة، والمطففين، والسور التي تنتهي بقاف، والجزء الأول)، بخط Aref Ruqaa Ink في `social/cards/fonts`، وهو خط البطاقات الأصلية: خط Aref Ruqaa المستعمل في التطبيق يكسر وصل اللام بالميم في «الممتحنة». والقاف المتطرفة في هذا الخط بلا نقطتين، فتُكتب بشكلها المطوّل المنقوط (`jalt`). لتوليد نوع واحد: `--only=surah` أو `--only=juz` أو `--only=app`.

صورة بوت تلغرام (`social/zad-alkhair-telegram-avatar.jpg`) لا يُشار إليها في الموقع؛ تُرفع يدويًا عبر ‎@BotFather‎ بالأمر ‎/setuserpic‎.

احتفظ باسم URL معتمد للصورة الجديدة وحدّث بيانات OG وTwitter معًا. عند حذف صورة نُشرت سابقًا، احتفظ بتحويل URL القديم في `_redirects`، لأن تطبيقات المشاركة قد تكون حفظته.

## الاسترجاع

مرجع ما قبل التنظيم: `1e369f0f44899745381a5a711460fc7c8d9077c5`. تظل الصور القديمة وتعديلات ما قبل التنظيم قابلة للاسترجاع من سجل Git. لا تستخدم `reset --hard` أو `clean -fd` على نسخة عمل قديمة دون حفظ الفرق ومراجعة الملفات غير المتتبعة. إعادة إصدار الواجهة لا تستدعي إعادة تطبيق ترحيلات Supabase.

## Hijri calendar corrections

The home screen and the prayer-times screen show Hijri dates from the
browser's Umm al-Qura calendar. When an official Saudi announcement starts a
month on a different day, add that month to `data/hijri-adjustments.json`:

```json
"months": {
  "1447-10": "2026-03-20"
}
```

The key is `year-month` (1 = Muharram … 12 = Dhu al-Hijjah) and the value is
the Gregorian date of the month's first day. The app fetches this file from the
network on every visit (the service worker does not cache it) and keeps the
last copy for offline use, so no release or cache bump is needed. Readers can
still shift the date by up to two days on their own device.
