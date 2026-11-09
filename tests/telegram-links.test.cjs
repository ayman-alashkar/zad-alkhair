"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");

/* روابط البوت والتنبيهات تُبنى على الخادم، فلا تمر بمولّد الصفحات ولا بفحوصه.
   هذا الاختبار يمنعها من العودة إلى مسارات حُذفت من الموقع. */
const FUNCTIONS=["telegram-webhook","send-reminders","send-message","announce","send-completions"];
const read=name=>fs.readFileSync(path.join(root,"supabase/functions",name,"index.ts"),"utf8");

test("Telegram and notification links open the unified reader path",()=>{
  assert.ok(fs.existsSync(path.join(root,"quran-read/index.html")),"the reader lives at /quran-read/");
  for(const name of FUNCTIONS){
    const src=read(name);
    assert.doesNotMatch(src,/reader\.html|["'`]surah\/|["'`]quran\/["'`]/,`${name} still links to a removed page`);
    assert.match(src,/new URL\("quran-read\/", root\)/,`${name} builds its reader link on /quran-read/`);
  }
});

test("juz reminders open the reader on the juz with the khatmah code",()=>{
  for(const name of ["telegram-webhook","send-reminders","send-message"]){
    const src=read(name);
    assert.match(src,/searchParams\.set\("juz", String\(juz\)\)/,`${name} passes the juz to the reader`);
    assert.match(src,/searchParams\.set\("code", String\(code\)\.trim\(\)\.toUpperCase\(\)\)/,`${name} passes the khatmah code`);
  }
});
