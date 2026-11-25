# مصادر بيانات البطاقة على مستوى الآية والصفحة والسورة

`center-ayah.json.gz`: جداول من قاعدة بيانات القرآن الكريم لمركز تفسير للدراسات القرآنية (`quran.db`، ترخيص CC BY 4.0، البصمة في الملف)، كما هي بلا تعديل:

| في اللقطة | الجدول والعمود | الناتج |
|---|---|---|
| `mukhtasar` | `QuranTafseer.Mukhtasarar` | `data/tafsir/al-mukhtasar/` |
| `saadi` | `tafsir_saadi.tafsir` | `data/tafsir/al-saadi/` |
| `irab` | `ayah_content_irab.irabAyah1` | `data/i3rab/markaz-tafsir/` |
| `nuzool` | `ayah_content_nozool.nozoolInfo` | `data/nuzool.json` (201 آية) |
| `fawaed` | `mokhtasar_fawaed.content` | `data/fawaed.json` (604 صفحة) |
| `goals` | `surah_content.surahGoals` | `data/surah-goals.json` |

يبنيها `scripts/build-card-data.mjs` (ومعه `--check`)، على نمط `data/tafsir/al-wajeez`: ملف لكل سورة فيه نص كل آية وبصمته، ومعه `index.json` و`manifest.json`. النص حرفي؛ التغيير الوحيد توحيد نهايات الأسطر وحذف المسافات في الطرفين، وحذف «• » من أول كل فائدة. في المختصر علامات `_…_` حول الكلمات المفسَّرة، تبقى كما هي ويحوّلها العرض إلى إبراز.

التفسير الثالث في البطاقة هو «الوجيز» للزحيلي، الموجود أصلًا في `data/tafsir/al-wajeez`.

**الإذن:** القاعدة منشورة من المركز بترخيص CC BY 4.0، لكن السعدي والمختصر والفوائد يُسأل المركز صراحة عن عرضها في زاد الخير قبل النشر للمستخدمين.

حجمها مضغوطًا: المختصر 0.9MB، السعدي 2.4MB، الإعراب 2.1MB، والملفات الصغيرة معًا نحو 0.3MB.
