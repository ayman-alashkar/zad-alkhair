"use strict";
/* رمز المشرف الجديد ستة محارف فأكثر، كما يفرض الخادم منذ ترحيل ٢٠٢٦١١٠٤.
   رمز الختمة يبقى أربعة محارف. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("organizer code needs six characters, matching the server",()=>{
  const org=read("src/home/organizer.js");
  assert.doesNotMatch(org,/nc\.length<4/);
  assert.equal((org.match(/nc\.length<6/g)||[]).length,2);
  assert.match(read("src/home/ui-bindings.js"),/oc\.length<6/);
});
