/* اختبارات متصفح حقيقي بحجم هاتف. تلتقط ما لا تراه اختبارات الشيفرة: عنصر مخفي تحت
   الشريط السفلي، أو خطأ JavaScript يوقف الصفحة. لا تتصل بالقاعدة الحقيقية: كل نداء إلى
   Supabase يُجاب ببيانات وهمية، وكل طلب خارجي آخر يُمنع.

   التشغيل: npm run test:browser (يحتاج playwright وChromium؛ يثبّتهما خط GitHub وحده).
   على جهاز فيه Chrome: CHROME_PATH=/usr/bin/google-chrome npm run test:browser */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 4391;
const BASE = `http://127.0.0.1:${PORT}`;

let server, browser;

test.before(async () => {
  server = spawn(process.execPath, ["scripts/serve.cjs"], { cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE + "/")).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] } : {});
});

test.after(async () => {
  await browser?.close();
  server?.kill();
});

/* صفحة هاتف، مع ردود وهمية لنداءات القاعدة. */
async function phonePage({ rpc = {}, storage = {} } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  await context.addInitScript(items => {
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
  }, storage);
  await context.route(url => !url.href.startsWith(BASE), async route => {
    const m = route.request().url().match(/\/rest\/v1\/rpc\/([a-z_]+)/);
    if (m) {
      const body = m[1] in rpc ? rpc[m[1]] : null;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    }
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  return { page, errors, context };
}

/* هل العنصر هو ما يظهر فعلًا في منتصفه، لا شيءٌ يغطيه؟ */
const isOnTop = (page, selector) => page.$eval(selector, el => {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height || r.bottom > innerHeight || r.top < 0) return false;
  /* التنبيه لا يستقبل اللمس (pointer-events:none)، فيُفعَّل لحظةَ الفحص وحدها. */
  const before = el.style.pointerEvents;
  el.style.pointerEvents = "auto";
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  el.style.pointerEvents = before;
  return hit === el || el.contains(hit);
});

test("home opens on a phone without script errors and shows the bottom tabs", async () => {
  const { page, errors, context } = await phonePage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(800);
  assert.ok(await page.isVisible("#zk-tabs"), "bottom tabs visible");
  assert.deepEqual(errors, []);
  await context.close();
});

test("a tall dialog's last button and a toast are not hidden by the bottom tabs", async () => {
  const { page, errors, context } = await phonePage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    zkHideLaunch();
    const rows = Array.from({ length: 12 }, (_, i) => `<div class="field-row"><label>حقل ${i}</label><input class="field"></div>`).join("");
    modal(`<div class="display">إعدادات</div>${rows}<div class="actions"><button class="btn gold" id="t-save">احفظ</button></div>`);
    document.querySelector(".modal .frame").scrollTop = 1e6;
    toast("تنبيه تجريبي");
  });
  await page.waitForTimeout(500);
  assert.ok(await isOnTop(page, "#t-save"), "save button reachable");
  assert.ok(await isOnTop(page, "#toast"), "toast visible");
  assert.deepEqual(errors, []);
  await context.close();
});

test("a khatmah card says «افتح الختمة» on a member's device and opens without a code", async () => {
  const cards = [
    { publicId: "p-mine", title: "ختمتي", accessType: "private", participantCount: 5, reservedCount: 10, doneCount: 2, endDate: "2030-01-01" },
    { publicId: "p-other", title: "ختمة أخرى", accessType: "private", participantCount: 3, reservedCount: 4, doneCount: 1, endDate: "2030-01-01" }
  ];
  /* سجل قديم بلا publicId: يُكمَل من get_state، ثم تتعرّف عليه البطاقة. */
  const { page, errors, context } = await phonePage({
    rpc: { list_active_khatmahs: cards, get_state: { publicId: "p-mine", code: "ABCD", title: "ختمتي", members: [], juz: [] } },
    storage: { "zad:mine": JSON.stringify([{ code: "ABCD", name: "قارئ", title: "ختمتي", at: 1 }]) }
  });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.click("#zk-launch-zad");
  await page.waitForFunction(() => document.querySelector('[data-khatmah-card="p-mine"]')?.textContent.includes("افتح الختمة"), null, { timeout: 5000 });
  assert.equal((await page.textContent('[data-khatmah-card="p-other"]')).trim(), "أدخل الرمز");
  await page.click('[data-khatmah-card="p-mine"]');
  await page.waitForFunction(() => location.hash === "#ABCD", null, { timeout: 3000 });
  assert.equal(await page.$("#card-code"), null, "no code prompt");
  assert.deepEqual(errors, []);
  await context.close();
});

test("the reader opens on a phone without script errors", async () => {
  const { page, errors, context } = await phonePage();
  await page.goto(BASE + "/reader.html?home=1", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  assert.deepEqual(errors, []);
  await context.close();
});
