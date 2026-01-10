(() => {
  function hasFancybox() {
    return !!(window.jQuery && window.jQuery.fancybox);
  }

  function ensureLoader(slide) {
    try {
      const $content = slide && slide.$content;
      if (!$content || !$content.length) return null;
      if ($content.find(".pp-iframeLoader").length) return $content.find(".pp-iframeLoader")[0];

      const el = document.createElement("div");
      el.className = "pp-iframeLoader";
      el.innerHTML =
        '<div class="pp-iframeLoader__spinner" aria-hidden="true"></div>' +
        '<div class="pp-iframeLoader__label">Loading…</div>';

      $content.append(el);
      return el;
    } catch (e) {
      return null;
    }
  }

  function removeLoader(slide) {
    try {
      const $content = slide && slide.$content;
      if (!$content || !$content.length) return;
      $content.find(".pp-iframeLoader").remove();
    } catch (e) {}
  }

  function markReadyBySource(win) {
    try {
      if (!window.jQuery || !window.jQuery.fancybox) return;
      const inst = window.jQuery.fancybox.getInstance && window.jQuery.fancybox.getInstance();
      if (!inst) return;
      const cur = inst.current;
      if (!cur || cur.type !== "iframe") return;

      // Best-effort: if we can match the iframe window, only then remove.
      const iframe = cur.$content && cur.$content.find ? cur.$content.find("iframe")[0] : null;
      if (iframe && iframe.contentWindow && win && iframe.contentWindow !== win) return;

      removeLoader(cur);
    } catch (e) {}
  }

  function init() {
    if (!hasFancybox()) return;

    // Show loader for iframe content.
    window.jQuery(document).on("beforeShow.fb", (e, instance, slide) => {
      if (!slide || slide.type !== "iframe") return;
      ensureLoader(slide);
    });

    // Hide loader on iframe load as a fallback.
    window.jQuery(document).on("afterShow.fb", (e, instance, slide) => {
      if (!slide || slide.type !== "iframe") return;
      const $content = slide.$content;
      if (!$content || !$content.length) return;
      const iframe = $content.find("iframe")[0];
      if (!iframe) return;

      const done = () => removeLoader(slide);
      iframe.addEventListener("load", () => setTimeout(done, 50), { once: true });
    });

    // Clean up on close.
    window.jQuery(document).on("afterClose.fb", (e, instance, slide) => {
      if (slide && slide.type === "iframe") removeLoader(slide);
    });

    // Preferred: child iframe can postMessage when its UI is ready.
    window.addEventListener("message", (e) => {
      const d = e && e.data;
      if (!d || typeof d !== "object") return;
      if (d.type !== "pp:iframe-ready") return;
      markReadyBySource(e.source);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

