(() => {
  function ping() {
    try {
      if (window.parent && window.parent !== window && window.parent.postMessage) {
        window.parent.postMessage({ type: "pp:iframe-ready" }, "*");
      }
    } catch (e) {}
  }

  // Send once when DOM is ready (fast), and once after full load (safe fallback).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ping, { once: true });
  } else {
    ping();
  }
  window.addEventListener("load", ping, { once: true });
})();

