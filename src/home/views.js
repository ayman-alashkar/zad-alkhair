/* ===================== الشمسة ===================== */
function shamsa(){
  const cx=160,cy=160,r1=76,r2=126,n=30,step=360/n,gap=1.5;
  const pt=(r,d)=>{const a=d*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)];};
  let w="";
  for(let i=0;i<n;i++){
    const a1=-90+i*step+gap/2,a2=-90+(i+1)*step-gap/2;
    const[x1,y1]=pt(r2,a1),[x2,y2]=pt(r2,a2),[x3,y3]=pt(r1,a2),[x4,y4]=pt(r1,a1);
    const s=state.juz[i].status;
    const fill=s==="done"?"url(#g)":s==="taken"?"#B9DED2":"#DCEDF3";
    const st=s==="done"?"#C99A45":s==="taken"?"#287A65":"#2E7C97";
    w+=`<path class="wedge" data-i="${i}" style="animation-delay:${i*18}ms"
      d="M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z"
      fill="${fill}" stroke="${st}" stroke-width="1.1"><title>الجزء ${i+1}</title></path>`;
  }
  const done=state.juz.filter(j=>j.status==="done").length;
  return `<svg class="shamsa" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label="تمّت قراءة ${done} من ثلاثين جزءًا">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F8E9C4"/><stop offset="1" stop-color="#E5C06B"/></linearGradient></defs>
    <circle cx="160" cy="160" r="142" fill="none" stroke="#C99A45" stroke-opacity=".42"/>
    <circle cx="160" cy="160" r="136" fill="none" stroke="#C99A45" stroke-opacity=".2"/>
    ${w}
    <circle cx="160" cy="160" r="68" fill="#FFFCF4" stroke="#C99A45" stroke-opacity=".5"/>
    <circle cx="160" cy="160" r="62" fill="none" stroke="#C99A45" stroke-opacity=".27"/>
    <text x="160" y="152" text-anchor="middle" font-family="Amiri,serif" font-size="50" fill="#C99A45">${ar(done)}</text>
    <text x="160" y="184" text-anchor="middle" font-family="Amiri,serif" font-size="19" fill="#8A7657">من ٣٠ جزءًا</text>
  </svg>`;
}

function cardShamsa(done,reserved){
  let rays="";
  for(let i=0;i<30;i++){
    const color=i<done?"#C59A4A":i<reserved?"#2C8B6C":"#8CB5C0";
    const opacity=i<reserved?1:.42;
    rays+=`<path d="M60 10V24" transform="rotate(${i*12} 60 60)"
      stroke="${color}" stroke-opacity="${opacity}" stroke-width="4.2" stroke-linecap="round"/>`;
  }
  return `<svg class="card-shamsa" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="55" fill="#FFFCF4" stroke="#C59A4A" stroke-opacity=".26"/>
    ${rays}
    <circle cx="60" cy="60" r="27" fill="#0A473E" stroke="#E4C980" stroke-width="1.4"/>
    <text x="60" y="66" text-anchor="middle" font-family="Amiri,serif" font-size="23" fill="#FFF9EA">${ar(done)}</text>
  </svg>`;
}

function participantWord(n){
  if(n===1) return "مشارك";
  if(n===2) return "مشاركان";
  if(n>=3&&n<=10) return "مشاركين";
  return "مشاركًا";
}

const pct=n=>Math.max(0,Math.min(100,(Number(n)||0)/30*100));
/* ختمات هذا الجهاز: كلمة مركزية تفتح قائمة العودة إلى الختمات */
function mineStrip(){
  const list=mineGet();
  if(!list.length) return "";
  return `<details class="mine-strip">
    <summary class="mine-toggle">ختماتي</summary>
    <div class="mine-row">${list.map(x=>`
      <button class="mine-card" data-mine="${esc(x.code)}">
        <b>${esc(x.title||"ختمة")}</b>
        <span>${esc(x.name)}</span>
      </button>`).join("")}</div>
  </details>`;
}

