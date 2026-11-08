const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync(__dirname+"/../src/reader/page-fit.js","utf8");

function fixture({width=400,height=800,columnWidth=width,page=42,headerCount=0,normalCount=15,widthFit=false,chromeHeight=0}={}){
  const frames=[];
  const normals=Array.from({length:normalCount},()=>({
    style:{},getBoundingClientRect(){const size=parseFloat(this.style.fontSize)||104;return {width:size*16,height:size*1.33}}
  }));
  const surahs=[],basmalas=[],inners=[];
  for(let i=0;i<headerCount;i++){
    const banner={style:{},dataset:{glyph:"header"}};
    const title={style:{},querySelector:()=>banner,
      getBoundingClientRect(){const size=parseFloat(this.style.fontSize)||108;return {width:size*16,height:Math.max(size*1.08,parseFloat(this.style.minHeight)||0)}}};
    const basmala={style:{},
      getBoundingClientRect(){const size=parseFloat(this.style.fontSize)||96;return {width:size*10,height:size*1.25}}};
    surahs.push(title);basmalas.push(basmala);inners.push(title,basmala);
    inners.push(...normals.slice(Math.floor(i*normalCount/headerCount),Math.floor((i+1)*normalCount/headerCount)));
  }
  if(!headerCount)inners.push(...normals);
  const rows=inners.map(inner=>({
    querySelector:()=>inner,getBoundingClientRect:()=>({height:inner.getBoundingClientRect().height})
  }));
  const classes=new Set();
  const stage={clientWidth:width,clientHeight:height,scrollTop:0,classList:{
    remove(name){classes.delete(name)},toggle(name,on){if(on)classes.add(name);else classes.delete(name)},contains:name=>classes.has(name)
  }};
  const host={style:{},clientWidth:columnWidth,get clientHeight(){return stage.clientHeight-chromeHeight},widthFit,children:rows,querySelectorAll(selector){
    return selector.includes(":not")?normals:selector===".surah-line"?surahs:selector===".bismillah-line"?basmalas:[];
  }};
  const root={isConnected:true,querySelector(selector){return selector===".page-stage"?stage:selector===".mushaf"?host:null}};
  const ctx=vm.createContext({
    document:{querySelector:()=>root},requestAnimationFrame:fn=>frames.push(fn),
    getComputedStyle:()=>({marginTop:"0",marginBottom:"0",getPropertyValue:()=>host.widthFit?"1":"0"}),
    INK_GUARD:.45,MIN_LINE_PX:24,FLOOR_TOLERANCE:.90,
    surahGlyphAspect:()=>12,renderSurahHeaderCanvas(){}
  });
  vm.runInContext(source,ctx);
  return {ctx,root,stage,host,normals,surahs,basmalas,run:()=>vm.runInContext(`fitPage(${page})`,ctx),
    contentHeight:()=>rows.reduce((sum,row)=>sum+row.getBoundingClientRect().height,0)+(parseFloat(host.style.gap)||0)*(rows.length-1),
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

test("comfortable portrait pages keep their approved text size",()=>{
  const f=fixture();f.run();f.frame();f.frame();
  assert.ok(Math.abs(parseFloat(f.normals[0].style.fontSize)-24.625)<.001);
  assert.ok(!f.stage.classList.contains("scrolls"));
  assert.ok(f.contentHeight()<=f.stage.clientHeight);
});

test("page heading and footer do not count towards the Quran fitting height",()=>{
  const baseline=fixture();baseline.run();baseline.frame();baseline.frame();
  const page=fixture({height:877,chromeHeight:77});page.run();page.frame();page.frame();
  assert.equal(page.normals[0].style.fontSize,baseline.normals[0].style.fontSize);
  assert.equal(page.host.style.gap,baseline.host.style.gap);
  assert.ok(page.contentHeight()<=page.host.clientHeight);
  assert.ok(!page.stage.classList.contains("scrolls"));
});

test("a short full-page layout reserves space without clipping its last row",()=>{
  const f=fixture({width:1363,height:859,columnWidth:780});f.run();f.frame();f.frame();
  assert.ok(parseFloat(f.host.style.gap)>=6);
  assert.ok(!f.stage.classList.contains("scrolls"));
  assert.ok(f.contentHeight()<=f.stage.clientHeight);
  assert.ok(parseFloat(f.normals[0].style.fontSize)>=24);
});

test("landscape scrolling keeps readable rows and resets only on return to a full page",()=>{
  const f=fixture({width:844,height:313,columnWidth:780});f.stage.scrollTop=90;
  f.run();f.frame();f.frame();
  assert.ok(f.stage.classList.contains("scrolls"));
  assert.ok(parseFloat(f.host.style.gap)>=6);
  assert.equal(parseFloat(f.normals[0].style.fontSize),24);
  assert.equal(f.stage.scrollTop,90);
  assert.ok(f.contentHeight()>f.stage.clientHeight);
  f.stage.clientWidth=390;f.stage.clientHeight=767;f.host.clientWidth=386;
  f.run();f.frame();f.frame();
  assert.ok(!f.stage.classList.contains("scrolls"));
  assert.equal(f.stage.scrollTop,0);
  assert.ok(f.contentHeight()<=f.stage.clientHeight);
});

test("three Surah banners and their basmalas retain their own reserved height",()=>{
  const f=fixture({width:844,height:313,columnWidth:780,headerCount:3,normalCount:9});
  f.run();f.frame();f.frame();
  assert.ok(f.stage.classList.contains("scrolls"));
  assert.ok(parseFloat(f.host.style.gap)>=6);
  for(const title of f.surahs){
    const banner=title.querySelector("canvas.surah-banner");
    assert.ok(parseFloat(title.style.minHeight)>=parseFloat(banner.style.width)/12-.001);
  }
  f.stage.clientWidth=390;f.stage.clientHeight=767;f.host.clientWidth=386;
  f.run();f.frame();f.frame();
  assert.ok(!f.stage.classList.contains("scrolls"));
  assert.ok(f.contentHeight()<=f.stage.clientHeight);
  for(const title of f.surahs){
    const banner=title.querySelector("canvas.surah-banner");
    assert.ok(parseFloat(title.style.minHeight)>=parseFloat(banner.style.width)/12-.001);
  }
});

test("touch landscape fills the available width and restores the portrait fit",()=>{
  const f=fixture({width:844,height:313,columnWidth:812,widthFit:true});
  f.run();f.frame();f.frame();
  const size=parseFloat(f.normals[0].style.fontSize);
  assert.ok(size>48);
  assert.ok(size*16>=f.host.clientWidth*.98&&size*16<=f.host.clientWidth);
  assert.ok(f.stage.classList.contains("scrolls"));
  assert.ok(parseFloat(f.host.style.gap)>=size*.15);
  assert.ok(parseFloat(f.host.style.paddingTop)>=10);
  assert.ok(parseFloat(f.host.style.paddingBottom)>=26);
  f.stage.scrollTop=300;
  f.stage.clientWidth=390;f.stage.clientHeight=767;f.host.clientWidth=386;f.host.widthFit=false;
  f.run();f.frame();f.frame();
  const portrait=fixture({width:390,height:767,columnWidth:386});portrait.run();portrait.frame();portrait.frame();
  assert.equal(f.normals[0].style.fontSize,portrait.normals[0].style.fontSize);
  assert.ok(!f.stage.classList.contains("scrolls"));
  assert.equal(f.stage.scrollTop,0);
  assert.equal(f.host.style.paddingTop,"");
  assert.equal(f.host.style.paddingBottom,"");
});

test("wide touch screens can enlarge beyond the measurement font size",()=>{
  const f=fixture({width:2200,height:900,columnWidth:2168,widthFit:true});
  f.run();f.frame();f.frame();
  const size=parseFloat(f.normals[0].style.fontSize);
  assert.ok(size>104);
  assert.ok(size*16>=f.host.clientWidth*.98&&size*16<=f.host.clientWidth);
  assert.ok(f.stage.classList.contains("scrolls"));
});

test("width fitting preserves title reservations on opening and multi-Surah pages",()=>{
  for(const page of [1,2,604]){
    const f=fixture({width:844,height:313,columnWidth:812,widthFit:true,page,
      headerCount:page===604?3:1,normalCount:page===604?9:6});
    f.run();f.frame();f.frame();
    const size=parseFloat(f.normals[0].style.fontSize);
    assert.ok(size>48);
    assert.ok(parseFloat(f.host.style.gap)>=6);
    assert.ok(f.stage.classList.contains("scrolls"));
    for(const title of f.surahs){
      const banner=title.querySelector("canvas.surah-banner");
      assert.ok(parseFloat(title.style.minHeight)>=parseFloat(banner.style.width)/12-.001);
    }
    assert.ok(f.basmalas.every(line=>parseFloat(line.style.fontSize)>40));
  }
});
