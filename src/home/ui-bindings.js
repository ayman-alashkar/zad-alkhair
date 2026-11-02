/* ===================== الربط بالواجهة ===================== */
function bind(){
  const $=id=>document.getElementById(id);

  if($("lk-retry")) $("lk-retry").onclick=async()=>{
    /* طلب صريح من المستخدم، فيُرفع الحارس ويُولَّد رمز جديد */
    const ok=await openBot();
    if(!ok) toast("تعذّر فتح تلغرام، تأكّد أنه مثبَّت");
  };
  if($("zclock")) zTick();
  if($("deadline-trigger")) $("deadline-trigger").onclick=deadlineDialog;
  if($("btn-prayer")) $("btn-prayer").onclick=prayerDialog;
  if($("btn-leave")) $("btn-leave").onclick=leaveDialog;
  document.querySelectorAll("[data-mine]").forEach(b=>b.onclick=()=>{
    zkReplaceHash(b.dataset.mine); boot();
  });
  if($("btn-new")) $("btn-new").onclick=()=>{screen="create";render();};
  document.querySelectorAll("[data-khatmah-card]").forEach(button=>
    button.onclick=()=>joinKhatmahCard(button.dataset.khatmahCard));
  /* ثلاث شاشات فيها زرّ الرئيسية، فالربط بالسمة لا بمعرّف يتكرّر */
  document.querySelectorAll("[data-home]").forEach(b=>b.onclick=goHome);

  if($("btn-join")){
    const go=()=>{
      const c=norm($("f-join").value).toUpperCase();
      if(c.length!==4) return toast("الرمز أربعة محارف");
      zkReplaceHash(c); boot();
    };
    $("btn-join").onclick=go;
    $("f-join").onkeydown=e=>{if(e.key==="Enter")go();};
  }

  if($("f-end")){
    const u=()=>{$("p-fend").textContent=
      $("f-end").value?`${fmtG($("f-end").value)} · ${fmtH($("f-end").value)}`:"";};
    $("f-end").oninput=u; u();
  }

  if($("btn-create")) $("btn-create").onclick=async()=>{
    const org=norm($("f-org").value), end=$("f-end").value, oc=norm($("f-code2").value);
    const access=document.querySelector('input[name="f-access"]:checked')?.value||"private";
    if(!org) return toast("اكتب اسمك");
    if(!end) return toast("اختر تاريخ الانتهاء");
    if(!oc)  return toast("اختر رمزًا للمنظّم");
    try{
      const r=await rpc("create_khatmah",{
        p_title:norm($("f-title").value)||"زاد الخير", p_dedication:norm($("f-ded").value),
        p_end:end, p_hour:+$("f-hour").value, p_minute:0,
        p_org_id:keyOf(org), p_org_name:org, p_org_code:oc, p_device:deviceId(),
        p_access_type:access});
      if(!r.ok) return toast(r.error||"تعذّر الإنشاء");
      code=r.code;
      zkReplaceHash(code);
      viewer={id:keyOf(org),name:org};
      localStorage.setItem(vKey(),JSON.stringify(viewer));
      activeKhatmahSet(code,true);
      localStorage.setItem(cKey(),oc);
      /* لا يرى الرمز ولا الرابط حتى يربط تذكيره، فلا تُستعمل ختمة بلا مشرف مربوط */
      await refresh(true);
      justCreated=true;
      startLinking();
    }catch(e){ toast("تعذّر الاتصال"); }
  };

  if($("btn-copy"))  $("btn-copy").onclick=copyLink;
  if($("btn-enter")) $("btn-enter").onclick=()=>refresh();

  if($("btn-login")){
    const go=async()=>{
      const name=norm($("f-name").value);
      if(!name) return toast("اكتب اسمك أولًا");
      await refresh(true);
      if(!state) return;
      const id=keyOf(name);
      const exact=(state.members||[]).find(m=>m.id===id);
      if(!exact){
        const near=similarTo(name,state.members);
        if(near.length) return askSimilar(near,name);
      }
      if(id===state.organizerId){ gateName=name; render(); return; }
      await doSignIn(id,name,null);
    };
    $("btn-login").onclick=go;
    $("f-name").onkeydown=e=>{if(e.key==="Enter")go();};
    $("f-name").focus();
  }

  if($("btn-code")){
    const go=async()=>{
      const c=norm($("f-code").value);
      if(!c) return toast("أدخل الرمز");
      const before=gateName;
      await doSignIn(keyOf(before),before,c);
      if(gateName) toast("الرمز غير صحيح");
    };
    $("btn-code").onclick=go;
    $("f-code").onkeydown=e=>{if(e.key==="Enter")go();};
    $("f-code").focus();
    $("btn-back").onclick=()=>{gateName="";render();};
  }

  if($("btn-logout")) $("btn-logout").onclick=logoutCurrent;

  document.querySelectorAll(".cell,.wedge").forEach(el=>el.onclick=()=>openSheet(+el.dataset.i));
  document.querySelectorAll("[data-member]").forEach(b=>b.onclick=()=>memberDialog(b.dataset.member));


  if($("btn-link")) $("btn-link").onclick=reminderFromAccountMenu;
  if($("btn-link-big")) $("btn-link-big").onclick=()=>{
    if(state&&state.accessType==="public") askReminderHour();
    else linkTelegram();
  };
  if($("btn-mine")) $("btn-mine").onclick=e=>{e.stopPropagation();showTopMenu("mine",false);};
  if($("btn-history"))  $("btn-history").onclick=historyDialog;


  if($("btn-share")) $("btn-share").onclick=shareText;
  if($("btn-next")) $("btn-next").onclick=settings;
  if($("btn-extend")) $("btn-extend").onclick=()=>datePicker(
    "تمديد الموعد","تبقى الحجوزات كما هي، ويعود التذكير إلى العمل.","مدّد",
    async(d)=>{
      const r=await rpc("update_settings",{p_code:code,p_org_code:orgCode(),
        p_title:state.title,p_dedication:state.dedication||"",
        p_end:d,p_hour:state.reminderHour,p_minute:0,p_device:deviceId(),
        p_access_type:state.accessType||"private"});
      if(!r.ok) return toast("تعذّر التمديد");
      closeLayer(); await refresh(); toast("مُدّد الموعد");
    });
  if($("btn-broadcast")) $("btn-broadcast").onclick=()=>messageDialog(null,"");
  if($("btn-settings")) $("btn-settings").onclick=settings;
  if($("btn-reset")) $("btn-reset").onclick=cancelKhatmah;
}

