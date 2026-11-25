
/* رابط الدخول في أزرار رسائل البوت (?login=…): على الآيفون لكل مكان يُفتح منه
   الموقع تخزين منفصل، فيبدو المتصفح جديدًا. الرمز يضيف هذا المتصفح إلى أجهزة
   صاحب الرسالة في كل ختماته، فيدخل باسمه دون أن يكتب شيئًا.
   يُحذف الرمز من العنوان فورًا حتى لا يبقى ظاهرًا أو يُنسخ مع الرابط. */
function takeLoginToken(){
  try{
    const url=new URL(location.href);
    const token=url.searchParams.get("login");
    if(token===null) return "";
    url.searchParams.delete("login");
    history.replaceState(history.state,"",url.href);
    return /^[0-9a-f]{36}$/.test(token)?token:"";
  }catch(_){ return ""; }
}
async function redeemLoginLink(token){
  if(!token) return;
  let r=null;
  try{
    r=await Promise.race([
      rpc("redeem_login_link",{p_token:token,p_device:deviceId()}),
      new Promise(resolve=>setTimeout(()=>resolve(null),8000))
    ]);
  }catch(_){ return; }
  /* رمز منتهٍ أو خاطئ: يكمل التطبيق كما لو فُتح بلا رمز. */
  if(!r||!r.ok) return;
  storeMemberships(r.memberships);
}
/* عضويات حساب تيليغرام بعد إضافة هذا المتصفح إليها: يُحفظ لكل ختمة اسم صاحبها. */
function storeMemberships(list){
  if(!Array.isArray(list)) return;
  for(const m of list){
    const c=cleanKhatmahCode(m&&m.code);
    if(!c||!m.id) continue;
    try{ localStorage.setItem("zad:viewer:"+c,JSON.stringify({id:m.id,name:m.name})); }catch(_){ }
  }
}

function loadViewer(){
  try{ appState.viewer=JSON.parse(localStorage.getItem(vKey())||"null"); }catch(e){ appState.viewer=null; }
}

/* الرجوع إلى الرئيسية: من الشريط العلوي ومن أزرار الصفحات سواء */
function goHome(){
  clearInterval(appState.lkTimer); appState.lkTimer=null; appState.linking=false;
  /* الرجوع إلى صفحة الختمات لا يغيّر الختمة النشطة. بذلك إذا عاد القارئ
     لاحقًا إلى واجهة زاد الخير ثم اختار «الختمات الجماعية» يرجع إلى ختمته. */
  closeLayer();
  zkReplaceHash("");appState.code="";appState.state=null;appState.viewer=null;appState.screen="home";render();
  loadPublicKhatmahs(true);
}

