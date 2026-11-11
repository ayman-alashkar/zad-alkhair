/* اختبارات متصفح حقيقي. تلتقط ما لا تراه اختبارات الشيفرة: عنصر مخفي تحت
   الشريط السفلي، أو خطأ JavaScript يوقف الصفحة. لا تتصل بالقاعدة الحقيقية: كل نداء إلى
   Supabase يُجاب ببيانات وهمية، وكل طلب خارجي آخر يُمنع.

   التشغيل: npm run test:browser (Chromium) أو ZAD_BROWSER=webkit npm run test:browser.
   على جهاز فيه Chrome: CHROME_PATH=/usr/bin/google-chrome npm run test:browser */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium, webkit } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 4391;
const BASE = `http://127.0.0.1:${PORT}`;
const ENGINE = process.env.ZAD_BROWSER || "chromium";
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

let server, browser;

test.before(async () => {
  server = spawn(process.execPath, ["scripts/serve.cjs"], { cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE + "/")).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  const engine = { chromium, webkit }[ENGINE];
  assert.ok(engine, `Unsupported browser engine: ${ENGINE}`);
  const chromePath = ENGINE === "chromium" && process.env.CHROME_PATH;
  browser = await engine.launch(chromePath ? { executablePath: chromePath, args: ["--no-sandbox"] } : {});
});

test.after(async () => {
  await browser?.close();
  server?.kill();
});

/* صفحة هاتف افتراضيًّا، مع ردود وهمية لنداءات القاعدة. */
async function appPage({ profile = PHONE, rpc = {}, storage = {}, realtime = () => {} } = {}) {
  const context = await browser.newContext({ ...profile, serviceWorkers: "block" });
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

/* Real reader layout with neutral Arabic text and local fonts, without CDN audio/data. */
async function readerPage({ profile = PHONE, theme = "light" } = {}) {
  const { surahs } = JSON.parse(readFileSync(path.join(root, "src/discovery/catalog.json"), "utf8"));
  const chapters = surahs.map(s => ({ id: s.n, name_arabic: s.name, verses_count: s.verses, pages: [1, 604] }));
  const fixture = await appPage({
    profile,
    storage: { "zad:qcf4:meta-v1": JSON.stringify({ chapters }), "zad:qcf4:theme": theme }
  });
  await fixture.context.route(/quran-qcf4@[^/]+\/fonts-woff2\//, route => route.fulfill({
    path: path.join(root, "fonts/aref-ruqaa-arabic-400.woff2"),
    headers: { "Access-Control-Allow-Origin": "*" }
  }));
  await fixture.context.route(/quran-qcf4@[^/]+\/pages\/\d+\.json/, route => route.fulfill({
    headers: { "Access-Control-Allow-Origin": "*" },
    json: {
      page: Number(new URL(route.request().url()).pathname.match(/(\d+)\.json$/)[1]),
      font: "QCF4_Hafs_01", surahs: [{ id: 2 }],
      lines: Array.from({ length: 15 }, (_, i) => ({ words: [
        ...Array.from({ length: 6 + i % 3 }, () => ({ type: "word", text: "نص تجريبي", char: "نَصٌّ تَجْرِيبِيٌّ", verse_key: `2:${60 + i}` })),
        { type: "end", text: `V${60 + i}`, char: "١٢٣", verse_key: `2:${60 + i}` }
      ] }))
    }
  }));
  return fixture;
}

/* «نسخ» يأخذ الآية بالرسم العثماني من نص تنزيل، لا الإملاء المبسّط المرافق لخطوط الصفحة. */
test("copying an ayah gives its Uthmani text from Tanzil, not the simplified text behind the page fonts", async () => {
  const tanzil = Object.fromEntries(readFileSync(path.join(root, "data/quran-uthmani/tanzil-uthmani-1.1.txt"), "utf8")
    .split("\n").filter(line => /^\d/.test(line)).map(line => { const [s, a, t] = line.split("|"); return [`${s}:${a}`, t]; }));
  const { page, errors, context } = await readerPage();
  /* يُلتقط ما يُكتب في الحافظة، فيعمل الاختبار في Chromium وWebKit دون أذونات الحافظة. */
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.__copied = text; } } });
  });
  await page.goto(BASE + "/quran-read/?page=9");
  /* نص الصفحة التجريبية المبسّط «نص تجريبي»، فلا يوافق نص تنزيل إلا إن جاء منه. */
  const word = page.locator('.page[data-page="9"] .line:first-child .verse-segment').first();
  await word.waitFor();
  /* ضغطة مطوّلة تفتح قائمة الآية. */
  const box = await word.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await page.click('[data-act="share"]');
  await page.click('[data-share="copy"]');
  await page.waitForFunction(() => typeof window.__copied === "string", null, { timeout: 3000 });
  const copied = await page.evaluate(() => window.__copied);
  /* الآية المنسوخة هي التي يذكرها سطرها الثاني (قد تختلف الآية التي تحت المؤشر بين المحركين). */
  const [, digits] = copied.split("\n")[1].match(/^سورة البقرة، الآية ([٠-٩]+)$/) || [];
  assert.ok(digits, copied);
  const ayah = [...digits].map(d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).join("");
  assert.equal(copied.split("\n")[0], `﴿${tanzil[`2:${ayah}`]}﴾`);
  assert.deepEqual(errors, []);
  await context.close();
});

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
  const { page, errors, context } = await appPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(800);
  assert.ok(await page.isVisible("#zk-tabs"), "bottom tabs visible");
  assert.deepEqual(errors, []);
  await context.close();
});

/* إحصاءات الاستعمال: القسم الظاهر يُعدّ مرة، ويُرسل المجموع عند مغادرة الصفحة. */
test("usage stats count the shown sections and send them when the page is left", async () => {
  const { page, errors, context } = await appPage();
  const sent = [];
  page.on("request", r => { if (r.url().includes("/rpc/record_usage")) sent.push(JSON.parse(r.postData())); });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(900);
  await page.click("#zk-launch-prayer");
  await page.waitForTimeout(900);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await page.waitForTimeout(400);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].p_counts, { home: 1, prayer: 1 });
  assert.match(sent[0].p_device, /^[0-9a-f-]{36}$/);
  assert.equal(await page.evaluate(() => localStorage.getItem("zad:usage-v1")), "{}");
  assert.deepEqual(errors, []);
  await context.close();
});

test("usage stats tell the recitation player from the mushaf in the reader page", async () => {
  const { page, errors, context } = await readerPage();
  const sent = [];
  page.on("request", r => { if (r.url().includes("/rpc/record_usage")) sent.push(JSON.parse(r.postData())); });
  await page.goto(BASE + "/quran-listen/?from=zad", { waitUntil: "load" });
  await page.waitForSelector(".zad-listen");
  await page.waitForTimeout(900);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await page.waitForTimeout(400);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].p_counts.listen, 1);
  assert.equal(sent[0].p_counts.reader, undefined);
  assert.deepEqual(errors, []);
  await context.close();
});

