/* =========================================================
   AIM Labs — 02 At a glance: the annotated-frame exhibit.
   Draws the model's detections on one real night-match frame,
   read from assets/video/clip-04-match.json. Everything else for
   iteration 2 lives in motion.js.
   ========================================================= */
(() => {
  const C = { green: '#64FF35', signal: '#8FB3FF', white: '#F0F2E9', ink: '#080B09', red: '#FF4255' };
  const BONES = [[5, 7], [7, 9], [6, 8], [8, 10], [5, 6], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [0, 5], [0, 6]];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const narrow = matchMedia('(max-width: 1024px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
  const fitCanvas = (cv, box) => {
    const dpr = Math.min(2, devicePixelRatio || 1), W = box.clientWidth, H = box.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    return { ctx, W, H };
  };
  // object-fit: cover mapping from normalised video coords to box px
  const cover = (W, H, vw = 1280, vh = 720) => { const s = Math.max(W / vw, H / vh); const ox = (W - vw * s) / 2, oy = (H - vh * s) / 2; return (x, y) => [ox + x * vw * s, oy + y * vh * s]; };
  const mono = s => `500 ${s}px "JetBrains Mono", ui-monospace, monospace`;
  const countUp = (el, to, suffix = '') => {
    if (el.dataset.done) return; el.dataset.done = 1;
    if (reduce) { el.textContent = String(to).padStart(2, '0') + suffix; return; }
    const t0 = performance.now();
    const step = now => { const k = clamp((now - t0) / 900), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = String(v).padStart(2, '0') + suffix; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  /* ================= 02 AT A GLANCE — the annotated-frame exhibit ================= */
  // The facts themselves are plain HTML (counted up by main.js). This only draws the model's
  // detections on one real frame, swept in once when the exhibit scrolls into view.
  const exMedia = document.querySelector('.exhibit__media');
  if (exMedia) {
    const cv = document.getElementById('glance-cv'), nEl = document.getElementById('glance-n');
    let dets = null, t0 = null;
    const draw = () => {
      if (!dets) return;
      const { ctx, W, H } = fitCanvas(cv, exMedia), P = cover(W, H);
      const k = reduce || t0 === null ? (t0 === null ? 0 : 1) : clamp((performance.now() - t0) / 1600);
      const sx = k * W * 1.02;
      let shown = 0;
      for (const p of dets) {
        const [x0, y0] = P(p[1] - p[3] / 2, p[2] - p[4] / 2), [x1, y1] = P(p[1] + p[3] / 2, p[2] + p[4] / 2);
        if ((x0 + x1) / 2 > sx || x1 < 0 || x0 > W) continue;
        shown++;
        ctx.strokeStyle = p[5] < .5 ? C.red : C.signal; ctx.lineWidth = 1.2;
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      }
      if (k > 0 && k < 1) { ctx.fillStyle = C.green; ctx.fillRect(sx, 0, 1, H); }
      nEl.textContent = String(shown).padStart(2, '0');
      if (k < 1 && t0 !== null) requestAnimationFrame(draw);
    };
    fetch('assets/video/clip-04-match.json').then(r => r.json()).then(d => { dets = d.frames[0].p; draw(); }).catch(() => {});
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { t0 = performance.now(); draw(); o.disconnect(); } }, { threshold: .4 }).observe(exMedia);
    new ResizeObserver(draw).observe(exMedia);
  }

})();
