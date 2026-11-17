/* ---------- المصحف المرسوم مسبقًا (DigitalKhatt) ----------
   يبني scripts/build-mushaf.mjs
   صفحات data/mushaf/: لكل حرف رقم شكله وموضعه بوحدات الخط، ولكل كلمة آيتها. فلا يرسم
   المتصفح خطًّا، بل يضع أشكالًا جاهزة، والصفحة واحدة على كل جهاز.

   العقد مع بقية القارئ كما كان مع QCF4: سطر .line فيه .line-inner، وفيه .verse-segment[data-key]
   لكل جزء من آية، وحجمه بوحدة em، فتحجّمه fitPage كما تحجّم سطر QCF4 بحجم الخط.
   وتُشتق من الصفحة lines[].words[] بشكل QCF4 (verse_key وtype وtext)، فيقرؤها البحث
   والمقتطفات ونص الآية دون تغيير. */
const DK_GLYPHS_URL=MUSHAF_BASE+"glyphs.json"+MUSHAF_Q;
/* عرض السطر الكامل في QCF4 بوحدة em (مجموع أطوال حروفه 40215 من 2500)، فيأخذ السطر الجديد
   العرض نفسه وتعطيه fitPage الحجم نفسه على الشاشة. */
const DK_FULL_LINE_EM=40215/2500;
/* موضع السطر الأساسي ومجموع ارتفاع السطر بوحدة em، كما يقعان في صندوق سطر QCF4 (line-height 1.33). */
const DK_BASELINE_EM=1.0,DK_LINE_EM=1.33;
const SVG_NS="http://www.w3.org/2000/svg";
let dkGlyphsJob=null;

function dkEnsureGlyphs(){
  if(dkGlyphsJob)return dkGlyphsJob;
  dkGlyphsJob=(async()=>{
    const r=await fetch(DK_GLYPHS_URL,{cache:"force-cache"});if(!r.ok)throw new Error("mushaf glyphs");
    const glyphs=await r.json();
    const holder=document.createElementNS(SVG_NS,"svg");
    holder.setAttribute("aria-hidden","true");holder.setAttribute("class","dk-glyphs");
    const defs=document.createElementNS(SVG_NS,"defs");
    for(const [id,d] of Object.entries(glyphs)){const p=document.createElementNS(SVG_NS,"path");p.id="dkg"+id;p.setAttribute("d",d);defs.appendChild(p)}
    holder.appendChild(defs);document.body.appendChild(holder);
  })().catch(err=>{dkGlyphsJob=null;throw err});
  return dkGlyphsJob;
}

/* صفحة data/mushaf بالشكل الذي يقرؤه القارئ: lines[].words[] كما في QCF4، والسطر المرسوم في dk. */
function dkAdaptPage(raw){
  const tokens=raw.tokens||[];
  const lines=raw.lines.map((l,i)=>{
    if(l.k==="s")return {line:i+1,words:[{type:"surah_header",sura:l.s}]};
    if(l.k==="b")return {line:i+1,words:[{type:"bismillah",char:""}],dk:l};
    const seen=new Set(),words=[];
    for(let j=0;j<l.e.length;j+=2){
      const t=l.e[j];if(t<0||seen.has(t))continue;seen.add(t);
      const [w,s,a,,text]=tokens[t];
      words.push({type:w<0?"end":"word",verse_key:`${s}:${a}`,text:text||""});
    }
    return {line:i+1,words,dk:l};
  });
  return {page:raw.page,surahs:raw.surahs,lines,dk:raw};
}

/* المقاس بالـem على غلاف span لا على svg نفسه: Safari لا يعيد حساب em في svg حين يتغيّر
   حجم الخط بعد الرسم (تدوير الشاشة)، فيبقى السطر بمقاسه القديم. svg يملأ غلافه فقط.
   الغلاف في svg.dkBox، وهو ما يُضاف إلى الصفحة. */
function dkSvg(x0,x1,base,height,widthEm,heightEm){
  const svg=document.createElementNS(SVG_NS,"svg"),box=document.createElement("span");
  svg.setAttribute("viewBox",`${x0} ${-base} ${x1-x0} ${height}`);
  svg.setAttribute("preserveAspectRatio","none");
  svg.setAttribute("aria-hidden","true");
  box.className="dk-box";box.style.width=widthEm+"em";box.style.height=heightEm+"em";
  svg.classList.add("dk-svg");box.appendChild(svg);svg.dkBox=box;
  return svg;
}
function dkUses(svg,l,tokens,from,to){
  const g=document.createElementNS(SVG_NS,"g");g.setAttribute("transform","scale(1,-1)");
  for(let i=0;i<l.t.length;i++){
    const t=l.t[i];if(t<from||t>to)continue;
    const u=document.createElementNS(SVG_NS,"use");
    u.setAttribute("href","#dkg"+l.g[i*3]);u.setAttribute("x",l.g[i*3+1]);u.setAttribute("y",l.g[i*3+2]);
    const tok=tokens[t],cls=[];
    if(tok){if(tok[0]<0)cls.push("dk-end");else if(tok[3])cls.push("dk-allah")}
    if(l.j&&l.j[i])cls.push("tj"+l.j[i]);
    if(cls.length)u.setAttribute("class",cls.join(" "));
    g.appendChild(u);
  }
  svg.appendChild(g);
}

