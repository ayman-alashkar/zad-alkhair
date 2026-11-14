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

/* زر «افتح زاد الخير» يحمل رمز دخول لصاحب الرسالة (?login=)، فيُعرف المستخدم
   في أي متصفح يُفتح منه الزر. فشل إصدار الرمز لا يمنع الإرسال. */
test("the «افتح زاد الخير» button carries the recipient's login token",()=>{
  for(const name of FUNCTIONS){
    const src=read(name);
    assert.match(src,/rpc\("issue_login_link", \{ p_chat: chat \}\)/,`${name} issues a login token for the recipient`);
    assert.match(src,/searchParams\.set\("login", login\)/,`${name} puts the token on the app link`);
    assert.match(src,/await loginToken\(chat\)/,`${name} uses the token when sending`);
    assert.match(src,/async function loginToken[\s\S]*?catch \{\s*return "";/,`${name} falls back to a plain link`);
  }
});

test("the app redeems ?login before opening the khatmah and removes it from the address",()=>{
  const account=fs.readFileSync(path.join(root,"src/home/account.js"),"utf8");
  const boot=fs.readFileSync(path.join(root,"src/home/bootstrap.js"),"utf8");
  assert.match(account,/url\.searchParams\.delete\("login"\)/);
  assert.match(account,/rpc\("redeem_login_link",\{p_token:token,p_device:deviceId\(\)\}\)/);
  assert.ok(boot.indexOf("takeLoginToken()")<boot.indexOf("zkCaptureIncomingKhatmah();\n"),"token is taken before the hash is captured");
  assert.match(boot,/zkLoginReady\.finally\(boot\)/);
});

/* «ادخل عبر تيليغرام»: البوت لا يُدخل أحدًا بمجرد فتح الرابط، بل يعرض الاسم وزر تأكيد. */
test("the bot asks for an explicit confirmation before a Telegram login",()=>{
  const src=read("telegram-webhook");
  assert.match(src,/\/\^login_\[0-9a-f\]\{32\}\$\/\.test\(code\)/,"/start login_<nonce> is recognised");
  assert.match(src,/p_confirm: false/,"opening the link only previews");
  assert.match(src,/callback_data: `lg:\$\{nonce\}`/,"an explicit confirm button");
  assert.match(src,/data\.startsWith\("lg:"\)[\s\S]*?p_confirm: true/,"the button confirms");
});
