/* اختبارات متصفح حقيقي بحجم هاتف. تلتقط ما لا تراه اختبارات الشيفرة: عنصر مخفي تحت
   الشريط السفلي، أو خطأ JavaScript يوقف الصفحة. لا تتصل بالقاعدة الحقيقية: كل نداء إلى
   Supabase يُجاب ببيانات وهمية، وكل طلب خارجي آخر يُمنع.

   التشغيل: npm run test:browser (يحتاج playwright وChromium؛ يثبّتهما خط GitHub وحده).
   على جهاز فيه Chrome: CHROME_PATH=/usr/bin/google-chrome npm run test:browser */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
async function phonePage({ rpc = {}, storage = {}, realtime = () => {} } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  /* اتصال Realtime لا يخرج إلى الخادم الحقيقي أبدًا: يُجاب هنا (أو لا يُجاب). */
  await context.routeWebSocket(/\/realtime\/v1\/websocket/, realtime);
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

test("the bare Quran reading URL opens the reader index and resuming keeps the saved page on reload", async () => {
  const { surahs } = JSON.parse(readFileSync(path.join(root, "src/discovery/catalog.json"), "utf8"));
  const chapters = surahs.map(s => ({ id: s.n, name_arabic: s.name, verses_count: s.verses, pages: [1, 604] }));
  const { page, errors, context } = await phonePage({
    storage: {
      "zad:qcf4:meta-v1": JSON.stringify({ chapters }),
      "zad:qcf4:last-position": JSON.stringify({ page: 45, savedAt: 1 }),
      "zad:qcf4:last-surface-v1": JSON.stringify({ surface: "reader", page: 45 })
    }
  });
  await context.route(/quran-qcf4@[^/]+\/fonts-woff2\//, route => route.fulfill({
    path: path.join(root, "fonts/aref-ruqaa-arabic-400.woff2"),
    headers: { "Access-Control-Allow-Origin": "*" }
  }));
  await context.route(/quran-qcf4@[^/]+\/pages\/\d+\.json/, route => route.fulfill({
    headers: { "Access-Control-Allow-Origin": "*" },
    json: { page: Number(new URL(route.request().url()).pathname.match(/(\d+)\.json$/)[1]), lines: [], surahs: [{ id: 1 }] }
  }));
  try {
    await page.goto(BASE + "/quran-read/");
    await page.locator('.quran-index[data-home-mode="1"]').waitFor();
    await page.locator('.page[data-page="45"][data-loaded="1"]').waitFor({ state: "attached" });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("zad:qcf4:last-position")).savedAt), 1);
    await page.locator('[data-hub-action="resume"]').click();
    assert.equal(new URL(page.url()).searchParams.get("page"), "45");
    await page.reload();
    await page.locator('.page[data-page="45"][data-loaded="1"]').waitFor({ state: "attached" });
    assert.equal(await page.locator('.quran-index[data-home-mode="1"]').count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("a member's khatmah tab opens from the saved state before the server answers", async () => {
  const state = { publicId: "p", code: "ABCD", title: "ختمتي", endDate: "2030-01-01", accessType: "private", organizerId: "org", roundNo: 1,
    members: [{ id: "me", name: "أنا", linked: true }, { id: "org", name: "المشرف", linked: true }],
    juz: Array.from({ length: 30 }, (_, i) => ({ status: i < 7 ? "done" : "open", ownerId: i < 7 ? "org" : null })) };
  const { page, errors, context } = await phonePage({
    storage: { "zad:last": "ABCD", "zad:viewer:ABCD": JSON.stringify({ id: "me", name: "أنا" }), "zad:khatmah-state-v1": JSON.stringify({ code: "ABCD", state }) }
  });
  /* الخادم لا يجيب أبدًا: ما يظهر إنما هو من الحالة المحفوظة. */
  await context.route(/\/rpc\/get_state/, () => {});
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.click("#zk-launch-zad");
  await page.waitForFunction(() => document.querySelectorAll("#app .cell").length >= 30, null, { timeout: 3000 });
  assert.deepEqual(errors, []);
  await context.close();
});

test("on Friday the home greets with «جمعتكم مباركة» and counts the Kahf pages read since Thursday's maghrib", async () => {
  const fri = new Date("2026-11-06T10:00:00").getTime();
  const pages = n => JSON.stringify(Object.fromEntries(Array.from({ length: n }, (_, i) => [293 + i, fri - 3600e3])));
  const { page, errors, context } = await phonePage({ storage: { "zad:kahf-pages-v1": pages(5) } });
  await page.clock.install({ time: fri });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.clock.runFor(1500);
  assert.equal(await page.textContent("#zt-greet-title"), "جمعتكم مباركة");
  const kahf = (await page.innerText("#zt-kahf")).replace(/\s+/g, " ");
  /* كتابع قراءة الجزء: من أبعد صفحة بلغها (٢٩٧)، لا من التي بعدها، وما قبلها مقروء. */
  assert.match(kahf, /الصفحة ٢٩٧/);
  assert.match(kahf, /قرأت ٤ من ١٢ صفحة/);
  assert.equal(await page.getAttribute(".zf-kahf .zt-btn", "href"), "reader.html?page=297&from=zad");
  assert.deepEqual(errors, []);
  await context.close();
});

test("«وردك اليوم» counts every tap, keeps the count, and the Back button closes the counter", async () => {
  const { page, errors, context } = await phonePage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.click('[data-zw-open="2"]');
  for (let i = 0; i < 5; i++) await page.click("#zw-tap");
  /* ذكرٌ قُرئ خارج التطبيق: «أتممته» يكمله، و«إعادة العدّ» تتراجع عنه. */
  await page.click('[data-zw-tab="0"]');
  await page.click("#zw-complete");
  assert.equal(await page.textContent("#zw-count"), "١٠٠");
  assert.equal(await page.isVisible("#zw-complete"), false);
  await page.click("#zw-reset");
  assert.equal(await page.textContent("#zw-count"), "٠");
  await page.click('[data-zw-tab="2"]');
  assert.equal(await page.textContent("#zw-count"), "٥");
  assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem("zad:wird-v1"))).counts, [0, 0, 5]);
  await page.goBack();
  await page.waitForFunction(() => document.getElementById("zw-screen").hidden, null, { timeout: 2000 });
  assert.match(await page.innerText('[data-zw-open="2"]'), /٥/);
  assert.deepEqual(errors, []);
  await context.close();
});

