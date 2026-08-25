(() => {
  "use strict";

  const SUPABASE_URL = "https://webqpbcijjbawatykoxe.supabase.co";
  const SUPABASE_KEY = "sb_publishable_51JPJ2XgwWW5l66bwqHN3Q_CJrEtyZv";
  const ID_KEY = "zad:pwa-install-id";
  const SENT_KEY = "zad:pwa-standalone-reported-v1";
  const APP_VERSION = "v105";

  function isStandalone() {
    return (
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      window.matchMedia?.("(display-mode: minimal-ui)")?.matches ||
      window.navigator.standalone === true
    );
  }

  function platform() {
    const ua = navigator.userAgent || "";
    if (/Android/i.test(ua)) return "android";
    if (
      /iPad|iPhone|iPod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    ) return "ios";
    if (/Windows|Macintosh|Linux/i.test(ua)) return "desktop";
    return "other";
  }

  function installId() {
    try {
      let id = localStorage.getItem(ID_KEY);
      const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (id && valid.test(id)) return id;

      if (crypto.randomUUID) {
        id = crypto.randomUUID();
      } else {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        const hex = [...bytes].map(v => v.toString(16).padStart(2, "0")).join("");
        id = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      }

      localStorage.setItem(ID_KEY, id);
      return id;
    } catch (_) {
      return null;
    }
  }

  let reporting = false;

  async function reportStandalone() {
    if (reporting || !isStandalone()) return;

    try {
      if (localStorage.getItem(SENT_KEY) === "1") return;
    } catch (_) {}

    if (navigator.onLine === false) return;

    const id = installId();
    if (!id) return;

    reporting = true;
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/record_pwa_install`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({
            p_device_id: id,
            p_platform: platform(),
            p_event: "standalone_open",
            p_app_version: APP_VERSION
          }),
          keepalive: true
        }
      );

      if (response.ok) {
        try { localStorage.setItem(SENT_KEY, "1"); } catch (_) {}
      }
    } catch (_) {
      // Silent by design: analytics must never affect the app.
    } finally {
      reporting = false;
    }
  }

  reportStandalone();
  window.addEventListener("online", reportStandalone, { passive: true });
  window.addEventListener("pageshow", reportStandalone, { passive: true });
})();
