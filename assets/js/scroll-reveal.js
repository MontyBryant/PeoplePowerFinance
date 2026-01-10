(() => {
  const ROOT = document;

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function uniqInOrder(nodes) {
    const out = [];
    const seen = new Set();
    for (const n of nodes) {
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    return out;
  }

  function collectOrdered(selectors) {
    const out = [];
    for (const sel of selectors) {
      const nodes = Array.from(ROOT.querySelectorAll(sel));
      out.push(...nodes);
    }
    return uniqInOrder(out);
  }

  function markReveal(el, delayMs) {
    if (!el || el.classList.contains("pp-reveal-item")) return;
    el.classList.add("pp-reveal-item");
    if (delayMs != null) el.style.setProperty("--pp-reveal-delay", `${delayMs}ms`);
  }

  function init() {
    const revealTargets = [];

    // ===== Impact section (cards + badges + titles) =====
    if (ROOT.querySelector("#impact")) {
      // Titles + intro text
      const impactIntro = collectOrdered([
        "#impact .pp-section-title",
        "#impact .Text_textSubeading__3xsOT",
      ]);
      impactIntro.forEach((el, idx) => {
        markReveal(el, Math.min(idx * 120, 240));
      });

      // Cards + badges: keep the existing per-type stagger feel
      const impactItems = Array.from(
        ROOT.querySelectorAll(
          [
            "#impact .EquivalentCard_equivalentCard__372LD",
            "#impact .AchievementRow_badge__4mLIk",
          ].join(",")
        )
      );

      let cardIdx = 0;
      let badgeIdx = 0;
      for (const el of impactItems) {
        if (el.matches(".EquivalentCard_equivalentCard__372LD")) {
          markReveal(el, 220 + Math.min(cardIdx * 90, 420));
          cardIdx += 1;
        } else {
          markReveal(el, 340 + Math.min(badgeIdx * 55, 440));
          badgeIdx += 1;
        }
      }

      // CTA buttons inside impact block
      const impactCtas = collectOrdered([
        "#impact a.Button_button__2Lf63",
        '#impact a[data-fancybox][data-src="#pp-profile-modal"]',
      ]);
      impactCtas.forEach((el) => markReveal(el, 520));
    }

    // ===== Leaderboard hero =====
    if (ROOT.querySelector("#leaderboard")) {
      const inner = collectOrdered(["#leaderboard .pp-leaderboard-hero__inner > *"]);
      inner.forEach((el, idx) => markReveal(el, Math.min(idx * 120, 360)));

      // Globe container (badge already floats via CSS)
      const globe = ROOT.querySelector("#leaderboard .pp-leaderboard-hero__globe");
      if (globe) markReveal(globe, 180);
    }

    // ===== Game section =====
    if (ROOT.querySelector("#world")) {
      const media = ROOT.querySelector("#world .pp-game__media");
      if (media) markReveal(media, 0);

      const content = collectOrdered([
        "#world .pp-game__title",
        "#world .pp-game__copy",
        "#world .pp-game__actions",
      ]);
      content.forEach((el, idx) => markReveal(el, Math.min(140 + idx * 110, 520)));
    }

    // ===== Footer columns =====
    const footerBoxes = collectOrdered([
      "footer.Footer_footer__7dIj9 .Footer_footerBox__q6Ada",
    ]);
    footerBoxes.forEach((el, idx) => markReveal(el, Math.min(idx * 90, 360)));

    // Collect all reveal items we created (some selectors may overlap)
    revealTargets.push(...Array.from(ROOT.querySelectorAll(".pp-reveal-item")));
    const items = uniqInOrder(revealTargets);
    if (!items.length) return;

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


