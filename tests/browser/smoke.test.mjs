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
        const { position, point, before } = geometry;
        assert.ok(point.y >= before.top - 8, "fixture taps a line inside the actual bottom toolbar area");
        const scrollBefore = await stage.evaluate(el => el.scrollTop);
        if (profile.hasTouch) await last.tap({ position }); else await last.click({ position });
        await page.waitForTimeout(220);
        assert.equal(await page.locator("body.reader-tools-top").count(), 1, "low taps put the tools at the top");
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

test("«وردك اليوم» counts every tap, keeps the count, and the Back button closes the counter", async () => {
  const { page, errors, context } = await appPage();
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
  const { page, errors, context } = await appPage({ storage: { "zad:wird-v1": JSON.stringify({ day: key, counts: [100, 100, 100] }) } });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForSelector(".zw-done");
  assert.equal(await page.$(".zw-card"), null);
  await page.click(".zw-done");
  await page.waitForFunction(() => !document.getElementById("zw-screen").hidden, null, { timeout: 2000 });
  assert.deepEqual(errors, []);
  await context.close();
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
