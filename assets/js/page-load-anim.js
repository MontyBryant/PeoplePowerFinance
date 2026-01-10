(() => {
  const root = document.documentElement;

  function prefersReducedMotion() {
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function play() {
    // If the inline "preload" class wasn't applied for any reason, apply it now.
    // (No harm if it's already there.)
    root.classList.add("pp-preload");

    // Respect reduced motion: skip transitions entirely.
    if (prefersReducedMotion()) {
      root.classList.add("pp-loaded");
      root.classList.remove("pp-preload");
      return;
    }

    // Ensure the preload styles are applied before switching to the end state.
    requestAnimationFrame(() => {
      root.classList.add("pp-loaded");
      // Clean up after transitions finish (keeps DOM/classes tidy).
      window.setTimeout(() => root.classList.remove("pp-preload"), 1100);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", play, { once: true });
  } else {
    play();
  }
})();