function khatmahCardsGroup(accessType,title,note){
  const items=publicKhatmahs.filter(k=>
    (k.accessType==="public"?"public":"private")===accessType);
  const cards=items.length?`<div class="khatmah-cards">${items.map(k=>{
    const done=Number(k.doneCount)||0,reserved=Number(k.reservedCount)||0;
    const people=Number(k.participantCount)||0,overdue=daysLeft(k.endDate)<0;
    const isPublic=accessType==="public";
    return `<article class="khatmah-card">
      ${cardShamsa(done,reserved)}
      <div class="card-khatmah-body">
        <h3 class="card-khatmah-title">${esc(k.title||"زاد الخير")}</h3>
        <div class="card-khatmah-stats">
          <span><b>${ar(people)}</b> ${participantWord(people)}</span>
          <span><b>${ar(done)}</b> من ٣٠ مقروء${overdue?" · تجاوزت الموعد":""}</span>
        </div>
        <div class="card-progress" role="img"
             aria-label="محجوز ${reserved} من 30، ومقروء ${done}">
          <i class="p-res" style="width:${pct(reserved)}%"></i>
          <i class="p-done" style="width:${pct(done)}%"></i>
        </div>
        <p class="card-slots ${reserved>=30?"full":""}">${reserved>=30
          ? "جميع الأجزاء الثلاثين محجوزة"
          : `<b>${ar(30-reserved)}</b> ${30-reserved===1?"جزء متاح":"جزءًا متاحًا"} · محجوز ${ar(reserved)} من ٣٠`}</p>
        <button class="btn gold card-join" data-khatmah-card="${esc(k.publicId)}">${isPublic?"انضم الآن":"أدخل الرمز"}</button>
      </div>
    </article>`;
  }).join("")}</div>`:
    `<div class="cards-empty">${accessType==="public"
      ?"لا توجد ختمة عامة جارية الآن."
      :"لا توجد ختمة خاصة جارية الآن."}</div>`;
  return `<section class="khatmah-kind" aria-label="${esc(title)}">
    <div class="khatmah-kind-head">
      <h3 class="khatmah-kind-title">${esc(title)}</h3>
      <span class="khatmah-kind-note">${esc(note)}</span>
    </div>
    ${cards}
  </section>`;
}

function publicCardsMarkup(){
  if(publicKhatmahsLoading&&!publicKhatmahsLoaded){
    return `<div class="khatmah-cards cards-loading">${Array.from({length:4},()=>'<div class="khatmah-card" aria-hidden="true"></div>').join("")}</div>`;
  }
  if(publicKhatmahsError&&!publicKhatmahs.length){
    return `<div class="cards-empty">تعذّر تحميل الختمات الجارية الآن.</div>`;
  }
  return `<div class="khatmah-kinds">
    ${khatmahCardsGroup("public","الختمات العامة","مفتوحة لكل من يرغب في المشاركة")}
    ${khatmahCardsGroup("private","الختمات الخاصة","تحتاج إلى رمز الختمة من منظّمها")}
  </div>`;
}

/* ===================== الشاشات ===================== */
let topUserObserver=null,topUserResizeFrame=0;
function closeTopMenu(){
  const menu=document.getElementById("tb-popover"),btn=document.getElementById("tb-user");
  if(menu){menu.hidden=true;menu.innerHTML="";}
  if(btn) btn.setAttribute("aria-expanded","false");
}
function topMineMarkup(withBack=false){
  const list=mineGet();
  return `${withBack?'<button class="tb-menu-item tb-menu-back" data-top-action="account">‹ رجوع</button>':""}
    ${list.length?list.map(x=>`<button class="tb-menu-item" data-top-mine="${esc(x.code)}">
      <span>${esc(x.title||"ختمة")}</span><small>${esc(x.name||"")}</small></button>`).join(""):
      '<div class="tb-menu-empty">لا توجد ختمات محفوظة على هذا الجهاز.</div>'}`;
}
function topAccountMarkup(){
  return `<button class="tb-menu-item" data-top-action="mine">ختماتي</button>
    <button class="tb-menu-item" data-top-action="history">سجلي</button>
    <button class="tb-menu-item" data-top-action="reminder">أعد تفعيل التذكير</button>
    <button class="tb-menu-item" data-top-action="logout">خروج</button>
    ${viewer&&state&&!isOrganizer()?'<button class="tb-menu-item danger" data-top-action="leave">مغادرة الختمة</button>':""}`;
}
function showTopMenu(kind,mineBack=(kind==="mine"&&screen==="main")){
  const menu=document.getElementById("tb-popover"),btn=document.getElementById("tb-user");
  if(!menu||!btn) return;
  menu.innerHTML=kind==="mine"?topMineMarkup(mineBack):topAccountMarkup();
  menu.hidden=false;btn.setAttribute("aria-expanded","true");
}
function toggleTopMenu(){
  const menu=document.getElementById("tb-popover"),btn=document.getElementById("tb-user");
  if(!menu||!btn||!btn.textContent.trim()) return;
  if(!menu.hidden){closeTopMenu();return;}
  showTopMenu(screen==="home"?"mine":"account");
}
function syncTopUser(){
  const topUser=document.getElementById("tb-user");
  if(!topUser) return;
  closeTopMenu();
  if(topUserObserver){topUserObserver.disconnect();topUserObserver=null;}
  document.body.classList.remove("show-top-user","show-home-mine");
  topUser.textContent="";
  topUser.disabled=true;

  if(screen==="home"){
    if(mineGet().length){
      topUser.textContent="ختماتي";topUser.disabled=false;
      document.body.classList.add("show-home-mine");
    }
    return;
  }
  if(!(viewer&&screen==="main")) return;
  topUser.textContent=viewer.name;topUser.disabled=false;
  const bar=document.getElementById("main-userbar");
  if(!bar) return;
  topUserObserver=new IntersectionObserver(entries=>{
    const entry=entries[0];
    const show=!entry.isIntersecting&&entry.boundingClientRect.top<64;
    document.body.classList.toggle("show-top-user",show);
    if(!show) closeTopMenu();
  },{root:null,rootMargin:"-64px 0px 0px 0px",threshold:0});
  topUserObserver.observe(bar);
}
function queueTopUserSync(){
  cancelAnimationFrame(topUserResizeFrame);
  topUserResizeFrame=requestAnimationFrame(syncTopUser);
}

