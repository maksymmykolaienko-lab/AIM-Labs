/* AIM Labs — iteration 2 motion: the hero film, the moving line, speed-reactive type */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hdr = document.getElementById('hdr'), lane = document.getElementById('lane');
  const run = document.getElementById('hero'), pin = document.getElementById('run-pin');
  const film = document.getElementById('run-film'), video = document.getElementById('run-video');
  const flood = document.getElementById('run-flood'), next = run.nextElementSibling;
  const board = document.getElementById('glance'), chase = document.getElementById('chase');

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
  let intro = reduce ? 1 : 0, sweep = 0, topL = 100, topR = 0;

  const paint = () => {
    const kvw = .1063 * pin.offsetHeight / innerWidth * 100;      // the lean, in vw
    const right = PR + (100 + kvw + 2 - PR) * clamp(sweep / .62, 0, 1);
    const left = PL + (-kvw - 2 - PL) * clamp((sweep - .12) / .78, 0, 1);
    const start = PL + .4;                                         // today's line starts on yesterday's
    set('--pr', (start + (right - start) * intro).toFixed(2));
    set('--pl', left.toFixed(2));
    if (MA < 100) { const m = sweep * 240; set('--ma', (MA + m).toFixed(1) + '%'); set('--mb', (MB + m).toFixed(1) + '%'); }
    topL = left + kvw; topR = right + kvw;                         // where the gap meets the header
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

  /* ---------- Section headings: in once on the diagonal; only those on screen react to speed ---------- */
  const seen = new Set([pin]);
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
    const draw = () => {
      if (!G || !W) return;
      const r = chase.getBoundingClientRect();
      const p = reduce ? .3 : clamp(-r.top / Math.max(1, r.height - innerHeight - innerWidth * .1051), 0, 1);   // done before 04 arrives
      const narrowFilm = portrait(), i = frameAt(), { s, ox, oy } = place(i);
      const far = narrowFilm ? -.012 : -.02, near = narrowFilm ? -.1 : -.2;
      const dx = far + (near - far) * ss(.06, .9, p);        // starts level with the player, then falls behind: the line moves
      const g = G.good[(Math.floor(i / G.n * G.good.length) + LAG) % G.good.length];
      const X = x => ox + x * VW * s, Y = y => oy + y * VH * s;
      film.style.transform = narrowFilm ? `translate(${ox.toFixed(1)}px, -9%)` : '';

      ctx.clearRect(0, 0, W, H);
      const px = G.c[i][0], foot = G.b[i], head = G.t[i];
      const shiftX = px - G.c[g][0] + dx, shiftY = foot - G.b[g], poly = G.p[g];
      ctx.beginPath();
      for (let k = 0; k < poly.length; k += 2) { const x = X(poly[k] + shiftX), y = Y(poly[k + 1] + shiftY); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath();
      ctx.fillStyle = 'rgba(143,179,255,.42)'; ctx.fill();
      ctx.strokeStyle = GHOST; ctx.lineWidth = 1.5; ctx.stroke();

      // the gap, on the ground between them
      const stepsTop = steps[0].parentNode.getBoundingClientRect().top - pin2.getBoundingClientRect().top;
      const yb = Math.min(Y(foot) + 12, stepsTop - 14), xa = X(px), xb = X(px + dx);
      ctx.fillStyle = GREEN;
      ctx.fillRect(Math.min(xa, xb), yb, Math.abs(xb - xa), 4);
      const wide = Math.abs(xb - xa) > 130;
      if (wide) tag('The line moved', (xa + xb) / 2, yb - 6, GREEN, INK);
      const ty = Y(head) - 14;
      tag('Today', xa, ty, GREEN, INK);
      if (Math.abs(xb - xa) > 84) tag('Your last run', xb, ty, GHOST, INK);

      const a = p < .34 ? 0 : p < .67 ? 1 : 2;
      steps.forEach((li, n) => li.classList.toggle('is-on', n === a));
    };
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
    const word = document.getElementById('relay-word'), read = document.getElementById('relay-read'), ctl = document.getElementById('relay-ctl');
    const baton = document.getElementById('relay-baton'), rail = document.getElementById('relay-legs');
    const legs = [...relay.querySelectorAll('.leg')], ctx = cv.getContext('2d');
    const NAMES = legs.map(b => b.querySelector('b').textContent);
    const GREEN = '#64FF35', BLUE = '#8FB3FF', RED = '#FF4255', INK = '#080B09', WHITE = '#F0F2E9';
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
      leg = i;
      legs.forEach((b, n) => { b.classList.toggle('is-on', n === i); b.setAttribute('aria-pressed', n === i); });
      baton.style.setProperty('--at', i);
      relay.classList.toggle('is-human', i === 5);
      word.textContent = NAMES[i]; word.classList.remove('is-swap'); void word.offsetWidth; word.classList.add('is-swap');
      if (innerWidth <= 1024) rail.scrollTo({ left: legs[i].parentNode.offsetLeft - legs[0].parentNode.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
    };
    const label = () => { ctl.textContent = running ? 'Pause' : leg === 5 ? 'Run it again' : 'Resume'; };
    const stop = () => { running = false; clearTimeout(timer); label(); };
    const next = () => {
      clearTimeout(timer);
      if (!running) return;
      timer = setTimeout(() => {
        if (leg >= 5) { stop(); return; }
        select(leg + 1); if (leg === 5) stop(); else next();
      }, HOLD);
    };
    const start = () => { running = true; label(); next(); };
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
          ctx.strokeStyle = BLUE; ctx.lineWidth = 2; ctx.setLineDash([2, 5]); ctx.beginPath(); t.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(foot[0], foot[1], 3.5, 0, 7); ctx.fill();
          const n = short(id), w = ctx.measureText(n).width + 8;
          ctx.fillStyle = 'rgba(8,11,9,.85)'; ctx.fillRect(foot[0] - w / 2, foot[1] + 6, w, 14); ctx.fillStyle = BLUE; ctx.fillText(n, foot[0] - w / 2 + 4, foot[1] + 17);
        }
        if (leg === 4 && id === D.held[fi]) {
          ctx.strokeStyle = GREEN; ctx.lineWidth = 2.6; ctx.strokeRect(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6);
          const t = `${short(id)} · ON THE BALL`, w = ctx.measureText(t).width + 10;
          ctx.fillStyle = GREEN; ctx.fillRect(x0 - 3, y0 - 20, w, 15); ctx.fillStyle = INK; ctx.fillText(t, x0 + 2, y0 - 9);
        }
      }
      if (f.b && (leg === 1 || leg === 4)) {
        const bx = X(f.b[0]), by = Y(f.b[1]), r = Math.max(7, f.b[2] * D.w * s / 2 + 3);
        ctx.strokeStyle = WHITE; ctx.lineWidth = 1.5; ctx.strokeRect(bx - r, by - r, r * 2, r * 2);
      }
      lastF = fi;
      const done = D.events.filter(e => e[0] <= fi).length, n = Math.max(1, f.p.length);
      read.textContent = [`Frame ${String(fi).padStart(3, '0')}`, `${f.p.length} players · confidence ${(conf / n).toFixed(2)}`, `${joints} bones this frame`, `${trails.size} IDs held`, `${done} of ${D.events.length} possession changes`, '1 suggestion'][leg];
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

  /* ---------- Scroll: progress, sweep, speed ---------- */
  const narrow = () => innerWidth < 768;
  let lastY = scrollY, lastT = performance.now(), vel = 0, raf = 0;
  const frame = now => {
    const y = scrollY, dt = Math.max(8, now - lastT);
    const v = (y - lastY) / dt;                                    // px per ms
    lastY = y; lastT = now;
    vel += (v - vel) * .2;

    const max = document.documentElement.scrollHeight - innerHeight;
    lane.style.transform = `scaleX(${clamp(y / (max || 1), 0, 1).toFixed(4)})`;

    const span = next.offsetTop - run.offsetTop - pin.offsetHeight;   // done before the next section arrives
    sweep = span > 0 ? clamp((y - run.offsetTop) / span, 0, 1) : 0;
    if (!reduce) paint();

    // the header sits on green from the flood to the end of the board
    const cut = innerWidth * .1051, end = board.offsetTop + board.offsetHeight - cut - 40;
    const chaseEnd = chase ? chase.offsetTop + chase.parentNode.offsetTop + chase.offsetHeight - cut - 60 : 0;
    const past = y >= end, onBoard = y >= run.offsetTop + run.offsetHeight - 40 && !past;
    hdr.classList.toggle('on-l', !past && (onBoard || (!reduce && topL < 9)));
    hdr.classList.toggle('on-r', !past && (onBoard || (!reduce && topR > 92)));
    hdr.classList.toggle('is-past', past && y >= chaseEnd);

    if (!reduce) {
      const g = narrow() ? .5 : 1;                                 // never past ±6° and ±8%, level at rest
      const sk = (clamp(-vel * 2.4, -6, 6) * g).toFixed(2) + 'deg', sx = (1 + clamp(Math.abs(vel) * .03, 0, .08) * g).toFixed(4), vx = (clamp(vel * 7, -14, 14) * g).toFixed(1) + 'px';
      speedTargets().forEach(n => { n.style.setProperty('--sk', sk); n.style.setProperty('--sx', sx); n.style.setProperty('--vx', vx); });
    }
    raf = Math.abs(vel) > .004 || Math.abs(v) > .001 ? requestAnimationFrame(frame) : (settle(), 0);
  };
  const settle = () => { vel = 0; speedTargets().forEach(n => ['--sk', '--sx', '--vx'].forEach(k => n.style.removeProperty(k))); };
  const wake = () => { if (!raf) { lastT = performance.now(); lastY = scrollY; raf = requestAnimationFrame(frame); } };
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { paint(); wake(); });
  frame(performance.now());
})();
