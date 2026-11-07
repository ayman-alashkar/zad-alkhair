const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const site="https://zad-alkhair.net";
const {indexPath,supported,shareOrigin,preview,readSurahPath,listenSurahPath}=require("./quran-routes.cjs");
const esc=value=>String(value).replace(/[&<>\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
const json=value=>JSON.stringify(value).replace(/</g,"\\u003c");
const arNum=value=>String(value).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);

const {reciters,surahs,juz}=require("../src/discovery/catalog.json");
const reciterName=({display})=>display.replace(/^فضيلة الشيخ\s+/,"");
reciters.sort((a,b)=>reciterName(a).localeCompare(reciterName(b),"ar"));
const reciterDescription=reciters.map(r=>r.display).join("، و");
const check=process.argv.includes("--check");
// Guide assets are versioned by content: editing any of them changes the URL, so
// browsers and the service worker can never keep a stale copy next to new pages.
const assetVersion=require("node:crypto").createHash("sha256")
  .update(["seo-pages.css","seo-pages.js","seo-install.js"].map(f=>fs.readFileSync(path.join(root,f),"utf8")).join("\0"))
  .digest("hex").slice(0,10);
const changed=new Set();
function write(relative,content){
  const file=path.join(root,relative);
  if(fs.existsSync(file)&&fs.readFileSync(file,"utf8")===content)return;
  changed.add(relative);
  if(check)return;
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
}

function head({title,description,shareDescription=description,canonical,image="/social/zad-alkhair-share-v2.jpg",type="website",jsonLd,extra="",socialOrigin=site,noindex=false}){
  const url=`${site}${canonical}`,imageUrl=`${socialOrigin}${image}`;
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F5F0E4">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${noindex?"noindex,follow":"index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/icons/zad-mark.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.json">
<script src="/seo-pages.js?v=${assetVersion}"></script>
<link rel="stylesheet" href="/seo-pages.css?v=${assetVersion}">
<script src="/seo-install.js?v=${assetVersion}" defer></script>
<meta property="og:type" content="${type}">
<meta property="og:locale" content="ar_AR">
<meta property="og:site_name" content="زاد الخير">
<meta property="og:url" content="${socialOrigin}${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(shareDescription)}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(shareDescription)}">
<meta name="twitter:image" content="${imageUrl}">
${extra}${jsonLd?`<script type="application/ld+json">${json(jsonLd)}</script>\n`:""}</head>`;
}
const brandLink=`<a class="guide-home" href="/" aria-label="الصفحة الرئيسية لزاد الخير"><img class="mark" src="/icons/zad-mark-reverse.svg" alt=""><div><div class="brand">زاد الخير</div><div class="motto">كلامُ الباري يجمعُنا</div></div></a>`;
const themeButton=`<button class="guide-theme" id="guideTheme" type="button" aria-label="تفعيل الوضع الليلي" aria-pressed="false" hidden></button>`;
const navIcon=path=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
const installIcon=navIcon('<path d="M12 3v11m-4-4 4 4 4-4M5 17v3h14v-3"/>');
// The menu stays hidden until seo-pages.js confirms the app is not already installed.
const installMenu=`<div class="install-menu" id="installMenu" hidden><button class="guide-install" id="guideInstall" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="installPanel">${installIcon}<span>حمّل التطبيق</span></button><div class="install-panel" id="installPanel" role="dialog" aria-label="تثبيت زاد الخير" tabindex="-1" hidden><div class="ip-head"><strong>أضف زاد الخير إلى جهازك</strong><button class="ip-close" type="button" aria-label="إغلاق">${navIcon('<path d="M6 6l12 12M18 6 6 18"/>')}</button></div><div class="ip-body"></div></div></div>`;
const siteHead=`<header class="site-head">${brandLink}<div class="head-tools">${installMenu}${themeButton}</div></header>`;
// /install/ shows the guide inline, so its header carries only the theme control.
const installSiteHead=`<header class="site-head">${brandLink}<div class="head-tools">${themeButton}</div></header>`;
// The same three guide links as the «دليل زاد الخير» menu on the home screen; the brand link above leads home.
const footerLinks=[
[indexPath,"الفهرس والقراء",'<path d="M12 6v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>'],
["/khatmahs/","كيف تعمل الختمات",'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>'],
["/about/","عن التطبيق",'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/>']
].map(([href,label,path])=>`<a href="${href}">${navIcon(path)}<span>${label}</span></a>`).join("");
// seo-install.js hides the install link once the app is installed. /install/ itself omits it.
const footerInstallLink=`<a class="footer-install-link" href="/install/" data-install-link>${installIcon}<span>تثبيت التطبيق</span></a>`;
const footerHtml=withInstall=>`<footer class="discovery-footer"><nav class="footer-links" aria-label="روابط زاد الخير">${footerLinks}${withInstall?footerInstallLink:""}</nav><p class="footer-motto">كلامُ الباري يجمعُنا</p></footer>`;
const footer=footerHtml(true);
const installFooter=footerHtml(false);
function crumbs(items){return `<nav class="breadcrumbs" aria-label="مسار الصفحة">${items.map((x,i)=>i===items.length-1?`<b>${esc(x[0])}</b>`:`<a href="${x[1]}">${esc(x[0])}</a><span>‹</span>`).join("")}</nav>`}

function surahPage(s){
  const title=`سورة ${s.name} مكتوبة — قراءة واستماع | زاد الخير`;
  const description=`سورة ${s.name} مكتوبة للقراءة والاستماع بصوت القراء الأفاضل: ${reciterDescription}، مع التفسير الوجيز.`;
  const canonical=`/surah/${s.n}/`,image=`/social/surah/surah-${String(s.n).padStart(3,"0")}-v2.jpg`;
  const graph={"@context":"https://schema.org","@graph":[{"@type":"WebPage","@id":`${site}${canonical}#webpage`,name:title,url:`${site}${canonical}`,description,inLanguage:"ar",isPartOf:{"@id":`${site}/#website`}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"زاد الخير",item:`${site}/`},{"@type":"ListItem",position:2,name:"الفهرس والقراء",item:`${site}/quran/`},{"@type":"ListItem",position:3,name:`سورة ${s.name}`,item:`${site}${canonical}`}]}]};
  const listeners=reciters.map(r=>`<a class="listen" ${r.surahOnly?'data-surah-only="true"':""} href="${listenSurahPath(s.n,r.id)}" aria-label="الاستماع إلى سورة ${esc(s.name)} بصوت ${esc(r.display)}">${esc(r.display)}</a>`).join("\n");
  const shareDescription=`اقرأ سورة ${s.name} واستمع إليها بصوت نخبة من القراء، مع التفسير الوجيز للدكتور الزحيلي.`;
  return `${head({title,description,shareDescription,canonical,image,jsonLd:graph,noindex:true,extra:`<meta name="zk:verses" content="${s.verses}">\n`})}<body>${siteHead}${crumbs([["زاد الخير","/"],["الفهرس والقراء",indexPath],[`سورة ${s.name}`]])}<main><div class="eyebrow">سورة رقم ${arNum(s.n)} · ${arNum(s.verses)} آية</div><h1>سورة ${esc(s.name)} مكتوبة — قراءة واستماع</h1><p class="lead">اقرأ سورة ${esc(s.name)} من المصحف الشريف، واستمع إليها بصوت نخبة من القراء، وارجع إلى التفسير الوجيز للدكتور وهبة الزحيلي أثناء القراءة.</p><div class="actions"><a class="btn primary" id="openReader" href="${supported.has(s.n)?readSurahPath(s.n):`/reader.html?surah=${s.n}&amp;ayah=1`}">قراءة سورة ${esc(s.name)}</a><a class="btn secondary" href="${indexPath}">فهرس القرآن العظيم</a></div><h2>سورة ${esc(s.name)} بصوت القراء</h2><p>اختر القارئ الذي تود سماع سورة ${esc(s.name)} بصوته:</p><div class="listen-list">${listeners}</div><h2>القراءة والتفسير دون اتصال</h2><p>يمكن تجهيز المصحف والتفسير للاستخدام دون اتصال، كما يمكن تنزيل تلاوة السورة بصوت القارئ الذي تختاره للاستماع إليها لاحقًا.</p></main>${footer}<script>(()=>{const p=new URLSearchParams(location.search);if(!["code","ayah","qari","open"].some(k=>p.has(k)))return;const u=new URL("/reader.html",location.href);u.searchParams.set("surah","${s.n}");const a=Number(p.get("ayah"));u.searchParams.set("ayah",Number.isInteger(a)&&a>=1&&a<=${s.verses}?String(a):"1");for(const k of ["code","qari","play"])if(p.get(k))u.searchParams.set(k,p.get(k));location.replace(u.href)})()</script></body></html>`;
}
function juzPage(j){
  const title=`${j.title} من القرآن — قراءة واستماع | زاد الخير`,canonical=`/juz/${j.n}/`,image=`/social/juz/juz-${String(j.n).padStart(2,"0")}-v2.jpg`;
  const description=j.desc.replace(/\.$/,"")+"، مع التفسير الوجيز والاستماع إلى تلاوات القراء.";
  const graph={"@context":"https://schema.org","@graph":[{"@type":"WebPage",name:title,url:`${site}${canonical}`,description,inLanguage:"ar",isPartOf:{"@id":`${site}/#website`}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"زاد الخير",item:`${site}/`},{"@type":"ListItem",position:2,name:"الفهرس والقراء",item:`${site}/quran/`},{"@type":"ListItem",position:3,name:j.title,item:`${site}${canonical}`}]}]};
  return `${head({title,description,canonical,image,jsonLd:graph})}<body>${siteHead}${crumbs([["زاد الخير","/"],["الفهرس والقراء",indexPath],[j.title]])}<main><div class="eyebrow">الجزء رقم ${j.n} من 30</div><h1>${esc(j.title)} من القرآن العظيم</h1><p class="lead">${esc(j.desc)}</p><p>اقرأ الجزء في مصحف زاد الخير، واستعن بالتفسير الوجيز للدكتور وهبة الزحيلي، أو استمع إلى التلاوة بصوت القارئ الذي تختاره.</p><div class="actions"><a class="btn primary" id="openReader" href="/reader.html?juz=${j.n}">قراءة ${esc(j.title)}</a><a class="btn secondary" href="${indexPath}#ajzaa">فهرس الأجزاء</a></div><h2>القراءة والاستماع دون اتصال</h2><p>يتيح زاد الخير تجهيز القرآن والتفسير للاستخدام دون إنترنت، وتنزيل تلاوات السور المطلوبة بصورة منفصلة.</p></main>${footer}<script>(()=>{const p=new URLSearchParams(location.search);if(!["code","open"].some(k=>p.has(k)))return;const u=new URL("/reader.html",location.href);u.searchParams.set("juz","${j.n}");if(p.get("code"))u.searchParams.set("code",p.get("code"));location.replace(u.href)})()</script></body></html>`;
}
function quranPage(surahs,juz,{direct=false}={}){
  const title="القرآن العظيم | قراءة، تفسير واستماع | زاد الخير",canonical=direct?indexPath:"/quran/";
  const description=`اقرأ القرآن العظيم مع التفسير الوجيز للدكتور وهبة الزحيلي، واستمع إلى التلاوات العطرة للقراء الأفاضل: ${reciterDescription}.`;
  const schema={"@context":"https://schema.org","@type":"CollectionPage",name:"القرآن العظيم في زاد الخير",url:`${site}${canonical}`,description,inLanguage:"ar",isPartOf:{"@id":`${site}/#website`}};
  const reciterCards=reciters.map(r=>`<a class="card link reciter-card" href="/quran/reciters/${r.slug}/"><strong>${esc(r.display)}</strong><small${r.surahOnly?' class="surah-only"':""}>${r.surahOnly?"الاستماع إلى السور كاملة":"القراءة ومتابعة الآيات"}</small></a>`).join("");
  const surahLinks=surahs.map(s=>`<a class="item" href="${direct?readSurahPath(s.n):`/surah/${s.n}/`}"><span>سورة ${esc(s.name)}</span><small>آياتها: ${arNum(s.verses)}</small></a>`).join("");
  const juzLinks=juz.map(j=>`<a class="item" href="/juz/${j.n}/">${esc(j.title)}</a>`).join("");
  const shareDescription="اقرأ القرآن العظيم واستمع إليه بصوت نخبة من القراء، مع التفسير الوجيز للدكتور الزحيلي.";
  return `${head({title,description,shareDescription,canonical,image:direct?"/social/zad-alkhair-reader-share-v2.jpg":"/social/zad-alkhair-reader-share.jpg",jsonLd:schema,socialOrigin:direct?shareOrigin:site,noindex:!direct||preview})}<body>${siteHead}${crumbs([["زاد الخير","/"],["الفهرس والقراء"]])}<main><h1>القرآن العظيم في زاد الخير</h1><p class="lead">اقرأ القرآن العظيم في مصحف المدينة، مع التفسير الوجيز للدكتور وهبة الزحيلي، وإمكانية الاستماع إلى تلاوات نخبة من القراء.</p><div class="actions"><a class="btn primary" href="${direct?"/quran-read/":"/reader.html?home=1&amp;from=zad"}">افتح المصحف الشريف</a>${direct?'<a class="btn secondary" href="/quran-listen/">مشغّل التلاوة</a>':""}<a class="btn secondary" href="/quran/player-guide/">دليل مشغّل التلاوة</a></div><h2>الاستماع إلى القرآن بصوت القراء:</h2><div class="reciter-grid">${reciterCards}</div><h2 id="surahs">سور القرآن الكريم</h2><p>اختر سورة لقراءتها، أو الاستماع إليها، أو معرفة تفسير آياتها.</p><nav class="link-grid surah-grid" aria-label="فهرس سور القرآن">${surahLinks}</nav><h2 id="ajzaa">أجزاء القرآن الكريم</h2><nav class="link-grid" aria-label="فهرس أجزاء القرآن">${juzLinks}</nav><h2>القراءة والاستماع دون اتصال</h2><p>يمكن تنزيل القرآن الكريم والتفسير كاملين للقراءة دون اتصال، كما يمكن تنزيل التلاوات التي تختارها سورةً سورةً للاستماع إليها لاحقًا.</p></main>${footer}</body></html>`;
}
function reciterPage(r,surahs){
  const title=`القرآن الكريم بصوت ${r.display} — استماع وقراءة | زاد الخير`,canonical=`/quran/reciters/${r.slug}/`;
  const description=r.surahOnly?`استمع إلى سور القرآن الكريم كاملة بصوت ${r.display} في زاد الخير. متابعة الآيات وتحديد الأجزاء غير متاحين بهذا الصوت.`:`اختر سورة من القرآن الكريم للاستماع إليها بصوت ${r.display} وقراءتها مع التفسير الوجيز في زاد الخير.`;
  const schema={"@context":"https://schema.org","@type":"CollectionPage",name:`القرآن الكريم بصوت ${r.display}`,url:`${site}${canonical}`,description,inLanguage:"ar",isPartOf:{"@id":`${site}/#website`}};
  const links=surahs.map(s=>`<a class="item" href="${listenSurahPath(s.n,r.id)}" aria-label="سورة ${esc(s.name)} بصوت ${esc(r.display)}">سورة ${esc(s.name)}</a>`).join("");
  return `${head({title,description,canonical,image:"/social/zad-alkhair-reader-share.jpg",jsonLd:schema})}<body>${siteHead}${crumbs([["زاد الخير","/"],["الفهرس والقراء",indexPath],[r.display]])}<main><div class="eyebrow">تلاوات القرآن الكريم</div><h1>القرآن الكريم بصوت ${esc(r.display)}</h1><p class="note">اختر سورة من القائمة، لتسمعها بصوت ${esc(r.display)} وتقرأها في ذات الوقت.</p>${r.surahOnly?'<p class="note">هذا القارئ متاح للاستماع إلى السور كاملة، مع قائمة التشغيل والتكرار والمؤقت والتنزيل. متابعة الآيات وتحديد الأجزاء غير متاحين بهذا الصوت.</p>':""}<nav class="link-grid" aria-label="سور القرآن بصوت ${esc(r.display)}">${links}</nav><div class="actions"><a class="btn secondary" href="${indexPath}">العودة إلى فهرس القرآن</a></div></main>${footer}</body></html>`;
}

