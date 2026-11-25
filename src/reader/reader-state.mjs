/* حالة القراءة التي تتشاركها أقسام المصحف.
   كانت متغيرات عامة في state.js يعدّلها أي ملف؛ صارت حقولًا في كائن واحد، فيظهر في
   كل سطر أنه يقرأ الحالة المشتركة أو يغيّرها (reading.currentPage). حالة التشغيل
   الصوتي لها كائنها في خطوة لاحقة. */
export const reading = {
  /* الصفحات المرسومة في المسار: رقم الصفحة ← عنصرها */
  pages: new Map(),
  currentPage: 1,

  /* الآية المحددة (سورة:آية) والكلمة التي حُددت منها، لقائمة الآية */
  selectedKey: null,
  selectedAnchor: null,
  toolsTimer: null,     /* مؤقت إخفاء أدوات القراءة */

  /* بيانات مصحف QCF: الفهرس، وخريطة السور، وفهرس الآيات */
  qcfMeta: null,
  chapterMap: new Map(),
  verseIndex: null,

  navigationBusy: false, /* انتقال بين الصفحات جارٍ */
};
