// Canvas camera for the canvas view, adapted from the lean-proto Studio.
// A camera moves the view; cards stay in world coordinates.
// Wheel pans, Ctrl/Cmd + wheel (or trackpad pinch) zooms at the cursor, Space + drag or middle drag pans,
// a drag anywhere (cards included) pans, a double-click on empty space fits everything.
(() => {
  const CARD = ".canvas-card,button,a,select,label";
  const CONTROL = "button,a,select,label";
  class Canvas {
    constructor(viewport, world, onChange = () => {}, { zoomSensitivity = 0.0006, pinchSensitivity = 0.01, maxWheelGain = Math.exp(120 * zoomSensitivity), top = 72, bottom = 32 } = {}) {
      this.viewport = viewport;
      this.world = world;
      this.onChange = onChange;
      this.zoomSensitivity = zoomSensitivity;
      this.pinchSensitivity = pinchSensitivity;
      this.maxWheelExponent = Math.log(maxWheelGain);
      this.margin = { top, bottom };
      this.x = 0; this.y = 0; this.zoom = 1;
      this.view = { x: 0, y: 0, zoom: 1 };
      this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
      let space = false, spaceUsed = false, drag = null, suppressClick = false;
      const editable = (e) => e.target.closest?.("input,textarea,select,[contenteditable='true']");
      this.onKeyDown = (e) => {
        if (e.code === "Space" && !editable(e)) {
          space = true;
          if (!e.repeat) spaceUsed = false;
          viewport.classList.add("grab-ready");
          if (!e.target.closest?.("button,a,[role='button']")) e.preventDefault();
        }
      };
      this.onKeyUp = (e) => {
        if (e.code === "Space") {
          if (spaceUsed) e.preventDefault();
          space = spaceUsed = false; viewport.classList.remove("grab-ready");
        }
      };
      this.onBlur = () => { space = spaceUsed = false; drag = null; this.stop(); viewport.classList.remove("grab-ready", "panning"); };
      addEventListener("keydown", this.onKeyDown);
      addEventListener("keyup", this.onKeyUp);
      addEventListener("blur", this.onBlur);
      viewport.addEventListener("pointerdown", (e) => {
        suppressClick = false;
        if (editable(e)) return;
        this.stop();
        if (e.button !== 1 && !(e.button === 0 && (space || !e.target.closest(CONTROL)))) return;
        e.preventDefault();
        if (space) spaceUsed = true;
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: this.x, startY: this.y, moved: false };
      });
      viewport.addEventListener("pointermove", (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        // Capture only once it is a drag: a plain click or double-click on a card keeps its own target.
        if (!drag.moved && Math.hypot(dx, dy) > 3) {
          drag.moved = true;
          viewport.setPointerCapture(e.pointerId);
          viewport.classList.add("panning");
        }
        if (!drag.moved) return;
        this.x = drag.startX + dx; this.y = drag.startY + dy; this.render(true, 28);
      });
      const finish = (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        suppressClick = drag.moved;
        if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
        drag = null; viewport.classList.remove("panning");
        setTimeout(() => { suppressClick = false; }, 0);
      };
      viewport.addEventListener("pointerup", finish);
      viewport.addEventListener("pointercancel", finish);
      viewport.addEventListener("click", (e) => {
        if (suppressClick || space) { suppressClick = false; e.preventDefault(); e.stopImmediatePropagation(); }
      }, true);
      viewport.addEventListener("auxclick", (e) => { if (e.button === 1) e.preventDefault(); });
      viewport.addEventListener("wheel", (e) => {
        if (editable(e)) return;
        e.preventDefault();
        const r = viewport.getBoundingClientRect(), unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;
        if (e.ctrlKey || e.metaKey) {
          const delta = Math.max(-120, Math.min(120, e.deltaY * unit));
          // A trackpad pinch sends many small deltas, a mouse wheel few large ones: the pinch needs a higher gain.
          const gain = Math.abs(delta) < 40 ? this.pinchSensitivity : this.zoomSensitivity;
          const exponent = Math.max(-this.maxWheelExponent, Math.min(this.maxWheelExponent, -delta * gain));
          this.scale(this.zoom * Math.exp(exponent), e.clientX - r.left, e.clientY - r.top);
        } else {
          this.x -= (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit;
          this.y -= (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * unit;
          this.render(true, 55);
        }
      }, { passive: false });
      viewport.addEventListener("dblclick", (e) => { if (!e.target.closest(CARD)) this.fit(true); });
      // Browsers may scroll an overflow:hidden ancestor after keyboard focus.
      viewport.addEventListener("scroll", () => { viewport.scrollLeft = 0; viewport.scrollTop = 0; });
    }
    destroy() {
      this.stop();
      removeEventListener("keydown", this.onKeyDown);
      removeEventListener("keyup", this.onKeyUp);
      removeEventListener("blur", this.onBlur);
    }
    render(smooth = false, damping = 70) {
      // A hidden page gets no animation frames: jump straight to the target.
      if (!smooth || this.reducedMotion.matches || document.hidden) {
        cancelAnimationFrame(this.animation);
        this.animation = 0;
        this.view = { x: this.x, y: this.y, zoom: this.zoom };
        this.paint();
        return;
      }
      this.damping = damping;
      if (this.animation) return;
      this.lastPaint = performance.now();
      const tick = (now) => {
        // The same blend for translation and scale keeps the cursor anchor fixed.
        const blend = 1 - Math.exp(-Math.max(0, now - this.lastPaint) / this.damping);
        this.lastPaint = Math.max(now, this.lastPaint);
        for (const key of ["x", "y", "zoom"]) this.view[key] += (this[key] - this.view[key]) * blend;
        if (Math.abs(this.x - this.view.x) < 0.08 && Math.abs(this.y - this.view.y) < 0.08 && Math.abs(this.zoom - this.view.zoom) < 0.00005) {
          this.render();
          return;
        }
        this.paint();
        this.animation = requestAnimationFrame(tick);
      };
      this.animation = requestAnimationFrame(tick);
    }
    paint() {
      const { x, y, zoom } = this.view;
      // While the camera moves, the world is one GPU layer: panning and zooming move a picture instead of redrawing
      // every screen. It is released a moment after the last move, so the screens are redrawn sharp at the new zoom.
      this.viewport.classList.add("is-moving");
      clearTimeout(this.idle);
      this.idle = setTimeout(() => this.viewport.classList.remove("is-moving"), 200);
      this.world.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
      // Background grid follows the camera; its step grows by 4 when zoomed out, so dots never turn into noise.
      let step = 24 * zoom;
      while (step < 12) step *= 4;
      this.viewport.style.setProperty("--grid-step", `${step}px`);
      this.viewport.style.setProperty("--grid-x", `${x}px`);
      this.viewport.style.setProperty("--grid-y", `${y}px`);
      this.onChange(zoom);
    }
    stop() {
      cancelAnimationFrame(this.animation);
      this.animation = 0;
      this.x = this.view.x; this.y = this.view.y; this.zoom = this.view.zoom;
    }
    scale(next, cx = this.viewport.clientWidth / 2, cy = this.viewport.clientHeight / 2) {
      next = Math.max(0.05, Math.min(2.5, next));
      this.x = cx - (cx - this.view.x) * next / this.view.zoom;
      this.y = cy - (cy - this.view.y) * next / this.view.zoom;
      this.zoom = next; this.render(true);
    }
    fit(smooth = false) {
      const w = this.world.offsetWidth, h = this.world.offsetHeight;
      const width = this.viewport.clientWidth, height = this.viewport.clientHeight;
      if (!w || !h || !width || !height) return;
      const { top, bottom } = this.margin;
      this.zoom = Math.max(0.05, Math.min(1, (width - 96) / w, (height - top - bottom) / h));
      this.x = (width - w * this.zoom) / 2;
      this.y = top + Math.max(0, (height - top - bottom - h * this.zoom) / 2);
      this.placed = true;
      this.render(smooth, 90);
    }
    // smooth glides there (user moves); otherwise the camera jumps (first placement).
    frame(card, smooth = false) {
      const width = this.viewport.clientWidth, height = this.viewport.clientHeight;
      if (!card || !width || !height) return;
      const { top, bottom } = this.margin;
      this.zoom = Math.max(0.05, Math.min(1, (width - 96) / card.offsetWidth, (height - top - bottom) / card.offsetHeight));
      // Position in the world: a card can sit in a positioned section, so its offsets add up to the world.
      let left = 0, y = 0;
      for (let el = card; el && el !== this.world; el = el.offsetParent) { left += el.offsetLeft; y += el.offsetTop; }
      this.x = width / 2 - (left + card.offsetWidth / 2) * this.zoom;
      this.y = top + (height - top - bottom - card.offsetHeight * this.zoom) / 2 - y * this.zoom;
      this.placed = true;
      this.render(smooth, 90);
    }
  }
  window.Canvas = Canvas;
})();
