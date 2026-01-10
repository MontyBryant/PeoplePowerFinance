(() => {
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function init() {
    const body = document.body;
    if (!body || !body.classList.contains("market_page")) return;

    // Targets (Marketplace + Leaderboard share `market_page`)
    const targets = Array.from(
      document.querySelectorAll([
        ".overview-header",
        ".overview-grid > .overview-card",
        ".category-header",
        ".li_container > .li_item",
      ].join(","))
    );
    if (!targets.length) return;

    // Mark as reveal items and set a light stagger per container.
    let idx = 0;
    for (const el of targets) {
      el.classList.add("pp-reveal-item");
      el.style.setProperty("--pp-reveal-delay", `${Math.min(idx * 50, 520)}ms`);
      idx += 1;
    }

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      },
      { root: null, threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );

    targets.forEach((el) => io.observe(el));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

