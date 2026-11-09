/* AIM Labs — foundation interactions (no dependencies) */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width: 640px)');
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  /* ---------- Funnel: every thread is a project; pick one to see its validation passport ---------- */
  // Illustrative portfolio. fate = last gate reached (1..4, 4 = applied); stop = validation step
  // where it stopped (index into the 8-step model), or -1 when applied.
  const PROJECTS = [
    ['Talent prediction from U10 data', 'Data & decision science', 'Can early data predict who will make it?', 1, 0, 'Stopped at the question. It cannot be answered responsibly for children — and the answer could close doors.', 'Shaped our under-18 data policy.'],
    ['Emotion from body language', 'Behavioural science', 'Can video read a player’s confidence?', 1, 1, 'Stopped at benchmark: no reliable ground truth, and the inference itself is one we should not make.', 'Added to the list of inferences we do not make.'],
    ['Fatigue from gait', 'Biomechanics', 'Does stride change show tiredness before a coach sees it?', 2, 2, 'Benchmarked well; real sessions showed too much noise from pitch and footwear. Findings fed the pose work.', 'Noise findings improved the pose model.'],
    ['Crowd noise and performance', 'Football intelligence', 'Does a loud crowd change youth decision-making?', 1, 1, 'Interesting, but no test design we trusted at grassroots level. Parked.', 'Logged as an open question for research partners.'],
    ['Pressing intensity index', 'Football intelligence', 'Can video measure how hard a team presses?', 3, 6, 'Validated and reviewed. Deployment deferred until coaches agree how it should be used.', 'Coach workshops on how to read the index.'],
    ['Boot type and turning', 'Biomechanics', 'Do boots change turning speed?', 1, 0, 'Out of scope: not a question AIM players or coaches asked for.', 'Sharpened the intake test: who asked for this?'],
    ['Small-sided game load', 'Data & decision science', 'How hard is a 4v4 compared with a match?', 2, 4, 'Held up in trials, failed robustness across age groups. Back to research.', 'Age-group gaps added to the benchmark plan.'],
    ['Pitch surface from video', 'Computer vision', 'Can video tell sand from grass from 3G?', 1, 1, 'Possible, but not useful enough to justify the work.', 'Detector reused for pitch calibration.'],
    ['Phone-video turn speed', 'Computer vision', 'Can phone video measure on-ball turning speed?', 4, -1, 'In use across AIM World, monitored. Low light remains a known limit.', 'Low-light failures feed the next model.'],
    ['Sleep from wearables', 'Data & decision science', 'Does sleep predict session quality?', 1, 0, 'Stopped: the data is not needed for the purpose. We use only what a defined question requires.', 'Reinforced the data-minimisation rule.'],
    ['Heading exposure counter', 'Computer vision', 'Can we count headers per session?', 2, 3, 'Specialists challenged the labels; agreement was too low to publish counts.', 'New labelling guide written with specialists.'],
    ['Weak-foot heatmaps', 'Football intelligence', 'Where do players avoid their weaker foot?', 1, 1, 'Detection of the touching foot was not reliable enough yet.', 'Foot-contact labels added to the dataset.'],
    ['Ball-mastery drill scoring', 'Product experimentation', 'Can a drill be scored automatically and fairly?', 3, 5, 'Works technically. Needs a coach-review step before a young player sees a score.', 'Coach-review step designed into the product.'],
    ['Throw-in distance', 'Computer vision', 'Can one camera measure throw-in distance?', 1, 1, 'Single-camera depth error was too high.', 'Opened a multi-camera research question.'],
    ['Goalkeeper reaction time', 'Biomechanics', 'Can video time a keeper’s first movement?', 1, 1, 'Frame rate on phones is too low for honest numbers.', 'Frame-rate minimum added to the capture guide.'],
    ['First-touch quality score', 'AI & machine learning', 'Can a model rate first touch like a coach does?', 2, 3, 'Coaches disagreed with the model more than with each other. Rebuilding the labels.', 'Labels rebuilt with a wider coach panel.'],
    ['Session review clips', 'Product experimentation', 'Does auto-clipping save coaches time?', 4, -1, 'Live in AIM World products after a 12-week academy pilot.', 'Real-world usage shapes the next version.'],
    ['Referee positioning', 'Football intelligence', 'Where should a grassroots referee stand?', 1, 0, 'Not AIM Labs’ question to answer. Shared with a partner instead.', 'Introduced a partner instead of new research.']
  ];
  const STAGES = ['', 'Stopped in Explore', 'Stopped in Validate', 'Stopped in Translate', 'Applied across AIM World'];
  if (document.getElementById('pp-run')) {
    const lanes = PROJECTS.length;

    // passport: a project runs the 8 validation gates; the stop gate drops a barrier and explains itself
    const $ = id => document.getElementById(id);
    const gates = [...document.querySelectorAll('#pp-gates .gate')], run = $('pp-run'), token = $('pp-token'), why = $('pp-why'), end = $('pp-end');
    const pick = $('pp-pick');
    const GROUPS = [[4, 'Applied'], [3, 'Stopped in Translate'], [2, 'Stopped in Validate'], [1, 'Stopped in Explore']];
    pick.innerHTML = GROUPS.map(([f, t]) => `<div class="pick__g pick__g--${f}"><p class="mono">${t} · ${PROJECTS.filter(p => p[3] === f).length}</p><div>${PROJECTS.map((p, i) => p[3] === f ? `<button class="pick__b" data-i="${i}">${p[0]}</button>` : '').join('')}</div></div>`).join('');
    // phones: choose the outcome first, then a project of that outcome
    pick.insertAdjacentHTML('afterbegin', `<div class="pick__tabs" role="tablist" aria-label="Outcome">${GROUPS.map(([f, t]) => `<button role="tab" class="pick__tab pick__tab--${f}" data-f="${f}"><b>${PROJECTS.filter(p => p[3] === f).length}</b><span>${t}</span></button>`).join('')}</div>`);
    const tabsF = [...pick.querySelectorAll('.pick__tab')], groupsF = [...pick.querySelectorAll('.pick__g')];
    const showGroup = f => {
      tabsF.forEach(t => t.setAttribute('aria-selected', +t.dataset.f === f));
      groupsF.forEach(g => g.classList.toggle('is-on', g.classList.contains('pick__g--' + f)));
    };
    tabsF.forEach(t => t.addEventListener('click', () => { const f = +t.dataset.f; showGroup(f); const first = PROJECTS.findIndex(p => p[3] === f); show(first); }));
    const pickBtns = [...pick.querySelectorAll('.pick__b')];
    let cur = 8, timers = [];
    const place = el => { const r = el.getBoundingClientRect(), R = run.getBoundingClientRect(); return [r.left + r.width / 2 - R.left, r.top + r.height / 2 - R.top]; };
    const dotOf = el => el.querySelector('.gate__dot, i') || el;
    // waiting = the token stops just short of the barrier instead of covering the gate
    const moveToken = (el, waiting) => {
      let [x, y] = place(dotOf(el));
      if (waiting) x -= narrow.matches ? 14 : 40;
      token.style.transform = `translate(${x}px, ${y}px)`;
    };
    const show = (i, animate = !reduce) => {
      cur = (i + lanes) % lanes;
      const [name, area, q, fate, stop, out, fedTxt] = PROJECTS[cur];
      timers.forEach(clearTimeout); timers = [];
      pickBtns.forEach(b => b.classList.toggle('is-sel', +b.dataset.i === cur));
      showGroup(fate);
      $('pp-i').textContent = `${String(cur + 1).padStart(2, '0')} / ${lanes}`;
      $('pp-area').textContent = area; $('pp-name').textContent = name; $('pp-q').textContent = q;
      const applied = stop === -1;
      const verdict = $('pp-verdict'); verdict.textContent = STAGES[fate]; verdict.className = 'verdict mono ' + (applied ? 'is-ok' : 'is-stop');
      $('pp-why-k').textContent = applied ? 'Why it shipped' : `Why it stopped · gate ${String(stop + 1).padStart(2, '0')}`;
      $('pp-out').textContent = out; $('pp-fed').textContent = fedTxt;
      const last = applied ? 7 : stop;
      // reset
      run.classList.remove('is-done', 'is-applied', 'is-stopped');
      gates.forEach(g => { g.className = 'gate'; });
      why.classList.remove('on'); $('pp-gate').textContent = '';
      token.classList.toggle('no-anim', !animate);
      moveToken(gates[0]);
      const finish = () => {
        run.classList.add('is-done', applied ? 'is-applied' : 'is-stopped');
        const target = applied ? end : gates[stop];
        if (!applied) gates[stop].classList.add('is-fail');
        else gates[7].classList.add('is-live');
        moveToken(target, !applied);
        // the explanation sits under its own gate (clamped inside the track)
        const [gx] = place(applied ? end : gates[stop]), w = why.offsetWidth, W = run.clientWidth;
        why.style.setProperty('--wx', Math.max(0, Math.min(W - w, gx - w / 2)) + 'px');
        why.style.setProperty('--ax', (gx - Math.max(0, Math.min(W - w, gx - w / 2))) + 'px');
        const gname = g => g.querySelector('b').textContent;
        $('pp-gate').textContent = applied ? `✓ All 8 gates passed · live in AIM World` : `✕ Stopped at gate ${String(stop + 1).padStart(2, '0')} · ${gname(gates[stop])}`;
        why.classList.add('on');
        gates.forEach((g, s) => { if (s > last) g.classList.add('is-out'); });
      };
      if (!animate) { gates.forEach((g, s) => { if (s < last || (applied && s < 7)) g.classList.add('is-pass'); }); finish(); return; }
      requestAnimationFrame(() => token.classList.remove('no-anim'));
      const STEP = 330;
      const passN = applied ? 7 : stop;
      for (let s2 = 0; s2 < passN; s2++) timers.push(setTimeout(() => { moveToken(gates[s2]); timers.push(setTimeout(() => gates[s2].classList.add('is-pass'), 180)); }, 120 + s2 * STEP));
      timers.push(setTimeout(finish, 120 + passN * STEP + 80));
    };
    const toRun = () => { const t = document.getElementById('pp-name').closest('.passport__title'); const r = t.getBoundingClientRect(); if (r.top < 40 || r.top > innerHeight * .55) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); };
    pickBtns.forEach(b => b.addEventListener('click', () => { show(+b.dataset.i); toRun(); }));
    $('pp-prev').addEventListener('click', () => show(cur - 1));
    $('pp-next').addEventListener('click', () => show(cur + 1));
    $('pp-replay').addEventListener('click', () => show(cur));
    addEventListener('resize', () => show(cur, false));
    show(cur, false);
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { show(4); o.disconnect(); } }, { threshold: .5 }).observe(run);
  }

  /* ---------- 07 Partnerships: fit check (illustrative examples) ---------- */
  const fit = document.getElementById('fitcheck');
  if (fit) {
    // x = position on the complementary (0) → direct competitor (1) line; m = models that fit
    const FIT = {
      wear: [.12, ['emb', 'joint'], 'Complementary · embed or co-develop', 'They own the hardware and the customers; AIM adds movement intelligence inside the device. Neither enters the other’s market.'],
      cast: [.2, ['lic'], 'Complementary · license', 'Scope-limited analysis for coverage of grassroots events. The broadcaster tells stories; AIM keeps the models.'],
      edu: [.24, ['co', 'lic'], 'Complementary · co-brand or license', 'Course content uses AIM tools with clear brand ownership. Coaches learn; AIM World gains reach.'],
      kit: [.3, ['joint'], 'Complementary · joint development', 'They bring distribution and product; Labs brings research and testing. Rights and data terms agreed up front.'],
      agency: [.9, [], 'Direct competitor · no deal', 'Representation is AIM Futures’ business. Licensing it AIM intelligence would strengthen a direct competitor.'],
      plat: [.94, [], 'Direct competitor · no deal', 'It serves the same academies as AIM World products. We would be helping it replicate what makes AIM different.']
    };
    const who = [...fit.querySelectorAll('.who button')], models = [...fit.querySelectorAll('.model')];
    const set = k => {
      const [x, m, v, why] = FIT[k];
      who.forEach(b => b.setAttribute('aria-checked', b.dataset.k === k));
      fit.classList.toggle('is-no', m.length === 0);
      document.getElementById('fit-dot').style.setProperty('--fx', (x * 100) + '%');
      document.getElementById('fit-verdict').textContent = (m.length ? '✓ ' : '✕ ') + v;
      document.getElementById('fit-why').textContent = why;
      models.forEach(el => el.classList.toggle('is-fit', m.includes(el.dataset.m)));
    };
    who.forEach(b => b.addEventListener('click', () => {
      set(b.dataset.k);
      const row = b.parentElement; if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: Math.max(0, row.scrollLeft + b.getBoundingClientRect().left - row.getBoundingClientRect().left - 16), behavior: reduce ? 'auto' : 'smooth' });
    }));
    set('wear');
  }

  /* ---------- Insights: filter + drag rail ---------- */
  const rail = document.getElementById('nb-rail');
  if (rail) {
    const notes = [...rail.querySelectorAll('.nb')], fbtn = [...document.querySelectorAll('.nbf button')];
    fbtn.forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.f;
      fbtn.forEach(x => x.setAttribute('aria-pressed', x === b));
      let n = 0; notes.forEach(c => { const show = f === 'all' || c.dataset.t === f; c.hidden = !show; if (show) n++; });
      // the first note of the selection leads, big
      notes.forEach(c => c.classList.remove('is-lead')); notes.find(c => !c.hidden)?.classList.add('is-lead');
      notes.forEach((c, k) => { c.classList.remove('is-in'); void c.offsetWidth; c.classList.add('is-in'); });
      document.getElementById('nb-count').textContent = `${n} note${n === 1 ? '' : 's'}`;
      rail.scrollTo({ left: 0 });
    }));
    const step = () => (notes.find(c => !c.hidden)?.offsetWidth || 320) + 16;
    document.getElementById('nb-prev').addEventListener('click', () => rail.scrollBy({ left: -step() }));
    document.getElementById('nb-next').addEventListener('click', () => rail.scrollBy({ left: step() }));
    let down = null, moved = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = [e.clientX, rail.scrollLeft]; moved = false; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down[0]; if (Math.abs(dx) > 4) { moved = true; rail.classList.add('is-drag'); } rail.scrollLeft = down[1] - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = null; setTimeout(() => rail.classList.remove('is-drag'), 0); });
    rail.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);
  }

  /* ---------- Partner: route finder ---------- */
  const rf = document.getElementById('rf');
  if (rf) {
    const R = JSON.parse(document.getElementById('rf-data').textContent);
    const tabs = [...rf.querySelectorAll('[role=tab]')], card = rf.querySelector('.rf__card');
    const CTA = ['Start a research conversation', 'Propose a collaboration', 'Ask about licensing', 'Plan a pilot', 'Talk to the research team', 'See open roles'];
    const meter = [...document.querySelectorAll('#rf-meter i')], ready = document.getElementById('rf-ready'), cta = document.getElementById('rf-cta');
    let cur = 0;
    // "Bring us" is a checklist: each ticked item fills one segment of the readiness bar
    const count = () => {
      const ticks = [...card.querySelectorAll('.rf__tick')], n = ticks.filter(t => t.getAttribute('aria-pressed') === 'true').length;
      meter.forEach((m, k) => m.classList.toggle('on', k < n));
      ready.textContent = n === ticks.length ? 'Ready to start' : `${n} of ${ticks.length} ready`;
      card.classList.toggle('is-ready', n === ticks.length);
      cta.textContent = (n === ticks.length ? 'Ready — ' : '') + CTA[cur];
    };
    const set = (i, anim) => {
      cur = i;
      tabs.forEach((t, k) => t.setAttribute('aria-selected', k === i));
      const fill = () => {
        const [, title, fit, bring, who] = R[i];
        document.getElementById('rf-who').textContent = who; document.getElementById('rf-t').textContent = title;
        document.getElementById('rf-fit').textContent = fit;
        document.getElementById('rf-big').innerHTML = tabs[i].querySelector('svg').outerHTML;
        document.getElementById('rf-bring').innerHTML = bring.map((x, k) => `<li style="--o:${k + 3}"><button type="button" class="rf__tick" aria-pressed="false"><i aria-hidden="true"></i>${x}</button></li>`).join('');
        count();
        card.classList.remove('is-swap', 'is-fresh');
        if (anim && !reduce) { void card.offsetWidth; card.classList.add('is-fresh'); }
      };
      if (anim && !reduce) { card.classList.add('is-swap'); setTimeout(fill, 220); } else fill();
    };
    card.addEventListener('click', e => {
      const t = e.target.closest('.rf__tick'); if (!t) return;
      t.setAttribute('aria-pressed', t.getAttribute('aria-pressed') !== 'true'); count();
    });
    tabs.forEach((t, i) => t.addEventListener('click', () => {
      set(i, true);
      const row = t.parentElement; if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: Math.max(0, row.scrollLeft + t.getBoundingClientRect().left - row.getBoundingClientRect().left - 16), behavior: reduce ? 'auto' : 'smooth' });
    }));
    set(0);
    if (!reduce) {   // the card's parts arrive in order the first time it comes into view
      card.classList.add('js-wait');
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { card.classList.remove('js-wait'); card.classList.add('is-fresh'); io.disconnect(); } }, { rootMargin: '0px 0px -20% 0px' });
      io.observe(card);
    }
  }

  /* ---------- Scroll reveal ---------- */
  if (!reduce) {
    const targets = document.querySelectorAll('.sec-head, .fact, .scale li, .lab__row, .stack, .funnel__cols li, .passport, .claim2, .fitcheck, .std, .person, .rf, .partner h2');
    const rio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        const t = e.target;
        t.classList.add('in'); rio.unobserve(t);
        // hand transitions back to the component once revealed
        setTimeout(() => { t.classList.remove('rv', 'in'); t.style.transitionDelay = ''; }, 1300);
      }
    }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(t => {
      const sib = [...t.parentElement.children].indexOf(t);
      t.classList.add('rv');
      t.style.transitionDelay = (Math.min(sib, 6) * 60) + 'ms';
      rio.observe(t);
    });
  }
})();