/* هواتف أندرويد كثيرة عرضها ٣٦٠، ويقلّ العرض أكثر حين يكبّر المستخدم الخط من إعدادات الهاتف.
   صف المواقيت يبقى سطرًا واحدًا لكل وقت، دون انكسار أو فيض خارج خانته. */
test("the home prayer row keeps every time on one line down to a 320px-wide page", async () => {
  const prayer = JSON.stringify({ land: "اليابان", city: "ناها", lat: 26.2124, lng: 127.6809, tz: "Asia/Tokyo", method: "MuslimWorldLeague", madhab: "Shafi" });
  for (const width of [320, 360]) {
    const { page, errors, context } = await appPage({
      profile: { ...PHONE, viewport: { width, height: 844 } },
      storage: { "zad:prayer": prayer }
    });
    await page.clock.setFixedTime(new Date("2026-11-06T00:45:00+09:00"));
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForSelector(".zt-prayers li");
    const cells = await page.$$eval(".zt-prayers li", items => items.map(li => {
      const t = li.querySelector(".t");
      return { text: li.innerText, fits: li.scrollWidth <= li.clientWidth, lines: Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight || "0") || 1) };
    }));
    assert.equal(cells.length, 5, `${width}px`);
    for (const c of cells) {
      assert.ok(c.fits, `${width}px: «${c.text}» spills out of its cell`);
      assert.ok(c.lines <= 1, `${width}px: «${c.text}» wraps`);
      assert.doesNotMatch(c.text, /صباحًا|ظهرًا|عصرًا|مساءً/, "the prayer name already tells the time of day");
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
});

test("records cold home startup at phone and desktop sizes", async t => {
  for (const [label, profile] of [["phone", PHONE], ["desktop", { viewport: { width: 1440, height: 900 } }]]) {
    const samples = [];
    for (let sample = 0; sample < 3; sample++) {
      const { page, errors, context } = await appPage({ profile });
      try {
        await page.addInitScript(() => {
          const observer = new MutationObserver(() => {
            if (!document.querySelector("#zk-launch.zk-home-ready")) return;
            performance.mark("zad-home-ready");
            observer.disconnect();
          });
          observer.observe(document, { subtree: true, attributes: true, attributeFilter: ["class"] });
        });
        await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
        await page.locator("#zk-launch.zk-home-ready").waitFor();
        const readyMs = await page.evaluate(() => performance.getEntriesByName("zad-home-ready")[0]?.startTime);
        assert.ok(Number.isFinite(readyMs), "home readiness was measured");
        assert.deepEqual(errors, []);
        samples.push(Math.round(readyMs));
      } finally {
        await context.close();
      }
    }
    samples.sort((a, b) => a - b);
    t.diagnostic(`${ENGINE} ${label} home ready: median ${samples[1]} ms (${samples.join(", ")} ms)`);
  }
});