function render(){
  const v={boot:viewBoot,home:viewHome,create:viewSetup,share:viewShare,
           gate:viewGate,main:viewMain,notfound:viewNotFound,linking:viewLinking}[screen]||viewBoot;
  document.getElementById("app").innerHTML=v();
  bind();
  requestAnimationFrame(syncTopUser);
}

const viewBoot=()=>`<div class="gate"><p class="lede">جارٍ التحميل…</p></div>`;

function viewLinking(){
  const org = justCreated || (state && viewer && state.organizerId===viewer.id);
  return `<div class="gate">
    <div class="display">${esc(state&&state.title?state.title:"زاد الخير")}</div>
    ${rule()}
    <div class="frame card">
      <div class="tgbig">${TG_ICON}</div>
      <p class="lede" style="margin:.4rem 0 0">جارٍ فتح تلغرام لتفعيل بوت زاد الخير المرتبط بهذه الختمة…</p>
      <div id="lk-fallback" class="lk-hidden">
        <div class="rule" style="margin:1.2rem 0 .9rem"><i>◆</i></div>
        <p class="hint" style="margin:0 0 .8rem">لم يفتح تلغرام؟</p>
        <button class="btn gold wide" id="lk-retry">أعد المحاولة</button>
        <p class="hint" style="margin-top:.9rem;line-height:1.9">${org
          ? "نعتذر عن أي إزعاج قد يسببه هذا، لكن الختمة لن تُنشأ قبل ربط بوت تلغرام التطبيق بحساب المشرف — حيث به يصلك التذكير، وتُدار بعض صلاحياتك."
          : "وإن لم يكن تلغرام على هاتفك، أخبر مشرف الختمة ليأذن لك بالدخول."}</p>
      </div>
    </div>
  </div>`;
}

function viewHome(){
  return `<div class="gate home-gate">
    <div class="brand">كلام الباري يجمعنا</div>
    ${rule()}
    <p class="lede">بتوفيق الله وهمّة بعضنا البعض، نبقى على تماس مع كلام الرحمن.</p>
    <div class="frame card" style="margin-top:1.7rem">
      <button class="btn gold wide" id="btn-new">نظّم ختمة جديدة</button>
      <div class="rule" style="margin:1.3rem 0 1.1rem"><i>أو</i></div>
      <div class="field-row" style="margin-bottom:.7rem">
        <label for="f-join">انضم إلى ختمة برمزها</label>
        <input id="f-join" class="field codebox" maxlength="4" autocomplete="off"
               placeholder="ABCD" inputmode="text"></div>
      <button class="btn wide" id="btn-join">انضمام</button>
      <p class="hint">الرمز أربعة محارف يعطيك إياها منظّم الختمة.</p>
    </div>
    <section class="public-khatmahs" aria-labelledby="active-khatmahs-title">
      <div class="public-khatmahs-head">
        <h2 id="active-khatmahs-title">الختمات الجارية</h2>
      </div>
      ${publicCardsMarkup()}
    </section>
  </div>`;
}

