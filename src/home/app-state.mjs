/* حالة التطبيق التي تتشاركها أقسامه.
   كانت متغيرات عامة يعدّلها أي ملف؛ صارت حقولًا في كائن واحد، فيظهر في كل سطر أنه
   يقرأ الحالة المشتركة أو يغيّرها (appState.code)، ويُعرف من يملك ماذا. */
export const appState = {
  /* الختمة المفتوحة */
  code: "",          /* رمزها، كما في #ABCD */
  state: null,       /* بياناتها كما أعادتها get_state */
  viewer: null,      /* المشارك الذي يراها من هذا المتصفح: {id, name} */
  selected: null,    /* الجزء المحدد في الحوار */
  gateName: "",      /* الاسم المكتوب في شاشة الدخول */
  screen: "boot",    /* boot | home | create | share | gate | main | notfound */
  justCreated: false,

  /* الختمات العامة في شاشة البداية */
  publicKhatmahs: [],
  publicKhatmahsLoaded: false,
  publicKhatmahsLoading: false,
  publicKhatmahsError: false,

  /* ربط تيليغرام: linking يمنع توليد رمز ثانٍ أثناء ربط جارٍ، وlkTimer مؤقت مراقبته */
  linking: false,
  lkTimer: null,

  /* اختيارات الصفحة الرئيسية للختمة، تبقى كما هي حين يُعاد رسمها بعد كل تحديث */
  juzFilter: "all",
  peopleOpen: false,
};
