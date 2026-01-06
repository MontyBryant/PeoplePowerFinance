(() => {
  const FOREST_SELECTOR = '.ProfileForest_scoreboard__2d1gG[data-src="#pp-forest-modal"]';
  const FOREST_WRAPPER_SELECTOR = ".ProfileForest_wrapper__2BSF4";
  const WIND_HANDLE_SELECTOR = ".pp-wind-edit-handle";
  const EDIT_MODE_CLASS = "pp-edit-mode";

  function isFancyboxOpen() {
    // Fancybox v3 uses .fancybox-container; v4 uses .fancybox__container.
    return !!(
      document.querySelector(".fancybox-container") ||
      document.querySelector(".fancybox__container")
    );
  }

  function openForestModal() {
    if (!window.jQuery || !window.jQuery.fancybox) return false;
    try {
      window.jQuery.fancybox.open({ src: "#pp-forest-modal", type: "inline" });
      return true;
    } catch (e) {
      return false;
    }
  }

  function openWindModal() {
    if (!window.jQuery || !window.jQuery.fancybox) return false;
    try {
      window.jQuery.fancybox.open({ src: "#pp-wind-modal", type: "inline" });
      return true;
    } catch (e) {
      return false;
    }
  }

  function withinRect(e, rect, pad = 0) {
    const x = e.clientX;
    const y = e.clientY;
    return (
      x >= rect.left - pad &&
      x <= rect.right + pad &&
      y >= rect.top - pad &&
      y <= rect.bottom + pad
    );
  }

  function stop(e) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
  }

  function rectOf(selector) {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r || (!r.width && !r.height)) return null;
    return r;
  }

  function unionRects(rects) {
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    let any = false;
    for (const r of rects) {
      if (!r) continue;
      any = true;
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
    if (!any) return null;
    return { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  function rectOfGroup(groupId) {
    const nodes = Array.from(
      document.querySelectorAll(`[data-pp-edit-group="${groupId}"][data-pp-edit-handle="true"]`)
    );
    const rects = nodes.map((n) => n.getBoundingClientRect()).filter((r) => r && r.width > 0 && r.height > 0);
    return unionRects(rects);
  }

  function onDocClickCapture(e) {
    if (document.documentElement.classList.contains(EDIT_MODE_CLASS)) return;
    // If a Fancybox modal is already open, don't "route" clicks by coordinates.
    // This prevents "click outside to close" from opening a different modal underneath.
    if (isFancyboxOpen()) return;

    // Priority 1: wind turbine graphic area (can overlap forest visually)
    const windRect = rectOf(WIND_HANDLE_SELECTOR);
    if (windRect && withinRect(e, windRect, 4)) {
      stop(e);
      openWindModal();
      return;
    }

    // Priority 2: explicit forest scoreboard button
    const forestBtn = document.querySelector(FOREST_SELECTOR);
    if (forestBtn) {
      const btnRect = forestBtn.getBoundingClientRect();
      if (btnRect && withinRect(e, btnRect, 6)) {
        stop(e);
        openForestModal();
        return;
      }
    }

    // Priority 3: click anywhere on the forest section background, unless it's on another asset/button.
    const forestWrap = document.querySelector(FOREST_WRAPPER_SELECTOR);
    if (!forestWrap) return;
    const forestRect = forestWrap.getBoundingClientRect();
    if (!forestRect || !withinRect(e, forestRect, 0)) return;

    // Don't hijack clicks on known interactive areas (profile buttons, doors, solar).
    if (e.target && e.target.closest) {
      if (e.target.closest(".pp-heroPanel__ctaButtons")) return;
      if (e.target.closest("#ppEditModeToggle")) return;
    }

    const doorsRect = rectOfGroup("doors");
    if (doorsRect && withinRect(e, doorsRect, 0)) return;
    const solarRect = rectOfGroup("solar");
    if (solarRect && withinRect(e, solarRect, 0)) return;

    stop(e);
    openForestModal();
  }

  function onKeydown(e) {
    if (isFancyboxOpen()) return;
    const el = e.target && e.target.closest ? e.target.closest(FOREST_SELECTOR) : null;
    if (!el) return;
    const key = e.key;
    if (key !== "Enter" && key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    openForestModal();
  }

  function init() {
    document.addEventListener("click", onDocClickCapture, true);
    document.addEventListener("keydown", onKeydown, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


