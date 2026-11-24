/* ===================== أدوات التنسيق =====================
   دوال نقية: الأرقام العربية، والتهريب، وتطبيع الأسماء، والتواريخ والأوقات. */
export const AR="٠١٢٣٤٥٦٧٨٩";
export const ar=n=>String(n).replace(/\d/g,d=>AR[+d]);
export const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
export const norm=s=>String(s||"").normalize("NFC").trim().replace(/\s+/g," ");
/* تطبيع الحروف مع إبقاء المسافات، ليمكن تفكيك الاسم إلى كلمات.
   المدى \u064B-\u0652 للتشكيل وحده ولا يمسّ الحروف. */
export const araNorm=s=>norm(s)
  .replace(/[\u064B-\u0652\u0670\u0640]/g,"")   /* تشكيل وتطويل */
  .replace(/[أإآٱ]/g,"ا")                        /* الهمزات على الألف */
  .replace(/ؤ/g,"و").replace(/ئ/g,"ي")           /* تُبدَّل لا تُحذف، فلا يقصر الاسم */
  .replace(/ء/g,"")
  .replace(/ى/g,"ي").replace(/ة/g,"ه")
  .toLowerCase();

/* مفتاح الهوية: بلا مسافات */
export const keyOf=s=>araNorm(s).replace(/\s+/g,"");
export const MONTHS=["كانون الثاني","شباط","آذار","نيسان","أيار","حزيران","تموز","آب","أيلول","تشرين الأول","تشرين الثاني","كانون الأول"];
export const daysLeft=e=>Math.max(0,Math.ceil((new Date(e+"T23:59:59")-new Date())/864e5));
export const isoParts=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export const todayISO=()=>isoParts(new Date());
export const plusDays=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return isoParts(d);};
export const fmtG=iso=>{const d=new Date(iso+"T12:00:00");return `${ar(d.getDate())} ${MONTHS[d.getMonth()]}`;};
/* withPeriod=false يحذف «صباحًا/ظهرًا/…» حيث يغني عنها اسم الصلاة. */
export const fmtTime=(h,m,withPeriod=true)=>{
  const per = h<12 ? "صباحًا" : h<15 ? "ظهرًا" : h<17 ? "عصرًا" : "مساءً";
  const h12 = h%12===0 ? 12 : h%12;
  const clock=`${ar(h12)}:${ar(String(m).padStart(2,"0"))}`;
  return withPeriod ? `${clock} ${per}` : clock;
};
export const hourOptions=sel=>Array.from({length:24},(_,h)=>
  `<option value="${h}" ${h===sel?"selected":""}>${fmtTime(h,0)}</option>`).join("");
export const fmtH=iso=>{try{return new Date(iso+"T12:00:00")
  .toLocaleDateString("ar-SA-u-ca-islamic-umalqura",{day:"numeric",month:"long"});}catch(e){return "";}};

/* ═══════════ موعد الختمة والوقت المتبقّي ═══════════ */
export const WEEKDAYS=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
export const fmtClockG=iso=>{const d=new Date(iso+"T12:00:00");return `${WEEKDAYS[d.getDay()]} ${ar(d.getDate())} ${MONTHS[d.getMonth()]} ${ar(d.getFullYear())}`;};
export const fmtClockH=iso=>{try{return new Date(iso+"T12:00:00")
  .toLocaleDateString("ar-SA-u-ca-islamic-umalqura",{day:"numeric",month:"long",year:"numeric"});}catch(e){return "";}};

/* عدد الأيام بصيغته العربية */
export const dayWord=n=>n===1?"يوم":n===2?"يومان":n<=10?`${ar(n)} أيام`:`${ar(n)} يومًا`;
