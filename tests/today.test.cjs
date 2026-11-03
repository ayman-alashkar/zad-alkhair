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
  assert.doesNotMatch(today,/(^|[^.\w])(code|viewer|state)\s*=[^=]/m);
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
