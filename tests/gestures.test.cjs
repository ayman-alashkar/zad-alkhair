"use strict";
/* وحدة الضغطات وعلامات الآيات: تعمل على data-ayah وdata-gi وحدها، أيًّا كان المحرّك. */
const test=require("node:test");
const assert=require("node:assert/strict");
const path=require("node:path");

/* عناصر مصغّرة: closest وparentElement وdataset فقط، وهي كل ما تستعمله الوحدتان */
function el(attrs={},parent=null){
  const node={dataset:{...attrs},parentElement:parent,classList:new Set(),
    closest(sel){
      const m=sel.match(/^\[data-(ayah|gi)(?:="([^"]+)")?\]$/);
      for(let n=this;n;n=n.parentElement){
        const key=m[1]==="ayah"?"ayah":"gi";
        if(n.dataset[key]!==undefined&&(m[2]===undefined||n.dataset[key]===m[2]))return n;
      }
      return null;
    }};
  return node;
}
function fakeRoot(){
  const handlers={};
  return {handlers,addEventListener:(t,fn)=>{handlers[t]=fn}};
}
const load=()=>Promise.all([import(path.join(__dirname,"..","src/reader/gestures.mjs")),import(path.join(__dirname,"..","src/reader/ayah-marks.mjs"))]);

test("a press on a word reports its ayah, its fixed word number and the ayah's outer element",async()=>{
  const [,marks]=await load();
  const line=el({});
  const segment=el({ayah:"2:255"},line);
  const word=el({ayah:"2:255",gi:"3012"},segment);
  const at=marks.ayahAt(word);
  assert.equal(at.ayah,"2:255");assert.equal(at.gi,3012);
  assert.equal(at.anchor,segment,"the anchor is the outermost element of the ayah");
  assert.equal(at.word,word);
  const plain=el({ayah:"2:256"},line);
  const p=marks.ayahAt(plain);
  assert.equal(p.gi,null,"an engine that has no word numbers yet still reports the ayah");
  assert.equal(p.anchor,plain);
  assert.equal(marks.ayahAt(line),null,"outside any ayah there is nothing to report");
});

test("tap, long press and double tap are announced, never decided",async(t)=>{
  const [g]=await load();
  t.mock.timers.enable({apis:["setTimeout","Date"]});
  const root=fakeRoot();g.bindGestures(root);
  const seen=[];
  g.onGesture("tap",d=>seen.push(["tap",d.ayah,d.gi]));
  g.onGesture("longPress",d=>seen.push(["long",d.ayah]));
  const word=el({ayah:"1:2",gi:"5"},el({ayah:"1:2"}));
  const press=(x=10,y=10)=>root.handlers.pointerdown({target:word,clientX:x,clientY:y});
  const click=()=>root.handlers.click({target:word,clientX:10,clientY:10});

  press();t.mock.timers.tick(100);root.handlers.pointerup();click();
  assert.deepEqual(seen.at(-1),["tap","1:2",5]);

  t.mock.timers.tick(1000);
  press();t.mock.timers.tick(600);root.handlers.pointerup();click();
  assert.deepEqual(seen.at(-1),["long","1:2"],"a long press is not followed by a tap");
  assert.equal(seen.filter(s=>s[0]==="tap").length,1);

  press();root.handlers.pointermove({clientX:40,clientY:10});t.mock.timers.tick(600);click();
  assert.equal(seen.length,2,"moving the finger cancels both");

  t.mock.timers.tick(1000);
  press();click();t.mock.timers.tick(100);press();click();
  assert.deepEqual(seen.slice(-2).map(s=>s[0]),["tap","tap"],"without a double-tap listener, the second tap stays a tap");
  g.onGesture("doubleTap",d=>seen.push(["double",d.ayah]));
  t.mock.timers.tick(1000);
  press();click();t.mock.timers.tick(100);press();click();
  assert.deepEqual(seen.slice(-2),[["tap","1:2",5],["double","1:2"]]);
  assert.throws(()=>g.onGesture("swipe",()=>{}));
});
