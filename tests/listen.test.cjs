const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");

test("both tab bars carry the same five sections, with «التلاوة» third",()=>{
  const home=read("src/home/index.html"),lib=read("src/reader/library.js");
  const homeLabels=[...home.matchAll(/class="zk-tab"[\s\S]*?data-label="([^"]+)"/g)].map(m=>m[1]);
  const readerLabels=[...lib.matchAll(/data-app-tab="[a-z]+"><svg[\s\S]*?data-label="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(homeLabels,["الرئيسية","القرآن","التلاوة","الختمات","المواقيت"]);
  assert.deepEqual(readerLabels,homeLabels);
  for(const css of [read("src/home/styles.css"),read("src/reader/styles.css")])assert.doesNotMatch(css,/tabs[^{]*\{[^}]*repeat\(4,/);
});

test("the listen page lives in the reader, so playback is shared with the mushaf",()=>{
  const app=read("src/reader/app.js"),boot=read("src/reader/bootstrap.js"),ui=read("src/reader/player-ui.js");
  assert.match(app,/@include listen\.js/);
  assert.match(boot,/entry\.listen[\s\S]*openListenPage\(\)/);
  // Every engine change repaints the listen page.
  for(const fn of ["updatePlayer","syncPlay","stopPlayer"]){
    const body=ui.slice(ui.indexOf(`function ${fn}(`)).split(/\nfunction /)[0];
    assert.match(body,/listenPaint\(\)/,fn);
  }
  // Listening there must not move the mushaf or the saved reading position.
  assert.match(ui,/async function syncPlaybackSelection\(requestId\)\{\s*\/\*[^*]*\*\/\s*if\(listenIsOpen\(\)\)return false;/);
});

test("sharing a listening link preserves the prepared reciter and only uses available public routes",()=>{
  const payloads=[];
  const ctx=vm.createContext({
    URL,READER_APP_TABS:"",window:{addEventListener(){}},audio:{addEventListener(){}},HUB_SHARE_ICON:"",
    document:{body:{dataset:{listenShareSurahs:"114"},classList:{contains:()=>false}}},
    location:{href:"https://example.test/reader?listen=1&surah=114"},
    reciter:{id:"SaadAlGhamdi_Hafs"},chapterMap:new Map([[114,{name_arabic:"الناس"}],[113,{name_arabic:"الفلق"}]]),
    publicSurahUrl:s=>`https://example.test/surah/${s}/`,shareHubPayload:p=>payloads.push(p)
  });
  vm.runInContext(read("src/reader/listen.js"),ctx);
  vm.runInContext("listenLinkedSurah=114;listenShare();listenShareSurah(113)",ctx);
  assert.equal(payloads[0].url,"https://example.test/listen/114/?qari=SaadAlGhamdi_Hafs");
  assert.equal(payloads[1].url,"https://example.test/surah/113/");
});

test("ayah counts use the Arabic plural, and the arc maps back to the same fraction",()=>{
  const src=read("src/reader/listen.js");
  const ctx=vm.createContext({ar:n=>String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[+d]),READER_APP_TABS:"",window:{addEventListener(){}},audio:{addEventListener(){}},HUB_SHARE_ICON:""});
  vm.runInContext(src,ctx);
  assert.equal(ctx.listenAyahCount(7),"٧ آيات");
  assert.equal(ctx.listenAyahCount(286),"٢٨٦ آية");
  assert.equal(ctx.listenAyahCount(11),"١١ آية");
  const svg={getBoundingClientRect:()=>({left:0,top:0,width:236,height:124}),viewBox:{baseVal:{x:-8,y:-2,width:236,height:124}}};
  for(const f of [0,.25,.5,.8,1]){
    const [x,y]=ctx.listenArcPoint(f);
    const back=ctx.listenArcFraction({clientX:x+8,clientY:y+2},svg);
    assert.ok(Math.abs(back-f)<1e-9,`${f} → ${back}`);
  }
  // Below the arc's ends the finger snaps to the nearer end.
  assert.equal(ctx.listenArcFraction({clientX:236,clientY:124},svg),0);
  assert.equal(ctx.listenArcFraction({clientX:0,clientY:124},svg),1);
});