test("after all three adhkar reach 100 the wird card shrinks to one line that still opens the counter", async () => {
  const day = new Date(); const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  const { page, errors, context } = await phonePage({ storage: { "zad:wird-v1": JSON.stringify({ day: key, counts: [100, 100, 100] }) } });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForSelector(".zw-done");
  assert.equal(await page.$(".zw-card"), null);
  await page.click(".zw-done");
  await page.waitForFunction(() => !document.getElementById("zw-screen").hidden, null, { timeout: 2000 });
  assert.deepEqual(errors, []);
  await context.close();
});

test("a reload stays on the screen that is showing (home, khatmahs or prayer times)", async () => {
  const { page, errors, context } = await phonePage();
  await page.goto(BASE + "/?section=khatmahs", { waitUntil: "load" });
  await page.reload({ waitUntil: "load" });
  assert.equal(await page.evaluate(() => document.body.classList.contains("zk-launch-open")), false, "still khatmahs");
  await page.click("#zk-tab-home");
  assert.equal(new URL(page.url()).searchParams.get("section"), null);
  await page.reload({ waitUntil: "load" });
  assert.equal(await page.evaluate(() => document.body.classList.contains("zk-launch-open")), true, "home after reload");
  await page.click("#zk-launch-prayer");
  await page.reload({ waitUntil: "load" });
  assert.equal(await page.evaluate(() => !document.getElementById("zt-prayer-page").hidden), true, "prayer after reload");
  assert.deepEqual(errors, []);
  await context.close();
});

