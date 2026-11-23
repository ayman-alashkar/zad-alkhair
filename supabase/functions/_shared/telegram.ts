/* إرسال رسائل تيليغرام. */
import { TOKEN } from "./config.ts";
import type { TelegramButton } from "./links.ts";

/* استدعاء أي طريقة في Bot API */
export function telegram(method: string, body: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type Delivery = { ok: boolean; blocked: boolean; error?: string };

/* رسالة HTML بأزرار اختيارية. blocked يعني أن المستخدم حظر البوت أو حذف حسابه،
   فيُفكّ ربطه بدل إعادة المحاولة. */
export async function sendMessage(chat: number, text: string,
  rows?: TelegramButton[][]): Promise<Delivery> {
  const body: Record<string, unknown> = {
    chat_id: chat,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (rows) body.reply_markup = { inline_keyboard: rows };
  const response = await telegram("sendMessage", body);
  if (response.ok) return { ok: true, blocked: false };
  const result = await response.json().catch(() => ({}));
  const description = String(result?.description ?? response.status);
  const blocked = response.status === 403 ||
    /blocked|deactivated|chat not found/i.test(description);
  return { ok: false, blocked, error: description };
}

/* أربعة مسارات متوازية تبقى بعيدة عن حدود تيليغرام. */
export const SEND_LANES = 4;

/* ينفّذ work لكل عنصر، وفي كل لحظة lanes عناصر على الأكثر. */
export async function eachConcurrently<T>(items: T[], lanes: number,
  work: (item: T) => Promise<void>) {
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const item = items[next++];
      await work(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(lanes, items.length) }, lane));
}

export const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
