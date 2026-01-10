(() => {
  // --- EXISTING EDIT MODE CODE (omitted for brevity in this update) ---
  // ... (keep all the existing edit mode code as is, only appending the tab logic below) ...

  function initTabs() {
    document.addEventListener("click", (e) => {
      const tabBtn = e.target.closest("[data-pp-tab]");
      if (!tabBtn) return;
      
      const tabId = tabBtn.getAttribute("data-pp-tab");
      const container = tabBtn.closest(".pp-profileModal");
      if (!container) return;

      // Update tabs state
      const tabs = container.querySelectorAll("[data-pp-tab]");
      tabs.forEach(t => {
        if (t.getAttribute("data-pp-tab") === tabId) {
          t.classList.add("is-active");
        } else {
          t.classList.remove("is-active");
        }
      });

      // Update panels state
      const panels = container.querySelectorAll("[data-pp-panel]");
      panels.forEach(p => {
        if (p.getAttribute("data-pp-panel") === tabId) {
          p.classList.add("is-active");
        } else {
          p.classList.remove("is-active");
        }
      });
      
      e.preventDefault();
    });

    // Handle "Go to Edit" links from within the modal
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-pp-go-tab]");
      if (!link) return;
      const targetTab = link.getAttribute("data-pp-go-tab");
      const container = link.closest(".pp-profileModal");
      if (!container) return;
      
      const tabBtn = container.querySelector(`[data-pp-tab="${targetTab}"]`);
      if (tabBtn) tabBtn.click();
      
      e.preventDefault();
    });
  }

  const STORAGE_KEY = "ppAssetLayout.v1";
  const ROOT_CLASS = "pp-edit-mode";
  // ... (rest of existing edit mode variables and functions) ...
  const RESET_ID = "ppEditModeReset";
  const TOGGLE_ID = "ppEditModeToggle";
  const COORDS_ID = "ppEditCoords";
  const COORDS_EXCLUDE_SELECTOR = `#${TOGGLE_ID},#${RESET_ID}`;

  let lastClientX = 0;
  let lastClientY = 0;
  let lastMoveTs = 0;
  let copiedTimer = null;

  function loadLayout() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function saveLayout(layout) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout || {}));
    } catch (e) {}
  }

  function clearLayout() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function getOffsetFor(groupId) {
    const layout = loadLayout();
    const v = layout[groupId];
    const x = v && Number.isFinite(v.x) ? v.x : 0;
    const y = v && Number.isFinite(v.y) ? v.y : 0;
    return { x, y };
  }

  function setOffsetFor(groupId, x, y) {
    const layout = loadLayout();
    layout[groupId] = { x, y };
    saveLayout(layout);
  }

  function applyGroupTransform(groupId, x, y) {
    const els = Array.from(document.querySelectorAll(`[data-pp-edit-group="${groupId}"]`));
    for (const el of els) {
      const base = el.getAttribute("data-pp-edit-base-transform") ?? "";
      const t = `translate3d(${x}px, ${y}px, 0px)`;
      el.style.transform = base ? `${base} ${t}` : t;
      el.dataset.ppEditX = String(x);
      el.dataset.ppEditY = String(y);
    }
  }

  function initPositions() {
    const groups = new Set(
      Array.from(document.querySelectorAll("[data-pp-edit-group]")).map((e) => e.getAttribute("data-pp-edit-group")).filter(Boolean)
    );

    for (const groupId of groups) {
      const { x, y } = getOffsetFor(groupId);
      applyGroupTransform(groupId, x, y);
    }
  }

  function cacheBaseTransforms() {
    const els = Array.from(document.querySelectorAll("[data-pp-edit-group]"));
    for (const el of els) {
      if (el.hasAttribute("data-pp-edit-base-transform")) continue;
      // Only respect inline transform; computed transforms may be matrices.
      const base = (el.style && el.style.transform) ? el.style.transform.trim() : "";
      el.setAttribute("data-pp-edit-base-transform", base);
    }
  }

  function ensureToggleButton() {
    let btn = document.getElementById(TOGGLE_ID);
    if (btn) return btn;
    btn = document.createElement("button");
    btn.id = TOGGLE_ID;
    btn.type = "button";
    btn.className = "pp-edit-toggle";
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-label", "Enable edit mode");
    btn.textContent = "Edit Mode";
    const actions = document.querySelector(".pp-topbar__actions");
    if (actions) {
      actions.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }
    return btn;
  }

  function ensureResetButton() {
    let btn = document.getElementById(RESET_ID);
    if (btn) return btn;
    btn = document.createElement("button");
    btn.id = RESET_ID;
    btn.type = "button";
    btn.className = "pp-edit-reset";
    btn.setAttribute("aria-label", "Reset asset positions");
    btn.textContent = "Reset";
    document.body.appendChild(btn);
    return btn;
  }

  function ensureCoordsHud() {
    let el = document.getElementById(COORDS_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = COORDS_ID;
    el.className = "pp-edit-coords";
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    el.textContent = "x: 0  y: 0";
    document.body.appendChild(el);
    return el;
  }

  function setCoordsText(text) {
    const el = document.getElementById(COORDS_ID);
    if (!el) return;
    el.textContent = text;
  }

  async function copyTextToClipboard(text) {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      // fall back below
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand && document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) {
      return false;
    }
  }

  function setEditMode(on) {
    document.documentElement.classList.toggle(ROOT_CLASS, !!on);
    const btn = document.getElementById(TOGGLE_ID);
    if (btn) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Disable edit mode" : "Enable edit mode");
      btn.textContent = on ? "Done" : "Edit Mode";
    }
  }

  function isEditMode() {
    return document.documentElement.classList.contains(ROOT_CLASS);
  }

  function closestEditableGroup(el) {
    if (!el || !el.closest) return null;
    // Only allow dragging from explicit handles.
    const handle = el.closest('[data-pp-edit-handle="true"]');
    if (!handle) return null;
    const hit = handle.closest("[data-pp-edit-group]") || (handle.matches("[data-pp-edit-group]") ? handle : null);
    if (!hit) return null;
    const groupId = hit.getAttribute("data-pp-edit-group");
    return groupId ? { groupId, el: hit } : null;
  }

  function initDragging() {
    let dragging = null; // {groupId, startX, startY, baseX, baseY}

    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!isEditMode()) return;
        // Ignore right-click / non-primary
        if (e.button != null && e.button !== 0) return;

        const hit = closestEditableGroup(e.target);
        if (!hit) return;

        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();

        const groupId = hit.groupId;
        const baseX = parseFloat(hit.el.dataset.ppEditX || "0") || 0;
        const baseY = parseFloat(hit.el.dataset.ppEditY || "0") || 0;
        dragging = { groupId, startX: e.clientX, startY: e.clientY, baseX, baseY };

        try {
          hit.el.setPointerCapture(e.pointerId);
        } catch (err) {}

        document.documentElement.classList.add("pp-edit-dragging");
      },
      true
    );

    document.addEventListener(
      "pointermove",
      (e) => {
        if (!dragging) return;
        e.preventDefault();
        const dx = e.clientX - dragging.startX;
        const dy = e.clientY - dragging.startY;
        const x = Math.round(dragging.baseX + dx);
        const y = Math.round(dragging.baseY + dy);
        applyGroupTransform(dragging.groupId, x, y);
      },
      { passive: false }
    );

    const end = (e) => {
      if (!dragging) return;
      e.preventDefault();
      const groupId = dragging.groupId;
      const el = document.querySelector(`[data-pp-edit-group="${groupId}"]`);
      const x = el ? parseFloat(el.dataset.ppEditX || "0") || 0 : 0;
      const y = el ? parseFloat(el.dataset.ppEditY || "0") || 0 : 0;
      setOffsetFor(groupId, x, y);
      dragging = null;
      document.documentElement.classList.remove("pp-edit-dragging");
    };

    document.addEventListener("pointerup", end, true);
    document.addEventListener("pointercancel", end, true);

    // Prevent clicks on hotspots while editing (even after drag).
    document.addEventListener(
      "click",
      (e) => {
        if (!isEditMode()) return;
        const hit = closestEditableGroup(e.target);
        if (!hit) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
      },
      true
    );
  }

  function resetAllPositions() {
    clearLayout();
    const groups = new Set(
      Array.from(document.querySelectorAll("[data-pp-edit-group]"))
        .map((e) => e.getAttribute("data-pp-edit-group"))
        .filter(Boolean)
    );
    for (const groupId of groups) {
      applyGroupTransform(groupId, 0, 0);
    }
  }

  function init() {
    if (!document.body) return;
    cacheBaseTransforms();
    initPositions();
    initTabs(); // Initialize tabs listener

    // forestCollect handle is page-anchored (position:absolute), so no portal/re-parenting needed.

    // Coords HUD + click-to-copy (must be registered before initDragging's click interception)
    ensureCoordsHud();
    document.addEventListener(
      "pointermove",
      (e) => {
        if (!isEditMode()) return;
        // Ignore non-primary pointers to keep it stable.
        if (e.pointerType === "mouse" || e.pointerType === "pen" || e.pointerType === "touch") {
          lastClientX = Math.round(e.clientX);
          lastClientY = Math.round(e.clientY);
          lastMoveTs = Date.now();
          setCoordsText(`x: ${lastClientX}  y: ${lastClientY}`);
        }
      },
      { passive: true, capture: true }
    );
    document.addEventListener(
      "click",
      async (e) => {
        if (!isEditMode()) return;
        if (e.target && e.target.closest && e.target.closest(COORDS_EXCLUDE_SELECTOR)) return;
        // If no recent pointer move happened (keyboard activation), fall back to event coords.
        const x = (Date.now() - lastMoveTs < 1500) ? lastClientX : Math.round(e.clientX);
        const y = (Date.now() - lastMoveTs < 1500) ? lastClientY : Math.round(e.clientY);
        const text = `${x},${y}`;
        const ok = await copyTextToClipboard(text);
        // In edit mode, a click should be used for copying coords only (no modals/links underneath).
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        setCoordsText(ok ? `x: ${x}  y: ${y}  (copied)` : `x: ${x}  y: ${y}  (copy failed)`);
        if (copiedTimer) clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => {
          setCoordsText(`x: ${x}  y: ${y}`);
        }, 900);
      },
      true
    );

    initDragging();

    const btn = ensureToggleButton();
    btn.addEventListener("click", () => setEditMode(!isEditMode()));

    const reset = ensureResetButton();
    reset.addEventListener("click", (e) => {
      // Only usable in edit mode; keep the handler safe regardless.
      if (!isEditMode()) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
      resetAllPositions();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


