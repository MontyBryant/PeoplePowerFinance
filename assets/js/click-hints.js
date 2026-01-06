(() => {
  const TARGET_SELECTOR = '[data-pp-clickhint="true"]';

  /** @type {Map<Element, HTMLSpanElement>} */
  const hints = new Map();
  let raf = 0;

  function unionRects(rects) {
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    for (const r of rects) {
      if (!r) continue;
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
    if (!isFinite(left) || !isFinite(top) || !isFinite(right) || !isFinite(bottom)) return null;
    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }

  function getTargetRect(el) {
    const base = el.getBoundingClientRect();
    // If the anchor has no box (common when all children are position:absolute), fall back to union of visible descendants.
    if (base.width >= 10 && base.height >= 10) return base;

    const candidates = Array.from(el.querySelectorAll("img, svg, canvas, video, div"));
    const rects = candidates
      .map((c) => c.getBoundingClientRect())
      .filter((r) => r && r.width > 10 && r.height > 10);

    const u = unionRects(rects);
    return u || base;
  }

  function parseOffset(raw) {
    if (!raw) return { x: 0, y: 0 };
    const parts = String(raw).split(",");
    const x = parseFloat((parts[0] || "").trim());
    const y = parseFloat((parts[1] || "").trim());
    return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
  }

  function pickPoint(rect, placement) {
    switch (placement) {
      case "top-left":
        return { x: rect.left, y: rect.top };
      case "top-right":
        return { x: rect.right, y: rect.top };
      case "bottom-left":
        return { x: rect.left, y: rect.bottom };
      case "bottom-right":
        return { x: rect.right, y: rect.bottom };
      case "top":
        return { x: rect.left + rect.width / 2, y: rect.top };
      case "bottom":
        return { x: rect.left + rect.width / 2, y: rect.bottom };
      case "left":
        return { x: rect.left, y: rect.top + rect.height / 2 };
      case "right":
        return { x: rect.right, y: rect.top + rect.height / 2 };
      case "center":
      default:
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }

  function positionHint(targetEl, hintEl) {
    const rect = getTargetRect(targetEl);
    const placement = targetEl.getAttribute("data-pp-clickhint-placement") || "center";
    const offset = parseOffset(targetEl.getAttribute("data-pp-clickhint-offset"));
    const pt = pickPoint(rect, placement);

    // Convert viewport coords -> document coords.
    const docX = pt.x + (window.scrollX || window.pageXOffset || 0) + offset.x;
    const docY = pt.y + (window.scrollY || window.pageYOffset || 0) + offset.y;

    hintEl.style.left = `${docX}px`;
    hintEl.style.top = `${docY}px`;
  }

  function updateAll() {
    for (const [el, hint] of hints.entries()) {
      // If the target disappears, remove the hint.
      if (!document.documentElement.contains(el)) {
        hint.remove();
        hints.delete(el);
        continue;
      }
      positionHint(el, hint);
    }
  }

  function scheduleUpdate() {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      updateAll();
    });
  }

  function ensureHint(targetEl) {
    if (hints.has(targetEl)) return;

    const hint = document.createElement("span");
    hint.className = "pp-clickhint";
    hint.setAttribute("aria-hidden", "true");
    document.body.appendChild(hint);

    const onEnter = () => hint.classList.add("pp-clickhint--hover");
    const onLeave = () => hint.classList.remove("pp-clickhint--hover");

    targetEl.addEventListener("mouseenter", onEnter);
    targetEl.addEventListener("mouseleave", onLeave);
    targetEl.addEventListener("focusin", onEnter);
    targetEl.addEventListener("focusout", onLeave);

    hints.set(targetEl, hint);
    positionHint(targetEl, hint);
  }

  function init() {
    const targets = Array.from(document.querySelectorAll(TARGET_SELECTOR));
    if (!targets.length) return;

    for (const t of targets) ensureHint(t);
    scheduleUpdate();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    window.addEventListener("load", scheduleUpdate, { passive: true });

    // If images/fonts load after DOMContentLoaded and shift layout, this keeps hints accurate.
    const ro = "ResizeObserver" in window ? new ResizeObserver(scheduleUpdate) : null;
    if (ro) {
      for (const t of targets) ro.observe(t);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