function viewNotFound(){
  return `<div class="gate">
    <div class="display">لا توجد ختمة بهذا الرمز</div>
    ${rule()}
    <p class="lede">تأكّد من الرمز <b>${esc(code)}</b>، أو اطلبه من المنظّم من جديد.</p>
    <button class="btn gold wide" data-home style="margin-top:1.2rem">رجوع</button>
  </div>`;
}

function viewSetup(){
  return `<div class="gate" style="max-width:46ch">
    <div class="display">ابدأ الختمة</div>
    ${rule()}
    <div class="frame card">
      <div class="field-row"><label for="f-org">اسمك (المنظّم)</label>
        <input id="f-org" class="field" autocomplete="name"></div>
      <div class="field-row"><label for="f-title">اسم الختمة</label>
        <input id="f-title" class="field" value="زاد الخير"></div>
      <div class="field-row"><label for="f-ded">على نية:</label>
        <input id="f-ded" class="field"></div>
      <fieldset class="access-picker">
        <legend>نوع الختمة</legend>
        <div class="access-options">
          <label class="access-option">
            <input type="radio" name="f-access" value="private" checked>
            <span class="access-option-body"><b>خاصة</b>
              <small>تظهر بطاقتها، ولا يدخلها القارئ إلا برمز الختمة.</small></span>
          </label>
          <label class="access-option">
            <input type="radio" name="f-access" value="public">
            <span class="access-option-body"><b>عامة</b>
              <small>مفتوحة، وينضم إليها أي قارئ مباشرة.</small></span>
          </label>
        </div>
      </fieldset>
      <div class="dtgrid">
        <div class="dtcell"><label for="f-end">تنتهي في</label>
          <input id="f-end" class="field" type="date" value="${plusDays(7)}" min="${todayISO()}">
          <p class="dtprev" id="p-fend"></p></div>
        <div class="dtcell"><label for="f-hour">التذكير عند</label>
          <select id="f-hour" class="field">${hourOptions(20)}</select>
          <p class="dtprev">كل يوم</p></div>
      </div>
      <div class="field-row"><label for="f-code2">رمز المنظّم</label>
        <input id="f-code2" class="field" placeholder="رمز تحفظه لنفسك">
        <p class="hint">هذا الرمز لضمان وجود منظّم واحد للختمة، وتجنّب الأخطاء.</p></div>
      <button class="btn gold wide" id="btn-create">ابدأ الختمة</button>
      <button class="btn quiet wide" data-home style="margin-top:.5rem">رجوع</button>
    </div>
  </div>`;
}

function viewShare(){
  const isPublic=state&&state.accessType==="public";
  return `<div class="gate" style="max-width:44ch">
    <div class="display">بدأت الختمة</div>
    ${rule()}
    <p class="lede">${isPublic
      ?"ختمتك عامة؛ يستطيع أي قارئ الانضمام إليها من الصفحة الرئيسية، ويمكنك أيضًا مشاركة رابطها."
      :"شارك هذا الرابط مع المجموعة. من يفتحه يكتب اسمه ويحجز جزءه مباشرة."}</p>
    <div class="frame card">
      ${isPublic?'<span class="access-badge public">ختمة عامة</span>':`
        <div class="codebig">${esc(code)}</div>
        <p class="hint" style="margin:0 0 1.1rem">رمز الختمة، لمن أراد الانضمام يدويًا</p>`}
      <div class="linkbox">${esc(linkFor(code))}</div>
      <button class="btn gold wide" id="btn-copy" style="margin-top:.9rem">نسخ رابط الدعوة</button>
      <button class="btn wide" id="btn-enter" style="margin-top:.5rem">ادخل إلى الختمة</button>
      <p class="hint">احفظ رمز المنظّم الذي اخترته، فهو ما يثبت أنك مشرف الختمة.</p>
    </div>
  </div>`;
}