/* سطر نص: يُقسَّم عند حدود الآيات، ولكل جزء span.verse-segment فيه svg بعرضه. */
function dkRenderTextLine(inner,data,l){
  const raw=data.dk,tokens=raw.tokens,unitEm=raw.scale/(raw.lineUnits/DK_FULL_LINE_EM);
  const base=DK_BASELINE_EM/unitEm,height=DK_LINE_EM/unitEm;
  // حدود الأجزاء: الحافة اليمنى لأول كلمة في كل آية، ونهاية السطر.
  const parts=[];
  for(let j=0;j<l.e.length;j+=2){
    const t=l.e[j],x=l.e[j+1],tok=tokens[t];if(!tok)continue;
    const key=`${tok[1]}:${tok[2]}`,last=parts[parts.length-1];
    if(last&&last.key===key){last.to=t;continue}
    parts.push({key,from:t,to:t,right:x});
  }
  parts.forEach((p,i)=>{
    const left=i+1<parts.length?parts[i+1].right:-l.n;
    const seg=document.createElement("span");seg.className="verse-segment";seg.dataset.key=p.key;
    const svg=dkSvg(left,p.right,base,height,(p.right-left)*unitEm*l.x,DK_LINE_EM);
    dkUses(svg,l,tokens,p.from,p.to);
    // خط السجدة فوق كلماتها، كما في المصحف المطبوع.
    if(l.sj){
      const x0=Math.max(left,l.sj[1]),x1=Math.min(p.right,l.sj[0]);
      if(x1>x0){const r=document.createElementNS(SVG_NS,"rect");r.setAttribute("class","dk-sajda");r.setAttribute("x",x0);r.setAttribute("y",-1260);r.setAttribute("width",x1-x0);r.setAttribute("height",60);svg.appendChild(r)}
    }
    seg.appendChild(svg.dkBox);inner.appendChild(seg);bindSegment(seg);
  });
}
function dkRenderBismillah(inner,data,l){
  const raw=data.dk,unitEm=raw.scale/(raw.lineUnits/DK_FULL_LINE_EM);
  const svg=dkSvg(-l.n,0,DK_BASELINE_EM/unitEm,DK_LINE_EM/unitEm,l.n*unitEm,DK_LINE_EM);
  dkUses(svg,{...l,t:l.t.map(()=>-1)},[],-1,-1);
  inner.appendChild(svg.dkBox);
}

/* ---------- ألوان التجويد ----------
   حكم كل حرف محسوب عند البناء (محرك DigitalKhatt على «التجويد الميسر» للحذيفي)، ومحفوظ في الصفحة.
   الإظهار صنف على <html> فقط: لا إعادة رسم ولا تحميل. الألوان ألوان مصاحف التجويد المعروفة
   بدرجات تناسب ورق زاد الخير ووضعه الليلي (styles.css). */
const TAJWEED_KEY="zad:mushaf-tajweed";
/* شريط الأحكام: يظهر مع أدوات القراءة (عند النقر على الصفحة) ما دامت الألوان ظاهرة. */
const TAJWEED_LEGEND=[
  ["tj8","مدّ لازم ٦"],["tj7","مدّ واجب ٤–٥"],["tj6","مدّ جائز ٢–٦"],["tj5","مدّ طبيعي ٢"],
  ["tj1","غنّة"],["tj4","قلقلة"],["tj2","تفخيم"],["tj3","لا يُلفظ"]
];
function setTajweed(on,announce=false){
  document.documentElement.dataset.tajweed=on?"on":"off";
  storageSet(TAJWEED_KEY,on?"1":"0");
  const btn=document.getElementById("tajweedBtn");
  if(btn){btn.setAttribute("aria-pressed",String(on));btn.classList.toggle("active",on)}
  if(announce)showToast(on?"تم تفعيل وضع التجويد":"تم إيقاف وضع التجويد");
}
{
  const btn=document.getElementById("tajweedBtn");
  const strip=document.getElementById("tajweedStrip");
  if(strip)strip.innerHTML=TAJWEED_LEGEND.map(([c,name])=>`<span><i class="tj-swatch ${c}"></i>${name}</span>`).join("");
  if(btn){btn.hidden=false;btn.onclick=()=>setTajweed(document.documentElement.dataset.tajweed!=="on",true)}
  setTajweed(storageGet(TAJWEED_KEY,"0")==="1");
}

/* ---------- عنوان السورة: البديل ----------
   العنوان عنوان QUL نفسه كما في QCF4 (mushaf.js). وحين لا يتوفر خطه (دون اتصال قبل حفظه)
   يُكتب «سورة كذا» بخط المصحف (titles.json)، فلا يبقى سطر العنوان فارغًا. */
const DK_TITLES_URL=MUSHAF_BASE+"titles.json"+MUSHAF_Q;
let dkTitlesJob=null,dkTitles=null;
function dkEnsureTitles(){
  if(dkTitles)return Promise.resolve(dkTitles);
  dkTitlesJob??=fetch(DK_TITLES_URL,{cache:"force-cache"}).then(r=>{if(!r.ok)throw new Error("mushaf titles");return r.json()}).then(t=>dkTitles=t).catch(e=>{dkTitlesJob=null;throw e});
  return dkTitlesJob;
}
function dkRenderSurahTitle(inner,sid){
  const t=dkTitles?.[sid-1];if(!t)return false;
  const unitEm=DK_FULL_LINE_EM/17600,H=1600;
  const svg=dkSvg(-t.n,0,1150,H,t.n*unitEm,H*unitEm);svg.classList.add("dk-title");
  const g=document.createElementNS(SVG_NS,"g");g.setAttribute("transform","scale(1,-1)");
  for(let i=0;i<t.g.length;i+=3){const u=document.createElementNS(SVG_NS,"use");u.setAttribute("href","#dkg"+t.g[i]);u.setAttribute("x",t.g[i+1]);u.setAttribute("y",t.g[i+2]);g.appendChild(u)}
  svg.appendChild(g);inner.appendChild(svg.dkBox);
  return true;
}
