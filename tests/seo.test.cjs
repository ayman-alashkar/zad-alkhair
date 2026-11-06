const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");

const root=path.resolve(__dirname,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const {reciters}=require("../src/discovery/catalog.json");
const {readerRoutes,supported,shareOrigin}=require("../scripts/quran-routes.cjs");
const reciterName=({display})=>display.replace(/^فضيلة الشيخ\s+/,"");
const orderedReciters=[...reciters].sort((a,b)=>reciterName(a).localeCompare(reciterName(b),"ar"));

test("sitemap contains every canonical discovery page once",()=>{
  const xml=read("sitemap.xml");
  const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
  assert.equal(urls.length,150+reciters.length);
  assert.equal(new Set(urls).size,urls.length);
  assert.ok(urls.includes("https://zad-alkhair.net/"));
  assert.ok(urls.includes("https://zad-alkhair.net/quran-index/"));
  assert.ok(urls.includes("https://zad-alkhair.net/khatmahs/"));
  for(let n=1;n<=114;n++)assert.ok(urls.includes(`https://zad-alkhair.net/quran-read/${n}/`));
  assert.ok(!urls.some(url=>/\/(?:quran-listen|surah)\//.test(new URL(url).pathname)));
  assert.ok(urls.includes("https://zad-alkhair.net/quran/reciters/ayman-suwaid/"));
  assert.match(read("robots.txt"),/Sitemap: https:\/\/zad-alkhair\.net\/sitemap\.xml/);
});

test("every sitemap URL maps to a page with its own canonical",()=>{
  const urls=[...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]));
  for(const url of urls){
    const relative=url.pathname==="/"?"index.html":path.join(url.pathname.slice(1),"index.html");
    const html=read(relative);
    assert.match(html,new RegExp(`<link rel="canonical" href="${url.href.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}">`),relative);
    assert.match(html,/<meta name="description" content="[^"\n]+">/,relative);
  }
});

test("Quran discovery pages expose useful crawlable links",()=>{
  const quran=read("quran/index.html");
  assert.equal((quran.match(/href="\/surah\/\d+\/"/g)||[]).length,114);
  assert.equal((quran.match(/href="\/juz\/\d+\/"/g)||[]).length,30);
  assert.equal((quran.match(/href="\/quran\/reciters\//g)||[]).length,reciters.length);
  const slugs=[...quran.matchAll(/href="\/quran\/reciters\/([^/]+)\/"/g)].map(match=>match[1]);
  assert.deepEqual(slugs,orderedReciters.map(({slug})=>slug));
  const mulk=read("surah/67/index.html");
  assert.match(mulk,/سورة الملك بصوت فضيلة الشيخ أيمن سويد/);
  assert.match(mulk,/qari=Ayman_Sowaid_64kbps/);
  assert.match(mulk,/if\(!\["code","ayah","qari","open"\]\.some\(k=>p\.has\(k\)\)\)return/);
  assert.doesNotMatch(mulk,/document\.getElementById\("openReader"\)\.href=u\.href;location\.replace/);
});

test("Quran, reciter and surah pages use the approved concise copy",()=>{
  const quran=read("quran/index.html");
  const reciterNames=orderedReciters.map(({display})=>display).join("، و");
  const quranDescription=`اقرأ القرآن العظيم مع التفسير الوجيز للدكتور وهبة الزحيلي، واستمع إلى التلاوات العطرة للقراء الأفاضل: ${reciterNames}.`;
  assert.ok(quran.includes(`<meta name="description" content="${quranDescription}">`));
  const quranShare="اقرأ القرآن العظيم واستمع إليه بصوت نخبة من القراء، مع التفسير الوجيز للدكتور الزحيلي.";
  assert.ok(quran.includes(`<meta property="og:description" content="${quranShare}">`));
  assert.ok(quran.includes(`<meta name="twitter:description" content="${quranShare}">`));
  assert.match(quran,/مصحف المدينة/);
  assert.match(quran,/>افتح المصحف الشريف<\/a>/);
  assert.doesNotMatch(quran,/>ثبّت التطبيق<\/a>/);
  assert.match(quran,/<strong>فضيلة الشيخ أيمن سويد<\/strong>/);
  assert.doesNotMatch(quran,/استماع وقراءة سور القرآن/);
  assert.match(quran,/اختر سورة لقراءتها، أو الاستماع إليها، أو معرفة تفسير آياتها/);
  assert.match(quran,/<small>آياتها: ٣٠<\/small>/);
  assert.match(quran,/يمكن تنزيل القرآن الكريم والتفسير كاملين للقراءة دون اتصال/);

  const reciter=read("quran/reciters/ayman-suwaid/index.html");
  assert.match(reciter,/<h1>القرآن الكريم بصوت فضيلة الشيخ أيمن سويد<\/h1>/);
  assert.match(reciter,/اختر سورة من القائمة، لتسمعها بصوت فضيلة الشيخ أيمن سويد وتقرأها في ذات الوقت/);
  assert.doesNotMatch(reciter,/استمع إلى تلاوة سور القرآن/);
  assert.doesNotMatch(reciter,/<small>بصوت/);

  const mulk=read("surah/67/index.html");
  assert.match(mulk,/اقرأ سورة الملك من المصحف الشريف/);
  assert.match(mulk,/اختر القارئ الذي تود سماع سورة الملك بصوته/);
  assert.match(mulk,/>فضيلة الشيخ أيمن سويد<\/a>/);
});

test("reciter honorifics are consistent in every surah description and the reader UI",()=>{
  const honorifics=[
    "فضيلة الشيخ مشاري راشد العفاسي",
    "فضيلة الشيخ أيمن سويد",
    "فضيلة الشيخ عبد الرشيد الصوفي",
    "فضيلة الشيخ ماهر المعيقلي",
    "فضيلة الشيخ محمد صديق المنشاوي",
    "فضيلة الشيخ محمود خليل الحصري"
  ];
  for(let surah=1;surah<=114;surah++){
    const html=read(`surah/${surah}/index.html`);
    const description=(html.match(/<meta name="description" content="([^"]+)"/)||[])[1];
    assert.ok(description,`surah/${surah}/index.html description`);
    assert.match(description,/بصوت القراء الأفاضل:/,`surah/${surah}/index.html`);
    for(const name of honorifics)assert.ok(description.includes(name),`surah/${surah}/index.html -> ${name}`);
    const name=(html.match(/<title>سورة (.+?) مكتوبة/)||[])[1];
    const share=`اقرأ سورة ${name} واستمع إليها بصوت نخبة من القراء، مع التفسير الوجيز للدكتور الزحيلي.`;
    assert.ok(html.includes(`<meta property="og:description" content="${share}">`),`surah/${surah}/index.html og`);
    assert.ok(html.includes(`<meta name="twitter:description" content="${share}">`),`surah/${surah}/index.html twitter`);
  }

  const reader=read("reader.html");
  for(const name of honorifics)assert.match(reader,new RegExp(`name:"${name}`));
  assert.match(reader,/name:"فضيلة الشيخ محمد صديق المنشاوي — مجود"/);
  assert.match(reader,/name:"فضيلة الشيخ محمد صديق المنشاوي — مرتل"/);
});

test("homepage gives Google real links without changing app actions",()=>{
  const home=read("index.html");
  assert.match(home,/<link rel="icon" href="\/icons\/icon-192\.png" sizes="192x192" type="image\/png">/);
  // The bottom tabs and the options menu are real links for crawlers; the app intercepts the taps.
  assert.match(home,/<a class="zk-tab" id="zk-launch-quran" href="\/quran-index\/">/);
  assert.match(home,/<a class="zk-tab" id="zk-launch-zad" href="khatmahs\/">/);
  assert.match(home,/<a class="zk-launch-install zt-menu-install" id="zk-launch-install" href="install\/" role="menuitem" hidden>/);
  assert.match(home,/event=>\{event\.preventDefault\(\);zkHideLaunch\(\);boot\(\)\}/);
  assert.match(home,/القرآن العظيم، ختمات جماعية ومواقيت الصلاة/);
  assert.match(home,/<div class="zt-menu-label">دليل زاد الخير<\/div>/);
  assert.match(home,/<a href="\/quran-index\/" role="menuitem">.*?<span>الفهرس والقراء<\/span><\/a>/);
  assert.match(home,/<a href="khatmahs\/" role="menuitem">.*?<span>كيف تعمل الختمات؟<\/span><\/a>/);
  assert.match(home,/<a href="about\/" role="menuitem">.*?<span>عن التطبيق<\/span><\/a>/);
});

test("tafsir cross-references use verse then surah order",()=>{
  const references=[];
  for(let surah=1;surah<=114;surah++){
    const data=JSON.parse(read(`data/tafsir/al-wajeez/${String(surah).padStart(3,"0")}.json`));
    for(const [ayah,record] of Object.entries(data.ayahs)){
      for(const match of record.text.matchAll(/\[[٠-٩0-9]+\/[٠-٩0-9]+\]/g))references.push(`${surah}:${ayah}:${match[0]}`);
    }
  }
  assert.deepEqual(references,[
    "2:174:[٧٧/٣]",
    "4:140:[٦٨/٦]",
    "4:160:[١٤٦/٦]",
    "5:13:[٢٩/٩]",
    "6:109:[٩٠/١٦]",
    "8:44:[١٣/٣]",
    "16:66:[٧٨/٦]",
    "16:118:[١٤٦/٦]"
  ]);
});

test("reader accepts a validated reciter deep link",()=>{
  const reader=read("reader.html");
  assert.match(reader,/<meta name="robots" content="noindex,follow">/);
  assert.match(reader,/<link rel="canonical" href="https:\/\/zad-alkhair\.net\/quran\/">/);
  assert.match(reader,/<meta property="og:url" content="https:\/\/zad-alkhair\.net\/reader">/);
  assert.match(reader,/<meta property="og:image" content="https:\/\/zad-alkhair\.net\/social\/zad-alkhair-reader-share\.jpg">/);
  assert.match(reader,/qari:RECITERS\.some\(r=>r\.id===qari\)\?qari:null/);
  assert.match(reader,/if\(entry\.qari&&!entry\.direct\)\{/);
  assert.match(reader,/if\(!entry\.direct&&entry\.autoplay&&entry\.surah\)prepareSurahFromDeepLink/);
});

test("direct Quran pages boot the same reader and carry their own sharing card",()=>{
  for(const {path:route,mode,surah} of readerRoutes){
    const html=read(route.slice(1)+"index.html");
    assert.ok(html.includes(`<link rel="canonical" href="https://zad-alkhair.net${route}">`));
    assert.match(html,/<script src="\/quran\/runtime\/reader\.js\?v=[a-f0-9]+"><\/script>/);
    assert.doesNotMatch(html,/location\.replace|http-equiv="refresh"/);
    const image=html.match(/<meta property="og:image" content="([^"]+)"/)[1];
    assert.equal(new URL(image).origin,shareOrigin);
    const filename=new URL(image).pathname;
    assert.ok(filename.endsWith(surah?`-${mode}-v2.jpg`:`-${mode==="read"?"reader":"listen"}-share-v2.jpg`));
    assert.ok(fs.existsSync(path.join(root,filename)));
    if(mode==="read"&&surah){
      assert.match(html,/<article class="reader-surah-summary">/);
      assert.ok(html.includes(`href="/quran-listen/${surah.n}/"`));
    }
  }
  const index=read("quran-index/index.html");
  assert.match(index,/href="\/quran-read\/114\/"/);
  assert.match(index,/href="\/quran-listen\/"/);
});

test("every local social preview image exists",()=>{
  const htmlFiles=[
    "index.html","reader.html","install/index.html","quran/index.html","about/index.html","khatmahs/index.html",
    ...Array.from({length:114},(_,i)=>`surah/${i+1}/index.html`),
    ...Array.from({length:30},(_,i)=>`juz/${i+1}/index.html`),
    ...reciters.map(({slug})=>`quran/reciters/${slug}/index.html`)
  ];
  for(const relative of htmlFiles){
    const html=read(relative);
    for(const match of html.matchAll(/<meta property="og:image" content="https:\/\/zad-alkhair\.net\/([^"]+)">/g)){
      assert.ok(fs.existsSync(path.join(root,match[1])),`${relative} -> /${match[1]}`);
    }
  }
});

test("structured data parses and internal links resolve",()=>{
  const urls=[...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]));
  for(const url of urls){
    const relative=url.pathname==="/"?"index.html":path.join(url.pathname.slice(1),"index.html");
    const html=read(relative);
    for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(match[1]),relative);
    for(const match of html.matchAll(/href="([^"]+)"/g)){
      if(match[1].includes("${"))continue;
      const target=new URL(match[1].replace(/&amp;/g,"&"),url);
      if(target.origin!=="https://zad-alkhair.net")continue;
      const file=target.pathname==="/"?"index.html":target.pathname.endsWith("/")?path.join(target.pathname.slice(1),"index.html"):target.pathname.slice(1);
      assert.ok(fs.existsSync(path.join(root,file)),`${relative} -> ${target.pathname}`);
    }
  }
});

