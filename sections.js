/* =========================================================
   AIM Labs — sections 02 & 03 (scroll-driven, real model data)
   02 At a glance : a scan line sweeps a real night-match frame; the
                    model's detections appear behind it and each fact is
                    "discovered" when the scan reaches the player it is
                    pinned to.
   03 Why         : every joint of every player in one clip → a cloud of
                    raw data → filtered to what is credible → one player's
                    path and shape → one cue back on the pitch.
   Both read the same per-frame JSON the hero uses (assets/video/*.json).
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

  /* ================= 02 AT A GLANCE — odometer digits ================= */
  // Each digit is a drum of 0–9 strips; on reveal it rolls through a few full turns and lands
  // on its value (right-hand digits spin longer, like a mechanical counter).
  const odos = [...document.querySelectorAll('.odo[data-odo]')];
  odos.forEach(el => {
    const val = el.dataset.odo.padStart(2, '0'), sfx = el.dataset.suffix || '';   // two-digit drums, like a scoreboard
    el.textContent = '';
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true'); vis.style.display = 'contents';
    [...val].forEach((ch, i) => {
      const d = document.createElement('span'); d.className = 'odo__d';
      const strip = document.createElement('span'); strip.className = 'odo__strip';
      const turns = 2 + i;                       // full rotations before landing
      for (let k = 0; k <= turns * 10 + 9; k++) { const n = document.createElement('span'); n.textContent = k % 10; strip.appendChild(n); }
      const target = turns * 10 + +ch;
      strip.style.setProperty('--to', target);
      strip.style.setProperty('--dur', (1.3 + i * .35).toFixed(2) + 's');
      d.appendChild(strip); vis.appendChild(d);
    });
    if (sfx) { const s2 = document.createElement('span'); s2.className = 'odo__sfx'; s2.textContent = sfx; s2.style.setProperty('--sfx-delay', (1.1 + val.length * .35).toFixed(2) + 's'); vis.appendChild(s2); }
    el.appendChild(vis);
  });
  const facts = document.querySelector('.facts');
  if (facts && odos.length) {
    const run = () => odos.forEach((el, i) => {
      el.querySelectorAll('.odo__strip').forEach(st => st.style.setProperty('--delay', (i * .12).toFixed(2) + 's'));
      if (reduce) el.querySelectorAll('.odo__strip, .odo__sfx').forEach(n => (n.style.transition = 'none'));
      el.classList.add('run');
      // once the last drum lands, drop the drum mask so the figure is crisp
      const strips = el.querySelectorAll('.odo__strip'), last = strips[strips.length - 1];
      if (reduce) el.classList.add('done');
      else last.addEventListener('transitionend', () => el.classList.add('done'), { once: true });
    });
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { run(); o.disconnect(); } }, { threshold: .45 }).observe(facts);
  }

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

  /* ================= 04 RESEARCH — one real frame, eight questions ================= */
  // Every research area reads the SAME frame of the AIM film (f145 of the 1v1 clip) and draws
  // what that discipline would measure. Geometry comes from the model output for that frame;
  // where a layer is an example rather than a measurement (feedback, workflow, review), it says so.
  const lab = document.getElementById('lab');
  if (lab) {
    const frame = document.getElementById('lab-frame'), cv = document.getElementById('lab-cv');
    const rows = [...lab.querySelectorAll('.lab__row')];
    const kEl = document.getElementById('lab-k'), vEl = document.getElementById('lab-v');
    const FI = 145, MAIN = 1, OPP = 2;
    let F = null, active = null, hover = null;
    const deg = (a, b, c) => { const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]]; const d = Math.acos(clamp((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2) || 1), -1, 1)); return Math.round(d * 180 / Math.PI); };
    const card = (ctx, x, y, w, lines, bg, fg) => {
      ctx.font = mono(10); const h = 14 + lines.length * 17;
      ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
      lines.forEach((l, i) => { ctx.fillStyle = i === 0 ? fg : fg; ctx.font = i === 0 ? mono(10) : `600 13px Inter, system-ui, sans-serif`; ctx.globalAlpha = i === 0 ? .75 : 1; ctx.fillText(l, x + 10, y + 18 + i * 17); ctx.globalAlpha = 1; });
      return h;
    };
    const label = (ctx, t, x, y, col, bg = 'rgba(8,11,9,.85)') => { ctx.font = mono(10); const w = ctx.measureText(t).width + 10; ctx.fillStyle = bg; ctx.fillRect(x, y - 13, w, 16); ctx.fillStyle = col; ctx.fillText(t, x + 5, y - 1); return w; };

    const TEXT = {
      cv: ['Computer vision · what is in the frame', ''],
      bio: ['Biomechanics · how the body moves', 'Joint angles estimated from one standard camera — a 2D estimate, not a lab measurement.'],
      ml: ['AI & machine learning · how sure the model is', ''],
      fi: ['Football intelligence · what it means in the game', ''],
      beh: ['Behavioural science · what the player hears', 'Same moment, one cue. We test which form of feedback a young player actually uses. Example cue.'],
      data: ['Data & decision science · fair comparison', ''],
      prod: ['Product experimentation · a workflow on trial', 'A coach tags the moment, shares the clip and adds a cue — tested with real sessions before it ships. Prototype UI.'],
      collab: ['Research collaboration · independent challenge', 'Partners review and challenge the labels: disagreement is flagged, not averaged away. Example review notes.']
    };

    fetch('assets/video/clip-01-duel.json').then(r => r.json()).then(d => { F = d.frames[FI]; draw(); }).catch(() => {});

    const draw = () => {
      if (!F) return;
      const { ctx, W, H } = fitCanvas(cv, frame), P = cover(W, H);
      const ppl = Object.fromEntries(F.p.map(p => [p[0], p]));
      const kp = (id, j) => { const k = ppl[id] && ppl[id][6]; return k ? [...P(k[j * 3], k[j * 3 + 1]), k[j * 3 + 2]] : null; };
      const box = id => { const p = ppl[id]; const [x0, y0] = P(p[1] - p[3] / 2, p[2] - p[4] / 2), [x1, y1] = P(p[1] + p[3] / 2, p[2] + p[4] / 2); return { x0, y0, x1, y1, h: y1 - y0, conf: p[5] }; };
      const skel = (id, col, w = 2.2, alpha = 1) => {
        ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
        for (const [a, b] of BONES) { const A = kp(id, a), B = kp(id, b); if (A && B && A[2] > .35 && B[2] > .35) { ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); } }
        ctx.globalAlpha = 1;
      };
      const a = active;
      if (a) { ctx.fillStyle = 'rgba(5,8,6,.38)'; ctx.fillRect(0, 0, W, H); }
      const ball = F.b ? (() => { const [x0, y0] = P(F.b[0] - F.b[2] / 2, F.b[1] - F.b[3] / 2), [x1, y1] = P(F.b[0] + F.b[2] / 2, F.b[1] + F.b[3] / 2); return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, conf: F.b[4] }; })() : null;
      let text = TEXT[a] ? TEXT[a][1] : '';

      if (!a) { Object.keys(ppl).forEach(id => skel(+id, C.green, 1.6, .55)); }

      if (a === 'cv') {
        let sum = 0;
        F.p.forEach(p => { const b = box(p[0]); sum += b.conf; ctx.strokeStyle = C.signal; ctx.lineWidth = 1.4; ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); label(ctx, `PERSON · ${b.conf.toFixed(2)}`, b.x0, b.y0 - 4, C.signal); });
        if (ball) { ctx.strokeStyle = C.white; ctx.lineWidth = 1.6; ctx.strokeRect(ball.x0, ball.y0, ball.x1 - ball.x0, ball.y1 - ball.y0); label(ctx, `BALL · ${ball.conf.toFixed(2)}`, ball.x0 - 20, ball.y1 + 16, C.white); }
        text = `${F.p.length} people and the ball found in one frame of ordinary video · mean confidence ${(sum / F.p.length).toFixed(2)}. Next question: does it hold up in poor light and crowded play?`;
      }
      if (a === 'bio') {
        skel(MAIN, C.green, 3);
        const arcAt = (j1, j2, j3, name, dx) => {
          const A = kp(MAIN, j1), B = kp(MAIN, j2), Cc = kp(MAIN, j3); if (!A || !B || !Cc) return '';
          const ang = deg(A, B, Cc), a1 = Math.atan2(A[1] - B[1], A[0] - B[0]), a2 = Math.atan2(Cc[1] - B[1], Cc[0] - B[0]);
          ctx.strokeStyle = C.signal; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(B[0], B[1], 18, Math.min(a1, a2), Math.max(a1, a2), Math.abs(a1 - a2) > Math.PI); ctx.stroke();
          label(ctx, `${name} ${ang}°`, B[0] + dx, B[1] + 4, C.signal); return `${name} ${ang}°`;
        };
        const r1 = arcAt(11, 13, 15, 'KNEE L', 22), r2 = arcAt(12, 14, 16, 'KNEE R', -96);
        const sh = [(kp(MAIN, 5)[0] + kp(MAIN, 6)[0]) / 2, (kp(MAIN, 5)[1] + kp(MAIN, 6)[1]) / 2], hp = [(kp(MAIN, 11)[0] + kp(MAIN, 12)[0]) / 2, (kp(MAIN, 11)[1] + kp(MAIN, 12)[1]) / 2];
        const lean = Math.round(Math.abs(Math.atan2(sh[0] - hp[0], hp[1] - sh[1])) * 180 / Math.PI);
        ctx.setLineDash([3, 4]); ctx.strokeStyle = C.white; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hp[0], hp[1]); ctx.lineTo(hp[0], hp[1] - (hp[1] - sh[1]) * 1.3); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hp[0], hp[1]); ctx.lineTo(sh[0], sh[1]); ctx.stroke();
        label(ctx, `TRUNK LEAN ${lean}°`, sh[0] + 14, sh[1] - 8, C.white);
        text = `${r1} · ${r2} · trunk lean ${lean}° at full stride. ` + TEXT.bio[1];
      }
      if (a === 'ml') {
        let all = [];
        [MAIN, OPP].forEach(id => { skel(id, C.green, 1.2, .35); for (let j = 0; j < 17; j++) { const q = kp(id, j); if (!q) continue; all.push([q[2], j, id]); ctx.beginPath(); ctx.arc(q[0], q[1], 2.5 + q[2] * 5, 0, 7); ctx.fillStyle = q[2] >= .5 ? 'rgba(100,255,53,.85)' : 'rgba(255,66,85,.9)'; ctx.fill(); } });
        const mean = all.reduce((s2, v) => s2 + v[0], 0) / all.length, low = all.sort((p, q) => p[0] - q[0])[0];
        const names = ['nose', 'left eye', 'right eye', 'left ear', 'right ear', 'left shoulder', 'right shoulder', 'left elbow', 'right elbow', 'left wrist', 'right wrist', 'left hip', 'right hip', 'left knee', 'right knee', 'left ankle', 'right ankle'];
        text = `${all.length} body keypoints on two players · mean confidence ${mean.toFixed(2)} · least certain: ${names[low[1]]} (${low[0].toFixed(2)}). Dot size = confidence. A model should show what it is unsure of.`;
      }
      if (a === 'fi') {
        const b1 = box(MAIN), b2 = box(OPP);
        skel(MAIN, C.green, 2.4); skel(OPP, C.signal, 2, .8);
        const foot = [(kp(MAIN, 15)[0] + kp(MAIN, 16)[0]) / 2, Math.max(kp(MAIN, 15)[1], kp(MAIN, 16)[1])];
        if (ball) {
          const lead = Math.hypot(ball.cx - foot[0], ball.cy - foot[1]) / b1.h;
          ctx.setLineDash([4, 4]); ctx.strokeStyle = C.white; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(foot[0], foot[1]); ctx.lineTo(ball.cx, ball.cy); ctx.stroke(); ctx.setLineDash([]);
          label(ctx, `BALL ${lead.toFixed(1)}× BODY AHEAD`, (foot[0] + ball.cx) / 2 - 60, Math.max(foot[1], ball.cy) + 22, C.white);
        }
        const h1 = kp(MAIN, 11), h2 = kp(OPP, 12);
        const gap = Math.abs(h1[0] - h2[0]) / b1.h;
        ctx.strokeStyle = C.signal; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(h2[0], h2[1]); ctx.lineTo(h1[0], h1[1]); ctx.stroke();
        label(ctx, `DEFENDER ${gap.toFixed(1)}× BODY BEHIND`, (h1[0] + h2[0]) / 2 - 70, Math.min(h1[1], h2[1]) - 10, C.signal);
        card(ctx, 14, H - 70, 240, ['CONTEXT', '1v1 · carrying · defender chasing'], 'rgba(100,255,53,.92)', C.ink);
        text = 'Raw positions become football language: who carries, who chases, how much space there is. Distances are relative to body height — no pitch calibration is assumed.';
      }
      if (a === 'beh') {
        skel(MAIN, C.green, 2.2, .7);
        const head = kp(MAIN, 0);
        ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(head[0], head[1], 16, 0, 7); ctx.stroke();
        const x = Math.min(W - 280, head[0] + 30), y = Math.max(40, head[1] - 70);
        ctx.beginPath(); ctx.moveTo(head[0] + 14, head[1] - 8); ctx.lineTo(x, y + 30); ctx.strokeStyle = C.green; ctx.lineWidth = 1.4; ctx.stroke();
        card(ctx, x, y, 262, ['FEEDBACK · EXAMPLE CUE', '“Lift your head before the touch.”'], 'rgba(100,255,53,.94)', C.ink);
      }
      if (a === 'data') {
        const stride = id => { const L = kp(id, 15), R = kp(id, 16), b = box(id); const v = Math.hypot(L[0] - R[0], L[1] - R[1]) / b.h; const e = (1 - Math.min(L[2], R[2])) * .25 + .01; return { v, e, L, R }; };
        const s1 = stride(MAIN), s2 = stride(OPP);
        [[s1, C.green], [s2, C.signal]].forEach(([st, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(st.L[0], st.L[1]); ctx.lineTo(st.R[0], st.R[1]); ctx.stroke(); [st.L, st.R].forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, 7); ctx.fillStyle = col; ctx.fill(); }); });
        // mini chart: stride / body height with uncertainty
        const cx = W - 220, cy = 34, cw = 200, ch = 92;
        ctx.fillStyle = 'rgba(8,11,9,.86)'; ctx.fillRect(cx, cy, cw, ch);
        ctx.font = mono(9.5); ctx.fillStyle = 'rgba(240,242,233,.7)'; ctx.fillText('STRIDE ÷ BODY HEIGHT', cx + 10, cy + 16);
        const scale = (cw - 70) / Math.max(s1.v + s1.e, s2.v + s2.e, .8);
        [[s1, C.green, 'RED', 34], [s2, C.signal, 'YELLOW', 62]].forEach(([st, col, n, yy]) => {
          ctx.fillStyle = col; ctx.fillRect(cx + 60, cy + yy - 8, st.v * scale, 10);
          ctx.strokeStyle = C.white; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + 60 + (st.v - st.e) * scale, cy + yy - 3); ctx.lineTo(cx + 60 + (st.v + st.e) * scale, cy + yy - 3); ctx.stroke();
          ctx.fillStyle = 'rgba(240,242,233,.85)'; ctx.font = mono(9.5); ctx.fillText(n, cx + 10, cy + yy + 1);
        });
        text = `Stride relative to body height: red ${s1.v.toFixed(2)} ± ${s1.e.toFixed(2)}, yellow ${s2.v.toFixed(2)} ± ${s2.e.toFixed(2)}. Normalising by body size and showing the error bar keeps the comparison fair — and honest.`;
      }
      if (a === 'prod') {
        skel(MAIN, C.green, 2, .6);
        const x = 14, y = H - 112, w = Math.min(330, W - 28);
        ctx.fillStyle = 'rgba(246,247,241,.96)'; ctx.fillRect(x, y, w, 98);
        ctx.fillStyle = C.ink; ctx.font = mono(9.5); ctx.fillText('SESSION REVIEW · PROTOTYPE', x + 12, y + 18);
        ctx.font = '600 13px Inter, system-ui, sans-serif'; ctx.fillText('Clip 14 · 1v1 drill · 3 tagged moments', x + 12, y + 38);
        ctx.fillStyle = 'rgba(8,11,9,.15)'; ctx.fillRect(x + 12, y + 56, w - 24, 6);
        [.22, .58, .81].forEach((t, i) => { ctx.fillStyle = i === 1 ? '#1F6E0B' : 'rgba(8,11,9,.55)'; ctx.fillRect(x + 12 + (w - 24) * t - 2, y + 51, 4, 16); });
        ctx.fillStyle = '#1F6E0B'; ctx.font = mono(9.5); ctx.fillText('▶ f145 · cue added · shared with player', x + 12, y + 84);
      }
      if (a === 'collab') {
        skel(MAIN, C.green, 1.6, .5); skel(OPP, C.signal, 1.6, .5);
        const pin = (x, y, n, t, left) => {
          ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); ctx.fillStyle = C.ink; ctx.font = '700 11px Inter, sans-serif'; ctx.fillText(n, x - 3.5, y + 4);
          ctx.font = mono(10); const w = ctx.measureText(t).width + 10;
          label(ctx, t, left ? x - 16 - w : Math.min(x + 16, W - w - 6), y + 4, C.white);
        };
        const fa = kp(MAIN, 16); if (fa) pin(fa[0], fa[1] + 18, '1', 'UNIVERSITY · contact frame?', true);
        const op = kp(OPP, 9) || kp(OPP, 0); if (op) pin(op[0], op[1], '2', 'CLUB ANALYST · tag as “pressing”?');
        if (ball) pin(ball.cx, ball.y0 - 26, '3', 'REVIEW · ball label agreed', true);
      }
      const T = TEXT[a];
      kEl.textContent = T ? T[0] : 'One moment, eight questions';
      vEl.textContent = a ? text : 'Every research area looks at the same real frame — and asks something different of it.';
    };

    const setActive = k => { if (active === k) return; active = k; rows.forEach(r => r.classList.toggle('is-on', r.dataset.area === k)); draw(); };
    const io = new IntersectionObserver(es => {
      if (hover) return;
      const vis = es.filter(e => e.isIntersecting);
      if (vis.length) setActive(vis[vis.length - 1].target.dataset.area);
    }, { rootMargin: narrow.matches ? '-62% 0px -30% 0px' : '-45% 0px -45% 0px' });
    rows.forEach(r => {
      io.observe(r);
      r.addEventListener('mouseenter', () => { hover = r.dataset.area; setActive(hover); });
      r.addEventListener('mouseleave', () => { hover = null; });
      r.addEventListener('focus', () => setActive(r.dataset.area));
    });
    new ResizeObserver(draw).observe(frame);
  }

  /* ================= 05 TECHNOLOGY — the frame, pulled apart ================= */
  // One real clip plays on the bottom sheet; each sheet above it draws ONE model layer for the
  // frame on screen (detect, pose, track, context). Possession changes are derived from the
  // detections (nearest player to the ball, held 5 frames). Visitors pick a layer, tilt the
  // stack, or compose it back into one picture.
  const xray = document.getElementById('xray');
  if (xray) {
    const view = document.getElementById('xray-view'), tilt = document.getElementById('xray-tilt');
    const video = document.getElementById('xray-video');
    const planes = [...xray.querySelectorAll('.plane')], btns = [...xray.querySelectorAll('.xl')];
    const modeBtns = [...xray.querySelectorAll('.xray__mode button')];
    const cvs = [1, 2, 3, 4].map(i => planes[i].querySelector('canvas'));
    const live = Object.fromEntries([...xray.querySelectorAll('[data-live]')].map(e => [e.dataset.live, e]));
    let D = null, visible = false, loaded = false, mediaTime = 0, sel = 0;
    const sid = new Map(); const short = id => 'ID ' + String(sid.get(id) || 0).padStart(2, '0');

    fetch('assets/video/clip-02-sand.json').then(r => r.json()).then(d => {
      d.frames.forEach(f => f.p.forEach(p => { if (!sid.has(p[0])) sid.set(p[0], sid.size + 1); }));
      const car = d.frames.map(f => {
        const b = f.b; if (!b) return null; let best = null;
        for (const p of f.p) { const dist = Math.hypot(p[1] - b[0], (p[2] + p[4] / 2 - b[1]) * .5625); if (dist < .6 * p[4] && (!best || dist < best[0])) best = [dist, p[0]]; }
        return best ? best[1] : null;
      });
      const events = [], held = []; let cur = null, cand = null, run = 0;
      car.forEach((c, i) => { if (c === cand) run++; else { cand = c; run = 1; } if (cand !== null && run === 5 && cand !== cur) { events.push([i - 4, cand]); cur = cand; } held.push(cur); });
      D = { ...d, events, held };
      document.getElementById('xcue-n').textContent = events.length;
      live[5].textContent = '1 suggestion';
    }).catch(() => {});

    // selection + mode
    const select = i => {
      sel = i;
      btns.forEach(b => b.classList.toggle('is-sel', +b.dataset.l === i));
      planes.forEach(p => p.classList.toggle('is-sel', +p.dataset.l === i));
      xray.classList.add('has-sel');   // every selection, Capture included, dims the other sheets
    };
    btns.forEach(b => b.addEventListener('click', () => select(+b.dataset.l)));   // works in both modes
    const setMode = m => {
      xray.classList.toggle('is-flat', m === 'flat');
      modeBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
      select(sel);   // compose keeps the selection: footage + that one layer
    };
    modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    // narrow screens: the layer under the pinned stack becomes active as you scroll, like section 04
    const narrowX = matchMedia('(max-width: 1024px)');
    let xio = null;
    const armScroll = () => {
      if (xio) { xio.disconnect(); xio = null; }
      if (!narrowX.matches) return;
      xio = new IntersectionObserver(es => {
        const vis = es.filter(e => e.isIntersecting);
        if (vis.length) select(+vis[vis.length - 1].target.dataset.l);
      }, { rootMargin: '-62% 0px -26% 0px' });
      btns.forEach(b => xio.observe(b));
    };
    armScroll(); narrowX.addEventListener('change', armScroll);

    // tilt the stack with the pointer (small, damped)
    view.addEventListener('pointermove', e => {
      if (reduce || xray.classList.contains('is-flat') || narrowX.matches) return;
      const r = view.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      tilt.style.transform = `rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`;
    });
    view.addEventListener('pointerleave', () => { tilt.style.transform = ''; });

    // entrance: the picture comes apart when the section arrives
    xray.classList.add('is-flat');
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { setTimeout(() => setMode('apart'), reduce ? 0 : 500); o.disconnect(); } }, { threshold: .45 }).observe(view);

    // video
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { if (!loaded) { loaded = true; video.preload = 'auto'; video.load(); } if (!reduce) video.play().catch(() => {}); } else video.pause();
    }, { rootMargin: '300px 0px' }).observe(view);
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      const cb = (n, m) => { mediaTime = m.mediaTime; video.requestVideoFrameCallback(cb); }; video.requestVideoFrameCallback(cb);
    }

    const trails = new Map(); let lastFi = -1;
    const draw = () => {
      if (!D) return;
      const t = video.paused ? video.currentTime : (mediaTime || video.currentTime);
      const fi = Math.max(0, Math.min(D.n - 1, Math.floor(t * D.fps + .001)));
      if (fi < lastFi) trails.clear();
      const f = D.frames[fi], carrier = D.held[fi];
      const L = cvs.map(cv => fitCanvas(cv, cv.parentElement));
      const { W, H } = L[0];
      // the video plane is scaled 1.06 to trim its letterbox — the layers use the same scale
      const S = 1.06, base = cover(W, H), P = (x, y) => { const [px, py] = base(x, y); return [W / 2 + (px - W / 2) * S, H / 2 + (py - H / 2) * S]; };
      let confSum = 0, joints = 0;
      for (const p of f.p) {
        const [id, cx, cy, bw, bh, conf, k] = p;
        const [x0, y0] = P(cx - bw / 2, cy - bh / 2), [x1, y1] = P(cx + bw / 2, cy + bh / 2);
        confSum += conf;
        // 1 · detect
        let c = L[0].ctx; c.strokeStyle = conf < .5 ? C.red : C.signal; c.lineWidth = 1.4; c.strokeRect(x0, y0, x1 - x0, y1 - y0);
        c.font = mono(10); const tg = conf.toFixed(2), tw = c.measureText(tg).width + 8; c.fillStyle = 'rgba(8,11,9,.85)'; c.fillRect(x0, y0 - 15, tw, 14); c.fillStyle = conf < .5 ? C.red : C.signal; c.fillText(tg, x0 + 4, y0 - 4);
        // 2 · pose
        c = L[1].ctx; c.strokeStyle = C.green; c.lineWidth = 2.2; c.lineCap = 'round';
        if (k && k.length) for (const [a, b2] of BONES) { if (k[a * 3 + 2] < .35 || k[b2 * 3 + 2] < .35) continue; joints++; const A = P(k[a * 3], k[a * 3 + 1]), B = P(k[b2 * 3], k[b2 * 3 + 1]); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); }
        // 3 · track
        const foot = [(x0 + x1) / 2, y1];
        if (fi !== lastFi) { const tr = trails.get(id) || []; tr.push(foot); if (tr.length > 40) tr.shift(); trails.set(id, tr); }
        c = L[2].ctx; const tr = trails.get(id) || [];
        c.strokeStyle = 'rgba(143,179,255,.9)'; c.lineWidth = 1.8; c.setLineDash([2, 4]); c.beginPath(); tr.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke(); c.setLineDash([]);
        c.fillStyle = C.signal; c.beginPath(); c.arc(foot[0], foot[1], 3.5, 0, 7); c.fill();
        c.font = mono(10); const it = short(id), iw = c.measureText(it).width + 8; c.fillStyle = 'rgba(8,11,9,.85)'; c.fillRect(foot[0] - iw / 2, foot[1] + 6, iw, 14); c.fillStyle = C.signal; c.fillText(it, foot[0] - iw / 2 + 4, foot[1] + 17);
        // 4 · context
        if (id === carrier) {
          c = L[3].ctx; c.strokeStyle = C.green; c.lineWidth = 2.4; c.strokeRect(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6);
          const ct = `${short(id)} · ON THE BALL`; c.font = mono(10); const cw = c.measureText(ct).width + 10; c.fillStyle = C.green; c.fillRect(x0 - 3, y0 - 20, cw, 15); c.fillStyle = C.ink; c.fillText(ct, x0 + 2, y0 - 9);
        }
      }
      if (f.b) {
        const [bx, by] = P(f.b[0], f.b[1]), r = Math.max(7, f.b[2] * W * S / 2 + 3);
        let c = L[0].ctx; c.strokeStyle = C.white; c.lineWidth = 1.5; c.strokeRect(bx - r, by - r, r * 2, r * 2);
        c = L[3].ctx; c.fillStyle = 'rgba(240,242,233,.9)'; c.beginPath(); c.arc(bx, by, 4, 0, 7); c.fill();
      }
      // context log, drawn on its own sheet
      const done = D.events.filter(e => e[0] <= fi);
      const c4 = L[3].ctx; c4.font = mono(10);
      D.events.forEach((e, i) => {
        const y = H - 14 - (D.events.length - 1 - i) * 17, txt = `f ${String(e[0]).padStart(3, '0')} · ball → ${short(e[1])}`, w = c4.measureText(txt).width + 12;
        c4.globalAlpha = e[0] <= fi ? 1 : .3; c4.fillStyle = 'rgba(8,11,9,.86)'; c4.fillRect(10, y - 12, w, 15);
        c4.fillStyle = e === done[done.length - 1] ? C.green : C.signal; c4.fillRect(10, y - 12, 2, 15);
        c4.fillStyle = C.white; c4.fillText(txt, 16, y - 1);
      });
      c4.globalAlpha = 1;
      lastFi = fi;
      live[0].textContent = `f ${String(fi).padStart(3, '0')}`;
      live[1].textContent = `${f.p.length} · ${(confSum / Math.max(1, f.p.length)).toFixed(2)}`;
      live[2].textContent = `${joints} bones`;
      live[3].textContent = `${trails.size} IDs`;
      live[4].textContent = `${done.length}/${D.events.length} changes`;
    };
    const loop = () => { if (visible) draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  /* ================= 08 STANDARDS — principles applied to one real frame ================= */
  // Each principle is a switch. ON (default) is how AIM Labs ships; switching one OFF shows
  // what that principle protects against. Geometry is the model output for f145 of the 1v1 clip.
  const std = document.getElementById('std');
  if (std) {
    const frame = document.getElementById('std-frame'), cv = document.getElementById('std-cv'), img = frame.querySelector('img');
    const sw = [...std.querySelectorAll('.pp')];
    const dk = document.getElementById('std-dk'), dv = document.getElementById('std-dv');
    const on = { '01': true, '02': true, '03': true, '04': true, '05': true, '06': true };
    let F = null;
    fetch('assets/video/clip-02-sand.json').then(r => r.json()).then(d => { F = d.frames[94]; draw(); }).catch(() => {});
    const chip = (ctx, x, y, lines, bg, fg, w) => {
      ctx.font = mono(10); const lw = w || Math.max(...lines.map(l => ctx.measureText(l).width)) + 18, h = 10 + lines.length * 15;
      const cw = cv.clientWidth; x = Math.max(6, Math.min(cw - lw - 6, x)); y = Math.max(6, y);   // keep every label inside the frame
      ctx.fillStyle = bg; ctx.fillRect(x, y, lw, h);
      lines.forEach((l, i) => { ctx.fillStyle = fg; ctx.globalAlpha = i === 0 && lines.length > 1 ? .72 : 1; ctx.fillText(l, x + 9, y + 17 + i * 15); });
      ctx.globalAlpha = 1; return [lw, h];
    };
    const draw = () => {
      if (!F) return;
      const { ctx, W, H } = fitCanvas(cv, frame), sc = Math.max(W / 1280, H / 720), ox = (W - 1280 * sc) * .5, oy = (H - 720 * sc) * .4;   // matches object-position 50% 40%
      const P = (x, y) => [ox + x * 1280 * sc, oy + y * 720 * sc];
      const ppl = F.p.filter(p => p[4] > .2);
      // the player the question is about = the one striking the ball: of the players whose feet are
      // near the ball, the largest (closest to camera)
      const near = F.b ? ppl.filter(p => Math.abs(p[1] - F.b[0]) < p[3] * 1.2 && Math.abs(p[2] + p[4] / 2 - F.b[1]) < p[4] * .5) : [];
      const main = (near.length ? near : ppl).reduce((m, p) => p[4] > m[4] ? p : m);
      const big = [...ppl].sort((p, q) => q[4] - p[4]).slice(0, 4);
      const kp = (p, j) => [...P(p[6][j * 3], p[6][j * 3 + 1]), p[6][j * 3 + 2]];
      const box = p => { const [x0, y0] = P(p[1] - p[3] / 2, p[2] - p[4] / 2), [x1, y1] = P(p[1] + p[3] / 2, p[2] + p[4] / 2); return { x0, y0, x1, y1, h: y1 - y0 }; };
      const RED = '#FF4255', small = W < 560;
      // P.04 — minors protected. The AIM film is shot with consent, so faces stay visible;
      // the principle is about what the SYSTEM keeps: an anonymous ID and a consent record — never identities.
      const tagged = [...big].sort((p, q) => p[1] - q[1]);
      tagged.forEach((p, i) => {
        const b = box(p);
        if (on['04']) chip(ctx, b.x0, b.y0 - 22, [small ? `ID ${'ABCD'[i]} ✓` : `ID ${'ABCD'[i]} · consent ✓`], 'rgba(8,11,9,.85)', C.green);
        else {
          const hd = [0, 1, 2].map(j => kp(p, j)).filter(q => q[2] > .3);
          if (hd.length) { const hx = hd.reduce((a, q) => a + q[0], 0) / hd.length, hy = hd.reduce((a, q) => a + q[1], 0) / hd.length; ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, b.h * .1 + 6, 0, 7); ctx.stroke(); }
          chip(ctx, b.x0, b.y0 - (small ? 22 : 52), small ? ['NAME? AGE?'] : ['IDENTITY COLLECTED', 'Name · Age · School · Location'], RED, C.white);
        }
      });
      // P.01 — only the data needed: legs of the player the question is about
      if (on['01']) {
        ctx.strokeStyle = C.green; ctx.lineWidth = 3; ctx.lineCap = 'round';
        [[11, 13], [13, 15], [12, 14], [14, 16], [11, 12]].forEach(([a, b2]) => { const A = kp(main, a), B = kp(main, b2); if (A[2] > .35 && B[2] > .35) { ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); } });
        [11, 12, 13, 14, 15, 16].forEach(j => { const A = kp(main, j); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(A[0], A[1], 4, 0, 7); ctx.fill(); ctx.strokeStyle = C.green; ctx.lineWidth = 1.5; ctx.stroke(); });
      } else {
        ppl.forEach(p => {
          ctx.strokeStyle = RED; ctx.lineWidth = 1.6;
          for (const [a, b2] of BONES) { const A = kp(p, a), B = kp(p, b2); if (A[2] > .35 && B[2] > .35) { ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); } }
          for (let j = 0; j < 17; j++) { const A = kp(p, j); if (A[2] > .3) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(A[0], A[1], 3, 0, 7); ctx.fill(); } }
        });
      }
      // P.03 — uncertainty shown on the measurement
      const L = kp(main, 15), R = kp(main, 16), bm = box(main), stride = Math.hypot(L[0] - R[0], L[1] - R[1]) / bm.h, err = (1 - Math.min(L[2], R[2])) * .25 + .01;
      const mx = bm.x0 - (small ? 120 : 175), my = bm.y0 + bm.h * .42;   // left of the striker, clear of the other labels
      chip(ctx, mx, my, on['03'] ? ['STRIDE ÷ HEIGHT', `${stride.toFixed(2)} ± ${err.toFixed(2)} · conf ${main[5].toFixed(2)}`] : ['STRIDE', `${stride.toFixed(2)} — exact`], on['03'] ? 'rgba(8,11,9,.88)' : RED, on['03'] ? C.signal : C.white);
      // P.02 — stated purpose (and what it must not infer)
      // purpose + limits stack in the bottom-left, above the status bar
      let by = H - 38;
      if (small) {   // phones: one-line badges, the list beside the frame explains them
        if (on['06']) { by -= 26; chip(ctx, 8, by, ['LIMITS STATED'], 'rgba(8,11,9,.88)', '#FFC45E'); }
        if (on['02']) { by -= 26; chip(ctx, 8, by, ['PURPOSE STATED'], 'rgba(8,11,9,.88)', C.white); }
      } else {
        if (on['06']) { by -= 40; chip(ctx, 10, by, ['KNOWN LIMITS', 'Low light · occlusion · far players'], 'rgba(8,11,9,.88)', '#FFC45E'); }
        if (on['02']) { by -= 56; chip(ctx, 10, by, ['PURPOSE', 'Measures: turning and stride', 'Must not infer: potential, emotion, identity'], 'rgba(8,11,9,.88)', C.white); }
      }
      if (!on['02']) chip(ctx, bm.x0 - 150, bm.y0 + 10, ['INFERRED', 'Potential 7.8 / 10', 'Confidence: high'], RED, C.white);
      // P.05 — a human decides
      const outTxt = small ? [on['05'] ? 'COACH REVIEWS FIRST' : 'AUTO-SENT TO PLAYER'] : on['05'] ? ['OUTPUT', 'Cue drafted → coach reviews before sharing'] : ['OUTPUT', 'Score auto-sent to player and parents'];
      ctx.font = mono(10); const ow = Math.max(...outTxt.map(t => ctx.measureText(t).width)) + 18;
      chip(ctx, W - ow - 10, small ? H - 64 : H - 78, outTxt, on['05'] ? C.green : RED, on['05'] ? C.ink : C.white);
      // status
      const n = Object.values(on).filter(Boolean).length;
      document.getElementById('std-count').textContent = `${n} / 6 principles on`;
      document.getElementById('std-state').textContent = n === 6 ? 'How AIM Labs ships' : 'Not how we work';
      std.classList.toggle('is-off', n < 6);
    };
    const describe = b => { const k = b.dataset.p; dk.textContent = `P.${k} · ${on[k] ? 'on' : 'off'}`; dv.textContent = on[k] ? b.dataset.d : 'Switched off — the frame now shows what this principle prevents.'; };
    sw.forEach(b => {
      b.addEventListener('click', () => { const k = b.dataset.p; on[k] = !on[k]; b.setAttribute('aria-checked', on[k]); describe(b); draw(); });
      b.addEventListener('mouseenter', () => describe(b));
      b.addEventListener('focus', () => describe(b));
    });
    document.getElementById('std-reset').addEventListener('click', () => { sw.forEach(b => { on[b.dataset.p] = true; b.setAttribute('aria-checked', 'true'); }); dk.textContent = 'Responsible by design'; dv.textContent = 'All six principles on — this is how AIM Labs ships.'; draw(); });
    img.complete ? draw() : img.addEventListener('load', draw);
    new ResizeObserver(draw).observe(frame);
  }

  /* ================= 03 WHY ================= */
  const wTrack = document.getElementById('why-track');
  if (wTrack) {
    const stage = document.getElementById('why-stage'), cv = document.getElementById('why-cv');
    const steps = [...wTrack.querySelectorAll('.why__steps li')];
    const numEl = document.getElementById('why-num'), unitEl = document.getElementById('why-unit'), cue = document.getElementById('why-cue');
    let D = null;

    fetch('assets/video/clip-01-duel.json').then(r => r.json()).then(d => {
      // the main player = the track with the largest total presence
      const area = new Map();
      d.frames.forEach(f => f.p.forEach(p => area.set(p[0], (area.get(p[0]) || 0) + p[3] * p[4])));
      const main = [...area.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const pts = [], path = [];
      d.frames.forEach((f, fi) => f.p.forEach(p => {
        const k = p[6];
        for (let j = 0; j < 17; j++) { const c = k[j * 3 + 2]; if (c > .05) pts.push([k[j * 3], k[j * 3 + 1], c, p[0] === main, fi]); }
        if (p[0] === main) {
          const ok = j => k[j * 3 + 2] > .35;
          if (ok(15) && ok(16)) path.push([(k[45] + k[48]) / 2, (k[46] + k[49]) / 2, fi]);
        }
      }));
      // deterministic shuffle so the cloud "arrives" scattered, not frame by frame
      let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
      // translate: smooth the raw ankle positions into a readable path (centred moving average, 9 frames)
      const smooth = path.map((q, i) => {
        const w = path.slice(Math.max(0, i - 4), i + 5);
        return [w.reduce((s, v) => s + v[0], 0) / w.length, w.reduce((s, v) => s + v[1], 0) / w.length, q[2]];
      });
      path.splice(0, path.length, ...smooth);
      const f0 = d.frames[0].p.find(p => p[0] === main);
      D = { pts, path, skel: f0 ? f0[6] : null, trusted: pts.filter(p => p[3] && p[2] >= .5).length, total: pts.length };
      render();
    }).catch(() => {});

    const render = () => {
      if (!D) return;
      const { ctx, W, H } = fitCanvas(cv, stage);
      // same placement as .why__img: full width, vertically centred (the gradients cover the rest)
      const sc = narrow.matches ? H * .84 / 720 : W / 1280;
      const ox = (W - 1280 * sc) / 2, oy = (H - 720 * sc) / 2;
      const P = (x, y) => [ox + x * 1280 * sc, oy + y * 720 * sc];
      const p = progress(wTrack);
      const a = ss(0, .26, p), b = ss(.3, .55, p), c = ss(.58, .8, p), d = ss(.82, .94, p);
      stage.style.setProperty('--img', (d * .95).toFixed(3));
      // dim plate over the frame while we are in "data" mode
      if (d > 0) { ctx.fillStyle = `rgba(5,8,6,${.55 * (1 - d) + .15})`; ctx.fillRect(0, 0, W, H); }

      // 1 · the cloud
      const n = Math.floor(D.total * a);
      for (let i = 0; i < n; i++) {
        const q = D.pts[i];
        let alpha, col;
        if (q[3] && q[2] >= .5) { col = b > 0 ? C.green : C.signal; alpha = .55 - .45 * c; }
        else if (q[2] < .5) { col = b > .05 ? C.red : C.signal; alpha = .5 * (1 - ss(.15, 1, b)); }
        else { col = C.signal; alpha = .5 * (1 - b); }
        alpha *= (1 - d * .9);
        if (alpha <= .01) continue;
        const [x, y] = P(q[0], q[1]);
        ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.fillRect(x - .8, y - .8, 1.8, 1.8);
      }
      ctx.globalAlpha = 1;

      // 3 · the path and the shape
      if (c > 0) {
        const m = Math.max(2, Math.floor(D.path.length * c));
        ctx.strokeStyle = C.green; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); for (let i = 0; i < m; i++) { const [x, y] = P(D.path[i][0], D.path[i][1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
        ctx.fillStyle = C.green;
        for (let i = 0; i < m; i += 10) { const [x, y] = P(D.path[i][0], D.path[i][1]); ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
        if (m > 2) {
          const last = D.path[m - 1], [lx, ly] = P(last[0], last[1]);
          ctx.font = mono(10); const t = `f ${String(last[2]).padStart(3, '0')}`;
          ctx.fillStyle = 'rgba(8,11,9,.85)'; ctx.fillRect(lx + 8, ly - 18, ctx.measureText(t).width + 10, 15);
          ctx.fillStyle = C.green; ctx.fillText(t, lx + 13, ly - 7);
        }
        if (D.skel) {
          const k = D.skel, ok = i => k[i * 3 + 2] > .35, S = i => P(k[i * 3], k[i * 3 + 1]);
          ctx.globalAlpha = ss(.3, 1, c); ctx.strokeStyle = C.green; ctx.lineWidth = 2.6;
          for (const [i, j] of BONES) if (ok(i) && ok(j)) { const A = S(i), B = S(j); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }
          ctx.fillStyle = C.ink; ctx.lineWidth = 1.5;
          for (let i = 0; i < 17; i++) if (ok(i) && i !== 1 && i !== 2 && i !== 3 && i !== 4) { const A = S(i); ctx.beginPath(); ctx.arc(A[0], A[1], 3.6, 0, 7); ctx.fill(); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
      }

      // readouts
      let num, unit;
      if (p < .3) { num = Math.round(D.total * a); unit = 'data points'; }
      else if (p < .58) { num = Math.round(D.total + (D.trusted - D.total) * b); unit = b > .9 ? 'trusted points · 1 player' : 'checking confidence'; }
      else if (p < .84) { num = Math.max(0, Math.round(D.path.length * c)); unit = 'frames on one path'; }
      else { num = 1; unit = 'cue for the coach'; }
      numEl.textContent = num.toLocaleString('en-GB'); unitEl.textContent = unit;
      cue.classList.toggle('on', p > .88);
      const active = p < .3 ? 0 : p < .62 ? 1 : 2;
      steps.forEach((li, i) => li.classList.toggle('is-on', i === active));
    };
    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };
    addEventListener('scroll', schedule, { passive: true });
    new ResizeObserver(render).observe(stage);
  }
})();
