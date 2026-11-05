/* =========================================================
   AIM Labs — Hero: "Two optics of one moment"
   Human register : real footage from the AIM film (assets/video/*.mp4)
   Machine register: what an off-the-shelf model detected in EACH frame
                     of that footage (assets/video/*.json, generated offline
                     with YOLO11-pose / YOLO11 + ByteTrack).
   The machine layer is revealed through a lens, or full-screen via the
   Human ↔ Machine optics toggle. Nothing here is drawn by hand: every box,
   joint, track and confidence value comes from the model output.
   ========================================================= */
(() => {
  const stage = document.getElementById('stage');
  const video = document.getElementById('hero-video');
  if (!stage || !video) return;
  const mc = document.getElementById('machine'), m = mc.getContext('2d');
  const lensLbl = document.getElementById('lens-lbl');
  const reelBtns = [...document.querySelectorAll('.reel__b')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CLIPS = [
    { key: 'clip-01-duel',  name: '1v1 duel',    pose: true },
    { key: 'clip-02-sand',  name: 'Sand pitch',  pose: true },
    { key: 'clip-03-park',  name: 'Park game',   pose: true },
    { key: 'clip-04-match', name: 'Night match', pose: false }
  ];
  const C = { green: '#64FF35', signal: '#8FB3FF', white: '#F0F2E9', ink: '#080B09', red: '#FF4255' };
  // COCO-17 skeleton
  const BONES = [[5, 7], [7, 9], [6, 8], [8, 10], [5, 6], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [0, 5], [0, 6]];
  const KP_MIN = .35;

  /* ---------- data ---------- */
  const cache = {};
  const load = i => cache[i] || (cache[i] = fetch(`assets/video/${CLIPS[i].key}.json`).then(r => r.json()).catch(() => null));
  let ci = 0, data = null;

  /* ---------- per-track memory: smoothing + trails ---------- */
  let tracks = new Map(), ballTrail = [], lastFrame = -1;
  const shortId = new Map();
  const resetTracks = () => { tracks = new Map(); ballTrail = []; lastFrame = -1; shortId.clear(); };
  const idLabel = id => {
    if (id < 0) return 'ID —';
    if (!shortId.has(id)) shortId.set(id, shortId.size + 1);
    return 'ID ' + String(shortId.get(id)).padStart(2, '0');
  };

  /* ---------- geometry: video "cover" → stage pixels ---------- */
  let W = 0, H = 0, dpr = 1, mobile = false;
  const px = (nx, ny) => {
    const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
    const sc = Math.max(W / vw, H / vh);
    return [(W - vw * sc) / 2 + nx * vw * sc, (H - vh * sc) / 2 + ny * vh * sc];
  };
  const resize = () => {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, devicePixelRatio || 1);
    mc.width = Math.round(W * dpr); mc.height = Math.round(H * dpr);
    mobile = W < 700;
    stage.style.setProperty('--lr', (mobile ? 96 : Math.min(170, W * .115)) + 'px');
  };

  /* ---------- drawing helpers ---------- */
  const mono = s => `500 ${s}px "JetBrains Mono", ui-monospace, monospace`;
  const tag = (txt, x, y, col) => {
    m.font = mono(10); const w = m.measureText(txt).width + 10;
    m.fillStyle = 'rgba(8,11,9,.84)'; m.fillRect(x, y - 14, w, 15);
    m.fillStyle = col; m.textBaseline = 'alphabetic'; m.fillText(txt, x + 5, y - 3);
  };
  const corners = (x0, y0, x1, y1, col) => {
    const c = Math.min(10, (x1 - x0) * .28, (y1 - y0) * .28);
    m.strokeStyle = col; m.lineWidth = 2.2;
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, dx, dy]) => {
      m.beginPath(); m.moveTo(x + dx * c, y); m.lineTo(x, y); m.lineTo(x, y + dy * c); m.stroke();
    });
  };
  const path = (pts) => { m.beginPath(); pts.forEach((p, i) => (i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1]))); m.stroke(); };

  /* ---------- machine layer ---------- */
  let focus = null;                 // the model's "attention": player nearest the ball
  let stats = { n: 0, ball: false };
  const draw = fi => {
    m.setTransform(dpr, 0, 0, dpr, 0, 0);
    m.clearRect(0, 0, W, H);
    m.fillStyle = 'rgba(5,9,7,.5)'; m.fillRect(0, 0, W, H);
    if (!data) return;
    const f = data.frames[Math.max(0, Math.min(data.n - 1, fi))];
    if (!f) return;
    const advanced = fi !== lastFrame, contiguous = fi === lastFrame + 1;
    if (advanced && !contiguous) { tracks.forEach(t => (t.trail = [])); ballTrail = []; }
    lastFrame = fi;

    const ball = f.b;
    const bpx = ball ? px(ball[0], ball[1]) : null;
    if (advanced) {
      if (bpx) { ballTrail.push(bpx); if (ballTrail.length > 18) ballTrail.shift(); }
      else if (ballTrail.length) ballTrail.shift();
    }
    if (ballTrail.length > 1) {
      m.strokeStyle = 'rgba(240,242,233,.75)'; m.lineWidth = 1.2; m.setLineDash([1, 4]); path(ballTrail); m.setLineDash([]);
    }

    let best = null, bestD = Infinity, biggest = null, bigA = 0;
    const seen = new Set();
    for (const p of f.p) {
      const [id, cx, cy, bw, bh, conf, k] = p;
      const [x0, y0] = px(cx - bw / 2, cy - bh / 2), [x1, y1] = px(cx + bw / 2, cy + bh / 2);
      const col = conf < .5 ? C.red : C.signal;   // uncertain detections are shown, not hidden
      let t = tracks.get(id);
      if (!t) { t = { kp: null, trail: [] }; tracks.set(id, t); }
      seen.add(id);
      const foot = [(x0 + x1) / 2, y1];
      if (advanced) {
        t.trail.push(foot); if (t.trail.length > 22) t.trail.shift();
        if (k && k.length) {
          if (!t.kp || !contiguous) t.kp = k.slice();
          else for (let i = 0; i < k.length; i++) t.kp[i] = t.kp[i] * .4 + k[i] * .6;   // light smoothing
        }
      }
      if (t.trail.length > 2) {
        m.strokeStyle = 'rgba(100,255,53,.75)'; m.lineWidth = 1.6; m.setLineDash([2, 4]); path(t.trail); m.setLineDash([]);
      }
      m.strokeStyle = col; m.lineWidth = 1; m.globalAlpha = .9; m.strokeRect(x0, y0, x1 - x0, y1 - y0); m.globalAlpha = 1;
      corners(x0, y0, x1, y1, col);
      if (y1 - y0 > 40) tag(`${idLabel(id)} · ${conf.toFixed(2)}`, x0, y0 - 3, col);
      if (t.kp && CLIPS[ci].pose) {
        const P = i => px(t.kp[i * 3], t.kp[i * 3 + 1]);
        const ok = i => t.kp[i * 3 + 2] > KP_MIN;
        const sz = Math.max(1.6, Math.min(3, (y1 - y0) / 110));
        m.strokeStyle = C.green; m.lineWidth = sz; m.lineCap = 'round';
        for (const [a, b] of BONES) if (ok(a) && ok(b)) path([P(a), P(b)]);
        m.fillStyle = C.ink; m.lineWidth = 1.4;
        for (let i = 5; i < 17; i++) { if (!ok(i)) continue; const A = P(i); m.beginPath(); m.arc(A[0], A[1], sz + 1.2, 0, 7); m.fill(); m.stroke(); }
        if (ok(0)) { const A = P(0); m.beginPath(); m.arc(A[0], A[1], sz + 2, 0, 7); m.fill(); m.stroke(); }
      }
      const area = (x1 - x0) * (y1 - y0);
      if (area > bigA) { bigA = area; biggest = [(x0 + x1) / 2, (y0 + y1) / 2]; }
      if (bpx) { const d = Math.hypot(foot[0] - bpx[0], foot[1] - bpx[1]); if (d < bestD) { bestD = d; best = [(x0 + x1) / 2, y0 + (y1 - y0) * .5]; } }
    }
    if (advanced) for (const [id, t] of tracks) { t.miss = seen.has(id) ? 0 : (t.miss || 0) + 1; if (t.miss > 25) tracks.delete(id); }

    if (bpx) {
      const r = Math.max(7, ball[2] * (video.videoWidth || 1280) * Math.max(W / (video.videoWidth || 1280), H / (video.videoHeight || 720)) / 2 + 3);
      m.strokeStyle = C.white; m.lineWidth = 1.4; m.strokeRect(bpx[0] - r, bpx[1] - r, r * 2, r * 2);
      tag(`BALL · ${ball[4].toFixed(2)}`, bpx[0] + r + 4, bpx[1] + 4, C.white);
    }
    focus = best || biggest;
    stats = { n: f.p.length, ball: !!ball };
  };

  /* ---------- lens ---------- */
  let lx = 0, ly = 0, tx = 0, ty = 0, mode = 'idle', lastPtr = 0, dragging = false, snap = true;
  const setLens = (x, y) => {
    stage.style.setProperty('--lx', x + 'px'); stage.style.setProperty('--ly', y + 'px');
    stage.style.setProperty('--lxp', x + 'px'); stage.style.setProperty('--lyp', y + 'px');
  };
  const toLocal = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const pointerAt = e => { [tx, ty] = toLocal(e); mode = 'pointer'; lastPtr = performance.now(); };
  stage.addEventListener('pointermove', e => { if (e.pointerType !== 'touch' || dragging) pointerAt(e); });
  stage.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !e.target.closest('.reel')) { dragging = true; pointerAt(e); } });
  addEventListener('pointerup', () => { dragging = false; });
  stage.addEventListener('pointerleave', () => { if (!dragging) lastPtr = performance.now() - 1500; });
  document.getElementById('hero').addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' && !e.target.closest('#stage')) pointerAt(e);
  });

  /* ---------- reel ---------- */
  let swapToken = 0;
  const setClip = async (i, autoplay = true) => {
    const token = ++swapToken;
    ci = (i + CLIPS.length) % CLIPS.length;
    stage.dataset.clip = ci;
    reelBtns.forEach((b, k) => { b.setAttribute('aria-pressed', k === ci); if (k !== ci) b.style.setProperty('--p', '0%'); });
    video.classList.add('swap');
    resetTracks(); data = null;
    const d = await load(ci);
    if (token !== swapToken) return;
    video.poster = `assets/video/${CLIPS[ci].key}.jpg`;
    video.src = `assets/video/${CLIPS[ci].key}.mp4`;
    data = d;
    video.addEventListener('loadeddata', () => video.classList.remove('swap'), { once: true });
    if (autoplay && !reduce) video.play().catch(() => {});
    load((ci + 1) % CLIPS.length);   // prefetch the next clip's model data
  };
  reelBtns.forEach((b, k) => b.addEventListener('click', () => setClip(k)));
  video.addEventListener('ended', () => setClip(ci + 1));

  /* ---------- frame loop ---------- */
  // rVFC gives the exact media time of the frame on screen; rAF keeps the lens moving while paused.
  let curFrame = 0, mediaTime = null, visible = true;
  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    const cb = (now, meta) => { mediaTime = meta.mediaTime; video.requestVideoFrameCallback(cb); };
    video.requestVideoFrameCallback(cb);
  }
  window.AIMHero = { frame: () => curFrame, total: () => (data ? data.n : 1), clip: () => CLIPS[ci].name };

  const tick = () => {
    const fps = data ? data.fps : 25;
    const t = !video.paused && mediaTime !== null ? mediaTime : video.currentTime;
    curFrame = Math.max(0, Math.min(data ? data.n - 1 : 0, Math.floor(t * fps + .001)));
    draw(curFrame);
    const now = performance.now();
    if (mode === 'pointer' && now - lastPtr > 2400) mode = 'idle';
    if (mode === 'idle') {
      const target = focus || [W * (mobile ? .5 : .68), H * .55];
      tx = mobile ? target[0] : Math.max(W * .52, target[0]);   // keep the idle lens clear of the headline
      ty = target[1];
      const r = mobile ? 96 : Math.min(170, W * .115);   // keep the whole idle lens on screen
      tx = Math.max(r + 8, Math.min(W - r - 8, tx)); ty = Math.max(r + 70, Math.min(H - r - 40, ty));
    }
    const k = snap ? 1 : mode === 'idle' ? .07 : .28; snap = false;
    lx += (tx - lx) * k; ly += (ty - ly) * k;
    setLens(lx, ly);
    lensLbl.textContent = `Machine view · ${stats.n} tracked${stats.ball ? ' · ball' : ''}`;
    if (data && reelBtns[ci]) reelBtns[ci].style.setProperty('--p', (curFrame / Math.max(1, data.n - 1) * 100).toFixed(1) + '%');
  };
  const loop = () => { if (visible && !document.hidden) tick(); requestAnimationFrame(loop); };

  // ?clip=2 starts on a clip; ?t=0.5 freezes at that fraction of it (reviews / screenshots)
  const q = new URLSearchParams(location.search);
  const freezeT = parseFloat(q.get('t'));
  const frozen = Number.isFinite(freezeT) || reduce;
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!reduce && !frozen) visible ? video.play().catch(() => {}) : video.pause();
  }).observe(stage);
  resize();

  const startClip = Math.max(0, Math.min(CLIPS.length - 1, (parseInt(q.get('clip'), 10) || 1) - 1));
  setClip(startClip, !frozen).then(() => {
    if (!frozen) return;
    video.pause();
    const go = () => { video.currentTime = (Number.isFinite(freezeT) ? freezeT : .45) * (video.duration || 6); };
    video.readyState >= 1 ? go() : video.addEventListener('loadedmetadata', go, { once: true });
  });
  requestAnimationFrame(loop);
})();