function settings(){
  modal(`<div class="display" style="font-size:1.4rem">إعدادات الختمة</div>

    <div class="field-row" style="margin-top:1rem;margin-bottom:.7rem">
      <label for="s-title">اسم الختمة</label>
      <input id="s-title" class="field" value="${esc(state.title)}"></div>
    <div class="field-row" style="margin-bottom:.9rem">
      <label for="s-ded">على نية:</label>
      <input id="s-ded" class="field" value="${esc(state.dedication||"")}"></div>

    <fieldset class="access-picker">
      <legend>نوع الختمة</legend>
      <div class="access-options">
        <label class="access-option">
          <input type="radio" name="s-access" value="private"${state.accessType==="public"?"":" checked"}>
          <span class="access-option-body"><b>خاصة</b>
            <small>تتطلب رمز الختمة عند الدخول من بطاقتها.</small></span>
        </label>
        <label class="access-option">
          <input type="radio" name="s-access" value="public"${state.accessType==="public"?" checked":""}>
          <span class="access-option-body"><b>عامة</b>
            <small>مفتوحة للانضمام مباشرة من الصفحة الرئيسية.</small></span>
        </label>
      </div>
    </fieldset>

    <div class="dtgrid">
      <div class="dtcell"><label for="s-end">تنتهي في</label>
        <input id="s-end" class="field" type="date" value="${state.endDate}">
        <p class="dtprev" id="p-end"></p></div>
      <div class="dtcell"><label for="s-hour">التذكير عند</label>
        <select id="s-hour" class="field">${hourOptions(state.reminderHour)}</select>
        <p class="dtprev">كل يوم</p></div>
    </div>

    <div class="pairbtn" style="margin-top:.3rem">
      <button class="btn sm" id="s-transfer">سلّم الإشراف</button>
      <button class="btn sm" id="s-orgcode">غيّر رمز المشرف</button></div>
    <div class="pairbtn" style="margin-top:.5rem">
      <button class="btn sm" id="s-next">ابدأ ختمة جديدة</button>
      <button class="btn danger sm" id="s-del">إلغاء الختمة</button></div>

    <div class="rule" style="margin:1.1rem 0 .8rem"><i>◆</i></div>
    <div class="pairbtn">
      <button class="btn gold sm" id="s-save">حفظ</button>
      <button class="btn quiet sm" id="s-close2">إغلاق</button></div>`);

  const eEnd=document.getElementById("s-end");
  const upd=()=>{document.getElementById("p-end").textContent=
    eEnd.value?`${fmtG(eEnd.value)} · ${fmtH(eEnd.value)}`:"";};
  eEnd.oninput=upd; upd();

  document.getElementById("s-close2").onclick=closeLayer;

  document.getElementById("s-save").onclick=async()=>{
    if(!eEnd.value) return toast("اختر تاريخ الانتهاء");
    try{
      const r=await rpc("update_settings",{p_code:code,p_org_code:orgCode(),
        p_title:norm(document.getElementById("s-title").value),
        p_dedication:norm(document.getElementById("s-ded").value),
        p_end:eEnd.value,p_hour:+document.getElementById("s-hour").value,p_minute:0,
        p_device:deviceId(),
        p_access_type:document.querySelector('input[name="s-access"]:checked')?.value||"private"});
      if(!r.ok) return toast("تعذّر الحفظ");
      closeLayer(); await refresh(); toast("حُفظت الإعدادات");
    }catch(e){ toast("تعذّر الاتصال"); }
  };

  document.getElementById("s-next").onclick=()=>datePicker(
    "ختمة جديدة","تُفرَّغ الأجزاء الثلاثون، ويبقى المشاركون وتذكيراتهم. ويصلهم إشعار بالبداية.","ابدأ",
    async(d)=>{
      const requestId=`${code}:${state.roundNo||1}:${d}`;
      const body={kind:"round",code,orgCode:orgCode(),device:deviceId(),end:d,requestId};
      const r=await edge("announce",body,{key:`round:${requestId}`});
      if(!r.ok) return toast(r.error||"تعذّر البدء");
      if(r.failed) enqueueEdge("announce",body,`round-notify:${requestId}`);
      closeLayer(); await refresh();
      toast(r.sent?`بدأت ختمة جديدة، وأُبلغ ${ar(r.sent)}`:"بدأت ختمة جديدة");
    });

  document.getElementById("s-transfer").onclick=transferDialog;
  document.getElementById("s-orgcode").onclick=orgCodeDialog;
  document.getElementById("s-del").onclick=cancelKhatmah;
}