test("with an active khatmah, a reload on home stays on home (the khatmah code is not left in the address)", async () => {
  const state = { publicId: "p", code: "ABCD", title: "ختمتي", endDate: "2030-01-01", accessType: "private", organizerId: "org", roundNo: 1,
    members: [{ id: "me", name: "أنا", linked: true }, { id: "org", name: "المشرف", linked: true }],
    juz: Array.from({ length: 30 }, () => ({ status: "open", ownerId: null })) };
  const { page, errors, context } = await phonePage({
    rpc: { get_state: state, list_active_khatmahs: [] },
    storage: { "zad:last": "ABCD", "zad:viewer:ABCD": JSON.stringify({ id: "me", name: "أنا" }) }
  });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.click("#zk-launch-zad");
  await page.waitForFunction(() => document.querySelectorAll("#app .cell").length >= 30, null, { timeout: 5000 });
  await page.reload({ waitUntil: "load" });
  assert.equal(await page.evaluate(() => document.body.classList.contains("zk-launch-open")), false, "khatmah after reload");
  await page.click("#zk-tab-home");
  assert.equal(new URL(page.url()).hash, "");
  await page.reload({ waitUntil: "load" });
  assert.equal(await page.evaluate(() => document.body.classList.contains("zk-launch-open")), true, "home after reload");
  assert.deepEqual(errors, []);
  await context.close();
});

test("live sync: joins the khatmah's channel, and a «changed» signal refreshes home and the khatmah screen at once", async () => {
  let done = 7;
  const state = () => ({ publicId: "p", code: "ABCD", title: "ختمتي", endDate: "2030-01-01", accessType: "private", organizerId: "org", roundNo: 1,
    members: [{ id: "me", name: "أنا", linked: true }, { id: "org", name: "المشرف", linked: true }],
    juz: Array.from({ length: 30 }, (_, i) => ({ status: i < done ? "done" : (i === 9 ? "taken" : "free"), ownerId: i < done ? "org" : (i === 9 ? "me" : null) })) });
  const sockets = [], joins = [];
  const { page, errors, context } = await phonePage({
    storage: { "zad:last": "ABCD", "zad:viewer:ABCD": JSON.stringify({ id: "me", name: "أنا" }) },
    realtime: ws => {
      sockets.push(ws);
      ws.onMessage(raw => {
        const m = JSON.parse(raw);
        if (m.event === "phx_join") { joins.push(m); ws.send(JSON.stringify({ topic: m.topic, event: "phx_reply", ref: m.ref, payload: { status: "ok", response: {} } })); }
      });
    }
  });
  await context.route(/\/rpc\/get_state/, route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(state()) }));
  const signal = () => sockets.at(-1).send(JSON.stringify({ topic: "realtime:khatmah:ABCD", event: "broadcast", payload: { type: "broadcast", event: "changed", payload: { id: "x" } } }));

  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector(".zt-ring-label b")?.textContent === "٧", null, { timeout: 5000 });
  assert.equal(joins[0].topic, "realtime:khatmah:ABCD");
  assert.equal(joins[0].payload.config.private, false);

  done = 8; signal();
  await page.waitForFunction(() => document.querySelector(".zt-ring-label b")?.textContent === "٨", null, { timeout: 3000 });

  await page.click("#zk-launch-zad");
  await page.waitForFunction(() => document.querySelectorAll("#app .cell").length >= 30, null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => document.querySelectorAll("#app .cell.done").length), 8);
  done = 9; signal();
  await page.waitForFunction(() => document.querySelectorAll("#app .cell.done").length === 9, null, { timeout: 3000 });

  /* الخادم يغلق الاتصال: يعود العميل ويشترك من جديد. */
  const count = sockets.length;
  await sockets.at(-1).close();
  for (let i = 0; i < 40 && sockets.length === count; i++) await page.waitForTimeout(100);
  assert.ok(sockets.length > count, "reconnected");
  for (let i = 0; i < 20 && joins.length < 2; i++) await page.waitForTimeout(100);
  assert.equal(joins.at(-1).topic, "realtime:khatmah:ABCD");
  assert.deepEqual(errors, []);
  await context.close();
});
