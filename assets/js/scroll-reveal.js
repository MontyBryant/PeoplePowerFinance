(() => {
  const ROOT = document;
  const SECTION_SELECTOR = "#impact";
  const ITEM_SELECTORS = [
    "#impact .EquivalentCard_equivalentCard__372LD",
    "#impact .AchievementRow_badge__4mLIk",
  ].join(",");

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function init() {
    const section = ROOT.querySelector(SECTION_SELECTOR);
    if (!section) return;

    const items = Array.from(ROOT.querySelectorAll(ITEM_SELECTORS));
    if (!items.length) return;

    // Add base class + staggered delay per group type
    let cardIdx = 0;
    let badgeIdx = 0;
    for (const el of items) {
      el.classList.add("pp-reveal-item");
      if (el.matches(".EquivalentCard_equivalentCard__372LD")) {
        el.style.setProperty("--pp-reveal-delay", `${Math.min(cardIdx * 90, 420)}ms`);
        cardIdx += 1;
      } else {
        el.style.setProperty("--pp-reveal-delay", `${Math.min(badgeIdx * 55, 440)}ms`);
        badgeIdx += 1;
      }
    }

    // If reduced motion or no IntersectionObserver, just show immediately.
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
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

    items.forEach((el) => io.observe(el));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


