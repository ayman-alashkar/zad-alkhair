"use strict";
/* بناء مصحف القراءات (scripts/build-qiraat-mushaf.mjs) على صفحتين: الصفحة الأولى، و507 وفيها أشد السطور ضغطًا. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const ROOT=path.join(__dirname,"..");

test("qiraat mushaf builds: Hafs lines whole, other riwayat only where they differ, every glyph defined",()=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),"qm-"));
  execFileSync(process.execPath,[path.join(ROOT,"scripts/build-qiraat-mushaf.mjs"),`--out=${out}`,"--jobs=2","1","507"],{stdio:"pipe"});
  const meta=JSON.parse(fs.readFileSync(path.join(out,"meta.json"),"utf8"));
  const report=JSON.parse(fs.readFileSync(path.join(out,"report.json"),"utf8"));
  assert.equal(meta.riwayat.length,20);
  assert.equal(report.pages,2);
  for(const pg of [1,507]){
    const P=JSON.parse(fs.readFileSync(path.join(out,"pages",String(pg).padStart(3,"0")+".json"),"utf8"));
    assert.ok(Array.isArray(P.lines.hafs)&&P.lines.hafs.length>=7);
    assert.equal(Object.keys(P.lines).length,20);
    for(const [r,L] of Object.entries(P.lines)){
      if(r==="hafs")continue;
      for(const [li,l] of Object.entries(L)){
        assert.ok(+li<P.lines.hafs.length,`${pg} ${r} line ${li}`);
        assert.notDeepEqual(l,P.lines.hafs[li],`${pg} ${r} line ${li} same as Hafs but stored`);
      }
    }
    for(const l of [...P.lines.hafs,...Object.values(P.lines).flatMap(L=>Array.isArray(L)?[]:Object.values(L))])
      for(let j=0;j<l.g.length;j+=3)assert.ok(meta.glyphs[l.g[j]],`glyph ${l.g[j]} undefined`);
  }
  // الصفحة 507: قالون يخالف حفصًا (صلة ميم الجمع)، وشعبة لا يخالفه في رسم السطور
  const P=JSON.parse(fs.readFileSync(path.join(out,"pages/507.json"),"utf8"));
  assert.ok(Object.keys(P.lines.qalun).length>0);
  assert.ok(report.lines.some(q=>q[0]===507&&q[1]==="hafs"),"507 has squeezed Hafs lines in the report");
  fs.rmSync(out,{recursive:true,force:true});
});
