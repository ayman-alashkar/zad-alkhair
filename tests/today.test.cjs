"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

test("surah map matches the catalogue and names the right surah for a page",()=>{
  const ctx={};vm.createContext(ctx);vm.runInContext(read("src/home/quran-map.js")+";this.SURAH_NAMES=SURAH_NAMES;this.SURAH_START_PAGES=SURAH_START_PAGES;this.surahForPage=surahForPage",ctx);
  const catalog=JSON.parse(read("src/discovery/catalog.json")).surahs.map(s=>s.name);
  assert.deepEqual([...ctx.SURAH_NAMES],catalog);
  const pages=[...ctx.SURAH_START_PAGES];
  assert.equal(pages.length,114);assert.equal(pages[0],1);assert.equal(pages[113],604);
  assert.ok(pages.every((p,i)=>i===0||p>=pages[i-1]));
  for(const [page,name] of [[1,"الفاتحة"],[2,"البقرة"],[50,"آل عمران"],[294,"الكهف"],[582,"النبأ"],[604,"الإخلاص"]])
    assert.equal(ctx.surahForPage(page).name,name,`page ${page}`);
});

test("home screen keeps the shared theme, real crawlable tabs and offline pattern",()=>{
  const home=read("index.html"),today=read("src/home/today.js"),sw=read("sw.js");
  assert.match(today,/const ZT_THEME_KEY="zad:qcf4:theme";/);
  assert.equal((home.match(/class="zk-tab"/g)||[]).length,4);
  assert.match(home,/<nav class="zk-tabs" id="zk-tabs" aria-label="الأقسام">/);
  assert.match(sw,/"\.\/icons\/zad-rosette\.svg"/);
  assert.ok(fs.existsSync(path.join(root,"icons/zad-rosette.svg")));
  // The Today screen reads the khatmah into its own variables; it must never assign the app's globals.
  // (A statement-position assignment; a query string such as "&code=" in a URL is not one.)
  assert.doesNotMatch(today.replace(/(&amp;|[?&])(code|state|viewer)=/g,""),/(^|[\s;{(,])(code|viewer|state)\s*=[^=]/m);
  // Opening and closing the home screen keeps the tabs and browser colour in step.
  assert.equal((read("src/home/bootstrap.js").match(/ztOnLaunchChange\(\);/g)||[]).length,2);
});

test("midday prayers read as ظهرًا, not عصرًا",()=>{
  const src=read("src/home/formatting-clock.js");
  const ctx={};vm.createContext(ctx);
  vm.runInContext(src.slice(0,src.indexOf("const hourOptions"))+";this.fmtTime=fmtTime",ctx);
  assert.match(ctx.fmtTime(12,19),/ظهرًا$/);assert.match(ctx.fmtTime(15,18),/عصرًا$/);
  assert.match(ctx.fmtTime(5,31),/صباحًا$/);assert.match(ctx.fmtTime(19,1),/مساءً$/);
});

test("khatmah screens rely on the bottom tabs: no duplicate brand, Quran link or prayer button",()=>{
  const home=read("index.html");
  assert.doesNotMatch(home,/class="tb-brand"|class="tb-reader"/);
  assert.match(read("src/home/styles.css"),/\.prayer-fab\{display:none!important\}/);
  assert.match(read("src/home/views.js"),/data-home>صفحة الختمات<\/button>/);
  assert.doesNotMatch(read("src/home/views.js"),/data-home>الصفحة الرئيسية</);
  // One pattern everywhere: the rosette, never the old hexagonal lattice on top.
  assert.match(read("src/home/styles.css"),/body::before\{inset:[^}]*zad-rosette\.svg/);
});

test("juz page ranges on the home screen match the reader's",()=>{
  const grab=(file)=>{const m=read(file).match(/const JUZ_PAGES=(\[\[.*?\]\]);/);assert.ok(m,file);return JSON.parse(m[1])};
  assert.deepEqual(grab("src/home/quran-map.js"),grab("src/reader/state.js"));
});

test("the reader records the furthest page only inside the user's unfinished juz",()=>{
  const src=read("src/reader/reading-tools.js");
  const start=src.indexOf("const JUZ_PROGRESS_KEY"),end=src.indexOf("function saveReaderSurface");
  const store=new Map();
  const ctx={JUZ_PAGES:JSON.parse(read("src/reader/state.js").match(/const JUZ_PAGES=(\[\[.*?\]\]);/)[1]),
    readerEntryParams:()=>({code:"",juz:null}),
    storageJsonGet:(k,f)=>store.has(k)?JSON.parse(store.get(k)):f,
    storageJsonSet:(k,v)=>store.set(k,JSON.stringify(v))};
  vm.createContext(ctx);vm.runInContext(src.slice(start,end)+";this.record=recordJuzProgress",ctx);
  store.set("zad:today-khatmah-v1",JSON.stringify({code:"ABCD",mine:[{n:23,done:false},{n:25,done:true}]}));
  for(const page of [100,442,446,444,470,490])ctx.record(page);   // 100, 470: outside juz 23; 490: juz 25 is done
  assert.deepEqual(JSON.parse(store.get("zad:juz-progress-v1")),{ABCD:{"23":446}});   // furthest, never moves back
});

/* ── Prayer-times screen ── */
function loadHijri(official,adj){
  const src=read("src/home/prayer-screen.js");
  const ctx={Intl,Date,Math,Number,String,Object,JSON,ztArabic:v=>String(v),
    localStorage:{getItem:k=>k==="zad:hijri-adjust"?String(adj||0):null}};
  vm.createContext(ctx);
  vm.runInContext(src.slice(0,src.indexOf("/* ── حالة الشاشة ── */"))+";this.setOfficial=v=>{zpOfficialMonths=v};this.hijri=zpHijri;this.valid=zpValidOfficial",ctx);
  ctx.setOfficial(official||{});
  return ctx;
}
const noon=(y,m,d)=>Date.UTC(y,m-1,d,12);
const ymd=h=>`${h.y}-${h.m}-${h.d}`;

test("official month starts override the built-in Umm al-Qura table, later or earlier",()=>{
  const plain=loadHijri({});
  const at=d=>noon(2026,3,d);
  /* The file's own entry: Eid al-Fitr 1447 fell on Friday 20 March 2026. */
  const file=loadHijri({});file.setOfficial(file.valid(JSON.parse(read("data/hijri-adjustments.json"))));
  assert.equal(ymd(file.hijri(at(19))),"1447-9-30");
  assert.equal(ymd(file.hijri(at(20))),"1447-10-1");
  /* Announced a day later than the table: Ramadan gains a day. */
  const later=loadHijri({"1447-10":"2026-03-21"});
  assert.equal(ymd(later.hijri(at(20))),"1447-9-"+(plain.hijri(at(19)).d+1));
  assert.equal(ymd(later.hijri(at(21))),"1447-10-1");
  assert.equal(ymd(later.hijri(at(25))),"1447-10-5");
  /* Announced a day earlier: the last table day of Ramadan becomes 1 Shawwal. */
  const earlier=loadHijri({"1447-10":"2026-03-19"});
  assert.equal(ymd(earlier.hijri(at(18))),ymd(plain.hijri(at(18))));
  assert.equal(ymd(earlier.hijri(at(19))),"1447-10-1");
  assert.equal(ymd(earlier.hijri(at(20))),"1447-10-2");
});
test("the reader's own Hijri offset shifts the date and stays within ±2 days",()=>{
  assert.equal(ymd(loadHijri({},1).hijri(noon(2026,11,3))),"1448-5-24");
  assert.equal(ymd(loadHijri({},-9).hijri(noon(2026,11,3))),"1448-5-21");
});
test("the adjustments file is well formed and fetched past the service worker cache",()=>{
  const ctx=loadHijri({});
  const months=ctx.valid(JSON.parse(read("data/hijri-adjustments.json")));
  assert.ok(Object.keys(months).length>0);
  assert.deepEqual(Object.keys(ctx.valid({months:{"1447-13":"2026-01-01","1447-9":"bad"}})),[]);
  assert.match(read("sw.js"),/hijri-adjustments\\\.json\$\/\.test\(url\.pathname\)\)return;/);
});
test("the prayer tab opens the in-app prayer screen, not the old dialog",()=>{
  const boot=read("src/home/bootstrap.js"),html=read("src/home/index.html");
  assert.match(html,/id="zt-prayer-page" hidden/);
  assert.match(boot,/zk-launch-prayer"\)\?\.addEventListener\("click",\(\)=>\{\s*if\(!zkLaunchVisible\(\)\)zkShowLaunch\(\);\s*ztSetView\("prayer"\)/);
  assert.match(boot,/if\(ztView!=="today"\)\{ztSetView\("today"\)/);
  assert.match(read("src/home/app.js"),/@include today\.js \*\/\n\/\* @include prayer-screen\.js/);
});
