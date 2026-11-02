/* ===================== أدوات ===================== */
const AR="٠١٢٣٤٥٦٧٨٩";
const ar=n=>String(n).replace(/\d/g,d=>AR[+d]);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm=s=>String(s||"").normalize("NFC").trim().replace(/\s+/g," ");
/* تطبيع الحروف مع إبقاء المسافات، ليمكن تفكيك الاسم إلى كلمات.
   المدى \u064B-\u0652 للتشكيل وحده ولا يمسّ الحروف. */
const araNorm=s=>norm(s)
  .replace(/[\u064B-\u0652\u0670\u0640]/g,"")   /* تشكيل وتطويل */
  .replace(/[أإآٱ]/g,"ا")                        /* الهمزات على الألف */
  .replace(/ؤ/g,"و").replace(/ئ/g,"ي")           /* تُبدَّل لا تُحذف، فلا يقصر الاسم */
  .replace(/ء/g,"")
  .replace(/ى/g,"ي").replace(/ة/g,"ه")
  .toLowerCase();

/* مفتاح الهوية: بلا مسافات */
const keyOf=s=>araNorm(s).replace(/\s+/g,"");
const MONTHS=["كانون الثاني","شباط","آذار","نيسان","أيار","حزيران","تموز","آب","أيلول","تشرين الأول","تشرين الثاني","كانون الأول"];
const daysLeft=e=>Math.max(0,Math.ceil((new Date(e+"T23:59:59")-new Date())/864e5));
const isoParts=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayISO=()=>isoParts(new Date());
const plusDays=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return isoParts(d);};
const fmtG=iso=>{const d=new Date(iso+"T12:00:00");return `${ar(d.getDate())} ${MONTHS[d.getMonth()]}`;};
const fmtTime=(h,m)=>{
  const per = h<12 ? "صباحًا" : h<18 ? "عصرًا" : "مساءً";
  const h12 = h%12===0 ? 12 : h%12;
  return `${ar(h12)}:${ar(String(m).padStart(2,"0"))} ${per}`;
};
const hourOptions=sel=>Array.from({length:24},(_,h)=>
  `<option value="${h}" ${h===sel?"selected":""}>${fmtTime(h,0)}</option>`).join("");
const fmtH=iso=>{try{return new Date(iso+"T12:00:00")
  .toLocaleDateString("ar-SA-u-ca-islamic-umalqura",{day:"numeric",month:"long"});}catch(e){return "";}};

/* ═══════════ الساعة والعدّاد ═══════════
   قرصها من قرص الشمسة نفسه: الحلقتان الذهبيتان بمقاسيهما،
   والقلب المضيء بنصف قطره، فتقرأ العين الاثنتين أختين.
   العقرب الثاني يمضي بزاوية متزايدة أبدًا، فلا يرتدّ عند الدقيقة. */
const WEEKDAYS=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const fmtClockG=iso=>{const d=new Date(iso+"T12:00:00");return `${WEEKDAYS[d.getDay()]} ${ar(d.getDate())} ${MONTHS[d.getMonth()]} ${ar(d.getFullYear())}`;};
const fmtClockH=iso=>{try{return new Date(iso+"T12:00:00")
  .toLocaleDateString("ar-SA-u-ca-islamic-umalqura",{day:"numeric",month:"long",year:"numeric"});}catch(e){return "";}};
const ZEP=Math.floor(Date.now()/1000), ZEPS=new Date().getSeconds();
const zSecDeg=()=>((Math.floor(Date.now()/1000)-ZEP)+ZEPS)*6;

function zClock(){
  const C=160, pt=(r,d)=>{const a=(d-90)*Math.PI/180;
    return[(C+r*Math.cos(a)).toFixed(1),(C+r*Math.sin(a)).toFixed(1)];};

  let ticks="";
  for(let i=0;i<60;i++){
    const big=i%5===0, [x1,y1]=pt(big?112:120,i*6), [x2,y2]=pt(126,i*6);
    ticks+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-linecap="round"
      stroke="${big?"#C08A2B":"#DCCBA8"}" stroke-width="${big?2.4:1}"/>`;
  }
  let nums="";
  for(let i=1;i<=12;i++){
    const [x,y]=pt(96,i*30);
    nums+=`<text x="${x}" y="${(+y+7.5).toFixed(1)}" text-anchor="middle"
      font-family="Amiri,serif" font-size="21" fill="#8C5A2E">${ar(i)}</text>`;
  }
  return `<svg class="zclock" id="zclock" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="الساعة الآن">
    <circle cx="160" cy="160" r="142" fill="none" stroke="#C08A2B" stroke-opacity=".45"/>
    <circle cx="160" cy="160" r="136" fill="none" stroke="#C08A2B" stroke-opacity=".22"/>
    <circle cx="160" cy="160" r="130" fill="#FFFCF4"/>
    ${ticks}${nums}
    <circle cx="160" cy="160" r="68" fill="none" stroke="#C08A2B" stroke-opacity=".2"/>
    <g id="zh"><path d="M160 84 L165.5 104 L163 182 L157 182 L154.5 104 Z" fill="#33291B"/></g>
    <g id="zm"><path d="M160 50 L164 74 L162.2 186 L157.8 186 L156 74 Z" fill="#33291B"/></g>
    <g id="zs">
      <line x1="160" y1="192" x2="160" y2="40" stroke="#B4574E" stroke-width="1.7" stroke-linecap="round"/>
      <circle cx="160" cy="181" r="6.5" fill="none" stroke="#B4574E" stroke-width="1.7"/>
    </g>
    <circle cx="160" cy="160" r="7.5" fill="#C08A2B"/>
    <circle cx="160" cy="160" r="3.2" fill="#FFFCF4"/>
  </svg>`;
}

