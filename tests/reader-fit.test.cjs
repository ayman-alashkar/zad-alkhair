const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync(__dirname+"/../src/reader/page-fit.js","utf8");

function fixture({width=400,height=800,tablet=false}={}){
  const frames=[];
  const normals=Array.from({length:15},()=>({
    style:{},getBoundingClientRect(){const size=parseFloat(this.style.fontSize)||104;return {width:size*16,height:size*1.33}}
  }));
  const rows=normals.map(inner=>({
    querySelector:()=>inner,getBoundingClientRect:()=>({height:inner.getBoundingClientRect().height})
  }));
  const stage={clientWidth:width,clientHeight:height,scrollTop:0,classList:{remove(){},toggle(){}}};
  const host={style:{},clientWidth:400,children:rows,querySelectorAll(selector){return selector.includes(":not")?normals:[]}};
  const root={isConnected:true,querySelector(selector){return selector===".page-stage"?stage:selector===".mushaf"?host:null}};
  const ctx=vm.createContext({
    document:{querySelector:()=>root},requestAnimationFrame:fn=>frames.push(fn),
    getComputedStyle:()=>({marginTop:"0",marginBottom:"0"}),
    INK_GUARD:.45,MIN_LINE_PX:24,FLOOR_TOLERANCE:.90,
    surahGlyphAspect:()=>1,renderSurahHeaderCanvas(){},
    matchMedia:()=>({matches:tablet})
  });
  vm.runInContext(source,ctx);
  return {ctx,root,stage,host,normals,run:()=>vm.runInContext("fitPage(42)",ctx),
    frame(){const pending=frames.splice(0);pending.forEach(f=>f())}};
}

test("overlapping fits use the same correct scale as a single fit",()=>{
  const baseline=fixture();baseline.run();baseline.frame();baseline.frame();
  const overlapping=fixture();overlapping.run();overlapping.run();overlapping.frame();overlapping.frame();
  const expected=parseFloat(baseline.normals[0].style.fontSize);
  const actual=parseFloat(overlapping.normals[0].style.fontSize);
  assert.ok(expected<30&&expected>0);
  assert.equal(actual,expected);
  assert.ok(actual*16<=overlapping.stage.clientWidth);
});

test("superseded layout work cannot overwrite the latest page fit",()=>{
  const f=fixture();f.run();f.frame();f.stage.clientWidth=320;f.run();f.frame();f.frame();
  const size=parseFloat(f.normals[0].style.fontSize);
  assert.ok(size*16<=320);
});

test("a fit queued for a removed page does not mutate it",()=>{
  const f=fixture();f.run();f.root.isConnected=false;f.frame();
  assert.equal(f.normals[0].style.fontSize,undefined);
});

test("a page with no measurable dimensions keeps its previous font size",()=>{
  const f=fixture();f.normals[0].style.fontSize="22px";f.stage.clientWidth=0;f.run();f.frame();
  assert.equal(f.normals[0].style.fontSize,"22px");
});

test("a tablet reserves space between lines without changing the phone or clipping Quran rows",()=>{
  const ordinary=fixture({width:800,height:1000});ordinary.run();ordinary.frame();
  const tablet=fixture({width:800,height:1000,tablet:true});tablet.run();tablet.frame();
  const size=parseFloat(tablet.normals[0].style.fontSize),gap=parseFloat(tablet.host.style.gap);
  assert.ok(gap>parseFloat(ordinary.host.style.gap));
  assert.ok(size>=24&&size*16<=800);
  assert.ok(size*1.33*15+gap*14<=1000);
});