function viewGate(){
  const asks=!!gateName;
  const org=memberOf(state.organizerId);
  const isPublic=state.accessType==="public";
  return `<div class="gate">
    <p class="joining">انضمامك إلى ختمة</p>
    <div class="display">${esc(state.title)}</div>
    ${state.dedication?`<p class="lede" style="margin-top:.2rem">على نية: ${esc(state.dedication)}</p>`:""}
    <p class="joining">بإشراف ${esc(org?org.name:"—")} · ${isPublic
      ?'<span class="access-badge public">ختمة عامة</span>'
      :`رمز الختمة <b>${esc(code)}</b>`}</p>
    ${rule()}
    <div class="frame card">
    ${asks?`
      <div class="field-row"><label for="f-code">رمز المنظّم</label>
        <input id="f-code" class="field" type="password" autocomplete="off" placeholder="الرمز الذي اخترته">
        <p class="hint">اسم «${esc(gateName)}» هو منظّم الختمة، ورمزه يضمن أن يبقى منظّمًا واحدًا.</p></div>
      <button class="btn gold wide" id="btn-code">تأكيد</button>
      <button class="btn quiet wide" id="btn-back" style="margin-top:.5rem">رجوع</button>`
    :`
      <div class="field-row"><input id="f-name" class="field" placeholder="أدخل اسمك لو سمحت" autocomplete="name"></div>
      <button class="btn gold wide" id="btn-login">دخول</button>
      <p class="hint">اسمك هو هويتك هنا. ادخل بالاسم نفسه في كل مرة لتجد أجزاءك.</p>`}
    </div>
    ${asks?"":`<p class="hint" style="margin-top:1.1rem">
      أتريد ختمة أخرى؟
      <button class="btn quiet sm" data-home>الصفحة الرئيسية</button></p>`}
  </div>`;
}

function viewMain(){
  const done=state.juz.filter(j=>j.status==="done").length;
  const taken=state.juz.filter(j=>j.status!=="free").length;
  const dl=daysLeft(state.endDate);
  const me=memberOf(viewer.id)||{};

  const cells=state.juz.map((j,i)=>{
    const cls=j.status==="done"?"done":j.status==="taken"?"taken":"";
    const mine=j.ownerId===viewer.id?" mine":"";
    const o=j.ownerId?memberOf(j.ownerId):null;
    return `<button class="cell ${cls}${mine}" data-i="${i}" style="animation-delay:${i*14}ms" aria-label="الجزء ${i+1}">
      <span class="num">${ar(i+1)}</span>
      <span class="range">${JUZ[i]}</span>
      <span class="who">${o?esc(o.name):(j.status==="done"?"مقروء":"متاح")}</span></button>`;
  }).join("");

  const sortedMembers=[...(state.members||[])].sort((a,b)=>
    norm(a.name).localeCompare(norm(b.name),"ar",{sensitivity:"base"}));
  const roster=sortedMembers.map(m=>{
    const n=state.juz.filter(j=>j.ownerId===m.id).length;
    const d=state.juz.filter(j=>j.ownerId===m.id&&j.status==="done").length;
    return `<div class="roster-row">
      <span class="avatar">${esc(norm(m.name).charAt(0)||"؟")}</span>
      <span class="rwho">
        <span class="rname">${esc(m.name)}</span>
        ${m.id===state.organizerId?'<span class="tag">المنظّم</span>':""}
      </span>
      <span class="rtag">
        ${m.linked?'<span class="tag j">التذكير مفعّل</span>':(!m.linked&&m.exempt?'<span class="tag ex">بلا تذكير</span>':"")}
      </span>
      <span class="n">${n?`${ar(d)} / ${ar(n)}`:"—"}</span>
      ${isOrganizer()
        ? (m.id!==viewer.id
            ? `<button class="btn quiet sm dots" data-member="${esc(m.id)}" aria-label="خيارات">⋯</button>`
            : `<span class="dots-gap" aria-hidden="true"></span>`)
        : ""}
    </div>`;
  }).join("");
  return `<div class="khatma-shell">
  <div class="userbar" id="main-userbar">
    <span class="avatar">${esc(norm(viewer.name).charAt(0)||"؟")}</span>
    <span class="user-name">${esc(viewer.name)}</span>
    ${isOrganizer()?'<span class="tag">المنظّم</span>':""}
    ${me.linked?'<span class="tag j">التذكير مفعّل</span>':""}
    <span class="spacer"></span>
    <button class="btn quiet sm" id="btn-mine">ختماتي</button>
    <button class="btn quiet sm" id="btn-history">سجلي</button>
    <button class="btn quiet sm" id="btn-link">${me.linked?"أعد تفعيل التذكير":"فعّل التذكير"}</button>
    <button class="btn quiet sm" id="btn-logout">خروج</button>
  </div>

  <div class="frame hero">
    <div class="hero-intro">
      <div class="display">${esc(state.title)}</div>
      ${state.dedication?`<div class="dedication">على نية: ${esc(state.dedication)}</div>`:""}
    </div>
    <div class="orbs">
      <div class="shamsa-col">
        ${shamsa()}
        <div class="shamsa-meta"><em>محجوز</em><b>${ar(taken)} من ٣٠</b></div>
      </div>
      ${zOrb()}
    </div>
  </div>
  ${ptLine()}

  ${me.linked?"":viewLinkCall()}
  ${done===30?viewKhatm():dl===0?viewOverdue():""}

  <div class="main-layout">
    <section class="juz-panel">
      <div class="sec-head"><h2 class="sec">الأجزاء الثلاثون</h2>
        <div class="legend"><b class="lg-free">متاح</b><b class="lg-take">محجوز</b><b class="lg-done">تمّت قراءته</b></div>
      </div>
      <div class="grid">${cells}</div>
    </section>

    <aside class="people-panel">
      <div class="sec-head"><h2 class="sec">المشاركون</h2>
        <span style="color:var(--muted);font-size:.78rem">${ar((state.members||[]).length)}</span></div>
      <div class="frame roster-list">${roster}</div>
    </aside>
  </div>

  <div class="toolbar">
    <button class="btn quiet" data-home>الصفحة الرئيسية</button>
    <button class="btn" id="btn-share">نسخ رابط الدعوة</button>
    <span class="codechip">رمز الختمة <b>${esc(code)}</b></span>
    ${isOrganizer()?`<button class="btn quiet" id="btn-broadcast">رسالة للمجموعة</button>`:""}
    ${isOrganizer()?`<button class="btn quiet" id="btn-settings">إعدادات الختمة</button>`:""}
    ${isOrganizer()?`<button class="btn danger" id="btn-reset">إلغاء الختمة</button>`:""}
    ${isOrganizer()?"":`<button class="btn danger spacer" id="btn-leave">مغادرة الختمة</button>`}
  </div>
  ${state.accessType==="public"
    ? (me.linked?`<p class="hint">موعد تذكيرك اليومي: ${fmtTime(me.reminderHour??state.reminderHour,me.reminderMinute??0)}.</p>`:"")
    : `<p class="hint">يصل التذكير يوميًا في ${fmtTime(state.reminderHour,state.reminderMinute??0)} إلى كل من فعّل التذكير وحجز جزءًا ولم يُتمّه.</p>`}
  </div>`;
}

