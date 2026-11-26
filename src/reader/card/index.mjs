/* نقطة الدخول: تسجّل الأقسام كلها وتصدّر فتح البطاقة.
   القارئ يستورد هذا الملف وحده. لإضافة قسم: ملف في sections/ يستدعي registerSection، ويُستورد هنا. */
import "./sections/word.mjs";
import "./sections/mutashabihat.mjs";
import "./sections/ayah.mjs";
import "./sections/page.mjs";
import "./sections/count.mjs";
export { openCard, closeCard, reportTarget } from "./card.mjs";
import { mutashabihatFor, wordLayers, headInfo } from "./data.mjs";
/** هل علامة الآية عند الكلمة gi موضع خلاف في العدّ؟ (لنافذة عدّ الآي) */
export const isDisputedHead = async gi => !!(await headInfo(gi, "hafs"));
/** نص الكلمة بالرسم العثماني (لنافذة التعليق). */
export const wordText = async (page, gi) => (await wordLayers(page, gi))?.text || "";
/** هل الكلمة في عبارة متشابهة؟ (لزر «متشابهات» في القائمة العائمة) */
export const hasMutashabihat = async gi => (await mutashabihatFor(gi)).length > 0;
