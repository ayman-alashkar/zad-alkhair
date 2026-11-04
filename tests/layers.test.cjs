"use strict";
/* الشريط السفلي ثابت فوق الصفحة، فكل ما يُفتح فوقها (النوافذ ولوحة الجزء والتنبيه)
   يجب أن يعلوه، وإلا اختفت أزرار الحفظ والرسائل تحته. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"..","src/home/styles.css"),"utf8");

function zOf(selector){
  const re=new RegExp("(^|\\})"+selector.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\{[^}]*z-index:(\\d+)","g");
  const all=[...css.matchAll(re)].map(m=>Number(m[2]));
  assert.ok(all.length,`no z-index for ${selector}`);
  return all[all.length-1];
}

test("overlays sit above the bottom tab bar",()=>{
  const tabs=zOf(".zk-tabs");
  for(const sel of [".modal",".scrim",".sheet",".toast",".app-confirm-overlay"]){
    assert.ok(zOf(sel)>tabs,`${sel} (${zOf(sel)}) must be above .zk-tabs (${tabs})`);
  }
  assert.ok(zOf(".toast")>zOf(".modal"),"toast must show above open dialogs");
  assert.ok(zOf(".app-confirm-overlay")>zOf(".modal"),"confirm must show above the dialog that opened it");
});
