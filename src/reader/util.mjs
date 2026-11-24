/* أدوات صغيرة يستعملها أكثر من ملف في القارئ. */

/* تهريب HTML، ومعه الفاصلة العليا */
export function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

/* رقم السورة بثلاث خانات، كما في أسماء ملفات البيانات: 2 ← 002 */
export function pad3(n){return String(Number(n)||0).padStart(3,"0")}
