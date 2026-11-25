/* نقطة الدخول: تسجّل الأقسام كلها وتصدّر فتح البطاقة.
   القارئ يستورد هذا الملف وحده. لإضافة قسم: ملف في sections/ يستدعي registerSection، ويُستورد هنا. */
import "./sections/word.mjs";
import "./sections/mutashabihat.mjs";
import "./sections/ayah.mjs";
import "./sections/page.mjs";
export { openCard, closeCard, reportTarget } from "./card.mjs";