function viewLinkCall(){
  return `<div class="frame linkcall">
    <div class="lc-text">
      <h3>فعّل التذكير في تلغرام ${TG_ICON}</h3>
      <p>يصلك جزؤك ووردك اليومي برسالة تذكيرية لطيفة في وقتها كل يوم، إن شاء الله.</p>
    </div>
    <button class="btn green lc-btn" id="btn-link-big">فعّل الآن</button>
  </div>`;
}

function viewOverdue(){
  const left=state.juz.filter(j=>j.status!=="done").length;
  return `<div class="frame overdue">
    <h2>انقضى الموعد</h2>
    <p>بقي ${ar(left)} ${left===1?"جزء لم يُقرأ":"أجزاء لم تُقرأ"}. لا يُلغى شيء، والتذكير يستمر أسبوعًا بعد الموعد.</p>
    ${isOrganizer()
      ?`<button class="btn gold" id="btn-extend">مدّد الموعد</button>
        <p class="hint">أو ابدأ ختمة جديدة من الإعدادات.</p>`
      :`<p class="hint">باب الخير مفتوح، فأتمّ جزءك متى تيسّر.</p>`}
  </div>`;
}

function viewKhatm(){
  return `<div class="frame khatm">
    <h2>تمّت الختمة</h2>
    <p>اللهم ارحمنا بالقرآن، واجعله لنا إمامًا ونورًا وهدًى ورحمة.</p>
    ${isOrganizer()
      ?`<button class="btn gold" id="btn-next">ابدأ ختمة جديدة</button>
        <p class="hint">يبقى المشاركون كما هم، وتُفتح الأجزاء الثلاثون من جديد.</p>`
      :`<p class="hint">ينتظر المشاركون أن يفتح المنظّم ختمة جديدة.</p>`}
  </div>`;
}
