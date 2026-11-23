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
/* الروابط ورمز الدخول في المكتبة المشتركة؛ كل وظيفة تستوردها ولا تبني روابطها بنفسها. */
const shared=name=>fs.readFileSync(path.join(root,"supabase/functions/_shared",name),"utf8");

test("Telegram and notification links open the unified reader path",()=>{
  assert.ok(fs.existsSync(path.join(root,"quran-read/index.html")),"the reader lives at /quran-read/");
  const links=shared("links.ts");
  assert.match(links,/new URL\("quran-read\/", root\)/,"the reader link is built on /quran-read/");
  for(const name of FUNCTIONS){
    const src=read(name);
    assert.doesNotMatch(src,/reader\.html|["'`]surah\/|["'`]quran\/["'`]|new URL\(/,`${name} builds links itself instead of using _shared/links.ts`);
    assert.match(src,/from "\.\.\/_shared\/links\.ts"/,`${name} uses the shared links`);
  }
});

test("juz reminders open the reader on the juz with the khatmah code",()=>{
  const links=shared("links.ts");
  assert.match(links,/searchParams\.set\("juz", String\(juz\)\)/,"the juz is passed to the reader");
  assert.match(links,/searchParams\.set\("code", String\(code\)\.trim\(\)\.toUpperCase\(\)\)/,"the khatmah code is passed");
  assert.match(read("send-reminders"),/readerLink\(code, n\)/,"each reminded juz links to its page");
});

/* زر «افتح زاد الخير» يحمل رمز دخول لصاحب الرسالة (?login=)، فيُعرف المستخدم
   في أي متصفح يُفتح منه الزر. فشل إصدار الرمز لا يمنع الإرسال. */
test("the «افتح زاد الخير» button carries the recipient's login token",()=>{
  const supa=shared("supabase.ts");
  assert.match(supa,/rpc\("issue_login_link", \{ p_chat: chat \}\)/,"a login token is issued for the recipient");
  assert.match(supa,/async function loginToken[\s\S]*?catch \{\s*return "";/,"failure falls back to a plain link");
  assert.match(shared("links.ts"),/searchParams\.set\("login", login\)/,"the token goes on the app link");
  for(const name of FUNCTIONS){
    assert.match(read(name),/navRows\(.*await loginToken\(chat\)\)/,`${name} puts the token on its buttons`);
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

/* طُلب اسم غير مربوط بالحساب الذي فُتح: البوت يذكر الاسمين، والزر يُدخل باسم صاحب الحساب. */
test("the bot names both the requested name and the account's own name when they differ",()=>{
  const src=read("telegram-webhook");
  assert.match(src,/if \(r\.wanted\)/);
  assert.match(src,/طُلب الدخول باسم «\$\{esc\(r\.wanted\)\}»، لكن حساب تيليغرام هذا مربوط باسم «\$\{esc\(r\.name\)\}»/);
  assert.match(src,/text: `ادخل باسم «\$\{r\.name\}»`/);
});
