const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync(process.env.READER_PATH||__dirname+"/../reader.html","utf8");
const start=html.indexOf("const pageFitJobs=new WeakMap();");
const end=html.indexOf("\nfunction clearVerseSelection()",start);
if(start<0||end<0)throw Error("Page fitting implementation not found");

function fixture(){
  const frames=[];
  const normals=Array.from({length:15},()=>({
    style:{},getBoundingClientRect(){const size=parseFloat(this.style.fontSize)||104;return {width:size*16,height:size*1.33}}
  }));
  const rows=normals.map(inner=>({
    querySelector:()=>inner,getBoundingClientRect:()=>({height:inner.getBoundingClientRect().height})
  }));
  const stage={clientWidth:400,clientHeight:800,scrollTop:0,classList:{remove(){},toggle(){}}};
  const host={style:{},clientWidth:400,children:rows,querySelectorAll(selector){return selector.includes(":not")?normals:[]}};
  const root={isConnected:true,querySelector(selector){return selector===".page-stage"?stage:selector===".mushaf"?host:null}};
  const ctx=vm.createContext({
    document:{querySelector:()=>root},requestAnimationFrame:fn=>frames.push(fn),
    getComputedStyle:()=>({marginTop:"0",marginBottom:"0"}),
    INK_GUARD:.45,MIN_LINE_PX:24,FLOOR_TOLERANCE:.90,
    surahGlyphAspect:()=>1,renderSurahHeaderCanvas(){}
  });
  vm.runInContext(html.slice(start,end),ctx);
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
