(() => {
  const STORAGE_KEY = "ppTheme"; // "day" | "night"
  const DEFAULT_THEME = "night";
  const BUTTON_OPT_IN_ATTR = "data-pp-theme-toggle"; // set to "true" on pages that should show the button

  function getTheme() {
    const t = (localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME).toLowerCase();
    return t === "night" ? "night" : "day";
  }

  function setTheme(theme) {
    const t = theme === "night" ? "night" : "day";
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }

  function applyTheme(theme) {
    const t = theme === "night" ? "night" : "day";
    document.documentElement.setAttribute("data-pp-theme", t);

    // Toggle the night CSS via media query switch (more compatible than link.disabled)
    const link = document.getElementById("pp-night-theme");
    if (link && link.tagName === "LINK") {
      link.media = t === "night" ? "all" : "not all";
    }

    const btn = document.getElementById("ppThemeToggle");
    if (btn) {
      // Icon-only button; keep it accessible.
      btn.textContent = "";
      btn.setAttribute("aria-pressed", t === "night" ? "true" : "false");
      const label = t === "night" ? "Switch to day mode" : "Switch to night mode";
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    }
  }

  function shouldRenderButton() {
    const body = document.body;
    if (!body) return false;
    return body.getAttribute(BUTTON_OPT_IN_ATTR) === "true";
  }

  function ensureButton() {
    if (!shouldRenderButton()) return null;

    let btn = document.getElementById("ppThemeToggle");
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = "ppThemeToggle";
    btn.type = "button";
    btn.className = "pp-theme-toggle";
    btn.setAttribute("aria-label", "Toggle day/night theme");
    btn.setAttribute("aria-pressed", "false");
    const mount = document.getElementById("pp-theme-toggle-container") || document.body;
    mount.appendChild(btn);
    return btn;
  }

  function init() {
    if (!document.body) return;

    const btn = ensureButton();
    if (btn) {
      btn.addEventListener("click", () => {
        const next = getTheme() === "night" ? "day" : "night";
        setTheme(next);
      });
    }

    // Apply persisted theme on load
    applyTheme(getTheme());

    // Avoid playing the sun/moon transition on initial load; enable transitions after first paint.
    requestAnimationFrame(() => {
      document.documentElement.classList.add("pp-theme-ready");
    });

    // Sync across iframes / other windows
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) applyTheme(getTheme());
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


