/* روابط التطبيق في الرسائل وأزرارها. */
import { APP_URL } from "./config.ts";

/* جذر التطبيق دون مسار ملف أو معاملات */
export function appRoot() {
  try {
    const root = new URL(APP_URL);
    root.hash = "";
    root.search = "";
    if (!root.pathname.endsWith("/")) {
      const last = root.pathname.split("/").pop() ?? "";
      root.pathname = last.includes(".")
        ? root.pathname.replace(/[^/]*$/, "")
        : root.pathname + "/";
    }
    return root;
  } catch {
    return null;
  }
}

/* التطبيق، وفيه رمز الختمة بعد # ورمز الدخول الشخصي في ?login */
export function appLink(code?: string, login?: string) {
  const root = appRoot();
  if (!root) return APP_URL;
  if (login) root.searchParams.set("login", login);
  if (code) root.hash = String(code).trim().toUpperCase();
  return root.href;
}

/* المصحف، مفتوحًا على جزء من ختمة إن أُعطيا */
export function readerLink(code?: string, juz?: number) {
  const root = appRoot();
  if (!root) return APP_URL;
  const url = new URL("quran-read/", root);
  if (Number.isInteger(juz) && Number(juz) >= 1 && Number(juz) <= 30) {
    url.searchParams.set("juz", String(juz));
  }
  if (code) url.searchParams.set("code", String(code).trim().toUpperCase());
  return url.href;
}

/* رمز الختمة من رابط مصحف بناه readerLink */
export function codeFromUrl(url?: string) {
  if (!url) return "";
  try {
    return (new URL(url).searchParams.get("code") ?? "").trim().toUpperCase();
  } catch {
    return "";
  }
}

export type TelegramButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

/* زرّا الرسالة: «افتح زاد الخير» (على الختمة، برمز دخول صاحبها) و«افتح المصحف» */
export function navRows(code?: string, login = ""): TelegramButton[][] {
  const app = appLink(code || undefined, login || undefined);
  const reader = readerLink();
  const row: TelegramButton[] = [];
  if (app) row.push({ text: "افتح زاد الخير", url: app });
  if (reader) row.push({ text: "افتح المصحف", url: reader });
  return row.length ? [row] : [];
}
