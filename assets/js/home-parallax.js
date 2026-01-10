(() => {
  const root = document.documentElement;

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function init() {
    if (!document.body || !document.body.classList.contains("pp-home")) return;
    if (prefersReducedMotion()) return;

    const celestial = document.querySelector(".pp-celestial");
    const heroPanel = document.querySelector(".pp-heroPanel");
    if (!celestial && !heroPanel) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || window.pageYOffset || 0;

        // Keep it extremely subtle to avoid "floaty UI".
        const c = clamp(y * 0.03, 0, 12);  // 0..12px
        const h = clamp(y * 0.012, 0, 6);  // 0..6px

        if (celestial) celestial.style.transform = `translate3d(0, ${c}px, 0)`;
        if (heroPanel) heroPanel.style.transform = `translate3d(0, ${h}px, 0)`;
      });
    };

    // Don’t fight the page-load intro animation; start after first paint.
    requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

