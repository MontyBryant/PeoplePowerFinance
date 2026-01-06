(() => {
  let lockCount = 0;
  let scrollY = 0;
  let pendingScrollY = null;
  let removeGuards = null;

  function addScrollGuards() {
    const opts = { passive: false };
    const guard = (e) => {
      // Allow scrolling inside the modal content itself.
      const withinModal = e.target && e.target.closest && e.target.closest(".fancybox-content");
      if (withinModal) return;
      e.preventDefault();
    };
    document.addEventListener("wheel", guard, opts);
    document.addEventListener("touchmove", guard, opts);
    document.addEventListener("keydown", (e) => {
      // Prevent keyboard scroll when modal is open, unless focus is inside the modal.
      const withinModal = document.activeElement && document.activeElement.closest && document.activeElement.closest(".fancybox-content");
      if (withinModal) return;
      const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
      if (keys.includes(e.key)) e.preventDefault();
    }, true);

    removeGuards = () => {
      document.removeEventListener("wheel", guard, opts);
      document.removeEventListener("touchmove", guard, opts);
      // keydown listener is anonymous; easiest is to rely on pp-modal-open overflow lock for keyboard scroll.
    };
  }

  function lockScroll() {
    // Fancybox can emit multiple lifecycle events per open; only lock once.
    if (document.body.classList.contains("pp-modal-open")) return;
    if (lockCount++ > 0) return;
    scrollY =
      pendingScrollY != null
        ? pendingScrollY
        : window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    pendingScrollY = null;
    document.body.dataset.ppScrollY = String(scrollY);

    document.documentElement.classList.add("pp-modal-open");
    document.body.classList.add("pp-modal-open");

    // Soft lock: don't change positioning (avoids jump-to-top on close).
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    addScrollGuards();
  }

  function unlockScroll() {
    if (lockCount === 0) return;
    lockCount = 0;

    document.documentElement.classList.remove("pp-modal-open");
    document.body.classList.remove("pp-modal-open");

    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    delete document.body.dataset.ppScrollY;
    if (removeGuards) removeGuards();
    removeGuards = null;
  }

  function init() {
    if (!window.jQuery || !window.jQuery.fancybox) return;

    // Reduce focus/scroll side-effects that can cause "jump to top" feelings.
    window.jQuery.fancybox.defaults.autoFocus = false;
    window.jQuery.fancybox.defaults.backFocus = false;
    window.jQuery.fancybox.defaults.trapFocus = false;
    // Prevent Fancybox hash plugin from changing URL (can cause scroll jumps).
    window.jQuery.fancybox.defaults.hash = false;

    // Capture scroll before Fancybox mutates the page (some browsers can jump on open).
    document.addEventListener(
      "click",
      (e) => {
        const trigger = e.target && e.target.closest && e.target.closest("[data-fancybox]");
        if (!trigger) return;
        const y = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        pendingScrollY = y;

        // If some triggers use hash/empty href, prevent the browser's default jump.
        if (trigger.tagName === "A") {
          const href = trigger.getAttribute("href") || "";
          if (href === "" || href === "#" || href.startsWith("#")) {
            e.preventDefault();
          }
        }

        // Some browsers/plugins still scroll on click; aggressively restore the scroll.
        // This keeps the background page pinned where the modal was opened.
        requestAnimationFrame(() => {
          window.scrollTo(0, y);
          setTimeout(() => window.scrollTo(0, y), 0);
          setTimeout(() => window.scrollTo(0, y), 50);
        });
      },
      true
    );

    // Use the earliest Fancybox lifecycle hook for locking.
    window.jQuery(document).on("beforeLoad.fb", lockScroll);
    window.jQuery(document).on("afterClose.fb", unlockScroll);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


