const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const site="https://zad-alkhair.net";
const esc=value=>String(value).replace(/[&<>\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
const json=value=>JSON.stringify(value).replace(/</g,"\\u003c");

const reciters=[
  {slug:"ayman-suwaid",id:"Ayman_Sowaid_64kbps",name:"أيمن سويد",display:"الشيخ أيمن سويد"},
  {slug:"abdul-rashid-sufi",id:"AbdulRashidSufi_Hafs",name:"عبد الرشيد الصوفي",display:"الشيخ عبد الرشيد الصوفي"},
  {slug:"maher-al-muaiqly",id:"MaherAlMuaiqly128kbps",name:"ماهر المعيقلي",display:"الشيخ ماهر المعيقلي"},
  {slug:"mohamed-siddiq-al-minshawi",id:"Minshawy_Murattal_128kbps",name:"محمد صديق المنشاوي",display:"الشيخ محمد صديق المنشاوي",extra:"مرتل ومجود"},
  {slug:"mahmoud-khalil-al-husary",id:"Husary_128kbps",name:"محمود خليل الحصري",display:"الشيخ محمود خليل الحصري"}
];

function readSurahs(){
  return Array.from({length:114},(_,i)=>{
    const n=i+1,file=path.join(root,"surah",String(n),"index.html"),src=fs.readFileSync(file,"utf8");
    const name=(src.match(/<title>سورة ([^|<]+?)\s*\|/)||src.match(/<h1>سورة ([^—|<]+?)(?:\s|<)/)||[])[1];
    const verses=(src.match(/name="zk:verses" content="(\d+)"/)||src.match(/rawAyah[\s\S]{0,160}?<=\s*(\d+)/)||[])[1];
    if(!name||!verses)throw new Error(`تعذّر استخراج بيانات السورة ${n}`);
    return {n,name:name.trim().replace(/\s+مكتوبة[\s\S]*$/,"").trim(),verses:Number(verses)};
  });
}
function readJuz(){
  return Array.from({length:30},(_,i)=>{
    const n=i+1,file=path.join(root,"juz",String(n),"index.html"),src=fs.readFileSync(file,"utf8");
    const title=(src.match(/<title>(الجزء [^|<]+?)\s*\|/)||[])[1];
    const desc=(src.match(/<meta name="description" content="([^"]+)"/)||[])[1];
    if(!title||!desc)throw new Error(`تعذّر استخراج بيانات الجزء ${n}`);
    return {
      n,
      title:title.trim().replace(/\s+من القرآن[\s\S]*$/,"").trim(),
      desc:desc.replace(/، مع التفسير الوجيز[\s\S]*$/,"").replace(/\.$/,"")+"."
    };
  });
}
function head({title,description,canonical,image="/zad-alkhair-share.png",type="website",jsonLd,extra=""}){
  const url=`${site}${canonical}`,imageUrl=`${site}${image}`;
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0F5C50">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="${url}">
<link rel="icon" href="/icons/zad-mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="/seo-pages.css">
<meta property="og:type" content="${type}">
<meta property="og:locale" content="ar_AR">
<meta property="og:site_name" content="زاد الخير">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${imageUrl}">
${extra}${jsonLd?`<script type="application/ld+json">${json(jsonLd)}</script>\n`:""}</head>`;
}
const siteHead=`<header class="site-head"><a href="/" aria-label="الصفحة الرئيسية لزاد الخير"><img class="mark" src="/icons/zad-mark-reverse.svg" alt="شعار زاد الخير"></a><div class="brand">زاد الخير</div><div class="motto">كلامُ الباري يجمعُنا</div></header>`;
const footer=`<footer><nav class="footer-links" aria-label="روابط زاد الخير"><a href="/">الرئيسية</a><a href="/quran/">القرآن العظيم</a><a href="/khatmahs/">الختمات الجماعية</a><a href="/install/">تثبيت التطبيق</a><a href="/about/">عن زاد الخير</a></nav></footer>`;
function crumbs(items){return `<nav class="breadcrumbs" aria-label="مسار الصفحة">${items.map((x,i)=>i===items.length-1?`<b>${esc(x[0])}</b>`:`<a href="${x[1]}">${esc(x[0])}</a><span>‹</span>`).join("")}</nav>`}

function surahPage(s){
  const title=`سورة ${s.name} مكتوبة — قراءة واستماع | زاد الخير`;
  const description=`سورة ${s.name} مكتوبة للقراءة والاستماع بصوت أيمن سويد، عبد الرشيد الصوفي، ماهر المعيقلي، محمد صديق المنشاوي ومحمود خليل الحصري، مع التفسير الوجيز.`;
  const canonical=`/surah/${s.n}/`,image=`/social/surah/surah-${String(s.n).padStart(3,"0")}.jpg`;
  const graph={"@context":"https://schema.org","@graph":[{"@type":"WebPage","@id":`${site}${canonical}#webpage`,name:title,url:`${site}${canonical}`,description,inLanguage:"ar",isPartOf:{"@id":`${site}/#website`}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"زاد الخير",item:`${site}/`},{"@type":"ListItem",position:2,name:"القرآن العظيم",item:`${site}/quran/`},{"@type":"ListItem",position:3,name:`سورة ${s.name}`,item:`${site}${canonical}`}]}]};
  const listeners=reciters.map(r=>`<a class="listen" href="/reader.html?surah=${s.n}&amp;ayah=1&amp;qari=${encodeURIComponent(r.id)}&amp;play=1">الاستماع إلى سورة ${esc(s.name)} بصوت ${esc(r.display)}${r.extra?` — ${esc(r.extra)}`:""}</a>`).join("\n");
  return `${head({title,description,canonical,image,jsonLd:graph,extra:`<meta name="zk:verses" content="${s.verses}">\n`})}<body>${siteHead}${crumbs([["زاد الخير","/"],["القرآن العظيم","/quran/"],[`سورة ${s.name}`]])}<main><div class="eyebrow">سورة رقم ${s.n} · ${s.verses} آية</div><h1>سورة ${esc(s.name)} مكتوبة — قراءة واستماع</h1><p class="lead">اقرأ سورة ${esc(s.name)} من المصحف، واستمع إليها بصوت نخبة من القراء، وارجع إلى التفسير الوجيز للدكتور وهبة الزحيلي أثناء القراءة.</p><div class="actions"><a class="btn primary" id="openReader" href="/reader.html?surah=${s.n}&amp;ayah=1">قراءة سورة ${esc(s.name)}</a><a class="btn secondary" href="/quran/">فهرس القرآن العظيم</a></div><h2>سورة ${esc(s.name)} بصوت القراء</h2><p>اختر القارئ لفتح سورة ${esc(s.name)} في قارئ زاد الخير وتجهيز مشغّل التلاوة بصوته:</p><div class="listen-list">${listeners}</div><h2>القراءة والتفسير دون اتصال</h2><p>يمكن تجهيز المصحف والتفسير للاستخدام دون اتصال، كما يمكن تنزيل تلاوة السورة بصوت القارئ الذي تختاره للاستماع إليها لاحقًا.</p></main>${footer}<script>(()=>{const p=new URLSearchParams(location.search);if(!["code","ayah","qari","open"].some(k=>p.has(k)))return;const u=new URL("/reader.html",location.href);u.searchParams.set("surah","${s.n}");const a=Number(p.get("ayah"));u.searchParams.set("ayah",Number.isInteger(a)&&a>=1&&a<=${s.verses}?String(a):"1");for(const k of ["code","qari","play"])if(p.get(k))u.searchParams.set(k,p.get(k));location.replace(u.href)})()</script></body></html>`;
}
function juzPage(j){
  const title=`${j.title} من القرآن — قراءة واستماع | زاد الخير`,canonical=`/juz/${j.n}/`,image=`/social/juz/juz-${String(j.n).padStart(2,"0")}.jpg`;
  const description=j.desc.replace(/\.$/,"")+"، مع التفسير الوجيز والاستماع إلى تلاوات القراء.";
  const graph={"@context":"https://schema.org","@graph":[{"@type":"WebPage",name:title,url:`${site}${canonical}`,description,inLanguage:"ar",isPartOf:{"@id":`${site}/#website`}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"زاد الخير",item:`${site}/`},{"@type":"ListItem",position:2,name:"القرآن العظيم",item:`${site}/quran/`},{"@type":"ListItem",position:3,name:j.title,item:`${site}${canonical}`}]}]};
  return `${head({title,description,canonical,image,jsonLd:graph})}<body>${siteHead}${crumbs([["زاد الخير","/"],["القرآن العظيم","/quran/"],[j.title]])}<main><div class="eyebrow">الجزء رقم ${j.n} من 30</div><h1>${esc(j.title)} من القرآن العظيم</h1><p class="lead">${esc(j.desc)}</p><p>اقرأ الجزء في مصحف زاد الخير، واستعن بالتفسير الوجيز للدكتور وهبة الزحيلي، أو استمع إلى التلاوة بصوت القارئ الذي تختاره.</p><div class="actions"><a class="btn primary" id="openReader" href="/reader.html?juz=${j.n}">قراءة ${esc(j.title)}</a><a class="btn secondary" href="/quran/#ajzaa">فهرس الأجزاء</a></div><h2>القراءة والاستماع دون اتصال</h2><p>يتيح زاد الخير تجهيز القرآن والتفسير للاستخدام دون إنترنت، وتنزيل تلاوات السور المطلوبة بصورة منفصلة.</p></main>${footer}<script>(()=>{const p=new URLSearchParams(location.search);if(!["code","open"].some(k=>p.has(k)))return;const u=new URL("/reader.html",location.href);u.searchParams.set("juz","${j.n}");if(p.get("code"))u.searchParams.set("code",p.get("code"));location.replace(u.href)})()</script></body></html>`;
}
function quranPage(surahs,juz){
  const title="القرآن العظيم | قراءة، تفسير واستماع | زاد الخير",canonical="/quran/";
  const description="اقرأ القرآن العظيم مع التفسير الوجيز للدكتور وهبة الزحيلي، واستمع إلى تلاوات أيمن سويد وعبد الرشيد الصوفي وماهر المعيقلي والمنشاوي والحصري.";
  const schema={"@context":"https://schema.org","@type":"CollectionPage",name:"القرآن العظيم في زاد الخير",url:`${site}${canonical}`,description,inLanguage:"ar",isPartOf:{"@id":`${site}/#website`}};
  const reciterCards=reciters.map(r=>`<a class="card link" href="/quran/reciters/${r.slug}/"><strong>${esc(r.display)}</strong><p>استماع وقراءة سور القرآن${r.extra?` — ${esc(r.extra)}`:""}</p></a>`).join("");
  const surahLinks=surahs.map(s=>`<a class="item" href="/surah/${s.n}/">سورة ${esc(s.name)}<small>${s.verses} آية</small></a>`).join("");
  const juzLinks=juz.map(j=>`<a class="item" href="/juz/${j.n}/">${esc(j.title)}</a>`).join("");
  return `${head({title,description,canonical,image:"/zad-alkhair-share.png",jsonLd:schema})}<body>${siteHead}${crumbs([["زاد الخير","/"],["القرآن العظيم"]])}<main><h1>القرآن العظيم في زاد الخير</h1><p class="lead">اقرأ القرآن العظيم في مصحف صُمّم للعناية بصفحة القراءة، مع التفسير الوجيز للدكتور وهبة الزحيلي والاستماع إلى تلاوات نخبة من القراء.</p><div class="actions"><a class="btn primary" href="/reader.html?home=1&amp;from=zad">فتح قارئ القرآن</a><a class="btn secondary" href="/install/">تثبيت زاد الخير</a></div><h2>الاستماع إلى القرآن بصوت القراء</h2><div class="reciter-grid">${reciterCards}</div><h2 id="surahs">سور القرآن الكريم</h2><p>اختر السورة لقراءتها، والاستماع إليها، والرجوع إلى تفسير آياتها.</p><nav class="link-grid" aria-label="فهرس سور القرآن">${surahLinks}</nav><h2 id="ajzaa">أجزاء القرآن الكريم</h2><nav class="link-grid" aria-label="فهرس أجزاء القرآن">${juzLinks}</nav><h2>القراءة والاستماع دون اتصال</h2><p>يمكن تجهيز القرآن والتفسير كاملين للعمل دون اتصال، ثم تنزيل التلاوات التي تختارها سورةً سورةً للاستماع إليها لاحقًا.</p></main>${footer}</body></html>`;
}
function reciterPage(r,surahs){
  const title=`القرآن بصوت ${r.display} — استماع وقراءة | زاد الخير`,canonical=`/quran/reciters/${r.slug}/`;
  const description=`استمع إلى سور القرآن الكريم بصوت ${r.display}${r.extra?` ${r.extra}`:""}، واقرأ الآيات من المصحف مع التفسير الوجيز عبر زاد الخير.`;
  const schema={"@context":"https://schema.org","@type":"CollectionPage",name:`القرآن بصوت ${r.display}`,url:`${site}${canonical}`,description,inLanguage:"ar",isPartOf:{"@id":`${site}/#website`}};
  const links=surahs.map(s=>`<a class="item" href="/reader.html?surah=${s.n}&amp;ayah=1&amp;qari=${encodeURIComponent(r.id)}&amp;play=1">سورة ${esc(s.name)}<small>بصوت ${esc(r.name)}</small></a>`).join("");
  return `${head({title,description,canonical,image:"/zad-alkhair-share.png",jsonLd:schema})}<body>${siteHead}${crumbs([["زاد الخير","/"],["القرآن العظيم","/quran/"],[r.display]])}<main><div class="eyebrow">تلاوات القرآن الكريم</div><h1>القرآن بصوت ${esc(r.display)}</h1><p class="lead">استمع إلى تلاوة سور القرآن بصوت ${esc(r.display)}${r.extra?` — ${esc(r.extra)}`:""}، واقرأ الآيات من مصحف زاد الخير مع التفسير الوجيز للدكتور وهبة الزحيلي.</p><p class="note">اختر سورة من القائمة. سيفتح القارئ على بدايتها ويختار صوت ${esc(r.name)} تلقائيًا.</p><nav class="link-grid" aria-label="سور القرآن بصوت ${esc(r.name)}">${links}</nav><div class="actions"><a class="btn secondary" href="/quran/">العودة إلى فهرس القرآن</a></div></main>${footer}</body></html>`;
}

const surahs=readSurahs(),juz=readJuz();
for(const s of surahs)fs.writeFileSync(path.join(root,"surah",String(s.n),"index.html"),surahPage(s));
for(const j of juz)fs.writeFileSync(path.join(root,"juz",String(j.n),"index.html"),juzPage(j));
fs.mkdirSync(path.join(root,"quran"),{recursive:true});
fs.writeFileSync(path.join(root,"quran","index.html"),quranPage(surahs,juz));
for(const r of reciters){const dir=path.join(root,"quran","reciters",r.slug);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"index.html"),reciterPage(r,surahs))}
const urls=["/","/quran/","/khatmahs/","/about/","/install/",...reciters.map(r=>`/quran/reciters/${r.slug}/`),...surahs.map(s=>`/surah/${s.n}/`),...juz.map(j=>`/juz/${j.n}/`)];
const today=new Date().toISOString().slice(0,10);
fs.writeFileSync(path.join(root,"sitemap.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${site}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(root,"robots.txt"),`User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
console.log(`Generated ${surahs.length} surah pages, ${juz.length} juz pages, ${reciters.length} reciter pages and ${urls.length} sitemap URLs.`);
