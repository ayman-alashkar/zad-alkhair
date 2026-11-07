const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const source=name=>fs.readFileSync(path.join(__dirname,"../src/reader",name),"utf8");

function fixture(url="https://zad-alkhair.net/quran-read/?page=9"){
  const values=new Map(),messages=[],state={blocked:false,url};
  const nodes=new Map();
  const node=()=>({style:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){}});
  const ctx=vm.createContext({
    TOTAL_PAGES:604,RECITERS:[{id:"test"}],defaultReciter:()=>({id:"test"}),
    URL,URLSearchParams,Map,Set,Date,setTimeout,clearTimeout,
    location:new URL(url),history:{replaceState(a,b,next){state.url=next}},
    document:{prerendering:false,addEventListener(){},querySelector:selector=>selector.startsWith("meta")?{content:"1,2,3"}:null,querySelectorAll:()=>[],
      getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)}},
    window:{addEventListener(){}},
    localStorage:{getItem:k=>values.get(k)??null,setItem(k,v){if(state.blocked)throw Error("storage unavailable");values.set(k,String(v))}},
    showToast:m=>messages.push(m),escapeHtml:s=>s
  });
  vm.runInContext(source("state.js")+"\n"+source("reading-tools.js")+`
    this.api={loadReadingMark,saveReadingMark,saveLastPosition,cleanConsumedReaderTarget,loadPageBookmarks,loadAyahBookmarks,
      move(p,verse=null){currentPage=p;selectedKey=verse}};`,ctx);
  return {api:ctx.api,values,messages,state};
}

test("browsing and automatic progress never move the deliberate reading mark",()=>{
  const f=fixture();f.api.move(9,"2:60");assert.equal(f.api.saveReadingMark(),true);
  f.api.move(25);f.api.saveLastPosition();
  assert.equal(f.api.loadReadingMark().page,9);assert.equal(f.api.loadReadingMark().verse,"2:60");
  assert.equal(JSON.parse(f.values.get("zad:qcf4:last-position")).page,25);
  f.api.move(30);f.api.saveReadingMark();
  assert.equal(f.api.loadReadingMark().page,30);assert.equal(f.api.loadReadingMark().verse,null);
});

test("saving the stopping point preserves existing page and ayah bookmarks",()=>{
  const f=fixture(),pages=[{page:7,savedAt:1}],ayahs=[{page:8,verse:"2:50",savedAt:1}];
  f.values.set("zad:qcf4:page-bookmarks",JSON.stringify(pages));
  f.values.set("zad:qcf4:ayah-bookmarks",JSON.stringify(ayahs));
  f.api.move(9);f.api.saveReadingMark();
  assert.equal(JSON.stringify(f.api.loadPageBookmarks()),JSON.stringify(pages));
  assert.equal(JSON.stringify(f.api.loadAyahBookmarks()),JSON.stringify(ayahs));
});

test("invalid or unavailable storage cannot report a successfully saved mark",()=>{
  const f=fixture();
  for(const page of [0,605,2.5,"bad"]){f.values.set("zad:qcf4:reading-mark-v1",JSON.stringify({page}));assert.equal(f.api.loadReadingMark(),null)}
  f.api.move(9);f.state.blocked=true;assert.equal(f.api.saveReadingMark(),false);
  assert.match(f.messages.at(-1),/تعذّر/);
});

test("after navigating from a direct surah link, reload points to the current page",()=>{
  const f=fixture("https://zad-alkhair.net/quran-read/2/?ayah=58&from=zad&code=AB12");
  f.api.move(10);f.api.cleanConsumedReaderTarget();
  const url=new URL(f.state.url);
  assert.equal(url.pathname,"/quran-read/");assert.equal(url.searchParams.get("page"),"10");
  assert.equal(url.searchParams.has("ayah"),false);assert.equal(url.searchParams.get("code"),"AB12");
});

test("the explicit incoming target is not consumed merely by loading reading tools",()=>{
  const url="https://zad-alkhair.net/quran-read/?juz=15";
  assert.equal(fixture(url).state.url,url);
});
