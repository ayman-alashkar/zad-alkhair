"use strict";
/* واجهة محرّكات رسم الصفحة: التسجيل، والتبديل، وإعادة الرسم، وزخرفة رأس الصفحة. */
const test=require("node:test");
const assert=require("node:assert/strict");
const path=require("node:path");

test("engines register, switch, and tell the mushaf to redraw",async()=>{
  const pe=await import(path.join(__dirname,"..","src/reader/page-engine.mjs"));
  const qcf={id:"qcf",prepare:async()=>"q",renderLines(){}};
  const dk={id:"digitalkhatt",prepare:async()=>"d",renderLines(){}};
  pe.registerEngine(qcf);
  assert.equal(pe.activeEngine(),qcf,"QCF is the default");
  const changes=[];pe.onEngineChange(id=>changes.push(id));
  await pe.setActiveEngine("missing");
  assert.equal(pe.activeEngine(),qcf,"an unknown engine is ignored");
  pe.registerEngine(dk);
  await pe.setActiveEngine("digitalkhatt");
  assert.equal(pe.activeEngine(),dk);assert.equal(pe.activeEngineId(),"digitalkhatt");
  await pe.setActiveEngine("digitalkhatt");
  assert.deepEqual(changes,["digitalkhatt"],"switching to the active engine redraws nothing");
  await pe.setActiveEngine("qcf");
});

test("page header decorators run on each drawn page header",async()=>{
  const pe=await import(path.join(__dirname,"..","src/reader/page-engine.mjs"));
  const seen=[];pe.onPageHeader((el,page)=>seen.push([el.id,page]));
  pe.decoratePageHeader({id:"meta-5"},5);
  pe.decoratePageHeader(null,6);
  assert.deepEqual(seen,[["meta-5",5]]);
});
