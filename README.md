# AIM Labs — website

Static site for AIM Labs, the research and innovation division of AIM World.
This branch (`iteration-2-motion`) is iteration 2, "Move the Line": one page per part of the site, with the navigation docked at the bottom. Iteration 1 (one long page) is on `main` and tag `iteration-1`.

Run locally:

```bash
python3 -m http.server 5180
```

then open http://127.0.0.1:5180.

The pages are built from sources. After editing anything in `src/`, rebuild:

```bash
python3 tools/build.py
```

- `src/sections/*.html` — one file per section; `src/head.html`, `src/footer.html` — shared parts
- `tools/build.py` — page list, bottom navigation (dock) and the "next leg" link; writes `index.html`, `research.html`, `technology.html`, `validation.html`, `partnerships.html`, `insights.html`, `about.html`, `partner.html`
- `styles.css` — base styles; `motion.css` — iteration 2 design
- `motion.js` — hero, dock, section scenes, dosed blocks, standards; `main.js` — project passport, fit check, route finder, notes filter
- `assets/video/` — footage from the AIM film and per-frame model output (JSON)
- `tools/` — scripts that make the footage and model data (see `tools/README.md`)

Figures, portfolio projects, partners, portraits and notes are placeholders and are labelled as such on the page.