function zOrb(){
  return `<div class="zcol">
    <div class="cdown">
      <button class="cd-lab deadline-trigger" id="deadline-trigger" type="button"
        aria-haspopup="dialog">الوقت المتبقّي لقراءة جزءك</button>
      <div class="cd-cells">
        <span class="cd-cell"><b id="cd-d">—</b><em>يوم</em></span>
        <span class="cd-cell"><b id="cd-h">—</b><em>ساعة</em></span>
        <span class="cd-cell"><b id="cd-m">—</b><em>دقيقة</em></span>
        <span class="cd-cell"><b id="cd-s">—</b><em>ثانية</em></span>
      </div>
    </div>
    ${zClock()}
    <div class="cdate">
      <span class="cd-g" id="cd-greg"></span>
      <span class="cd-hij" id="cd-hij"></span>
    </div>
    ${ptNextLine()}
  </div>`;
}

function deadlineDialog(){
  if(!state||!state.endDate) return;
  modal(`<div class="deadline-dialog" role="dialog" aria-modal="true" aria-label="موعد انتهاء الختمة">
    <p class="deadline-copy">التاريخ المتفق عليه للانتهاء من القراءة الجماعية لهذه الختمة هو:</p>
    <div class="deadline-date-field">
      <span class="deadline-date-g">${esc(fmtClockG(state.endDate))}</span>
      <span class="deadline-date-h">${esc(fmtClockH(state.endDate))}</span>
    </div>
    <button class="btn gold" id="deadline-close">إغلاق</button>
  </div>`);
  document.getElementById("deadline-close").onclick=closeLayer;
}

let zDay="";
function zTick(){
  const face=document.getElementById("zclock");
  if(!face) return;
  const n=new Date(), s=n.getSeconds(), m=n.getMinutes(), h=n.getHours()%12;
  const turn=(id,deg)=>{const e=document.getElementById(id);
    if(e) e.setAttribute("transform",`rotate(${deg.toFixed(3)} 160 160)`);};
  turn("zh",(h+m/60)*30);
  turn("zm",(m+s/60)*6);
  turn("zs",zSecDeg());

  /* التاريخ يُعاد بناؤه عند تبدّل اليوم وحده */
  const iso=todayISO(), g=document.getElementById("cd-greg"), hj=document.getElementById("cd-hij");
  if(g&&(iso!==zDay||!g.textContent)){
    zDay=iso;
    g.textContent=fmtClockG(iso);
    if(hj) hj.textContent=fmtClockH(iso);
  }

  /* العدّاد ينبض مع العقرب الثاني، إذ ينبعان من نبضة واحدة */
  if(!state||!state.endDate) return;
  const put=(id,v)=>{const e=document.getElementById(id); if(e) e.textContent=v;};
  let left=new Date(state.endDate+"T23:59:59").getTime()-Date.now();
  const lab=document.getElementById("deadline-trigger");   /* الصنف cd-lab، والمعرّف هذا */
  if(left<=0){
    if(lab) lab.textContent="انقضى وقت الختمة";
    put("cd-d",ar(0));put("cd-h",ar(0));put("cd-m",ar(0));put("cd-s",ar(0));
    return;
  }
  if(lab&&lab.textContent!=="الوقت المتبقّي لقراءة جزءك") lab.textContent="الوقت المتبقّي لقراءة جزءك";
  const t=Math.floor(left/1000);
  const p=v=>ar(String(v).padStart(2,"0"));
  put("cd-d",ar(Math.floor(t/86400)));
  put("cd-h",p(Math.floor(t/3600)%24));
  put("cd-m",p(Math.floor(t/60)%60));
  put("cd-s",p(t%60));
}
/* حلقة تُصحّح انحرافها، فتقع كل نبضة على رأس الثانية */
function zLoop(){ zTick(); setTimeout(zLoop, 1000-(Date.now()%1000)); }