test("a tall dialog's last button and a toast are not hidden by the bottom tabs", async () => {
  const { page, errors, context } = await appPage();
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
  const { page, errors, context } = await appPage({
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
  const { page, errors, context } = await appPage();
  await page.goto(BASE + "/quran-read/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  assert.deepEqual(errors, []);
  await context.close();
});

test("the collapsed player can move without opening and stays reachable after resizing", async t => {
  for (const [name, profile] of [["phone", PHONE], ["desktop", { viewport: { width: 1440, height: 900 } }]]) {
    await t.test(name, async () => {
      const { page, errors, context } = await appPage({ profile });
      try {
        await page.goto(BASE + "/quran-read/?page=9", { waitUntil: "load" });
        // Expose only the collapsed UI; no live recording is needed for this gesture.
        await page.evaluate(() => document.body.classList.add("player-on"));
        const fab = page.locator("#audioFab"), panel = page.locator("#audioPanel");
        const bounds = () => fab.boundingBox();
        const opened = () => panel.isVisible();
        const dragTo = async (x, y) => {
          const box = await bounds();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(x, y, { steps: 8 });
          await page.mouse.up();
        };
        assert.equal(await fab.evaluate(el => getComputedStyle(el).touchAction), "none");
        await dragTo(2, 2);
        assert.equal(await opened(), false, "dragging does not open the player");
        const topLeft = await bounds();
        assert.ok(topLeft.x >= 13.5 && topLeft.y >= 13.5, "control stays inside the top and left edges");
        const { width, height } = page.viewportSize();
        await dragTo(width - 2, height - 2);
        assert.equal(await opened(), false, "release near the other corner is still a drag");
        const bottomRight = await bounds();
        assert.ok(bottomRight.x + bottomRight.width <= width - 13.5);
        assert.ok(bottomRight.y + bottomRight.height <= height - 13.5);

        // Small finger movement is a tap, and expanding/collapsing keeps the position.
        const centerX = bottomRight.x + bottomRight.width / 2, centerY = bottomRight.y + bottomRight.height / 2;
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 2, centerY + 1);
        await page.mouse.up();
        assert.equal(await opened(), true, "a tap with small movement opens the player");
        await page.locator("#collapsePlayer").click();
        assert.deepEqual(await bounds(), bottomRight, "the moved position survives opening the player");

        const resized = name === "phone" ? { width: 844, height: 390 } : { width: 390, height: 844 };
        await page.setViewportSize(resized);
        const afterResize = await bounds();
        assert.ok(afterResize.x >= 13.5 && afterResize.y >= 13.5);
        assert.ok(afterResize.x + afterResize.width <= resized.width - 13.5);
        assert.ok(afterResize.y + afterResize.height <= resized.height - 13.5);
        await fab.press("Enter");
        assert.equal(await opened(), true, "native keyboard activation remains available");
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  }
});

test("reader tools avoid low-page taps and require a separate tap to open tafsir", async t => {
  const profiles = [
    ["phone", PHONE],
    ["landscape phone", { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }],
    ["tablet", { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }],
    ["desktop", { viewport: { width: 1440, height: 900 } }]
  ];
  for (const [name, profile] of profiles) for (const theme of ["light", "dark"]) {
    await t.test(`${name} ${theme}`, async () => {
      const { page, errors, context } = await readerPage({ profile, theme });
      try {
        await page.goto(BASE + "/quran-read/?page=9");
        const root = page.locator('.page[data-page="9"]'), stage = root.locator(".page-stage");
        await root.locator(".word.end").first().waitFor();
        await page.waitForTimeout(300);
        await stage.evaluate(el => { el.scrollTop = el.scrollHeight; });
        const last = root.locator(".line:last-child .verse-segment").first();
        const toolbar = page.locator(".bottom");
        const tapGeometry = async () => {
          const box = await last.boundingBox(), position = { x: box.width / 2, y: box.height - 2 };
          return { position, point: { x: box.x + position.x, y: box.y + position.y }, before: await toolbar.evaluate(el => ({ top: el.offsetTop, height: el.offsetHeight })) };
        };
        let geometry = await tapGeometry();
        // Neutral sample text leaves extra space on a tall phone. Confirm
        // that it keeps the bottom dock, then use a shorter portrait viewport
        // to exercise an actual collision without changing the page layout.
        if (name === "phone" && geometry.point.y < geometry.before.top - 8) {
          await last.tap({ position: geometry.position });
          assert.equal(await page.locator("body.reader-tools-top").count(), 0, "a clear last row keeps the bottom dock");
          assert.equal(await page.locator(".backdrop,body.player-on").count(), 0);
          await last.tap({ position: geometry.position });
          await page.setViewportSize({ width: profile.viewport.width, height: 640 });
          await page.waitForTimeout(300);
          await stage.evaluate(el => { el.scrollTop = el.scrollHeight; });
          geometry = await tapGeometry();
        }
        // The one-row landscape dock is short enough that the last row clears
        // it once the page is scrolled to the end. Confirm that, then scroll
        // the row down under the dock to exercise an actual collision.
        if (name === "landscape phone" && geometry.point.y < geometry.before.top - 8) {
          await last.tap({ position: geometry.position });
          assert.equal(await page.locator("body.reader-tools-top").count(), 0, "a clear last row keeps the bottom dock");
          await last.tap({ position: geometry.position });
          const shift = geometry.before.top + geometry.before.height / 2 - geometry.point.y;
          await stage.evaluate((el, d) => { el.scrollTop -= d; }, shift);
          await page.waitForTimeout(150);
          geometry = await tapGeometry();
        }
        const { position, point, before } = geometry;
        assert.ok(point.y >= before.top - 8, "fixture taps a line inside the actual bottom toolbar area");
        const scrollBefore = await stage.evaluate(el => el.scrollTop);
        if (profile.hasTouch) await last.tap({ position }); else await last.click({ position });
        await page.waitForTimeout(220);
        assert.equal(await page.locator("body.reader-tools-top").count(), 1, "low taps put the tools at the top");
        /* الظهور انتقال CSS؛ WebKit في CI قد يتأخر عن ‎220ms‎، فيُنتظر انتهاؤه بدل فحص لحظة ثابتة. */
        await page.waitForFunction(() => Number(getComputedStyle(document.querySelector(".bottom")).opacity) > .99, null, { timeout: 2000 }).catch(() => {});
        const toolsStyle = await toolbar.evaluate(el => ({ opacity: getComputedStyle(el).opacity, pointerEvents: getComputedStyle(el).pointerEvents }));
        assert.ok(Number(toolsStyle.opacity) > .99, "the relocated tools finish appearing");
        assert.notEqual(toolsStyle.pointerEvents, "none", "the relocated tools accept the next deliberate touch");
        const toolsBox = await toolbar.boundingBox(), headerBox = await page.locator(".topbar").boundingBox();
        assert.ok(toolsBox.y >= headerBox.y + headerBox.height + 3, "tools clear the header");
        assert.ok(toolsBox.y + toolsBox.height < point.y - 8, "tools clear the selecting finger and text");
        assert.ok(await root.locator('.verse-segment.selected[data-key="2:74"]').count());
        assert.equal(await page.locator(".backdrop").count(), 0, "selecting does not open tafsir");
        assert.equal(await page.locator("body.player-on").count(), 0, "selecting does not open the player");
        assert.equal(await root.locator(".page-bookmark").count(), 0, "selecting does not add a bookmark");
        assert.equal(await stage.evaluate(el => el.scrollTop), scrollBefore, "selection keeps the reading position");

        // Clear the selection, then select a high row with a fresh gesture.
        if (profile.hasTouch) await last.tap({ position }); else await last.click({ position });
        await stage.evaluate(el => { el.scrollTop = 0; });
        const first = root.locator(".line:first-child .verse-segment").first();
        if (profile.hasTouch) await first.tap(); else await first.click();
        assert.equal(await page.locator("body.reader-tools-top").count(), 0, "high taps retain the bottom tools");
        if (profile.hasTouch) await page.locator("#tafsirBtn").tap(); else await page.locator("#tafsirBtn").click();
        await page.locator(".backdrop").waitFor({ state: "visible" });
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  }
});

/* في الوضع الأفقي تكون الصفحة أطول من الشاشة. الآية التي يفتحها رابط أو علامة أو
   فهرس يجب أن تظهر، لا أن تبقى تحت حافة الشاشة، والأدوات الأربع في صف واحد. */
test("a linked verse is scrolled into view on a rotated phone, with the four tools in one row", async t => {
  for (const [width, height] of [[852, 393], [780, 360]]) await t.test(`${width}×${height}`, async () => {
    const { page, errors, context } = await readerPage({
      profile: { viewport: { width, height }, isMobile: true, hasTouch: true }
    });
    try {
      // The fixture's page 9 ends with verse 2:74, the last of its 15 lines.
      await context.route(/quran-qcf4@[^/]+\/verses\.json/, route => route.fulfill({
        headers: { "Access-Control-Allow-Origin": "*" }, json: { "2:74": { page: 9 } }
      }));
      await page.goto(BASE + "/quran-read/2/?ayah=74");
      const verse = page.locator('.page[data-page="9"] .verse-segment.selected').first();
      await verse.waitFor();
      await page.waitForTimeout(600);
      const layout = await verse.evaluate(el => {
        const r = el.getBoundingClientRect(), stage = el.closest(".page-stage");
        const top = document.querySelector(".topbar").getBoundingClientRect().bottom;
        const dock = document.querySelector(".bottom");
        const tools = [...dock.querySelectorAll(".tool")].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().top));
        return { scrolls: stage.classList.contains("scrolls"), top: r.top, bottom: r.bottom, limitTop: top, limitBottom: Math.round(dock.getBoundingClientRect().top), tools, toolsTop: document.body.classList.contains("reader-tools-top") };
      });
      assert.ok(layout.scrolls, "the page is taller than the screen");
      assert.ok(layout.top >= layout.limitTop - 1 && layout.bottom <= layout.limitBottom + 1,
        `verse at ${Math.round(layout.top)}–${Math.round(layout.bottom)} is outside ${Math.round(layout.limitTop)}–${layout.limitBottom}`);
      assert.equal(layout.toolsTop, false, "a verse in view leaves the tools at the bottom");
      assert.equal(new Set(layout.tools).size, 1, `tools share one row: ${layout.tools}`);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
});

test("Quran text and verse numbers stay readable when a phone or tablet rotates", async t => {
  for (const [width, height] of [[390, 844], [768, 1024], [834, 1194], [1024, 1366]]) {
    for (const theme of ["light", "dark"]) await t.test(`${width}×${height} ${theme}`, async () => {
      const { page, errors, context } = await readerPage({
        profile: { viewport: { width, height }, isMobile: true, hasTouch: true },
        theme
      });
      const measure = () => page.locator('.page[data-page="9"]').evaluate(root => {
        const stage = root.querySelector(".page-stage"), bounds = stage.getBoundingClientRect();
        const lines = [...root.querySelectorAll(".line-inner")], host = root.querySelector(".mushaf");
        const columnWidth = host.getBoundingClientRect().width;
        const contrast = (foreground, background) => {
          const luminance = color => {
            const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map(x => {
              const c = Number(x) / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
            });
            return .2126 * r + .7152 * g + .0722 * b;
          };
          const a = luminance(foreground), b = luminance(background);
          return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        };
        const background = getComputedStyle(root).backgroundColor;
        return {
          fontSize: parseFloat(getComputedStyle(lines[0]).fontSize),
          columnWidth,
          widthFit: getComputedStyle(host).getPropertyValue("--mushaf-fit-width").trim() === "1",
          widthUsed: Math.max(...lines.map(line => line.getBoundingClientRect().width)) / columnWidth,
          gap: parseFloat(getComputedStyle(host).rowGap),
          edgePadding: [host.style.paddingTop, host.style.paddingBottom],
          stageHeight: stage.clientHeight,
          headingTop: root.querySelector(".page-meta").getBoundingClientRect().top,
          footerTop: root.querySelector(".page-footer").getBoundingClientRect().top,
          stageBottom: bounds.bottom,
          scrolls: stage.classList.contains("scrolls"),
          scrollTop: stage.scrollTop,
          fitsWidth: lines.every(line => {
            const r = line.getBoundingClientRect();return r.left >= bounds.left - 1 && r.right <= bounds.right + 1;
          }),
          fits: !stage.classList.contains("scrolls") && lines.every(line => {
            const r = line.getBoundingClientRect();
            return r.left >= bounds.left - 1 && r.right <= bounds.right + 1 && r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1;
          }),
          textContrast: contrast(getComputedStyle(root.querySelector(".word:not(.end)")).color, background),
          numberContrast: contrast(getComputedStyle(root.querySelector(".word.end")).color, background),
          labelContrast: Math.min(...[...root.querySelectorAll(".page-meta-link,.page-no")].map(el => contrast(getComputedStyle(el).color, background))),
          labelsStayInMargins: [...root.querySelectorAll(".page-meta-link,.page-no")].every(el => {
            const r = el.getBoundingClientRect(), margin = el.closest(".page-meta,.page-footer").getBoundingClientRect();
            return r.top >= margin.top - 1 && r.bottom <= margin.bottom + 1 && r.left >= margin.left - 1 && r.right <= margin.right + 1;
          })
        };
      });
      try {
        await page.goto(BASE + "/quran-read/?page=9");
        await page.locator('.page[data-page="9"] .word.end').first().waitFor();
        await page.waitForTimeout(300);
        const portrait = await measure();
        assert.ok(!portrait.widthFit, "portrait retains the complete-page fitting mode");
        assert.ok(portrait.fits, "all fifteen lines fit the portrait reading area");
        assert.ok(portrait.textContrast >= 7, "Quran text has strong contrast");
        assert.ok(portrait.numberContrast >= 4.5, "verse numbers remain legible in either theme");
        assert.ok(portrait.labelContrast >= 7, "surah, juz and page labels have strong contrast");
        assert.ok(portrait.labelsStayInMargins, "larger labels stay inside the existing page margins");
        assert.ok(portrait.columnWidth > width * .9, "portrait reading uses the available width");
        await page.setViewportSize({ width: height, height: width });
        await page.waitForTimeout(300);
        const landscape = await measure();
        assert.ok(landscape.widthFit, "touch landscape activates width fitting");
        assert.ok(landscape.columnWidth >= height - 33, "landscape uses the screen width with small side margins");
        assert.ok(landscape.widthUsed >= .97 && landscape.widthUsed <= 1.01, "the longest Quran line fills its column");
        assert.ok(landscape.fontSize > portrait.fontSize * 1.3, "landscape makes the text noticeably larger");
        assert.ok(landscape.scrolls, "the enlarged landscape page scrolls vertically");
        assert.ok(landscape.stageHeight >= width - 1, "scrolling uses the full screen height");
        assert.ok(landscape.footerTop >= landscape.stageBottom, "the footer follows the page instead of staying on screen");
        assert.ok(landscape.gap >= 6, "short reading areas keep space between rows");
        assert.ok(landscape.fitsWidth, "rotation never clips the sides of a line");
        assert.ok(landscape.labelsStayInMargins, "landscape keeps the labels inside their scrolling margins");
        if (landscape.scrolls) {
          assert.ok(await page.locator('.page[data-page="9"] .page-stage').evaluate(stage => {
            stage.scrollTop = 70;
            const header = stage.querySelector(".page-meta").getBoundingClientRect(), bounds = stage.getBoundingClientRect();
            return header.bottom <= bounds.top + 1;
          }), "the heading scrolls away to free the top of the reading area");
          assert.ok(await page.locator('.page[data-page="9"] .page-stage').evaluate(stage => {
            stage.scrollTop = stage.scrollHeight;
            const last = stage.querySelector(".line:last-child .line-inner").getBoundingClientRect(), bounds = stage.getBoundingClientRect();
            const footer = stage.querySelector(".page-footer").getBoundingClientRect();
            return last.top >= bounds.top - 1 && last.bottom <= footer.top + 1 && footer.bottom <= bounds.bottom + 1;
          }), "the last row and page number are reachable together at the end of scrolling");
        } else assert.ok(landscape.fits, "the complete page fits when the height permits it");
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(300);
        const restored = await measure();
        assert.ok(!restored.widthFit, "portrait leaves width fitting");
        assert.deepEqual(restored.edgePadding, ["", ""], "portrait clears the enlarged ink padding");
        assert.ok(restored.fits, "returning to portrait preserves the complete page");
        assert.equal(restored.scrollTop, 0, "portrait has no leftover scroll offset");
        assert.ok(Math.abs(restored.fontSize - portrait.fontSize) < .1, "rotation does not accumulate text shrinkage");
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  }
});

test("the Quran index resumes the saved page and shares a direct juz link", async () => {
  const { surahs } = JSON.parse(readFileSync(path.join(root, "src/discovery/catalog.json"), "utf8"));
  const chapters = surahs.map(s => ({ id: s.n, name_arabic: s.name, verses_count: s.verses, pages: [1, 604] }));
  const { page, errors, context } = await appPage({
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
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async ({ url }) => { window.sharedJuzUrl = url; }
      });
    });
    await page.goto(BASE + "/quran-read/");
    await page.locator('.quran-index[data-home-mode="1"]').waitFor();
    await page.locator('.page[data-page="45"][data-loaded="1"]').waitFor({ state: "attached" });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("zad:qcf4:last-position")).savedAt), 1);
    await page.locator('[data-hub-action="resume"]').click();
    assert.equal(new URL(page.url()).searchParams.get("page"), "45");
    await page.reload();
    await page.locator('.page[data-page="45"][data-loaded="1"]').waitFor({ state: "attached" });
    assert.equal(await page.locator('.quran-index[data-home-mode="1"]').count(), 0);

    await page.goto(BASE + "/juz/8/");
    await page.locator("#openReader").click();
    await page.locator('.page[data-page="142"][data-loaded="1"]').waitFor({ state: "attached" });
    assert.equal(new URL(page.url()).pathname, "/quran-read/");
    assert.equal(new URL(page.url()).searchParams.get("juz"), "8");

    await page.goto(BASE + "/juz/8/?code=AB12");
    await page.waitForURL(BASE + "/quran-read/?juz=8&code=AB12");
    await page.locator('.page[data-page="142"][data-loaded="1"]').waitFor({ state: "attached" });

    await page.goto(BASE + "/quran-read/");
    const index = page.locator('.quran-index[data-home-mode="1"]');
    await index.getByRole("button", { name: "الأجزاء", exact: true }).click();
    await index.getByRole("button", { name: "مشاركة الجزء ١٥", exact: true }).click();
    const shared = await page.evaluate(() => window.sharedJuzUrl);
    assert.equal(shared, BASE + "/quran-read/?juz=15");
    await page.goto(shared);
    await page.locator('.page[data-page="282"][data-loaded="1"]').waitFor({ state: "attached" });
    assert.equal(await index.count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("surah play buttons in both Quran indexes open the mushaf player", async t => {
  for (const [device, profile] of [["phone", PHONE], ["desktop", { viewport: { width: 1440, height: 900 } }]]) {
    for (const home of [true, false]) {
      await t.test(`${device} ${home ? "home index" : "reader index"}`, async () => {
        const { page, errors, context } = await readerPage({ profile });
        try {
          await page.addInitScript(() => {
            localStorage.setItem("zad:qcf4:qari", JSON.stringify({ id: "Ayman_Sowaid_64kbps" }));
            localStorage.setItem("zad:qcf4:last-position", JSON.stringify({ page: 45 }));
            // Exercise the real player state without loading a live recording.
            const paused = new WeakMap();
            Object.defineProperty(HTMLMediaElement.prototype, "paused", { get() { return paused.get(this) !== false; } });
            HTMLMediaElement.prototype.play = async function () { paused.set(this, false); };
            HTMLMediaElement.prototype.pause = function () { paused.set(this, true); };
          });
          await page.goto(BASE + (home ? "/quran-read/" : "/quran-read/?page=45"));
          await page.locator('.page[data-page="45"][data-loaded="1"]').waitFor({ state: "attached" });
          if (!home) await page.locator('.page[data-page="45"] [data-index-tab="s"]').click();
          const index = page.locator(`.quran-index[data-home-mode="${home ? 1 : 0}"]`);
          await index.getByRole("button", { name: "تشغيل سورة الفاتحة", exact: true }).click();
          await page.locator("body.player-on.player-expanded").waitFor({ state: "attached" });
          await page.waitForFunction(() => !document.getElementById("audio").paused);
          assert.equal(await page.locator(".quran-index, .zad-listen").count(), 0);
          assert.equal(await page.locator("#audioPanel").isVisible(), true);
          assert.match(await page.locator("#audioNow").textContent(), /الفاتحة/);
          assert.match(await page.locator("#audio").getAttribute("src"), /Ayman_Sowaid_64kbps\/001001\.mp3$/);
          assert.equal(new URL(page.url()).pathname, "/quran-read/");
          assert.equal(new URL(page.url()).searchParams.get("page"), "1");
          assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("zad:qcf4:last-surface-v1")).surface), "reader");
          assert.deepEqual(errors, []);
        } finally {
          await context.close();
        }
      });
    }
  }
});

test("one reading mark moves between pages and the index keeps five recent visits", async t => {
  const { surahs } = JSON.parse(readFileSync(path.join(root, "src/discovery/catalog.json"), "utf8"));
  const chapters = surahs.map(s => ({ id: s.n, name_arabic: s.name, verses_count: s.verses, pages: [1, 604] }));
  for (const [label, profile, theme] of [
    ["phone", PHONE, "light"],
    ["tablet", { viewport: { width: 1024, height: 1366 }, isMobile: true, hasTouch: true }, "dark"],
    ["desktop", { viewport: { width: 1440, height: 900 } }, "light"]
  ]) await t.test(label, async () => {
    const { page, errors, context } = await appPage({ profile });
    const oldAyahs = JSON.stringify([{ page: 8, verse: "2:50", savedAt: 1 }]);
    await context.addInitScript(({ chapters, theme, oldAyahs }) => {
      if (sessionStorage.getItem("bookmark-test-seeded")) return;
      localStorage.setItem("zad:qcf4:meta-v1", JSON.stringify({ chapters }));
      localStorage.setItem("zad:qcf4:theme", theme);
      localStorage.setItem("zad:qcf4:page-bookmarks", JSON.stringify([{ page: 7, savedAt: 1 }, { page: 8, savedAt: 2 }]));
      localStorage.setItem("zad:qcf4:last-position", JSON.stringify({ page: 15, savedAt: 1 }));
      localStorage.setItem("zad:qcf4:recent-visits", JSON.stringify([14, 13, 12, 11, 10, 5].map(page => ({ page, savedAt: 1 }))));
      localStorage.setItem("zad:qcf4:search-v1", JSON.stringify([{ key: "2:60", s: 2, a: 60, page: 10, text: "آية للقراءة" }]));
      localStorage.setItem("zad:qcf4:ayah-bookmarks", oldAyahs);
      localStorage.setItem("zad:qcf4:bookmarks", oldAyahs);
      sessionStorage.setItem("bookmark-test-seeded", "1");
    }, { chapters, theme, oldAyahs });
    await context.route(/quran-qcf4@[^/]+\/fonts-woff2\//, route => route.fulfill({
      path: path.join(root, "fonts/aref-ruqaa-arabic-400.woff2"),
      headers: { "Access-Control-Allow-Origin": "*" }
    }));
    await context.route(/quran-qcf4@[^/]+\/pages\/\d+\.json/, route => route.fulfill({
      headers: { "Access-Control-Allow-Origin": "*" },
      json: {
        page: Number(new URL(route.request().url()).pathname.match(/(\d+)\.json$/)[1]),
        font: "QCF4_Hafs_01", surahs: [{ id: 2 }],
        lines: Array.from({ length: 15 }, (_, i) => ({
          words: [{ type: "word", text: "آية للقراءة", char: "آية للقراءة", verse_key: `2:${60 + i}` }]
        }))
      }
    }));
    const currentVerse = n => page.locator(`.page[data-page="${n}"] .verse-segment`).first();
    const ribbon = n => page.locator(`.page[data-page="${n}"] .page-bookmark`);
    const storedPages = () => page.evaluate(() => JSON.parse(localStorage.getItem("zad:qcf4:page-bookmarks")).map(x => x.page));
    const showReaderTools = async n => {
      if (await page.locator("body").evaluate(el => el.classList.contains("hidden-tools")))
        await page.locator(`.page[data-page="${n}"] .page-no`).click();
    };
    try {
      await page.goto(BASE + "/quran-read/?page=9");
      await currentVerse(9).waitFor();
      assert.deepEqual(await storedPages(), [8], "the newest previous mark is kept when upgrading an older list");
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("zad:qcf4:recent-visits")).map(x => x.page)), [15, 14, 13, 12, 11]);
      await showReaderTools(9);
      await page.getByRole("button", { name: "أضف علامة", exact: true }).click();
      await ribbon(9).waitFor();
      assert.equal(await page.locator("#bookmarkBtn").getAttribute("aria-pressed"), "true");
      assert.ok(await page.locator("#bookmarkBtn").evaluate(btn => {
        const color = getComputedStyle(btn).color, [r, g, b] = color.match(/\d+/g).map(Number);
        return r > g * 1.3 && r > b * 1.3 && getComputedStyle(btn.querySelector("svg")).fill === color;
      }), "the saved mark icon is filled red in either theme");
      assert.deepEqual(await storedPages(), [9], "saving a page replaces the previous mark");
      assert.equal(await ribbon(8).count(), 0);
      assert.equal(await page.locator(".page-bookmark").count(), 1);
      assert.equal(await page.locator("[data-save]").count(), 0, "no second save menu");
      const fits = await ribbon(9).evaluate(pin => {
        const r = pin.getBoundingClientRect(), firstLine = pin.closest(".page").querySelector(".line").getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= firstLine.top;
      });
      assert.ok(fits, "ribbon stays above the Quran text within the viewport");
      const shortcutsFit = await page.evaluate(() => {
        const rect = id => document.getElementById(id).getBoundingClientRect();
        const upper = Math.max(rect("tafsirBtn").bottom, rect("listenBtn").bottom);
        return ["bookmarkBtn", "jumpBookmarkBtn"].every(id => {
          const r = rect(id), btn = document.getElementById(id);
          return r.top >= upper && r.left >= 0 && r.right <= innerWidth && r.height >= 44 && r.bottom <= innerHeight + 1 && btn.scrollWidth <= btn.clientWidth;
        });
      });
      assert.ok(shortcutsFit, "both shortcuts fit below tafsir and listening");
      assert.equal(await page.locator(".top-actions #readerSearchBtn").count(), 1);
      assert.equal(await page.locator(".reader-shortcuts #bookmarkBtn").count(), 1);
      assert.equal(await page.locator("#desktopNextBtn").isVisible(), !profile.hasTouch, "desktop keeps arrow navigation; touch readers use swipes");
      assert.equal(await page.locator("#prevBtn").isVisible(), false);
      assert.equal(await page.locator("#nextBtn").isVisible(), false);

      if (profile.hasTouch) {
        const area = await page.locator('.page[data-page="9"] .page-stage').boundingBox();
        const y = area.y + area.height * .4;
        await page.mouse.move(area.x + area.width * .2, y);
        await page.mouse.down();
        await page.mouse.move(area.x + area.width * .8, y, { steps: 8 });
        await page.mouse.up();
      } else await page.locator("#desktopNextBtn").click();
      await page.waitForURL(BASE + "/quran-read/?page=10");
      await currentVerse(10).waitFor();
      await showReaderTools(10);
      assert.equal(await ribbon(10).count(), 0);
      assert.equal(await page.locator("#bookmarkBtn").getAttribute("aria-pressed"), "false");
      await page.getByRole("button", { name: "الانتقال إلى العلامة", exact: true }).click();
      await page.waitForURL(BASE + "/quran-read/?page=9");
      await ribbon(9).waitFor();
      assert.equal(await page.locator(".backdrop").count(), 0, "jump opens the saved page directly");
      assert.equal(await page.locator("#bookmarkBtn").getAttribute("aria-pressed"), "true");

      await page.locator("#readerSearchBtn").click();
      await page.getByRole("searchbox", { name: "البحث في القرآن", exact: true }).fill("آية");
      await page.locator(".quran-search-result").click();
      await page.waitForURL(BASE + "/quran-read/?page=10");
      await showReaderTools(10);
      await page.locator("#jumpBookmarkBtn").click();
      await page.waitForURL(BASE + "/quran-read/?page=9");
      await page.reload();
      await ribbon(9).waitFor();
      await showReaderTools(9);
      await page.getByRole("button", { name: "إزالة العلامة", exact: true }).click();
      assert.equal(await ribbon(9).count(), 0);
      assert.deepEqual(await storedPages(), []);

      await page.getByRole("button", { name: "أضف علامة", exact: true }).click();
      await page.goto(BASE + "/quran-read/?page=10");
      await currentVerse(10).waitFor();
      await showReaderTools(10);
      await page.getByRole("button", { name: "أضف علامة", exact: true }).click();
      assert.deepEqual(await storedPages(), [10]);
      assert.equal(await ribbon(9).count(), 0, "moving the mark clears its previous ribbon");
      await page.goto(BASE + "/quran-read/?page=9");
      await currentVerse(9).waitFor();
      await showReaderTools(9);
      assert.equal(await page.locator("#bookmarkBtn").getAttribute("aria-pressed"), "false");
      await page.locator("#jumpBookmarkBtn").click();
      await page.waitForURL(BASE + "/quran-read/?page=10");
      await ribbon(10).waitFor();
      await page.goto(BASE + "/quran-read/?page=9");
      await currentVerse(9).waitFor();
      await showReaderTools(9);
      await page.getByRole("button", { name: "أضف علامة", exact: true }).click();
      assert.deepEqual(await storedPages(), [9]);
      assert.equal(await ribbon(10).count(), 0);
      await page.locator("#quranHomeBtn").click();
      assert.deepEqual(await page.locator(".quran-index-tab").allTextContents(), ["السور", "الأجزاء", "الانتقال إلى"]);
      assert.equal(await page.locator("#quranSurahList .quran-index-row").count(), 114);
      assert.equal(await page.locator("#quranSurahList .quran-index-juz-sep").count(), 0);
      assert.doesNotMatch(await page.locator("#quranSurahList").innerText(), /الجزء/);
      await page.locator('.quran-index-tab[data-tab="j"]').click();
      assert.equal(await page.locator("#quranJuzList .juz-accordion").count(), 30);
      await page.locator('.quran-index-tab[data-tab="m"]').click();
      await page.locator("#quranBookmarkList .ref-pages .quran-bookmark-row").first().waitFor();
      assert.deepEqual(await page.locator("#quranBookmarkList h4").allTextContents(), ["آخر الزيارات", "الانتقال إلى العلامة"]);
      assert.equal(await page.locator("#quranBookmarkList .ref-recent .quran-bookmark-row").count(), 5);
      assert.equal(await page.locator("#quranBookmarkList .ref-pages .quran-bookmark-row").count(), 1);
      assert.equal(await page.locator(".ref-ayahs,[data-ayah-open]").count(), 0);
      await page.getByRole("button", { name: "إزالة علامة الصفحة ٩", exact: true }).click();
      assert.deepEqual(await storedPages(), []);
      assert.equal(await ribbon(9).count(), 0, "index deletion updates the rendered page");
      assert.equal(await page.locator("#bookmarkBtn").getAttribute("aria-pressed"), "false");
      await page.locator('[data-hub-action="resume"]').click();
      await showReaderTools(9);
      await page.locator("#jumpBookmarkBtn").click();
      assert.equal(new URL(page.url()).searchParams.get("page"), "9");
      assert.deepEqual(await storedPages(), [], "older marks never return after the single mark is removed");
      assert.match(await page.locator("#toast").innerText(), /أضف علامة/);
      assert.deepEqual(await page.evaluate(() => [
        localStorage.getItem("zad:qcf4:ayah-bookmarks"),
        localStorage.getItem("zad:qcf4:bookmarks"),
        localStorage.getItem("zad:qcf4:reading-mark-v1")
      ]), [oldAyahs, oldAyahs, null], "old ayah data preserved; no second bookmark model");
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
});

test("a member's khatmah tab opens from the saved state before the server answers", async () => {
  const state = { publicId: "p", code: "ABCD", title: "ختمتي", endDate: "2030-01-01", accessType: "private", organizerId: "org", roundNo: 1,
    members: [{ id: "me", name: "أنا", linked: true }, { id: "org", name: "المشرف", linked: true }],
    juz: Array.from({ length: 30 }, (_, i) => ({ status: i < 7 ? "done" : "open", ownerId: i < 7 ? "org" : null })) };
  const { page, errors, context } = await appPage({
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
  const { page, errors, context } = await appPage({ storage: { "zad:kahf-pages-v1": pages(5) } });
  await page.clock.install({ time: fri });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.clock.runFor(1500);
  assert.equal(await page.textContent("#zt-greet-title"), "جمعتكم مباركة");
  const kahf = (await page.innerText("#zt-kahf")).replace(/\s+/g, " ");
  /* كتابع قراءة الجزء: من أبعد صفحة بلغها (٢٩٧)، لا من التي بعدها، وما قبلها مقروء. */
  assert.match(kahf, /الصفحة ٢٩٧/);
  assert.match(kahf, /قرأت ٤ من ١٢ صفحة/);
  assert.equal(await page.getAttribute(".zf-kahf .zt-btn", "href"), "/quran-read/?page=297&from=zad");
  assert.deepEqual(errors, []);
  await context.close();
});

test("«وردك اليوم» opens from the adhkar page, counts every tap, and Back returns to the adhkar page", async () => {
  const { page, errors, context } = await appPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.click("#zt-adhkar [data-za-index]");
  await page.waitForFunction(() => !document.getElementById("za-screen").hidden, null, { timeout: 2000 });
  await page.click("[data-za-wird]");
  await page.click('[data-zw-tab="2"]');
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
  assert.equal(await page.isVisible("#za-screen .za-tiles"), true, "back on the adhkar page");
  await page.goBack();
  await page.waitForFunction(() => document.getElementById("za-screen").hidden, null, { timeout: 2000 });
  assert.deepEqual(errors, []);
  await context.close();
});

test("in the morning the adhkar card opens the morning adhkar, a full count moves to the next one, and Back returns home", async () => {
  const { page, errors, context } = await appPage();
  await page.clock.install({ time: new Date("2026-11-10T08:00:00").getTime() });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForSelector(".za-card-main");
  assert.match(await page.innerText(".za-card-main"), /أذكار الصباح[\s\S]*٣١ ذكرًا/);
  await page.click(".za-card-main");
  assert.equal(await page.textContent("#za-title"), "أذكار الصباح");
  assert.match(await page.innerText(".za-progress-row"), /الذكر ١ من ٣١/);
  assert.match(await page.innerText(".za-text"), /﴿٢٥٥﴾/, "Ayat al-Kursi from the mushaf text");
  await page.click("#za-tap");
  await page.clock.runFor(600);
  assert.match(await page.innerText(".za-progress-row"), /الذكر ٢ من ٣١/);
  for (let i = 0; i < 2; i++) await page.click("#za-tap");
  assert.equal(await page.textContent("#za-count"), "٢");
  assert.match(await page.innerText(".za-reader"), /من ٣/);
  await page.goBack();
  await page.waitForFunction(() => document.getElementById("za-screen").hidden, null, { timeout: 2000 });
  assert.match(await page.innerText(".za-card-main"), /أتممت ١ من ٣١/);
  /* أتمّها كلها: تنكمش البطاقة إلى سطر يفتح صفحة الأذكار. */
  await page.evaluate(() => { const st = zaLoad("morning"); st.counts = st.items.map(it => it.count); zaSave("morning", st); zaCardRender(); });
  assert.match(await page.innerText("#zt-adhkar .zw-done"), /أتممتها، تقبّل الله منك/);
  await page.click("#zt-adhkar .zw-done");
  assert.equal(await page.isVisible("#za-screen .za-tiles"), true);
  assert.equal(await page.$("#za-screen .za-hero"), null, "no «now» card once they are done");
  assert.deepEqual(errors, []);
  await context.close();
});

/* لكل قسم رابط: يفتح الرئيسية على القسم، وزر المشاركة في الترأس ينسخ رابط ما هو مفتوح. */
test("an adhkar link opens its section, Back leads to the adhkar page, and the header shares the open page's link", async () => {
  const { page, errors, context } = await appPage();
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.__copied = text; } } });
  });
  await page.goto(BASE + "/adhkar/evening/", { waitUntil: "load" });
  await page.waitForFunction(() => document.getElementById("za-title")?.textContent === "أذكار المساء", null, { timeout: 5000 });
  assert.equal(new URL(page.url()).search, "", "?adhkar= is removed from the address");
  await page.click("#za-share");
  await page.waitForFunction(() => window.__copied, null, { timeout: 2000 });
  assert.equal(await page.evaluate(() => window.__copied), new URL("/adhkar/evening/", BASE).href);
  await page.goBack();
  await page.waitForSelector("#za-screen .za-tiles");
  assert.equal(await page.textContent("#za-title"), "الأذكار");
  assert.equal(new URL(page.url()).search, "", "Back does not return to ?adhkar=");
  /* الضغطة الثانية على الزر نفسه خلال ٧٠٠ ملّي ثانية تُهمل عمدًا (bootstrap.js). */
  await page.waitForTimeout(750);
  await page.click("#za-share");
  await page.waitForFunction(() => window.__copied?.endsWith("/adhkar/"), null, { timeout: 2000 });
  await page.click("[data-za-wird]");
  await page.click("#zw-share");
  await page.waitForFunction(() => window.__copied?.endsWith("/adhkar/wird/"), null, { timeout: 2000 });
  /* زر الرجوع في الترأس: من الورد إلى صفحة الأذكار، ثم إلى الرئيسية. */
  await page.click("#zw-back");
  await page.waitForFunction(() => document.getElementById("zw-screen").hidden);
  await page.click("#za-back");
  await page.waitForFunction(() => document.getElementById("za-screen").hidden);
  assert.deepEqual(errors, []);
  await context.close();
});

/* الصلاة القائم وقتها: «الآن» فوقها ورابط أذكارها تحتها. للفجر زيادات، والفجر ينتهي بالشروق. */
test("the prayer card marks the current prayer and links to its adhkar, with Fajr's extras and nothing after sunrise", async () => {
  const prayer = JSON.stringify({ land: "اليابان", city: "ناها", lat: 26.2124, lng: 127.6809, tz: "Asia/Tokyo", method: "MuslimWorldLeague", madhab: "Shafi" });
  for (const [at, name, total] of [["2026-11-10T16:00:00+09:00", "العصر", "١٢"], ["2026-11-10T06:10:00+09:00", "الفجر", "١٤"], ["2026-11-10T08:30:00+09:00", null, null]]) {
    const { page, errors, context } = await appPage({ storage: { "zad:prayer": prayer } });
    await page.clock.setFixedTime(new Date(at));
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForSelector(".zt-prayers li");
    if (!name) {
      assert.equal(await page.$(".zt-prayers li.is-now"), null, `${at}: no prayer between sunrise and dhuhr`);
      assert.equal(await page.$(".zt-adhkar-link"), null);
    } else {
      assert.match(await page.innerText(".zt-prayers li.is-now"), new RegExp(`الآن[\\s\\S]*${name}`));
      assert.equal((await page.innerText(".zt-adhkar-link")).trim(), `أذكار بعد صلاة ${name}`);
      await page.click(".zt-adhkar-link");
      assert.equal(await page.textContent("#za-title"), `أذكار بعد صلاة ${name}`);
      assert.match(await page.innerText(".za-progress-row"), new RegExp(`من ${total}`));
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
});


test("a reload stays on the screen that is showing (home, khatmahs or prayer times)", async () => {
  const { page, errors, context } = await appPage();
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
  const { page, errors, context } = await appPage({
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
  const { page, errors, context } = await appPage({
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

/* «ما تيسّر»: الزر يفعّل الوضع (الوسم وسطر «التالي»)، والضغطة الثانية تطفئه.
   الصوت هنا ممنوع، فالمطلوب حالة الواجهة لا التلاوة نفسها. */
test("«ما تيسّر» turns on with its tag and up-next line, and a second press turns it off", async () => {
  const { page, errors, context } = await readerPage();
  try {
    await page.goto(BASE + "/quran-listen/?from=zad", { waitUntil: "load" });
    await page.waitForSelector(".zl-card .zl-tayassur");
    await page.click(".zl-tayassur");
    await page.waitForFunction(() => document.querySelector(".zl-tayassur").getAttribute("aria-pressed") === "true");
    assert.match(await page.locator(".zl-eyebrow").innerText(), /ما تيسّر/);
    assert.match(await page.locator(".zl-upnext").innerText(), /^التالي: سورة /);
    assert.doesNotMatch(await page.locator(".zl-qari-name").innerText(), /الحمود/, "never the whole-surah reciter");
    await page.click(".zl-tayassur");
    await page.waitForFunction(() => document.querySelector(".zl-tayassur").getAttribute("aria-pressed") === "false");
    assert.equal(await page.locator(".zl-upnext").isHidden(), true);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

/* الانتقال من سورة إلى أخرى مع قارئ موقّت (ملف للسورة وتوقيت للآيات): توقيت السورة
   الجديدة يتأخر، والملف القديم ما زال يُسمع. كان توقيته ينقل الآية الجارية إليه فتظهر
   «الآية ١٢١ من ٤» ولا تبدأ السورة الجديدة. الصوت والتوقيت هنا وهميان ومحليّان. */
test("switching surah with a timed reciter starts the new surah from its first ayah", { skip: ENGINE !== "chromium" && "mp3 playback is checked in Chromium" }, async () => {
  const { page, errors, context } = await readerPage();
  const { surahs } = JSON.parse(readFileSync(path.join(root, "src/discovery/catalog.json"), "utf8"));
  const verses = Object.fromEntries(surahs.map(s => [s.n, s.verses]));
  const tone = readFileSync(path.join(root, "tests/browser/tone-12s.mp3"));
  const cors = { "Access-Control-Allow-Origin": "*" };
  await context.addInitScript(() => localStorage.setItem("zad:qcf4:qari", "Husary_128kbps"));
  await context.route(/mp3quran\.net\/api\/v3\/ayat_timing\/reads/, route => route.fulfill({ headers: cors,
    json: [{ id: 8, name: "محمود خليل الحصري", rewaya: "حفص عن عاصم - مرتل", folder_url: "https://audio.test/husary/" }] }));
  await context.route(/mp3quran\.net\/api\/v3\/ayat_timing\?surah=\d+/, async route => {
    const s = Number(route.request().url().match(/surah=(\d+)/)[1]);
    await new Promise(r => setTimeout(r, 800));
    /* 40ms لكل آية، فالآية ١٢١ من البقرة عند الثانية ٤٫٨ من الملف. */
    route.fulfill({ headers: cors, json: Array.from({ length: verses[s] }, (_, i) => ({ ayah: i + 1, start_time: i * 40, end_time: (i + 1) * 40 })) });
  });
  await context.route(/^https:\/\/audio\.test\//, route => route.fulfill({ status: 200, contentType: "audio/mpeg", body: tone, headers: { ...cors, "Accept-Ranges": "bytes" } }));
  try {
    await page.goto(BASE + "/quran-listen/?from=zad", { waitUntil: "load" });
    await page.waitForSelector(".zl-row-main");
    assert.match(await page.locator(".zl-qari-name").innerText(), /الحصري/);
    await page.locator(".zl-row-main").nth(1).click();
    await page.waitForFunction(() => !document.querySelector("audio").paused, null, { timeout: 8000 });
    await page.evaluate(() => { document.querySelector("audio").currentTime = 4.82; });
    await page.waitForFunction(() => /الآية ١٢١ من/.test(document.querySelector(".zl-ayah").textContent), null, { timeout: 3000 });
    await page.locator(".zl-row-main").nth(111).click();
    await page.waitForFunction(() => document.querySelector(".zl-name").textContent.includes("الإخلاص") && !document.querySelector("audio").paused && document.querySelector("audio").currentTime < 1, null, { timeout: 5000 });
    assert.equal(await page.locator(".zl-ayah").innerText(), "الآية ١ من ٤");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
