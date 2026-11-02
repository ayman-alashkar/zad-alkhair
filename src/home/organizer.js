/* ===================== إسناد الأجزاء ===================== */
function assignDialog(i){
  const num=i+1;
  const cur=state.juz[i].ownerId;
  const rows=(state.members||[]).map(m=>{
    const n=state.juz.filter(j=>j.ownerId===m.id).length;
    return `<button class="asg-row${m.id===cur?" cur":""}" data-to="${esc(m.id)}">
      <span class="avatar">${esc(norm(m.name).charAt(0)||"؟")}</span>
      <span class="asg-name">${esc(m.name)}</span>
      ${m.linked?'<span class="tag j">تذكير</span>':'<span class="tag warn">بلا تذكير</span>'}
      <span class="asg-n">${n?`${ar(n)} ${n===1?"جزء":"أجزاء"}`:"لم يحجز"}</span>
    </button>`;
  }).join("");

  modal(`<div class="display" style="font-size:1.4rem">إسناد الجزء ${ar(num)}</div>
    <p class="hint" style="margin:.6rem 0 1rem">${esc(JUZ[i])}</p>
    <div class="asg-list">${rows}</div>
    <div class="rule" style="margin:1rem 0 .8rem"><i>◆</i></div>
    <p class="seclabel">مشارك جديد</p>
    <div class="field-row" style="margin-bottom:.7rem">
      <input id="asg-new" class="field" placeholder="اسم من لا يملك تلغرام"></div>
    <div class="actions">
      <button class="btn" id="asg-add">أضفه وأسنده</button>
      <button class="btn quiet" id="asg-no">إغلاق</button></div>
    <p class="hint">من تضيفه هنا لن يصله تذكير، فبلّغه بنفسك.</p>`);

  document.getElementById("asg-no").onclick=closeLayer;

  document.querySelectorAll("[data-to]").forEach(b=>b.onclick=async()=>{
    const m=memberOf(b.dataset.to);
    if(!await appConfirm(`سيُسنَد الجزء ${ar(num)} إلى ${m?m.name:""}.`,{title:"إسناد الجزء",ok:"نعم، أسنده"})) return;
    await doAssign(num,b.dataset.to);
  });

  document.getElementById("asg-add").onclick=async()=>{
    const nm=norm(document.getElementById("asg-new").value);
    if(!nm) return toast("اكتب الاسم");
    const id=keyOf(nm);
    if(memberOf(id)) return toast("الاسم مسجَّل، اختره من القائمة");
    if(!await appConfirm(`سيُضاف ${nm} إلى المشاركين ويُسنَد إليه الجزء ${ar(num)}.\nلن يصله تذكير حتى يدخل بنفسه ويفعّله.`,{title:"إضافة مشارك",ok:"أضفه وأسنده"})) return;
    try{
      const r=await rpc("add_member",{p_code:code,p_org_code:orgCode(),p_id:id,p_name:nm,p_device:deviceId()});
      if(!r.ok) return toast(r.error||"تعذّر الإضافة");
      await doAssign(num,id);
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

async function doAssign(num,to){
  try{
    const r=await rpc("assign_juz",{p_code:code,p_org_code:orgCode(),p_num:num,p_to:to,p_device:deviceId()});
    if(!r.ok) return toast(r.error||"تعذّر الإسناد");
    closeLayer(); await refresh();
    toast(r.linked?`أُسنِد إلى ${r.name}`:`أُسنِد إلى ${r.name} — بلّغه بنفسك`);
  }catch(e){ toast("تعذّر الاتصال"); }
}

/* ===================== الدمج ===================== */
function mergeDialog(fromId){
  const from=memberOf(fromId); if(!from) return;
  const others=(state.members||[]).filter(m=>m.id!==fromId);
  modal(`<div class="display" style="font-size:1.4rem">دمج مشارك</div>
    <p class="hint" style="margin:.6rem 0 1rem">
      ستُنقل أجزاء «${esc(from.name)}» وربط تلغرامه إلى الاسم الذي تختاره، ثم يُحذف اسمه.</p>
    <div class="field-row"><label for="f-to">ادمجه في</label>
      <select id="f-to" class="field">
        ${others.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("")}
      </select></div>
    <div class="actions">
      <button class="btn gold" id="mg-go">دمج</button>
      <button class="btn quiet" id="mg-no">إلغاء</button></div>`);
  document.getElementById("mg-no").onclick=closeLayer;
  document.getElementById("mg-go").onclick=async()=>{
    const to=document.getElementById("f-to").value;
    try{
      const r=await rpc("merge_members",{p_code:code,p_org_code:orgCode(),p_from:fromId,p_to:to,p_device:deviceId()});
      if(!r.ok) return toast(r.error||"تعذّر الدمج");
      closeLayer(); await refresh();
      toast(`نُقلت ${ar(r.moved)} أجزاء إلى ${r.name}`);
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

/* ===================== التعليمات ===================== */
const HELP_ORG=[
 {t:"قبل أن تبدأ",
 b:["شارك رابط الدعوة مع المجموعة، فمن يفتحه يكتب اسمه ويحجز جزءه مباشرة.",
     "<b>اختر نوع الختمة:</b> <b>العامة</b> تظهر في الصفحة الرئيسية ويدخلها أي قارئ بضغطة، فاخترها إن أردت أن يشاركك من لا تعرفه. و<b>الخاصة</b> لا يدخلها أحد من بطاقتها إلا برمز الختمة، فاخترها لجماعة بعينها: أهل بيت أو حلقة مسجد.",
     "ولك تغيير النوع متى شئت من «إعدادات الختمة»، فما حُجز يبقى كما هو.",
     "احفظ رمز المنظّم في مكان آمن. هو ما يثبت أنك مشرف الختمة، ولا يمكن استعادته إن ضاع.",
     "تفعيل التذكير في تلغرام يلزمك كما يلزم غيرك، ولا يظهر رمز الختمة ولا رابط الدعوة قبله.",
     "رمز الختمة يظهر في أسفل الصفحة، ويصلح لمن أراد الانضمام يدويًا بلا رابط."]},
 {t:"كيف يدخل المشاركون",
 b:["يكتب كلٌّ اسمه. في الختمة العامة يختار إن كان يريد تذكيرًا، وفي الخاصة يفعّله أو يأذن له المشرف بالدخول بلا تذكير.",
     "الختمة العامة تُفتح مباشرة من بطاقتها، أما الخاصة فتطلب رمز الختمة.",
     "بعد فتح تلغرام، عليه ضغط زر «start» في أسفل الشاشة.",
     "الاسم يُقفل على جهاز صاحبه، فلا يدخل به غيره."]},
 {t:"من لا يملك تلغرام",
  b:["في الختمة العامة يختار المشارك بنفسه عند الدخول: تذكير في تلغرام أو متابعة بلا تذكير، فلا يحتاج إلى إذن المشرف.",
     "في الختمة الخاصة، إن كان المشارك لا يملك تلغرام، افتح نافذته من زر ⋯ واختر «ائذن له بالدخول بلا تلغرام».",
     "سيدخل ويحجز كالجميع، لكن لن يصله تذكير.",
     "ولا يصحّ هذا الإذن لك أنت، فالمشرف يلزمه التفعيل.",
     "ويظهر أمام اسمه وسم «بلا تذكير»."]},
 {t:"توزيع الأجزاء",
  b:["الأصل أن يحجز كلٌّ جزءه بنفسه.",
     "ولمن يصعب عليه، افتح الجزء واضغط «أسنده إلى مشارك» واختره من القائمة.",
     "وتستطيع إضافة اسم جديد من النافذة نفسها لمن ليس في القائمة بعد.",
     "وإن نسي أحدهم تعليم جزئه، افتح الجزء واضغط «علّمه مقروءًا نيابةً عنه»، وستصله رسالة شكر."]},
 {t:"نافذة المشارك — زر ⋯",
  b:["<b>أرسل له رسالة</b>: تصله في تلغرام تحت عنوان الختمة.",
     "<b>افتح الاسم</b>: افتحه لمرة واحدة أو دائماً، ويمكنك إلغاء الفتح الدائم لاحقاً.",
     "<b>ادمجه في اسم آخر</b>: لمن دخل باسمين مختلفين، فتنتقل أجزاؤه وتذكيره إلى اسم واحد.",
     "<b>احذفه</b>: في حال إنشاء حساب بالخطأ وتركه مثلًا. وتعود أجزاؤه متاحة ويُفقد تذكيره."]},
 {t:"الإعدادات وما بعد الختمة",
  b:["في الختمة الخاصة يكون وقت التذكير موحّدًا وتضبطه من الإعدادات. أمّا في الختمة العامة فيختار كل مشارك ساعته بنفسه.",
     "<b>ابدأ ختمة جديدة</b> من الإعدادات: تُفرَّغ الأجزاء الثلاثون، ويبقى المشاركون وتذكيراتهم والرابط كما هي.",
     "<b>سلّم الإشراف</b>: تختار من يخلفك من المشاركين وتضع له رمزًا، فتصير أنت مشاركًا عاديًّا وتبقى أجزاؤك وتذكيرك كما هي. والمشرف لا يغادر ختمته، فإن أردت الخروج منها فسلّم الإشراف أوّلًا ثم غادر.",
     "<b>غيّر رمز المشرف</b>: لمن تسرّب رمزه أو أراد تبديله. القديم يبطل فورًا.",
     "<b>إلغاء الختمة</b>: يمحو كل شيء نهائيًا ويُبطل الرابط، وتصل المجموعة رسالة بالإلغاء. لا تستعمله إلا للتخلّص من ختمة أنشئت بالخطأ.",
     "إن انقضى الموعد ولم تكتمل، فالتذكير يستمر أسبوعًا عبر تلغرام، ولك أن تمدّد الموعد بضغطة."]}
];

const HELP_ONE=[
 {t:"الختمات العامة والخاصة",
  b:["في الصفحة الرئيسية بطاقتان: <b>الختمات العامة</b> و<b>الختمات الخاصة</b>، وفي كل بطاقة اسم الختمة وعدد المشاركين وشريط يبيّن كم جزءًا حُجز.",
     "<b>العامة</b> مفتوحة لكل من يرغب في المشاركة، تدخلها بضغطة «انضم الآن» بلا رمز.",
     "<b>الخاصة</b> لجماعة بعينها، فلا تدخلها إلا برمز الختمة الذي يعطيك إياه منظّمها.",
     "في الختمة العامة يُسألُ القارئ: أتريد تذكيرًا يوميًّا في تلغرام؟ فإن قال نعم اختار ساعته وربط حسابه، وإن قال لا دخل وحجز جزءه وتابع من التطبيق.",
     "وقبل أن تدخل، انظر إلى شريط الحجز: إن قال «جميع الأجزاء الثلاثين محجوزة» فلا جزء متاحًا فيها، وإلا فالشريط يخبرك كم بقي."]},
 {t:"كيف تشارك",
  b:["اختر جزءًا متاحًا واضغطه، ثم «احجز هذا الجزء».",
     "تستطيع حجز أكثر من جزء إن أردت.",
     "وإن غيّرت رأيك، افتح جزءك واضغط «تراجع عن الحجز»، فيعود متاحًا لغيرك."]},
 {t:"إذا أتممت جزءك",
  b:["افتحه واضغط «أتممت قراءته»، فيصير ذهبيًا.",
     "عندها يتوقف تذكيرك به، وتصلك رسالة شكر في تلغرام.",
     "فإن نسيت، بقي التذكير يصلك حتى تعلّمه."]},
 {t:"التذكير",
  b:["يصلك في تلغرام مرة كل يوم، فيه جزؤك ووردك اليومي وآية أو حديث.",
     "ولا يصلك شيء إن لم يبق لك جزء غير مقروء."]},
 {t:"إن أردت المغادرة",
  b:["في أسفل صفحة الختمة زرّ <b>مغادرة الختمة</b>.",
     "ما لم تُتمّه من أجزاء يعود متاحًا لغيرك، <b>وما أتممتَه يبقى محسوبًا للختمة باسمك</b> — القراءة لا تُلغى بالمغادرة.",
     "ويتوقّف تذكيرك، ويُرفع اسمك من قائمة المشاركين.",
     "ولك أن تعود متى شئت بالاسم نفسه."]}
];

function helpDialog(){
  const inside = !!(state && viewer && screen==="main");
  const org = inside && isOrganizer();

  const block=(secs)=>secs.map(x=>`<section class="hsec">
      <h4>${x.t}</h4>
      <ul>${x.b.map(li=>`<li>${li}</li>`).join("")}</ul>
    </section>`).join("");

  let title, body;
  if(!inside){
    title="التعليمات";
    body=`<p class="hgroup">للمشارك</p>${block(HELP_ONE)}
          <p class="hgroup">لمشرف الختمة</p>${block(HELP_ORG)}`;
  } else if(org){
    title="دليل المشرف"; body=block(HELP_ORG);
  } else {
    title="كيف تشارك"; body=block(HELP_ONE);
  }

  modal(`<div class="display" style="font-size:1.4rem;margin-bottom:1rem">${title}</div>
    <div class="hbody">${body}</div>
    <div class="actions" style="margin-top:1rem;justify-content:center">
      <button class="btn gold" id="h-close">حسنًا</button></div>`);
  document.getElementById("h-close").onclick=closeLayer;
}

/* ===================== نافذة المشارك ===================== */
function nameAccessDialog(id){
  const m=memberOf(id); if(!m) return;
  modal(`<div class="display" style="font-size:1.4rem">فتح اسم «${esc(m.name)}»</div>
    <p class="hint" style="line-height:2;margin:.7rem 0">اختر طريقة الدخول المناسبة للمشارك.</p>
    <div class="mlist">
      <button class="mact" id="access-once"><b>فتح لمرة واحدة</b>
        <span>أول متصفح يدخل بالاسم يصبح الجهاز المسموح له، ثم يُقفل الاسم مجدداً.</span></button>
      ${m.openPermanently
        ? `<button class="mact" id="access-lock"><b>إلغاء الفتح الدائم</b><span>تعود الحماية للأجهزة المسموح لها قبل الفتح الدائم.</span></button>`
        : `<button class="mact" id="access-open"><b>فتح دائم</b><span>يمكن الدخول بالاسم من أي متصفح حتى تلغي الفتح.</span></button>`}
    </div>
    <p class="hint" style="line-height:1.9;margin:.8rem 0">عند الفتح الدائم يستطيع أي شخص يعرف الاسم ورابط الختمة الدخول به.</p>
    <div class="actions"><button class="btn quiet" id="access-back">رجوع</button></div>`);
  document.getElementById("access-back").onclick=()=>memberDialog(id);
  async function setAccess(mode){
    const message=mode==="open"
      ? `سيستطيع أي شخص يعرف اسم «${m.name}» ورابط الختمة الدخول به من أي متصفح حتى تلغي الفتح. هل تريد المتابعة؟`
      : mode==="once"
        ? `سيتمكن أول متصفح يدخل باسم «${m.name}» من استخدامه، ثم يُقفل الاسم عليه. تأكد أن صاحبه سيدخل فوراً.`
        : `ستعود حماية اسم «${m.name}» للأجهزة التي كانت مسموحة قبل الفتح الدائم.`;
    if(!await appConfirm(message,{title:"فتح الاسم",ok:mode==="lock"?"ألغِ الفتح":"تأكيد"})) return;
    try{
      const r=await rpc("set_name_access",{p_code:code,p_org_code:orgCode(),p_id:id,p_device:deviceId(),p_mode:mode});
      if(!r?.ok) return toast(r?.error||"تعذّر التنفيذ");
      closeLayer(); await refresh(); toast(mode==="open"?"فُتح الاسم دائماً":mode==="once"?"فُتح الاسم لمرة واحدة":"أُلغي الفتح الدائم");
    }catch(e){toast("تعذّر الاتصال");}
  }
  document.getElementById("access-once").onclick=()=>setAccess("once");
  document.getElementById("access-open")?.addEventListener("click",()=>setAccess("open"));
  document.getElementById("access-lock")?.addEventListener("click",()=>setAccess("lock"));
}

function memberDialog(id){
  const m=memberOf(id); if(!m) return;
  const n=state.juz.filter(j=>j.ownerId===id).length;
  const d=state.juz.filter(j=>j.ownerId===id&&j.status==="done").length;

  modal(`<div class="mhead">
      <span class="avatar big">${esc(norm(m.name).charAt(0)||"؟")}</span>
      <div>
        <div class="display" style="font-size:1.35rem">${esc(m.name)}</div>
        <p class="hint" style="margin:0">
          ${n?`${ar(d)} من ${ar(n)} ${n===1?"جزء":"أجزاء"} أتمّها`:"لم يحجز جزءًا بعد"}
          · ${m.linked?"التذكير مفعّل":"بلا تذكير"}
          ${m.exempt?(state.accessType==="public"?"· اختار المتابعة بلا تذكير":"· يدخل بلا تذكير بإذن منك"):""}
        </p>
      </div></div>

    <div class="mlist">
      ${m.linked?`<button class="mact" id="m-msg"><b>أرسل له رسالة</b>
        <span>تصله في تلغرام من البوت</span></button>`:""}
      ${(state.accessType!=="public"&&!m.linked&&m.id!==state.organizerId)?`<button class="mact" id="m-exempt">
        <b>${m.exempt?"اسحب إذن الدخول":"ائذن له بالدخول بلا تلغرام"}</b>
        <span>${m.exempt
          ?"سيُطلب منه تفعيل تلغرام في المرة القادمة"
          :"لمن لا تلغرام على هاتفه، فيدخل ويحجز بنفسه"}</span></button>`:""}
      ${m.id!==state.organizerId?`<button class="mact" id="m-release"><b>${m.openPermanently?"إدارة فتح الاسم":"افتح الاسم"}</b>
        <span>${m.openPermanently?"الاسم مفتوح على جميع الأجهزة":"فتح لمرة واحدة أو فتح دائم"}</span></button>`:""}
      <button class="mact" id="m-merge"><b>ادمجه في اسم آخر</b>
        <span>تنتقل أجزاؤه وتذكيره، ويُحذف هذا الاسم</span></button>
      <button class="mact danger" id="m-remove"><b>احذفه</b>
        <span>تعود أجزاؤه متاحة، ويُفقد تذكيره</span></button>
    </div>
    <div class="actions" style="margin-top:1rem">
      <button class="btn quiet" id="m-close">إغلاق</button></div>`);

  document.getElementById("m-close").onclick=closeLayer;
  const msgBtn=document.getElementById("m-msg");
  if(msgBtn) msgBtn.onclick=()=>messageDialog(id,m.name);
  const rel=document.getElementById("m-release");
  if(rel) rel.onclick=()=>nameAccessDialog(id);
  const ex=document.getElementById("m-exempt");
  if(ex) ex.onclick=async()=>{
    const on=!m.exempt;
    if(on&&!await appConfirm(`سيدخل «${m.name}» ويحجز بلا تفعيل تلغرام، ولن يصله تذكير.`,{title:"الدخول بلا تذكير",ok:"ائذن له"})) return;
    try{
      const r=await rpc("set_exempt",{p_code:code,p_org_code:orgCode(),p_id:id,p_on:on,p_device:deviceId()});
      if(!r.ok) return toast(r.error||"تعذّر التنفيذ");
      closeLayer(); await refresh(); toast(on?"أُذِن له بالدخول":"سُحب الإذن");
    }catch(e){ toast("تعذّر الاتصال"); }
  };
  document.getElementById("m-merge").onclick=()=>mergeDialog(id);
  document.getElementById("m-remove").onclick=()=>removeDialog(id);
}

/* ═══════════ التذكير في الختمة العامة ═══════════
   سؤالان لا سوق: أتريد تذكيرًا؟ فمتى؟ ثم تلغرام. */
function askReminder(){
  closeLayer();
  modal(`<div class="display" style="font-size:1.4rem">هل تفضّل أن يصلك تذكير يومي؟</div>
    <p class="hint" style="margin:.7rem 0 1.2rem;line-height:2">
      يصلك في تلغرام كل يوم: جزؤك ووردك ورابط لقراءته.
      لك أن تشارك بلا تذكير، فتتابع من التطبيق متى شئت.</p>
    <div class="mlist">
      <button class="mact" id="rm-yes"><b>نعم، عندي تلغرام</b>
        <span>أختار ساعة التذكير ثم أربط حسابي</span></button>
      <button class="mact" id="rm-no"><b>لا، بلا تذكير</b>
        <span>أدخل الآن وأحجز جزئي، وأتابع من التطبيق</span></button>
    </div>`);
  document.getElementById("rm-yes").onclick=askReminderHour;
  document.getElementById("rm-no").onclick=async()=>{
    try{
      const r=await rpc("set_my_reminder",{p_code:code,p_id:viewer.id,
        p_device:deviceId(),p_wants:false,p_hour:null,p_minute:null});
      if(!r||!r.ok) return toast((r&&r.error)||"تعذّر التنفيذ");
      closeLayer(); await refresh(); toast("أهلًا بك");
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

function askReminderHour(){
  const me=viewer?memberOf(viewer.id):null;
  const h=me&&me.reminderHour!=null
    ? me.reminderHour
    : (state&&state.reminderHour!=null?state.reminderHour:20);
  modal(`<div class="display" style="font-size:1.4rem">متى يصلك التذكير؟</div>
    <p class="hint" style="margin:.7rem 0 1rem">اختر ساعة تناسب قراءتك. ولك تغييرها لاحقًا.</p>
    <div class="field-row"><label for="rm-hour">ساعة التذكير</label>
      <select id="rm-hour" class="field">${hourOptions(h)}</select></div>
    <div class="actions">
      <button class="btn gold" id="rm-go">تابِع إلى تلغرام</button>
      <button class="btn quiet spacer" id="rm-back">رجوع</button></div>`);
  document.getElementById("rm-back").onclick=askReminder;
  document.getElementById("rm-go").onclick=async()=>{
    const hh=+document.getElementById("rm-hour").value;
    try{
      const r=await rpc("set_my_reminder",{p_code:code,p_id:viewer.id,
        p_device:deviceId(),p_wants:true,p_hour:hh,p_minute:0});
      if(!r||!r.ok) return toast((r&&r.error)||"تعذّر التنفيذ");
    }catch(e){ return toast("تعذّر الاتصال"); }
    closeLayer(); startLinking();
  };
}

/* ═══════════ مغادرة الختمة ═══════════ */
function leaveDialog(){
  const mine=state.juz.filter(j=>j.ownerId===viewer.id);
  const done=mine.filter(j=>j.status==="done").length;
  const open=mine.length-done;
  modal(`<div class="display" style="font-size:1.4rem">مغادرة الختمة</div>
    <p class="hint" style="margin:.7rem 0 .9rem;line-height:2">
      ستخرج من «${esc(state.title)}» ويُرفع اسمك من المشاركين، ويتوقّف تذكيرك.</p>
    ${open?`<p class="warnbox">${arCount(open,"جزء لم تُتمّه سيعود متاحًا","جزءان لم تُتمّهما سيعودان متاحين","أجزاء لم تُتمّها ستعود متاحة","جزءًا لم تُتمّها ستعود متاحة")} لغيرك.</p>`:""}
    ${done?`<p class="hint" style="margin:0 0 .9rem">وما أتممتَه (${ar(done)} ${done===1?"جزء":"أجزاء"}) يبقى محسوبًا للختمة باسمك — القراءة لا تُلغى بالمغادرة.</p>`:""}
    <p class="hint" style="margin:0 0 1.1rem">ولك أن تعود متى شئت بالاسم نفسه.</p>
    <div class="actions">
      <button class="btn danger" id="lv-go">غادر الختمة</button>
      <button class="btn quiet spacer" id="lv-no">بقاء</button></div>`);
  document.getElementById("lv-no").onclick=closeLayer;
  document.getElementById("lv-go").onclick=async()=>{
    try{
      const r=await rpc("leave_khatmah",{p_code:code,p_id:viewer.id,p_device:deviceId()});
      if(!r||!r.ok) return toast((r&&r.error)||"تعذّر التنفيذ");
      mineForget(code);
      localStorage.removeItem(vKey()); localStorage.removeItem(cKey());
      activeKhatmahForget(code);
      toast(r.freed?`غادرتَ الختمة، وتحرّرت ${ar(r.freed)} ${r.freed===1?"جزء":"أجزاء"}`:"غادرتَ الختمة");
      goHome();
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

/* ═══════════ تسليم الإشراف ═══════════
   ينتقل الإشراف وحده. لا تُنقل أجزاء ولا روابط تلغرام. */
function transferDialog(){
  const others=(state.members||[]).filter(m=>m.id!==state.organizerId);
  if(!others.length) return toast("لا يوجد مشارك آخر لتسلّمه الإشراف");
  modal(`<div class="display" style="font-size:1.4rem">تسليم الإشراف</div>
    <p class="hint" style="margin:.7rem 0 1rem;line-height:2">
      اختر من يخلفك، وضع له رمزًا يدخل به. وتصير أنت مشاركًا عاديًّا،
      وتبقى أجزاؤك وتذكيرك كما هي.</p>
    <div class="field-row"><label for="tr-to">المشرف الجديد</label>
      <select id="tr-to" class="field">
        ${others.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("")}
      </select></div>
    <div class="field-row"><label for="tr-code">رمز المشرف الجديد</label>
      <input id="tr-code" class="field" autocomplete="off" placeholder="أربعة محارف فأكثر">
      <p class="hint">أبلغه به بنفسك، فلا سبيل لاستعادته إن ضاع.</p></div>
    <div class="actions">
      <button class="btn gold" id="tr-go">سلّم الإشراف</button>
      <button class="btn quiet spacer" id="tr-no">إلغاء</button></div>`);
  document.getElementById("tr-no").onclick=settings;
  document.getElementById("tr-go").onclick=async()=>{
    const to=document.getElementById("tr-to").value;
    const nc=norm(document.getElementById("tr-code").value);
    const who=memberOf(to);
    if(nc.length<4) return toast("الرمز أربعة محارف فأكثر");
    if(!await appConfirm(`سيصير ${who?who.name:""} مشرف الختمة، وتفقد أنت صلاحيات الإشراف.`,{title:"تسليم الإشراف",ok:"سلّم الإشراف",danger:true})) return;
    try{
      const r=await rpc("transfer_organizer",{p_code:code,p_org_code:orgCode(),
        p_device:deviceId(),p_to:to,p_new_code:nc});
      if(!r||!r.ok) return toast((r&&r.error)||"تعذّر التسليم");
      localStorage.removeItem(cKey());
      closeLayer(); await refresh(); toast(`صار ${r.name} مشرف الختمة`);
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

/* ═══════════ تغيير رمز المشرف ═══════════ */
function orgCodeDialog(){
  modal(`<div class="display" style="font-size:1.4rem">تغيير رمز المشرف</div>
    <p class="hint" style="margin:.7rem 0 1rem">لمن تسرّب رمزه أو أراد تبديله. الرمز القديم يبطل فورًا.</p>
    <div class="field-row"><label for="oc-new">الرمز الجديد</label>
      <input id="oc-new" class="field" autocomplete="off" placeholder="أربعة محارف فأكثر"></div>
    <div class="actions">
      <button class="btn gold" id="oc-go">غيّر الرمز</button>
      <button class="btn quiet spacer" id="oc-no">إلغاء</button></div>`);
  document.getElementById("oc-no").onclick=settings;
  document.getElementById("oc-go").onclick=async()=>{
    const nc=norm(document.getElementById("oc-new").value);
    if(nc.length<4) return toast("الرمز أربعة محارف فأكثر");
    try{
      const r=await rpc("change_organizer_code",{p_code:code,p_org_code:orgCode(),
        p_device:deviceId(),p_new_code:nc});
      if(!r||!r.ok) return toast((r&&r.error)||"تعذّر التغيير");
      localStorage.setItem(cKey(),nc);
      closeLayer(); toast("تغيّر رمز المشرف، فاحفظه");
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

/* ===================== الرسائل ===================== */
function messageDialog(id,name){
  const all=!id;
  const n=(state.members||[]).filter(m=>m.linked).length;
  modal(`<div class="display" style="font-size:1.4rem">${all?"رسالة للمجموعة":"رسالة إلى "+esc(name)}</div>
    <p class="hint" style="margin:.6rem 0 .9rem">${all
      ?`تصل ${ar(n)} ${n===1?"مشاركًا فعّل":"مشاركين فعّلوا"} التذكير. ومن لم يفعّل لا يصله شيء.`
      :"تصله في تلغرام من البوت، تحت عنوان الختمة."}</p>
    <div class="field-row">
      <textarea id="msg-text" class="field msgbox" rows="6"
        placeholder="اكتب رسالتك…"></textarea></div>
    <div class="actions">
      <button class="btn gold" id="msg-go">أرسل</button>
      <button class="btn quiet" id="msg-no">إلغاء</button></div>`);

  const ta=document.getElementById("msg-text"); ta.focus();
  document.getElementById("msg-no").onclick=closeLayer;
  document.getElementById("msg-go").onclick=async()=>{
    const t=ta.value.trim();
    if(!t) return toast("اكتب الرسالة");
    if(all&&!await appConfirm(`ستُرسل هذه الرسالة إلى ${ar(n)} من المشاركين.`,{title:"رسالة للمجموعة",ok:"أرسل"})) return;
    toast("جارٍ الإرسال…");
    try{
      const body={code,orgCode:orgCode(),device:deviceId(),to:id||null,text:t};
      const r=await edge("send-message",body,
        {key:`message:${code}:${id||"all"}:${t}`});
      if(!r.ok) return toast(r.error||"تعذّر الإرسال");
      closeLayer();
      toast(r.sent?`وصلت ${ar(r.sent)} ${r.sent===1?"رسالة":"رسائل"}`:"لم تصل أي رسالة");
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

/* ===================== حذف مشارك ===================== */
function removeDialog(id){
  const m=memberOf(id); if(!m) return;
  const n=state.juz.filter(j=>j.ownerId===id).length;
  const d=state.juz.filter(j=>j.ownerId===id&&j.status==="done").length;

  const warn = n
    ? `<p class="warnbox">يحمل ${ar(n)} ${n===1?"جزءًا":"أجزاء"}${d?`، أتمّ منها ${ar(d)}`:""}.
       ستعود كلها متاحة للجميع.</p>` : "";
  const tg = m.linked
    ? `<p class="warnbox">تذكيره في تلغرام مفعّل، وسيُفقد. فإن عاد فعليه تفعيله من جديد.</p>` : "";

  modal(`<div class="display" style="font-size:1.4rem">حذف مشارك</div>
    <p class="hint" style="margin:.7rem 0 .9rem">سيُحذف «${esc(m.name)}» من قائمة المشاركين.</p>
    ${warn}${tg}
    <p class="hint" style="margin:.9rem 0 1.1rem">
      وإن كان يريد تغيير اسمه لا حذفه، فالأفضل أن يدخل بالاسم الجديد ثم تدمج القديم فيه،
      فتنتقل أجزاؤه وتذكيره معه.</p>
    <div class="actions">
      <button class="btn danger" id="rm-go">احذفه</button>
      <button class="btn quiet" id="rm-no">إلغاء</button></div>`);

  document.getElementById("rm-no").onclick=closeLayer;
  document.getElementById("rm-go").onclick=async()=>{
    try{
      const r=await rpc("remove_member",{p_code:code,p_org_code:orgCode(),p_id:id,p_device:deviceId()});
      if(!r.ok) return toast(r.error||"تعذّر الحذف");
      closeLayer(); await refresh();
      toast(r.freed?`حُذف ${r.name}، وتحرّرت ${ar(r.freed)} أجزاء`:`حُذف ${r.name}`);
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}
