/* AIM Labs — iteration 2 motion: the hero film, the moving line, speed-reactive type */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lane = document.getElementById('lane'), dock = document.getElementById('dock');
  const run = document.getElementById('hero'), pin = document.getElementById('run-pin');
  const film = document.getElementById('run-film'), video = document.getElementById('run-video');
  const flood = document.getElementById('run-flood'), next = run && run.nextElementSibling;
  const chase = document.getElementById('chase');
  let paint = () => {}, sweep = 0;

  /* ---------- 01 Hero (home only) ---------- */
  if (run) {

    /* ---------- Film: poster first, video after; only plays on screen ---------- */
    if (!reduce) {
      const portrait = matchMedia('(max-aspect-ratio: 1/1)').matches;
      const slow = navigator.connection && (navigator.connection.saveData || /(^|-)2g$/.test(navigator.connection.effectiveType || ''));
      if (!slow) {
        video.src = `assets/video/${portrait ? 'run-m' : 'run'}.mp4`;
        video.addEventListener('playing', () => film.classList.add('is-live'), { once: true });
        const play = () => video.play().catch(() => {});
        new IntersectionObserver(([e]) => e.isIntersecting ? play() : video.pause(), { threshold: .02 }).observe(run);
        document.addEventListener('visibilitychange', () => document.hidden ? video.pause() : play());
      }
    }

    /* ---------- Dark-on-green copy of the headline, revealed where the gap passes ---------- */
    if (!reduce) {
      const copy = document.getElementById('run-copy').cloneNode(true);
      copy.removeAttribute('id'); copy.classList.add('is-copy'); copy.inert = true;
      copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      copy.querySelector('h1').outerHTML = copy.querySelector('h1').outerHTML.replace(/^<h1/, '<div').replace(/<\/h1>$/, '</div>');
      copy.querySelectorAll('.sr-only').forEach(n => n.remove());
      flood.appendChild(copy);
    }

    /* ---------- The line ---------- */
    const css = getComputedStyle(pin);
    const PL = parseFloat(css.getPropertyValue('--pl')), PR = parseFloat(css.getPropertyValue('--pr'));
    const MA = parseFloat(css.getPropertyValue('--ma')), MB = parseFloat(css.getPropertyValue('--mb'));
    const set = (k, v) => pin.style.setProperty(k, v);
    let intro = reduce ? 1 : 0;

    paint = () => {
      const kvw = .1063 * pin.offsetHeight / innerWidth * 100;      // the lean, in vw
      const right = PR + (100 + kvw + 2 - PR) * clamp(sweep / .62, 0, 1);
      const left = PL + (-kvw - 2 - PL) * clamp((sweep - .12) / .78, 0, 1);
      const start = PL + .4;                                         // today's line starts on yesterday's
      set('--pr', (start + (right - start) * intro).toFixed(2));
      set('--pl', left.toFixed(2));
      if (MA < 100) { const m = sweep * 240; set('--ma', (MA + m).toFixed(1) + '%'); set('--mb', (MB + m).toFixed(1) + '%'); }
      pin.classList.toggle('is-moving', sweep > .02);
      film.style.transform = `scale(${(1 + sweep * .07).toFixed(4)})`;
    };

    if (!reduce) {
      // today's line jumps forward once, a beat after the headline lands
      const t0 = performance.now() + 480, D = 620;
      const ease = t => { const c = 1.9; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; };   // slight overshoot: it is pushed, not placed
      paint();
      const tick = now => {
        const t = clamp((now - t0) / D, 0, 1);
        intro = ease(t); paint();
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } else paint();
  }

  /* ---------- 02: once the five facts are read, the annotated clip slides up over them ---------- */
  const grun = document.getElementById('grun');
  let grunTick = () => {};
  if (grun) {
    const media = grun.querySelector('.xclip__media'), v = document.getElementById('xclip-video'), cv = document.getElementById('xclip-cv'), ctx = cv.getContext('2d');
    const GREEN = '#64FF35', BLUE = '#8FB3FF', RED = '#FF4255', INK = '#080B09', WHITE = '#F0F2E9';
    const BONES = [[5, 7], [7, 9], [6, 8], [8, 10], [5, 6], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];
    const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const MAIN = 1;   // the player in red, tracked for the whole clip
    let D = null, W = 0, H = 0, k = 0, calls = [0, 0, 0], on = false, raf3 = 0, lastF = -1;
    const trail = [];
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = media.clientWidth; H = media.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const chip = (x0, y0, dx, dy, txt, col, a) => {
      if (a <= .01) return;
      ctx.globalAlpha = a;
      ctx.font = '500 12px "JetBrains Mono", monospace';
      const w = ctx.measureText(txt).width + 18, h = 26;
      let x = clamp(dx < 0 ? x0 + dx - w : x0 + dx, 10, W - w - 10), y = clamp(y0 + dy, 10, H - h - 10);   // dx < 0: the chip sits to the left
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x + (dx < 0 ? w : 0), y + h / 2); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y0, 4, 0, 7); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = col; ctx.fillText(txt, x + 9, y + 17);
      ctx.globalAlpha = 1;
    };
    const draw = () => {
      if (!D || !W) return;
      ctx.clearRect(0, 0, W, H);
      const fi = clamp(Math.floor((v.currentTime || 0) * D.fps + .001), 0, D.n - 1), f = D.frames[fi];
      if (fi < lastF) trail.length = 0;
      // same fit as the video: cover the panel, or on phones cover the band at 17–69% of its height
      const by = W < 600 ? H * .17 : 0, bh = W < 600 ? H * .52 : H;
      const s = Math.max(W / D.w, bh / D.h) * 1.06, ox = (W - D.w * s) / 2, oy = by + (bh - D.h * s) / 2;
      ctx.save(); ctx.beginPath(); ctx.rect(0, by, W, bh); ctx.clip();
      const X = x => ox + x * D.w * s, Y = y => oy + y * D.h * s;
      ctx.lineCap = 'round'; ctx.font = '500 11px "JetBrains Mono", monospace';
      let main = null;
      for (const p of f.p) {
        const [id, cx, cy, bw, bh, c, kp] = p;
        const x0 = X(cx - bw / 2), y0 = Y(cy - bh / 2), x1 = X(cx + bw / 2), y1 = Y(cy + bh / 2);
        ctx.strokeStyle = c < .5 ? RED : BLUE; ctx.lineWidth = id === MAIN ? 2 : 1.4; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        if (kp && kp.length) { ctx.strokeStyle = GREEN; ctx.lineWidth = id === MAIN ? 3 : 2.2;
          for (const [a, b] of BONES) { if (kp[a * 3 + 2] < .35 || kp[b * 3 + 2] < .35) continue; ctx.beginPath(); ctx.moveTo(X(kp[a * 3]), Y(kp[a * 3 + 1])); ctx.lineTo(X(kp[b * 3]), Y(kp[b * 3 + 1])); ctx.stroke(); } }
        if (id === MAIN) main = { x0, y0, x1, y1, c, kp, foot: [(x0 + x1) / 2, y1] };
      }
      if (main && fi !== lastF) { trail.push(main.foot); if (trail.length > 60) trail.shift(); }
      if (trail.length > 1) { ctx.strokeStyle = BLUE; ctx.lineWidth = 2.2; ctx.setLineDash([3, 6]); ctx.beginPath(); trail.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.setLineDash([]); }
      if (f.b) { const bx = X(f.b[0]), by = Y(f.b[1]), r = Math.max(8, f.b[2] * D.w * s / 2 + 4); ctx.strokeStyle = WHITE; ctx.lineWidth = 1.5; ctx.strokeRect(bx - r, by - r, r * 2, r * 2); }
      ctx.restore();
      if (main) {
        const sh = main.kp && main.kp[5 * 3 + 2] > .35 ? [X(main.kp[15]), Y(main.kp[16])] : [main.x0, (main.y0 + main.y1) / 3];
        const narrowC = W < 600;
        chip(main.x0, main.y0 + 18, -22, -6, `DETECTED · conf ${main.c.toFixed(2)}`, BLUE, calls[0]);
        chip(sh[0], sh[1], -40, narrowC ? 30 : 40, 'POSE · 17 JOINTS', GREEN, calls[1]);
        chip(main.foot[0], main.foot[1], narrowC ? -16 : 28, narrowC ? -150 : -64, `TRACKED · ID 01 · f ${String(fi).padStart(3, '0')}`, BLUE, calls[2]);
      }
      lastF = fi;
    };
    const loop = () => { draw(); raf3 = on ? requestAnimationFrame(loop) : 0; };
    new ResizeObserver(() => { size(); draw(); }).observe(media);
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !D) {
        fetch('assets/video/clip-01-duel.json').then(r => r.json()).then(d => { D = d; size(); draw(); }).catch(() => {});
        v.src = 'assets/video/clip-01-duel.mp4';
      }
    }, { rootMargin: '600px 0px' }).observe(grun);
    grunTick = () => {
      const r = grun.getBoundingClientRect();
      const p = reduce ? 1 : clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
      k = reduce ? 1 : ss(.26, .6, p);
      calls = [ss(.64, .72, p), ss(.72, .8, p), ss(.8, .88, p)];
      grun.style.setProperty('--k', k.toFixed(4));
      grun.style.setProperty('--cap', (reduce ? 1 : ss(.6, .7, p)).toFixed(3));
      const visible = r.top < innerHeight && r.bottom > 0 && k > .01;
      if (visible && !on) { on = true; if (!reduce) v.play().catch(() => {}); if (!raf3) raf3 = requestAnimationFrame(loop); }
      if (!visible && on) { on = false; v.pause(); }
      if (reduce) draw();
    };
    if (reduce) { calls = [1, 1, 1]; v.addEventListener('loadeddata', draw); }
    grunTick();
  }

  /* ---------- Section headings: in once on the diagonal; only those on screen react to speed ---------- */
  const seen = new Set(pin ? [pin] : []);
  const speedTargets = () => seen;
  document.querySelectorAll('.kin').forEach(k => {
    if (reduce) return;
    k.classList.add('kin-wait');
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { seen.add(k); k.classList.remove('kin-wait'); } else seen.delete(k);
    }, { rootMargin: '0px 0px -12% 0px' }).observe(k);
  });

  /* ---------- 03 Why: a real run and the same player's ghost; scrolling moves the line ---------- */
  if (chase) {
    const film = document.getElementById('chase-film'), v = document.getElementById('chase-video'), cv = document.getElementById('chase-cv');
    const steps = [...document.querySelectorAll('#chase-steps li')], ctx = cv.getContext('2d');
    const INK = '#080B09', GREEN = '#64FF35', GHOST = '#8FB3FF', VW = 1280, VH = 720, LAG = 9;   // ghost runs LAG frames out of step, so it reads as another attempt
    const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    let G = null, W = 0, H = 0, on = false, raf2 = 0;

    const pin2 = cv.parentNode;
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = pin2.clientWidth; H = pin2.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const portrait = () => matchMedia('(max-aspect-ratio: 1/1)').matches;
    const narrowFilmTop = portrait;
    // landscape: same placement as object-fit: cover. Phones: the whole frame, panned to keep the runner centred.
    const place = i => {
      if (!portrait()) { const s = Math.max(W / VW, H / VH); return { s, ox: (W - VW * s) / 2, oy: (H - VH * s) / 2 - H * .07 }; }
      const s = H / VH, fw = VW * s;
      return { s, oy: -H * .09, ox: clamp(W * .62 - G.s[i] * fw, W - fw, 0) };
    };
    const tag = (t, x0, y, col, ink) => {
      ctx.font = `500 11px "JetBrains Mono", monospace`;
      const w = ctx.measureText(t).width + 14, x = clamp(x0, w / 2 + 8, W - w / 2 - 8);
      ctx.fillStyle = col; ctx.fillRect(x - w / 2, y - 18, w, 20);
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.fillText(t, x, y - 4); ctx.textAlign = 'left';
    };
    const frameAt = () => {
      if (!G) return 0;
      const d = v.duration || 3.14;
      return clamp(Math.floor((v.currentTime % d) / d * G.n), 0, G.n - 1);
    };
    const cpin = document.getElementById('chase-pin'), numEl = document.getElementById('chase-num'), wipe = document.getElementById('chase-wipe');
    const snaps = [...chase.querySelectorAll('.chase__snap')];
    const span = () => Math.max(1, chase.offsetHeight - innerHeight - innerWidth * .1051);   // done before 04 arrives
    const placeSnaps = () => snaps.forEach((s, n) => { s.style.top = Math.round([.17, .5, .84][n] * span()) + 'px'; });
    let stage = -1;
    const outline = (poly, sx, sy, X, Y) => { ctx.beginPath(); for (let k = 0; k < poly.length; k += 2) { const x = X(poly[k] + sx), y = Y(poly[k + 1] + sy); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); };
    const draw = () => {
      if (!G || !W) return;
      const r = chase.getBoundingClientRect();
      const p = reduce ? .9 : clamp(-r.top / span(), 0, 1);
      const a = p < .34 ? 0 : p < .67 ? 1 : 2, ts = clamp((p - [0, .34, .67][a]) / .33, 0, 1);
      if (a !== stage) {
        cpin.dataset.st = a; numEl.textContent = '0' + (a + 1);
        if (stage !== -1 && !reduce) { [wipe, numEl].forEach(n => { n.classList.remove('go'); void n.offsetWidth; n.classList.add('go'); }); }
        stage = a;
      }
      steps.forEach((li, n) => { li.classList.toggle('is-on', n === a); li.classList.toggle('is-done', n < a); });
      steps[a].style.setProperty('--ts', ts.toFixed(3));

      const narrowFilm = portrait(), i = frameAt(), { s, ox, oy } = place(i);
      const X = x => ox + x * VW * s, Y = y => oy + y * VH * s;
      film.style.transform = narrowFilm ? `translate(${ox.toFixed(1)}px, -9%)` : '';
      ctx.clearRect(0, 0, W, H);
      const px = G.c[i][0], foot = G.b[i], head = G.t[i];
      // phones: the head can rise into the lede; keep tags below the text block
      const lede = chase.querySelector('.chase__lede'), textBottom = lede ? lede.getBoundingClientRect().bottom - pin2.getBoundingClientRect().top : 0;
      const ty = Math.max(Y(head) - 14, narrowFilmTop() ? textBottom + 30 : -1e9);
      const stepsTop = steps[0].parentNode.getBoundingClientRect().top - pin2.getBoundingClientRect().top;

      if (a === 0) {
        // Explore: what can one camera see? The outline arrives as points; a scan passes over the pitch.
        const poly = G.p[i], sweep = ((performance.now() / 1700) % 1) * (W + 200) - 100, lean = H * .1063;
        for (let k = 0; k < poly.length; k += 2) {
          const x = X(poly[k]), y = Y(poly[k + 1]), lit = Math.abs(x - (sweep + lean * (1 - 2 * y / H))) < 60;
          ctx.fillStyle = lit ? GREEN : 'rgba(240,242,233,.9)'; ctx.fillRect(x - 2, y - 2, lit ? 5 : 3.5, lit ? 5 : 3.5);
        }
        ctx.strokeStyle = 'rgba(100,255,53,.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sweep + lean, 0); ctx.lineTo(sweep - lean, H); ctx.stroke();
        tag(`One camera · ${poly.length / 2} outline points`, X(px), ty, GREEN, INK);
      } else if (a === 1) {
        // Test: is it credible? Every frame's outline is checked; incomplete ones are dropped, not patched.
        const ok = G.good.includes(i);
        outline(G.p[i], 0, 0, X, Y);
        ctx.strokeStyle = ok ? '#F0F2E9' : '#FF4255'; ctx.lineWidth = 2.2; ctx.stroke();
        tag(ok ? `Frame ${String(i + 1).padStart(3, '0')} · complete ✓` : `Frame ${String(i + 1).padStart(3, '0')} · incomplete · dropped`, X(px), ty, ok ? '#F0F2E9' : '#FF4255', INK);
        const L = narrowFilm ? 16 : 48, R = W - L, cw = (R - L) / G.n, y = stepsTop - 30;
        for (let n = 0; n < G.n; n++) {
          ctx.fillStyle = G.good.includes(n) ? GREEN : '#FF4255';
          ctx.globalAlpha = n <= Math.floor(ts * 1.25 * G.n) ? 1 : .18;
          ctx.fillRect(L + n * cw, y, Math.max(1, cw - 1.5), 12);
        }
        ctx.globalAlpha = 1; ctx.fillStyle = '#F0F2E9'; ctx.fillRect(L + i * cw - 1, y - 5, 2, 22);
        ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = '#E2E6DC';
        ctx.fillText(`Outline check · ${G.good.length} of ${G.n} frames complete · ${G.n - G.good.length} dropped`, L, y - 10);
      } else {
        // Translate: what works becomes something a coach can use. The ghost is the same player; the line moves.
        const far = narrowFilm ? -.012 : -.02, near = narrowFilm ? -.1 : -.2;
        const dx = far + (near - far) * ss(.05, .85, ts);
        const g = G.good[(Math.floor(i / G.n * G.good.length) + LAG) % G.good.length];
        outline(G.p[g], px - G.c[g][0] + dx, foot - G.b[g], X, Y);
        ctx.fillStyle = 'rgba(143,179,255,.42)'; ctx.fill();
        ctx.strokeStyle = GHOST; ctx.lineWidth = 1.5; ctx.stroke();
        const yb = Math.min(Y(foot) + 12, stepsTop - 14), xa = X(px), xb = X(px + dx);
        ctx.fillStyle = GREEN; ctx.fillRect(Math.min(xa, xb), yb, Math.abs(xb - xa), 4);
        if (Math.abs(xb - xa) > 130) tag('The line moved', (xa + xb) / 2, yb - 6, GREEN, INK);
        tag('Today', xa, ty, GREEN, INK);
        if (Math.abs(xb - xa) > 84) tag('Your last run', xb, ty, GHOST, INK);
      }
    };
    addEventListener('resize', placeSnaps); placeSnaps();
    const loop = () => { draw(); raf2 = on ? requestAnimationFrame(loop) : 0; };

    fetch('assets/video/why-run.json').then(r => r.json()).then(d => {
      d.b = d.p.map(f => { let m = 0; for (let k = 1; k < f.length; k += 2) m = Math.max(m, f[k]); return m; });
      d.t = d.p.map(f => { let m = 1; for (let k = 1; k < f.length; k += 2) m = Math.min(m, f[k]); return m; });
      // segmentation drops the legs or loses the runner on some frames: the ghost only uses whole outlines,
      // and the runner's marks are interpolated across the gaps
      const hs = d.b.map((b, i) => b - d.t[i]), med = [...hs].sort((a, b) => a - b)[hs.length >> 1];
      d.good = d.p.map((f, i) => i).filter(i => hs[i] > med * .86 && (i === 0 || d.p[i] !== d.p[i - 1] && JSON.stringify(d.p[i]) !== JSON.stringify(d.p[i - 1])));
      const fill = get => set => d.p.forEach((_, i) => {
        if (d.good.includes(i)) return;
        const a = [...d.good].reverse().find(k => k < i) ?? d.good[0], b = d.good.find(k => k > i) ?? d.good[d.good.length - 1];
        const t = b === a ? 0 : (i - a) / (b - a); set(i, get(a) + (get(b) - get(a)) * t);
      });
      const fb = [...d.b], ft = [...d.t], fc = d.c.map(q => q[0]);
      fill(i => fb[i])((i, v) => { d.b[i] = v; }); fill(i => ft[i])((i, v) => { d.t[i] = v; }); fill(i => fc[i])((i, v) => { d.c[i] = [v, d.c[i][1]]; });
      d.s = d.c.map((_, i) => { const w = d.c.slice(Math.max(0, i - 6), i + 7); return w.reduce((a, q) => a + q[0], 0) / w.length; });   // steady pan
      G = d; size(); draw();
    }).catch(() => {});
    new ResizeObserver(() => { size(); draw(); }).observe(pin2);

    new IntersectionObserver(([e]) => {
      on = e.isIntersecting && !reduce;
      if (reduce) return;
      if (on) {
        if (!v.src) { v.src = 'assets/video/why-run.mp4'; v.addEventListener('playing', () => film.classList.add('is-live'), { once: true }); }
        v.play().catch(() => {});
        if (!raf2) raf2 = requestAnimationFrame(loop);
      } else v.pause();
    }, { rootMargin: '200px 0px' }).observe(chase);
  }

  /* ---------- 04 Research: each lane runs out to its status, once ---------- */
  const lanes = document.getElementById('lanes');
  if (lanes && !reduce) {
    lanes.classList.add('lanes-wait');
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { lanes.classList.remove('lanes-wait'); o.disconnect(); } }, { threshold: .12 }).observe(lanes.querySelector('.lanes__list'));
  }

  /* ---------- 05 Technology: one real clip, six legs. Model output comes from the clip's own JSON. ---------- */
  const relay = document.getElementById('technology');
  if (relay) {
    const film = document.getElementById('relay-film'), v = document.getElementById('relay-video'), cv = document.getElementById('relay-cv');
    const word = document.getElementById('relay-word'), numEl = document.getElementById('relay-num'), unitEl = document.getElementById('relay-unit'), ctl = document.getElementById('relay-ctl');
    const baton = document.getElementById('relay-baton'), rail = document.getElementById('relay-legs');
    const legs = [...relay.querySelectorAll('.leg')], ctx = cv.getContext('2d');
    const NAMES = legs.map(b => b.querySelector('b').textContent);
    const GREEN = '#64FF35', BLUE = '#8FB3FF', RED = '#FF4255', INK = '#080B09', WHITE = '#F0F2E9', CYAN = '#38C6E0', AMBER = '#FFC45E';
    const LEGC = [WHITE, BLUE, GREEN, CYAN, AMBER, GREEN];   // each leg's colour = the colour of its layer on the clip
    const BONES = [[5, 7], [7, 9], [6, 8], [8, 10], [5, 6], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];
    const HOLD = 2300;
    let D = null, W = 0, H = 0, leg = 0, visible = false, running = false, started = false, timer = 0, lastF = -1;
    const trails = new Map(), sid = new Map();
    const short = id => 'ID ' + String(sid.get(id) || 0).padStart(2, '0');

    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = film.clientWidth; H = film.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const select = i => {
      if (!Number.isInteger(i) || !legs[i]) return;
      leg = i;
      legs.forEach((b, n) => { b.classList.toggle('is-on', n === i); b.setAttribute('aria-pressed', n === i); });
      baton.style.setProperty('--at', i);
      relay.style.setProperty('--lc', LEGC[i]);
      legs.forEach((b, n) => b.classList.toggle('is-done', n < i));
      relay.classList.toggle('is-human', i === 5);
      word.textContent = NAMES[i]; word.classList.remove('is-swap'); void word.offsetWidth; word.classList.add('is-swap');
      if (innerWidth <= 1024) rail.scrollTo({ left: legs[i].parentNode.offsetLeft - legs[0].parentNode.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
    };
    const label = () => { ctl.textContent = running ? 'Pause' : leg === 5 ? 'Run it again' : 'Resume'; };
    const stop = () => { running = false; relay.classList.remove('is-running'); clearTimeout(timer); label(); };
    const next = () => {
      clearTimeout(timer);
      if (!running) return;
      timer = setTimeout(() => {
        if (leg >= 5) { stop(); return; }
        select(leg + 1); if (leg === 5) stop(); else next();
      }, HOLD);
    };
    const start = () => { running = true; relay.classList.add('is-running'); label(); next(); };
    legs.forEach((b, i) => b.addEventListener('click', () => { stop(); select(i); label(); }));
    ctl.addEventListener('click', () => {
      if (running) { stop(); return; }
      if (leg === 5) select(0);
      start();
    });
    // phones: swiping the legs picks one
    let swipe = 0;
    rail.addEventListener('scroll', () => {
      clearTimeout(swipe);
      swipe = setTimeout(() => {
        if (running || innerWidth > 1024) return;
        const step = legs[1].parentNode.offsetLeft - legs[0].parentNode.offsetLeft;
        if (!step) return;
        const i = clamp(Math.round(rail.scrollLeft / step), 0, 5);
        if (i !== leg) { select(i); label(); }
      }, 140);
    }, { passive: true });

    const draw = () => {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      if (!D) return;
      const fi = clamp(Math.floor(v.currentTime * D.fps + .001), 0, D.n - 1), f = D.frames[fi];
      if (fi < lastF) trails.clear();
      // same placement as the video: object-fit cover, then scaled 1.06 to trim the letterbox
      const s = Math.max(W / D.w, H / D.h) * 1.06, ox = (W - D.w * s) / 2, oy = (H - D.h * s) / 2;
      const X = x => ox + x * D.w * s, Y = y => oy + y * D.h * s;
      let conf = 0, joints = 0;
      ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.lineCap = 'round';
      for (const [id, cx, cy, bw, bh, c, k] of f.p) {
        const x0 = X(cx - bw / 2), y0 = Y(cy - bh / 2), x1 = X(cx + bw / 2), y1 = Y(cy + bh / 2);
        conf += c;
        const foot = [(x0 + x1) / 2, y1];
        if (fi !== lastF) { const t = trails.get(id) || []; t.push(foot); if (t.length > 40) t.shift(); trails.set(id, t); }
        if (leg === 1) {
          ctx.strokeStyle = c < .5 ? RED : BLUE; ctx.lineWidth = 1.6; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
          const t = c.toFixed(2), w = ctx.measureText(t).width + 8;
          ctx.fillStyle = 'rgba(8,11,9,.85)'; ctx.fillRect(x0, y0 - 15, w, 14); ctx.fillStyle = c < .5 ? RED : BLUE; ctx.fillText(t, x0 + 4, y0 - 4);
        }
        if (k && k.length) for (const [a, b] of BONES) {
          if (k[a * 3 + 2] < .35 || k[b * 3 + 2] < .35) continue;
          joints++;
          if (leg === 2) { ctx.strokeStyle = GREEN; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(X(k[a * 3]), Y(k[a * 3 + 1])); ctx.lineTo(X(k[b * 3]), Y(k[b * 3 + 1])); ctx.stroke(); }
        }
        if (leg === 3) {
          const t = trails.get(id) || [];
          ctx.strokeStyle = CYAN; ctx.lineWidth = 2; ctx.setLineDash([2, 5]); ctx.beginPath(); t.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = CYAN; ctx.beginPath(); ctx.arc(foot[0], foot[1], 3.5, 0, 7); ctx.fill();
          const n = short(id), w = ctx.measureText(n).width + 8;
          ctx.fillStyle = 'rgba(8,11,9,.85)'; ctx.fillRect(foot[0] - w / 2, foot[1] + 6, w, 14); ctx.fillStyle = CYAN; ctx.fillText(n, foot[0] - w / 2 + 4, foot[1] + 17);
        }
        if (leg === 4 && id === D.held[fi]) {
          ctx.strokeStyle = AMBER; ctx.lineWidth = 2.6; ctx.strokeRect(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6);
          const t = `${short(id)} · ON THE BALL`, w = ctx.measureText(t).width + 10;
          ctx.fillStyle = AMBER; ctx.fillRect(x0 - 3, y0 - 20, w, 15); ctx.fillStyle = INK; ctx.fillText(t, x0 + 2, y0 - 9);
        }
      }
      if (f.b && (leg === 1 || leg === 4)) {
        const bx = X(f.b[0]), by = Y(f.b[1]), r = Math.max(7, f.b[2] * D.w * s / 2 + 3);
        ctx.strokeStyle = WHITE; ctx.lineWidth = 1.5; ctx.strokeRect(bx - r, by - r, r * 2, r * 2);
      }
      lastF = fi;
      const done = D.events.filter(e => e[0] <= fi).length, n = Math.max(1, f.p.length);
      const R = [[String(fi).padStart(3, '0'), 'frame of 200'], [String(f.p.length), `players · conf ${(conf / n).toFixed(2)}`], [String(joints), 'bones this frame'], [String(trails.size), 'IDs held'], [`${done}/${D.events.length}`, 'possession changes'], ['1', 'suggestion · a person decides']][leg];
      if (numEl.textContent !== R[0]) numEl.textContent = R[0];
      if (unitEl.textContent !== R[1]) unitEl.textContent = R[1];
    };
    const loop = () => { if (visible) { draw(); requestAnimationFrame(loop); } };

    new ResizeObserver(() => { size(); draw(); }).observe(film);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        if (!v.src) {
          v.src = 'assets/video/clip-02-sand.mp4';
          fetch('assets/video/clip-02-sand.json').then(r => r.json()).then(d => {
            d.frames.forEach(f => f.p.forEach(p => { if (!sid.has(p[0])) sid.set(p[0], sid.size + 1); }));
            // who has the ball: nearest player, held for 5 frames
            const near = d.frames.map(f => {
              if (!f.b) return null; let best = null;
              for (const p of f.p) { const dist = Math.hypot(p[1] - f.b[0], (p[2] + p[4] / 2 - f.b[1]) * .5625); if (dist < .6 * p[4] && (!best || dist < best[0])) best = [dist, p[0]]; }
              return best ? best[1] : null;
            });
            const events = [], held = []; let cur = null, cand = null, n = 0;
            near.forEach((c, i) => { if (c === cand) n++; else { cand = c; n = 1; } if (cand !== null && n === 5 && cand !== cur) { events.push([i - 4, cand]); cur = cand; } held.push(cur); });
            D = { ...d, events, held };
            document.getElementById('relay-n').textContent = events.length;
          }).catch(() => {});
        }
        if (!reduce) v.play().catch(() => {});
        requestAnimationFrame(loop);
      } else { v.pause(); }
    }, { rootMargin: '200px 0px' }).observe(film);

    if (!reduce) relay.classList.add('is-ready');   // nothing runs by itself, so no pause control
    label();
    // the baton starts moving once the film is properly on screen, one time only
    new IntersectionObserver(([e], o) => {
      if (e.isIntersecting && !started && !reduce) { started = true; start(); o.disconnect(); }
    }, { threshold: .55 }).observe(film);
  }

  /* ---------- Dock: the site navigation sits at the bottom. Phones open a sheet; it tucks while you read down ---------- */
  const now = document.getElementById('dock-now');
  const setSheet = open => { dock.classList.toggle('is-open', open); now.setAttribute('aria-expanded', open); };
  now.addEventListener('click', () => setSheet(!dock.classList.contains('is-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape' && dock.classList.contains('is-open')) { setSheet(false); now.focus(); } });
  document.addEventListener('click', e => { if (!dock.contains(e.target)) setSheet(false); });
  dock.addEventListener('focusin', () => dock.classList.remove('is-tucked'));

  /* ---------- Touch: no hover, so the item in the middle of the screen takes the hover state ---------- */
  const touchQ = matchMedia('(hover: none)');
  const nearFocus = (items, on) => {
    let cur;
    const tick = () => {
      if (!touchQ.matches) return;
      const mid = innerHeight * .45; let best = null, bd = innerHeight * .3;
      items().forEach(it => { const r = it.getBoundingClientRect(); if (!r.height) return; const d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = it; } });
      if (best !== cur) { cur = best; on(best); }
    };
    addEventListener('scroll', () => requestAnimationFrame(tick), { passive: true }); tick();
    return tick;
  };
  const nearClass = sel => { const all = () => [...document.querySelectorAll(sel)]; nearFocus(all, b => all().forEach(x => x.classList.toggle('is-near', x === b))); };
  nearClass('.lix__list a'); nearClass('.read8 li'); nearClass('.log .nb:not(.is-lead):not([hidden])');

  /* ---------- Swipe rows: dots under the row, coloured by status, tap to jump ---------- */
  const dotsFor = (row, items, cls, colour) => {
    const bar = document.createElement('div');
    bar.className = 'cdots ' + cls; bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = items.map((it, i) => `<button tabindex="-1" style="--dc:${colour(it)}"></button>`).join('') + `<span class="mono"></span>`;
    row.after(bar);
    const btns = [...bar.querySelectorAll('button')], lbl = bar.querySelector('span');
    const cur = () => { const L = row.getBoundingClientRect().left; let best = 0, bd = 1e9; items.forEach((it, i) => { const d = Math.abs(it.getBoundingClientRect().left - L - parseFloat(getComputedStyle(row).paddingLeft)); if (d < bd) { bd = d; best = i; } }); return best; };
    const mark = () => { const c = cur(); btns.forEach((b, i) => b.setAttribute('aria-current', i === c)); lbl.textContent = `${String(c + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`; };
    btns.forEach((b, i) => b.addEventListener('click', () => row.scrollTo({ left: items[i].offsetLeft - row.offsetLeft - parseFloat(getComputedStyle(row).paddingLeft), behavior: reduce ? 'auto' : 'smooth' })));
    row.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
    mark();
  };
  const lanesRow = document.querySelector('.lanes__list');
  if (lanesRow) {
    const lanes = [...lanesRow.children];
    // write out the next status for each card (on desktop it is a hover hint on the track)
    lanes.forEach(l => { const r = l.querySelector('.lane__rest span'); if (r) l.insertAdjacentHTML('beforeend', `<p class="lane__next mono">Next <b>${r.textContent.replace(/^Next · /, '')}</b></p>`); });
    dotsFor(lanesRow, lanes, 'cdots--lanes', l => `var(--c${l.dataset.s || 6})`);
  }

  /* ---------- Footer: on phones the link groups fold ---------- */
  const fcols = [...document.querySelectorAll('.ftr__col')];
  const phoneQ = matchMedia('(max-width: 640px)');
  const foldFooter = () => fcols.forEach(d => { d.open = !phoneQ.matches; });
  foldFooter(); phoneQ.addEventListener('change', foldFooter);

  /* ---------- Insights: notes arrive one by one ---------- */
  const log = document.querySelector('.log');
  if (log && !reduce) {
    log.classList.add('js-reveal');
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    log.querySelectorAll('.nb').forEach(n => io.observe(n));
  }

  /* ---------- People & Standards: one line in focus; a person lights the lines they keep ---------- */
  const keep = document.getElementById('keep-lines');
  if (keep) {
    const lines = [...keep.children];
    lines.forEach((li, i) => li.style.setProperty('--k', i));
    const focus = li => lines.forEach(l => l.classList.toggle('is-on', l === li));
    lines.forEach(li => {
      li.addEventListener('mouseenter', () => focus(li));
      li.addEventListener('focus', () => focus(li));
      li.addEventListener('click', () => focus(li));
    });
    nearFocus(() => lines, b => { if (b) focus(b); });
    if (!reduce) {
      keep.classList.add('js-reveal');
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { keep.classList.add('is-in'); io.disconnect(); } }), { rootMargin: '0px 0px -15% 0px' });
      io.observe(keep);
    }
    const people = [...document.querySelectorAll('#team .person')];
    nearFocus(() => people, b => people.forEach(x => x.classList.toggle('is-on', x === b)));   // touch: the person in the middle lights up
    document.querySelectorAll('#team .person').forEach(p => {
      const ks = (p.dataset.keeps || '').split(' ');
      const mark = on => lines.forEach(l => l.classList.toggle('is-kept', on && ks.includes(l.dataset.k)));
      p.addEventListener('mouseenter', () => mark(true));
      p.addEventListener('mouseleave', () => mark(false));
      p.addEventListener('focus', () => mark(true));
      p.addEventListener('blur', () => mark(false));
      p.addEventListener('click', () => {   // touch: a tap pins the person and their lines
        const on = !p.classList.contains('is-on');
        document.querySelectorAll('#team .person').forEach(o => o.classList.remove('is-on'));
        p.classList.toggle('is-on', on); mark(on);
      });
    });
  }

  /* ---------- Dosed blocks (Partnerships): one block in focus; its parts arrive one at a time ---------- */
  const doses = [...document.querySelectorAll('[data-dose]')];
  const pinDoses = () => !reduce && matchMedia('(min-width: 861px) and (min-height: 620px)').matches;
  const doseTick = () => {
    if (!doses.length) return;
    const pinned = pinDoses(), mid = innerHeight * .5;
    doses.forEach(d => {
      const r = d.getBoundingClientRect(), steps = d.querySelectorAll('[data-step]');
      d.classList.toggle('is-focus', reduce || (r.top < mid + 40 && r.bottom > mid - 40));
      if (reduce) { steps.forEach(s => s.classList.add('is-shown')); return; }
      if (pinned) {
        // pinned for (n × 32svh): step k shows once the scroll is k / n of the way through 80% of it
        const n = +getComputedStyle(d).getPropertyValue('--n') || 1;
        const p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
        d.style.setProperty('--dp', p.toFixed(3));
        steps.forEach(s => s.classList.toggle('is-shown', r.top < innerHeight * .4 && +s.dataset.step <= Math.floor(p / .8 * n + .001)));
      } else {
        d.style.setProperty('--dp', 1);
        steps.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .78) s.classList.add('is-shown'); });
      }
    });
  };

  /* ---------- Scroll: progress, sweep, speed ---------- */
  const narrow = () => innerWidth < 768;
  let lastY = scrollY, lastT = performance.now(), vel = 0, raf = 0;
  const frame = now => {
    const y = scrollY, dt = Math.max(8, now - lastT);
    const dy = y - lastY, v = dy / dt;                             // px per ms
    lastY = y; lastT = now;
    vel += (v - vel) * .2;

    const max = document.documentElement.scrollHeight - innerHeight;
    lane.style.transform = `scaleX(${clamp(y / (max || 1), 0, 1).toFixed(4)})`;

    grunTick();
    doseTick();
    if (run) {
      const span = next.offsetTop - run.offsetTop - pin.offsetHeight;   // done before the next section arrives
      sweep = span > 0 ? clamp((y - run.offsetTop) / span, 0, 1) : 0;
      if (!reduce) paint();
    }

    // the dock tucks to its essentials while reading down, and comes back on any scroll up, at the top and at the end
    if (dy > 6 && y > 160 && max - y > 120 && !dock.classList.contains('is-open') && !dock.matches(':hover, :focus-within')) dock.classList.add('is-tucked');
    else if (dy < -6 || y <= 160 || max - y <= 120) dock.classList.remove('is-tucked');

    if (!reduce) {
      const g = narrow() ? .5 : 1;                                 // never past ±6° and ±8%, level at rest
      const sk = (clamp(-vel * 2.4, -6, 6) * g).toFixed(2) + 'deg', sx = (1 + clamp(Math.abs(vel) * .03, 0, .08) * g).toFixed(4), vx = (clamp(vel * 7, -14, 14) * g).toFixed(1) + 'px';
      speedTargets().forEach(n => { n.style.setProperty('--sk', sk); n.style.setProperty('--sx', sx); n.style.setProperty('--vx', vx); });
    }
    raf = Math.abs(vel) > .004 || Math.abs(v) > .001 ? requestAnimationFrame(frame) : (settle(), 0);
  };
  const settle = () => { vel = 0; speedTargets().forEach(n => ['--sk', '--sx', '--vx'].forEach(k => n.style.removeProperty(k))); };
  const wake = () => { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); } };   // lastY is kept: a jump still reads as a direction
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { paint(); doseTick(); wake(); });
  frame(performance.now());
})();
