"use strict";
/* رمز الختمة قد يصير أطول من أربعة محارف (gen_code يقبل حتى ٨)، فلا يجوز أن تقصّه
   الواجهة أو ترفضه. ورمز المشرف الجديد ستة محارف فأكثر كما يفرض الخادم. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("khatmah code readers keep up to eight characters",()=>{
  assert.match(read("src/home/session.js"),/toUpperCase\(\)\.slice\(0,8\)/);
  assert.match(read("src/home/name-matching.js"),/const hashCode=.*\.slice\(0,8\)/);
  assert.match(read("src/reader/reading-tools.js"),/const code=rawCode\.slice\(0,8\)/);
  for(const f of ["src/home/session.js","src/home/name-matching.js","src/reader/reading-tools.js"]){
    assert.doesNotMatch(read(f),/toUpperCase\(\)\.slice\(0,4\)|rawCode\.slice\(0,4\)/,f);
  }
});

test("join fields accept codes of four to eight characters",()=>{
  for(const f of ["src/home/views.js","src/home/dialogs.js"]){
    const src=read(f);
    assert.doesNotMatch(src,/codebox" maxlength="4"/,f);
    assert.match(src,/codebox" maxlength="8"/,f);
  }
  for(const f of ["src/home/ui-bindings.js","src/home/dialogs.js"]){
    assert.doesNotMatch(read(f),/c\.length!==4/,f);
  }
});

test("organizer code needs six characters, matching the server",()=>{
  const org=read("src/home/organizer.js");
  assert.doesNotMatch(org,/nc\.length<4/);
  assert.equal((org.match(/nc\.length<6/g)||[]).length,2);
  assert.match(read("src/home/ui-bindings.js"),/oc\.length<6/);
});
