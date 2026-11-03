// يصدّر بطاقات المشاركة من مصادرها في social/cards إلى صور JPEG (أقل من 300 كيلوبايت، حدّ معاينة واتساب) بقياس 1200×675 (وصورة بوت تلغرام 1024×1024).
// الاستعمال: node scripts/build-share-cards.cjs   (يتطلّب playwright مع Chromium)
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const cards = [
  ["social/cards/home.html", "social/zad-alkhair-share-v2.jpg"],
  ["social/cards/reader.html", "social/zad-alkhair-reader-share.jpg"],
  ["social/cards/install.html", "social/zad-alkhair-install-share-v2.jpg"],
  ["social/cards/guide.html", "social/player-guide-card-v6.jpg"],
  ["social/cards/telegram-avatar.html", "social/zad-alkhair-telegram-avatar.jpg", 1024, 1024],
];

(async () => {
  const browser = await chromium.launch();
  for (const [source, output, width = 1200, height = 675] of cards) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto("file://" + path.join(root, source));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(root, output), type: "jpeg", quality: 90 });
    await page.close();
    console.log(output);
  }
  await browser.close();
})();
