/* إعداد مشترك لكل الوظائف: الأسرار من بيئة Supabase، وعنوان التطبيق. */

export const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
export const SB_URL = Deno.env.get("SUPABASE_URL")!;
export const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

export const FINAL_ORIGIN = "https://zad-alkhair.net";

/* APP_URL من البيئة يُقبل إن كان على النطاق النهائي فقط، وإلا فالجذر. */
export const APP_URL = (() => {
  try {
    const configured = new URL(Deno.env.get("APP_URL") ?? "");
    if (configured.origin === FINAL_ORIGIN) return configured.href;
  } catch { /* لا عنوان صالح في البيئة */ }
  return `${FINAL_ORIGIN}/`;
})();

/* ترويسات الوظائف التي تستدعيها الواجهة من المتصفح. */
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