test("group khatmahs have a dedicated descriptive page",()=>{
  const page=read("khatmahs/index.html");
  for(const phrase of ["ختمات جماعية","حجز الأجزاء","تذكير يومي اختياري","تلغرام","إدارة الختمة"])assert.ok(page.includes(phrase),phrase);
  assert.match(page,/href="\/\?section=khatmahs"/);
  assert.doesNotMatch(page,/خدمة مجانية لتنظيم ختم القرآن/);
  assert.doesNotMatch(page,/طلاب الحلقة/);
  assert.doesNotMatch(page,/<h2>القراءة من داخل الختمة<\/h2>/);
});

// The asset version is a content hash; sw.js must precache the same URLs the pages load.
const assetVersion=require("node:crypto").createHash("sha256").update(["seo-pages.css","seo-pages.js","seo-install.js"].map(f=>read(f)).join("\0")).digest("hex").slice(0,10);
test("guide asset URLs carry the content version, also in the service worker",()=>{
  const sw=read("sw.js");
  for(const f of ["seo-pages.css","seo-pages.js","seo-install.js"])assert.ok(sw.includes(`"./${f}?v=${assetVersion}"`),f);
});
test("every guide page uses the shared accessible appearance control and pre-paint theme script",()=>{
  const urls=[...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]));
  for(const url of urls){
    const relative=url.pathname==="/"?"index.html":path.join(url.pathname.slice(1),"index.html");
    const html=read(relative);if(!html.includes("seo-pages.css"))continue;
    assert.equal((html.match(/id="guideTheme"/g)||[]).length,1,relative);
    assert.equal((html.match(new RegExp(`src="/seo-pages\\.js\\?v=${assetVersion}"`,"g"))||[]).length,1,relative);
    assert.ok(html.indexOf(`/seo-pages.js?v=${assetVersion}`)<html.indexOf(`/seo-pages.css?v=${assetVersion}`),relative);
    assert.ok(html.includes(`/seo-install.js?v=${assetVersion}`),relative);
    assert.match(html,/aria-label="تفعيل الوضع الليلي" aria-pressed="false"/);
  }
});
test("guide pages offer installation once, from the header menu",()=>{
  const urls=[...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]));
  for(const url of urls){
    const relative=url.pathname==="/"?"index.html":path.join(url.pathname.slice(1),"index.html");
    const html=read(relative);if(!html.includes("seo-pages.css"))continue;
    assert.match(html,/<link rel="manifest" href="\/manifest\.json">/,relative);
    assert.doesNotMatch(html,/class="footer-install"|أقرب إليك/,relative);
    const footer=html.slice(html.indexOf("<footer"));
    if(relative==="install/index.html"){
      assert.doesNotMatch(footer,/href="\/install\/"/);
      assert.doesNotMatch(html,/id="installMenu"/);
      assert.match(html,/id="installGuide"/);
      assert.match(html,/<button class="btn secondary install-share" id="installShare" type="button">/);
      assert.doesNotMatch(html,/installOpen/);
    }else{
      assert.equal((footer.match(/<a class="footer-install-link" href="\/install\/" data-install-link>/g)||[]).length,1,relative);
      assert.equal((html.match(/id="installMenu"/g)||[]).length,1,relative);
      assert.match(html,/<div class="install-menu" id="installMenu" hidden>/,relative);
      const main=html.slice(html.indexOf("<main"),html.indexOf("</main>"));
      assert.doesNotMatch(main,/href="\/install\/"/,relative);
    }
  }
  assert.match(read("seo-pages.css"),/\.footer-links svg\{width:21px;height:21px/);
  const script=read("seo-install.js");
  assert.match(script,/id===myDevice&&promptEvent/);
  assert.match(script,/p_event:'install_accepted'/);
  assert.match(script,/querySelectorAll\('\[data-install-link\]'\)/);
  assert.match(script,/navigator\.clipboard\.writeText\(url\)/);
  assert.doesNotMatch(script,/get\('next'\)/);
});
test("new reciter pages and surah links use the exact player IDs and explain whole-surah limits",()=>{
  for(const {slug,id} of reciters){
    const page=read(`quran/reciters/${slug}/index.html`);
    assert.equal((page.match(new RegExp(`qari=${id}(?:&amp;play=1)?"`,"g"))||[]).length,114);
    assert.match(read("quran/index.html"),new RegExp(`/quran/reciters/${slug}/`));
    for(let n=1;n<=114;n++){
      const href=supported.has(n)?`/quran-listen/${n}/?qari=${id}`:`qari=${id}&amp;play=1`;
      assert.ok(page.includes(href),`${slug}, surah ${n}`);
      assert.ok(read(`surah/${n}/index.html`).includes(href),`${n}, ${slug}`);
    }
  }
  assert.match(read("quran/reciters/mahmoud-al-hamoud/index.html"),/متابعة الآيات وتحديد الأجزاء غير متاحين/);
});
test("the Quran index keeps its own title; the reader's back arrow leads to the home screen",()=>{
  const library=read("src/reader/library.js");
  assert.match(library,/<div class="quran-index-head"><div class="quran-index-title">القرآن العظيم<\/div>/);
  assert.doesNotMatch(library,/quran-index-brand/);
  assert.doesNotMatch(library,/العودة إلى الختمات الجماعية/);
  assert.match(read("src/reader/reading-tools.js"),/zadReturnHeld=false;e\.preventDefault\(\);return\}\s*\/\*[^*]*\*\/\s*location\.href="\/";/);
  assert.match(read("install/index.html"),/<h1>تثبيت تطبيق زاد الخير<\/h1>/);
  // Surah rows and Juz separators must take every column measurement from the same variables.
  const css=read("src/reader/styles.css");
  assert.match(css,/html body \.quran-index \.quran-index-row-with-actions,\nhtml body \.quran-index \.quran-index-juz-sep\{[^}]*grid-template-columns:var\(--ix-num\) minmax\(0,1fr\) calc\(3 \* var\(--ix-btn\) \+ 2 \* var\(--ix-btn-gap\)\)\}/);
  assert.match(css,/html body \.quran-index \.quran-index-row-main,\nhtml body \.quran-index \.quran-index-juz-main\{grid-template-columns:minmax\(0,1fr\) var\(--ix-page\)/);
});
test("the Quran index carries Zad's four section tabs; reading pages do not",()=>{
  const library=read("src/reader/library.js");
  assert.match(library,/id="quranSurahList"><\/div><\/div><\/div><\/div>\$\{READER_APP_TABS\}`/);
  for(const href of ['href="/"','href="/?section=khatmahs"','href="/?section=prayer"'])assert.ok(library.includes(href),href);
  assert.match(library,/aria-current="page" data-app-tab="quran"/);
  assert.doesNotMatch(read("src/reader/index.html"),/reader-app-tabs/);
  assert.doesNotMatch(library,/data-hub="zad"/);   /* the tabs lead home now */
});
test("the Quran index opens before the mushaf fonts, and reading waits for them",()=>{
  const boot=read("src/reader/bootstrap.js"),tools=read("src/reader/reading-tools.js");
  const early=boot.indexOf("openQuranIndex(tab,{home:true})"),fonts=boot.indexOf('document.fonts.load(\'48px "QCF4_QBSML"\')');
  assert.ok(early>0&&fonts>early,"the index opens before the font wait");
  assert.match(boot,/if\(wantsHome&&!earlyIndexOpened\)/);
  assert.match(tools,/async function go\(p\)\{[\s\S]{0,200}if\(!readerBooted\)\{readerGoPending=true;await readerBootReady\}/);
  assert.match(read("src/reader/library.js"),/if\(!readerBooted\)loading\.classList\.remove\("hide"\)/);
});
test("the reader's tab bar has the home bar's exact box",()=>{
  const reader=read("src/reader/styles.css"),home=read("src/home/styles.css");
  assert.match(home,/\.zk-tabs\{[^}]*height:calc\(72px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(reader,/\.reader-app-tabs\{[^}]*height:calc\(72px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(reader,/\.reader-app-tabs\{align-self:center;[^}]*margin:10px 0 18px;/);   /* home pill: bottom 18px */
  for(const css of [home,reader])assert.match(css,/span\[data-label\]::after\{content:attr\(data-label\);font-weight:650/);
});
