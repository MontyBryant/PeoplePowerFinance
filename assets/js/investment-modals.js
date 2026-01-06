(() => {
  const STORAGE_KEY = "ppInvest.v1";
  const DEFAULTS = {
    wind: { invested: 1250, apy: 7.4, earned: 38.9, harvested: 12.3, co2: 0.88, days: 180, nextPayout: "2d" },
    solar: { invested: 900, apy: 5.8, earned: 21.44, harvested: 6.1, co2: 0.62, days: 180, nextPayout: "8h" },
  };

  function fmtGBP(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "£0.00";
    return v.toLocaleString(undefined, { style: "currency", currency: "GBP" });
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function save(obj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj || {}));
    } catch (e) {}
  }

  function getState(key) {
    const store = load();
    const base = DEFAULTS[key] || {};
    const v = store[key] && typeof store[key] === "object" ? store[key] : {};
    return { ...base, ...v };
  }

  function setState(key, next) {
    const store = load();
    store[key] = next;
    save(store);
  }

  function render(key) {
    const s = getState(key);
    const nodes = Array.from(document.querySelectorAll(`[data-pp-invest="${key}"][data-field]`));
    for (const el of nodes) {
      const field = el.getAttribute("data-field");
      if (!field) continue;
      if (field === "invested") el.textContent = fmtGBP(s.invested);
      else if (field === "earned") el.textContent = fmtGBP(s.earned);
      else if (field === "harvested") el.textContent = fmtGBP(s.harvested);
      else if (field === "apy") el.textContent = `${Number(s.apy).toFixed(1)}%`;
      else if (field === "co2") el.textContent = `${Number(s.co2).toFixed(2)}t`;
      else if (field === "days") el.textContent = String(s.days);
      else if (field === "nextPayout") el.textContent = String(s.nextPayout || "");
    }
  }

  async function toast(msg) {
    // Minimal, non-invasive: reuse coords HUD if present, else do nothing.
    const hud = document.getElementById("ppEditCoords");
    if (!hud) return;
    const prev = hud.textContent;
    hud.textContent = msg;
    setTimeout(() => (hud.textContent = prev), 1100);
  }

  function harvest(key) {
    const s = getState(key);
    const earned = Number(s.earned) || 0;
    if (earned <= 0.001) {
      toast("Nothing to harvest");
      return;
    }
    const next = {
      ...s,
      earned: 0,
      harvested: (Number(s.harvested) || 0) + earned,
      // give a fun next payout estimate after harvest
      nextPayout: key === "solar" ? "23h" : "6d",
    };
    setState(key, next);
    render(key);
    toast(`Harvested ${fmtGBP(earned)}`);
  }

  function init() {
    render("wind");
    render("solar");

    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("[data-pp-invest-harvest]") : null;
      if (!btn) return;
      const key = btn.getAttribute("data-pp-invest-harvest");
      if (!key) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
      harvest(key);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


