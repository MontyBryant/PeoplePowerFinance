(() => {
  const ALLOWED_INLINE = new Set([
    "#pp-profile-modal",
    "#pp-forest-modal",
    "#pp-wind-modal",
    "#pp-solar-modal",
  ]);

  function openInline(src) {
    if (!ALLOWED_INLINE.has(src)) return false;
    if (!window.jQuery || !window.jQuery.fancybox) return false;
    try {
      window.jQuery.fancybox.close();
      setTimeout(() => window.jQuery.fancybox.open({ src, type: "inline" }), 0);
      return true;
    } catch (e) {
      return false;
    }
  }

  function onMessage(e) {
    const d = e && e.data;
    if (!d || typeof d !== "object") return;
    if (d.type !== "pp:open-inline-modal") return;
    if (typeof d.src !== "string") return;
    openInline(d.src);
  }

  window.addEventListener("message", onMessage);
})();


