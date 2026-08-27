const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");

const root=path.resolve(__dirname,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

test("sitemap contains every canonical discovery page once",()=>{
  const xml=read("sitemap.xml");
  const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
  assert.equal(urls.length,154);
  assert.equal(new Set(urls).size,154);
  assert.ok(urls.includes("https://zad-alkhair.net/"));
  assert.ok(urls.includes("https://zad-alkhair.net/quran/"));
  assert.ok(urls.includes("https://zad-alkhair.net/khatmahs/"));
  assert.ok(urls.includes("https://zad-alkhair.net/surah/67/"));
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
  assert.equal((quran.match(/href="\/quran\/reciters\//g)||[]).length,5);
  const mulk=read("surah/67/index.html");
  assert.match(mulk,/سورة الملك بصوت فضيلة الشيخ أيمن سويد/);
  assert.match(mulk,/qari=Ayman_Sowaid_64kbps/);
  assert.match(mulk,/if\(!\["code","ayah","qari","open"\]\.some\(k=>p\.has\(k\)\)\)return/);
  assert.doesNotMatch(mulk,/document\.getElementById\("openReader"\)\.href=u\.href;location\.replace/);
});

test("Quran, reciter and surah pages use the approved concise copy",()=>{
  const quran=read("quran/index.html");
  const quranDescription="اقرأ القرآن العظيم مع التفسير الوجيز للدكتور وهبة الزحيلي، واستمع إلى التلاوات العطرة للقراء الأفاضل: فضيلة الشيخ أيمن سويد وفضيلة الشيخ عبد الرشيد الصوفي وفضيلة الشيخ ماهر المعيقلي وفضيلة الشيخ محمد صديق المنشاوي وفضيلة الشيخ محمود خليل الحصري.";
  assert.match(quran,new RegExp(`<meta name="description" content="${quranDescription}">`));
  assert.match(quran,new RegExp(`<meta property="og:description" content="${quranDescription}">`));
  assert.match(quran,/مصحف المدينة QCF4/);
  assert.match(quran,/>افتح المصحف الشريف<\/a>/);
  assert.match(quran,/>ثبّت التطبيق<\/a>/);
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

test("homepage gives Google real links without changing app actions",()=>{
  const home=read("index.html");
  assert.match(home,/<link rel="icon" href="\/icons\/icon-192\.png" sizes="192x192" type="image\/png">/);
  assert.match(home,/<a class="zk-launch-option" id="zk-launch-quran" href="quran\/">/);
  assert.match(home,/<a class="zk-launch-option" id="zk-launch-zad" href="khatmahs\/">/);
  assert.match(home,/<a class="zk-launch-install" id="zk-launch-install" href="install\/" hidden>/);
  assert.match(home,/event=>\{event\.preventDefault\(\);zkHideLaunch\(\);boot\(\)\}/);
  assert.match(home,/القرآن العظيم، ختمات جماعية ومواقيت الصلاة/);
  assert.match(home,/<summary>دليل زاد الخير<\/summary>/);
  assert.match(home,/<a href="quran\/">الفهرس والقراء<\/a>/);
  assert.match(home,/<a href="khatmahs\/">كيف تعمل الختمات؟<\/a>/);
  assert.match(home,/<a href="about\/">عن التطبيق<\/a>/);
});

test("corrected tafsir cross-reference keeps its integrity hash",()=>{
  const anAam=JSON.parse(read("data/tafsir/al-wajeez/006.json"));
  assert.match(anAam.ayahs[109].text,/\[٩٠\/١٦\]/);
  assert.doesNotMatch(anAam.ayahs[109].text,/\[١٦\/٩٠\]/);
});

test("reader accepts a validated reciter deep link",()=>{
  const reader=read("reader.html");
  assert.match(reader,/<meta name="robots" content="noindex,follow">/);
  assert.match(reader,/<link rel="canonical" href="https:\/\/zad-alkhair\.net\/quran\/">/);
  assert.match(reader,/<meta property="og:url" content="https:\/\/zad-alkhair\.net\/reader">/);
  assert.match(reader,/<meta property="og:image" content="https:\/\/zad-alkhair\.net\/zad-alkhair-share\.png">/);
  assert.match(reader,/qari:RECITERS\.some\(r=>r\.id===qari\)\?qari:null/);
  assert.match(reader,/if\(entry\.qari\)\{/);
  assert.match(reader,/if\(entry\.autoplay&&entry\.surah\)prepareSurahFromDeepLink/);
});

test("every local social preview image exists",()=>{
  const htmlFiles=[
    "index.html","reader.html","install/index.html","quran/index.html","about/index.html","khatmahs/index.html",
    ...Array.from({length:114},(_,i)=>`surah/${i+1}/index.html`),
    ...Array.from({length:30},(_,i)=>`juz/${i+1}/index.html`),
    ..."ayman-suwaid abdul-rashid-sufi maher-al-muaiqly mohamed-siddiq-al-minshawi mahmoud-khalil-al-husary".split(" ").map(slug=>`quran/reciters/${slug}/index.html`)
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
