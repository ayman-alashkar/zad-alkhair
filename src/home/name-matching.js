/* ═══════════ مطابقة الأسماء ═══════════
   المنهج المعتمد لأسماء الأشخاص: Jaro-Winkler لا مسافة التحرير،
   لأنها تكافئ تطابق أوائل الحروف وتتسامح مع تبادل موضعين،
   وأكثر اختلاف الأسماء العربية يقع في آخرها (ة/ا، ى/ي).
   ويُضاف إليها تفكيك الاسم إلى كلمات، لأن الكنية تُزاد وتُنقص. */

function jaro(a,b){
  if(a===b) return 1;
  const la=a.length, lb=b.length;
  if(!la||!lb) return 0;
  const win=Math.max(0,Math.floor(Math.max(la,lb)/2)-1);
  const ma=new Array(la).fill(false), mb=new Array(lb).fill(false);
  let m=0;
  for(let i=0;i<la;i++){
    const lo=Math.max(0,i-win), hi=Math.min(i+win+1,lb);
    for(let j=lo;j<hi;j++){
      if(mb[j]||a[i]!==b[j]) continue;
      ma[i]=mb[j]=true; m++; break;
    }
  }
  if(!m) return 0;
  let t=0, k=0;
  for(let i=0;i<la;i++){
    if(!ma[i]) continue;
    while(!mb[k]) k++;
    if(a[i]!==b[k]) t++;
    k++;
  }
  t/=2;
  return (m/la + m/lb + (m-t)/m)/3;
}

/* مكافأة البادئة، بحدّ أربعة أحرف كما في الصيغة المعتمدة */
function jw(a,b){
  const j=jaro(a,b);
  if(j<0.7) return j;
  let p=0;
  while(p<4 && p<a.length && p<b.length && a[p]===b[p]) p++;
  return j + p*0.1*(1-j);
}

/* كلمات لا تميّز صاحبها، فلا يُبنى عليها تشابه */
const KUNYA=new Set(["ام","ابو","ابن","بنت","بن","ابي","عبد","ال","الحاج","الحاجه","الشيخ","دكتور"]);

const tokensOf=s=>araNorm(s).split(/\s+/).filter(t=>t.length>=2);
const coreTokens=s=>tokensOf(s).filter(t=>!KUNYA.has(t));

/* درجة التشابه بين اسمين: صفر إلى واحد */
function nameScore(a,b){
  const ka=keyOf(a), kb=keyOf(b);
  if(ka===kb) return 1;

  /* كلمة مميّزة مشتركة: «محمد» و«أم محمد»، «رضوان» و«رضوان أحمد» */
  const ta=coreTokens(a), tb=coreTokens(b);
  for(const x of ta) for(const y of tb)
    if(x.length>=3 && x===y) return 0.95;

  /* وإلا فمقارنة الاسم كاملًا، ثم أقرب كلمتين فيه */
  let best=jw(ka,kb);
  for(const x of ta) for(const y of tb)
    if(x.length>=3&&y.length>=3) best=Math.max(best, jw(x,y)*0.96);
  return best;
}

/* العتبة: العتبات الشائعة بين ٠٫٨٠ و٠٫٩٠، واخترنا ٠٫٨٧
   لأن الاقتراح يُعرض ولا يُفرض، فالتساهل اليسير أهون من التفويت */
const NEAR=0.87;

function similarTo(typed,members){
  return (members||[])
    .map(m=>({m,s:nameScore(typed,m.name)}))
    .filter(x=>x.s>=NEAR && x.m.id!==keyOf(typed))
    .sort((x,y)=>y.s-x.s)
    .slice(0,3)
    .map(x=>x.m);
}

let justCreated=false;
let publicKhatmahs=[],publicKhatmahsLoaded=false,publicKhatmahsLoading=false,publicKhatmahsError=false;
let code="", state=null, viewer=null, selected=null, gateName="",
    screen="boot";   /* boot | home | create | share | gate | main | notfound */

const hashCode=()=>(location.hash||"").replace(/^#/,"").trim().toUpperCase().slice(0,4);
