"use strict";
/* تلاوة الرواية المختارة: ملفات كل آية حفص في تلاوة الرواية (src/reader/riwaya-audio.mjs). */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.join(__dirname,"..");
const data=JSON.parse(fs.readFileSync(path.join(ROOT,"data/riwaya-audio.json"),"utf8"));
const load=()=>import(path.join(ROOT,"src/reader/riwaya-audio.mjs"));
const tail=u=>u.slice(u.indexOf("recitations/")+12);

test("every riwaya except Hafs has one reciter",()=>{
  const want=["qalun","warsh","bazzi","qunbul","duri","susi","hisham","dhakwan","shubah","khalaf","khallad","harith","durik","wardan","jammaz","ruwais","rawh","ishaq","idris"];
  assert.deepEqual(Object.keys(data.reciters).sort(),want.sort());
});

test("merged, split and shifted ayahs map to the right files",async()=>{
  const {riwayaAyahFiles:f}=await load();
  const files=(r,s,a)=>f(data,r,s,a).map(tail);
  // قالون على المدني الأول: «الم» داخلة في الآية الأولى، والبقرة 200 هي 198.
  assert.deepEqual(files("qalun",2,1),["257/002001.mp3"]);
  assert.deepEqual(files("qalun",2,2),[]);
  assert.deepEqual(files("qalun",2,200),["257/002198.mp3"]);
  // البسملة ليست آية عند المدنيين، و«عليهم» رأس آية: الآية 7 ملفان.
  assert.deepEqual(files("qalun",1,1),[]);
  assert.deepEqual(files("qalun",1,7),["257/001006.mp3","257/001007.mp3"]);
  // البصري يعدّ «خائفين» (البقرة 114).
  assert.deepEqual(files("duri",2,114),["271/002113.mp3","271/002114.mp3"]);
  // الكوفي مثل حفص.
  assert.deepEqual(files("shubah",2,286),["275/002286.mp3"]);
});

test("Bazzi's missing surah is recorded",()=>{
  assert.deepEqual(data.reciters.bazzi.missing,[64]);
});