for(const s of surahs)write(`surah/${s.n}/index.html`,surahPage(s));
for(const j of juz)write(`juz/${j.n}/index.html`,juzPage(j));
write("quran/index.html",quranPage(surahs,juz));
write(`${indexPath.slice(1)}index.html`,quranPage(surahs,juz,{direct:true}));
for(const r of reciters)write(`quran/reciters/${r.slug}/index.html`,reciterPage(r,surahs));
function installPage(){
  const title="تثبيت تطبيق زاد الخير",canonical="/install/";
  const description="ثبّت تطبيق زاد الخير على آيفون أو أندرويد أو الحاسب من موقع zad-alkhair.net، دون متجر تطبيقات.";
  const graph={"@context":"https://schema.org","@graph":[{"@type":"WebPage",name:title,url:`${site}${canonical}`,description,inLanguage:"ar",isPartOf:{"@id":`${site}/#website`}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"زاد الخير",item:`${site}/`},{"@type":"ListItem",position:2,name:"تثبيت التطبيق",item:`${site}${canonical}`}]}]};
  return `${head({title,description,canonical,image:"/social/zad-alkhair-install-share-v2.jpg",jsonLd:graph})}<body>${installSiteHead}${crumbs([["زاد الخير","/"],["تثبيت التطبيق"]])}<main><h1>تثبيت تطبيق زاد الخير</h1><p class="lead">يعمل زاد الخير على الهاتف والحاسب كتطبيق ويب مستقل، يمكن تحميله من موقع zad-alkhair.net دون الحاجة لمتجر تطبيقات. حجمه صغير، ولا يزيد إلا بما تختار تنزيله من التلاوات، وتصله التحديثات تلقائيًا دون أي خطوة منك.</p><p class="note" id="installDone" hidden>زاد الخير مثبّت على هذا الجهاز. يمكنك فتحه من أيقونته، أو اتباع الخطوات لجهاز آخر.</p><section class="install-guide" id="installGuide" aria-label="خطوات التثبيت"></section><div class="actions"><button class="btn secondary install-share" id="installShare" type="button">${navIcon('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>')}<span>مشاركة الصفحة</span></button><span class="share-status" id="installShareStatus" role="status" aria-live="polite"></span></div></main>${installFooter}<script>if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{})</script></body></html>`;
}
write("install/index.html",installPage());
// Hand-written guide pages share the generated header, footer and asset version.
const assetTags=`<link rel="manifest" href="/manifest.json">\n<script src="/seo-pages.js?v=${assetVersion}"></script>\n<link rel="stylesheet" href="/seo-pages.css?v=${assetVersion}">\n<script src="/seo-install.js?v=${assetVersion}" defer></script>`;
function shareShell(html){
  return html.replace(/<header class="site-head">[\s\S]*?<\/header>/,siteHead)
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/,footer)
    .replace(/<meta name="theme-color" content="[^"]+">/,'<meta name="theme-color" content="#F5F0E4">')
    .replace(/<link rel="manifest" href="\/manifest\.json">\s*/g,"")
    .replace(/<script src="\/seo-(pages|install)\.js[^"]*"( defer)?><\/script>\s*/g,"")
    .replace(/<link rel="stylesheet" href="\/seo-pages\.css[^"]*">/,assetTags);
}
write("quran/player-guide/index.html",shareShell(fs.readFileSync(path.join(root,"quran/player-guide/index.html"),"utf8")));
for(const relative of ["about/index.html","khatmahs/index.html"]){
  const html=shareShell(fs.readFileSync(path.join(root,"src/discovery",relative.replace("/index.html",".html")),"utf8"));
  write(relative,html);
}
const swSource=fs.readFileSync(path.join(root,"sw.js"),"utf8");
const swAssets=/"\.\/seo-pages\.css\?v=[^"]+","\.\/seo-pages\.js\?v=[^"]+","\.\/seo-install\.js\?v=[^"]+"/;
if(!swAssets.test(swSource))throw new Error("sw.js: guide asset list not found");
write("sw.js",swSource.replace(swAssets,`"./seo-pages.css?v=${assetVersion}","./seo-pages.js?v=${assetVersion}","./seo-install.js?v=${assetVersion}"`));
const urls=["/",indexPath,"/quran/player-guide/","/khatmahs/","/about/","/install/",...reciters.map(r=>`/quran/reciters/${r.slug}/`),...surahs.map(s=>readSurahPath(s.n)),...juz.map(j=>`/juz/${j.n}/`)];
// Preserve dates and ordering for unchanged pages; rebuilding alone is not a modification.
const previous=fs.existsSync(path.join(root,"sitemap.xml"))?fs.readFileSync(path.join(root,"sitemap.xml"),"utf8"):"";
const dates=new Map([...previous.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g)].map(m=>[m[1],m[2]]));
const wanted=new Set(urls.map(u=>site+u));
const ordered=[...dates.keys()].filter(u=>wanted.has(u));
for(const u of wanted)if(!ordered.includes(u))ordered.push(u);
const today=new Date().toISOString().slice(0,10);
const lastmod=u=>changed.has(u===site+"/"?"index.html":u.slice(site.length+1)+"index.html")?today:dates.get(u)||today;
write("sitemap.xml",`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ordered.map(u=>`  <url><loc>${u}</loc><lastmod>${lastmod(u)}</lastmod></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt",`User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
if(check&&changed.size){
  console.error("Stale generated files; run npm run build:",...changed);
  process.exitCode=1;
}else console.log(`${check?"Checked":"Generated"} ${surahs.length} surah pages, ${juz.length} juz pages, ${reciters.length} reciter pages and ${urls.length} sitemap URLs.`);