/* نافذة اختيار تاريخ، تُستعمل للختمة الجديدة وللتمديد */
function datePicker(title,note,okLabel,onOk){
  modal(`<div class="display" style="font-size:1.4rem">${title}</div>
    <p class="hint" style="margin:.6rem 0 1.1rem">${note}</p>
    <div class="dtcell" style="margin-bottom:1.1rem"><label for="d-end">التاريخ</label>
      <input id="d-end" class="field" type="date" value="${plusDays(7)}" min="${todayISO()}">
      <p class="dtprev" id="p-dend"></p></div>
    <div class="actions">
      <button class="btn gold" id="d-go">${okLabel}</button>
      <button class="btn quiet" id="d-no">إلغاء</button></div>`);
  const e=document.getElementById("d-end");
  const u=()=>{document.getElementById("p-dend").textContent=
    e.value?`${fmtG(e.value)} · ${fmtH(e.value)}`:"";};
  e.oninput=u; u();
  document.getElementById("d-no").onclick=closeLayer;
  document.getElementById("d-go").onclick=async()=>{
    if(!e.value) return toast("اختر التاريخ");
    try{ await onOk(e.value); }catch(err){ toast("تعذّر الاتصال"); }
  };
}

async function cancelKhatmah(){
  if(!await appConfirm(`سيُحذف كل شيء نهائيًا: المشاركون وتذكيراتهم ورمز الختمة، ويتعطّل الرابط الذي شاركته، وتصل المجموعة رسالة بالإلغاء.

لبدء ختمة جديدة بنفس المجموعة استعمل «ابدأ ختمة جديدة» بدلًا من هذا.`,{title:"إلغاء الختمة",ok:"نعم، ألغِ الختمة",danger:true})) return;
  try{
    const body={code,orgCode:orgCode(),device:deviceId()};
    const r=await edge("cancel-khatmah",body,{key:`cancel:${code}`});
    if(!r.ok) return toast(r.error||"الرمز غير صحيح");
    mineForget(code);
    localStorage.removeItem(vKey()); localStorage.removeItem(cKey());
    activeKhatmahForget(code);
    zkReplaceHash(""); code=""; state=null; viewer=null; screen="home"; closeLayer(); render();
    loadPublicKhatmahs(true);
    toast("أُلغيت الختمة");
  }catch(e){ toast("تعذّر الاتصال"); }
}
