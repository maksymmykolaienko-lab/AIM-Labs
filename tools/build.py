"""Build the static pages of iteration 2 from src/.

    python3 tools/build.py

Sections live in src/sections/*.html, the shared head and footer in src/.
The bottom navigation (dock) and the "next leg" link at the end of each
page are generated here. Edit the sources, not the generated *.html files
in the project root.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
V = '5'   # bump to bust browser caches after CSS/JS changes

# file, dock label, number, <title>, description, sections, line used when another page hands over to this one
PAGES = [
    ('index.html', 'Home', '', 'AIM Labs — Innovation built for football',
     'AIM Labs is the research and innovation division of AIM World, exploring, validating and translating research into practical football intelligence.',
     ['hero', 'glance', 'why', 'lanes-index'], ''),
    ('research.html', 'Research', '01', 'Research & Innovation — AIM Labs',
     'Research grounded in the game: eight areas, each starting with a football question and labelled with the status of the work.',
     ['research'], 'Every area starts with a football question.'),
    ('technology.html', 'Technology', '02', 'Technology & Intelligence — AIM Labs',
     'Intelligence behind the game: one clip, six stages, and the last hand is human.',
     ['technology'], 'One clip, six hands. The last one is human.'),
    ('validation.html', 'Validation', '03', 'From research to application — AIM Labs',
     'Explore. Test. Validate. Apply. Eight validation gates, and most projects stop on evidence.',
     ['validation'], 'Eight gates. Most projects stop, on evidence.'),
    ('partnerships.html', 'Partnerships', '04', 'Proof & Partnerships — AIM Labs',
     'Evidence before scale: claims beside the evidence that supports them, and technology extended selectively.',
     ['partnerships'], 'Claims beside their evidence.'),
    ('insights.html', 'Insights', '05', 'Insights — AIM Labs',
     'Better questions, better intelligence: research notes, explainers and project learning.',
     ['insights'], 'The training log: what the work is teaching us.'),
    ('about.html', 'About', '06', 'People & Standards — AIM Labs',
     'Innovation with responsibility: six principles that never move, and the people behind the work.',
     ['about'], 'Six lines that never move.'),
    ('partner.html', 'Partner', '', 'Partner with AIM Labs',
     'From possibility to proof: six routes to working with AIM Labs, and exactly what to bring.',
     ['partner'], 'From possibility to proof.'),
]
TITLES = {
    'research.html': 'Research &amp; Innovation', 'technology.html': 'Technology &amp; Intelligence',
    'validation.html': 'Validation', 'partnerships.html': 'Proof &amp; Partnerships', 'insights.html': 'Insights',
    'about.html': 'People &amp; Standards', 'partner.html': 'Partner with AIM Labs', 'index.html': 'Back to the start',
}
PRELOAD = ('<link rel="preload" as="image" href="assets/video/run.jpg" media="(min-aspect-ratio: 1/1)">\n'
           '<link rel="preload" as="image" href="assets/video/run-m.jpg" media="(max-aspect-ratio: 1/1)">\n')


def dock(cur):
    items = []
    for f, label, n, *_ in PAGES:
        if not n:
            continue
        li = ' class="is-cur"' if f == cur else ''
        ac = ' aria-current="page"' if f == cur else ''
        items.append(f'<li{li}><a href="{f}"{ac}><span class="mono">{n}</span>{label}</a></li>')
    now = next(((n, label) for f, label, n, *_ in PAGES if f == cur and n), ('', 'Pages'))
    home = ' aria-current="page"' if cur == 'index.html' else ''
    cta = ' aria-current="page"' if cur == 'partner.html' else ''
    return (
        '<nav class="dock" id="dock" aria-label="Site">\n'
        '  <div class="dock__bar">\n'
        f'    <a class="dock__home" href="index.html"{home} aria-label="AIM Labs home"><svg class="logo__mark" aria-hidden="true"><use href="#aim-mark"/></svg><span class="dock__word">AIM <b>Labs</b></span></a>\n'
        f'    <button class="dock__now" id="dock-now" aria-expanded="false" aria-controls="dock-list"><span class="mono">{now[0]}</span>{now[1]}<i aria-hidden="true"></i></button>\n'
        f'    <ol class="dock__list" id="dock-list">{"".join(items)}</ol>\n'
        f'    <a class="dock__cta" href="partner.html"{cta}>Partner</a>\n'
        '  </div>\n'
        '  <i class="dock__lane" aria-hidden="true"><i id="lane"></i></i>\n'
        '</nav>\n'
    )


def nextleg(f):
    if f == 'index.html':
        return ''
    order = [p[0] for p in PAGES if p[0] != 'index.html']
    k = order.index(f)
    nf = order[k + 1] if k + 1 < len(order) else 'index.html'
    n = next(p for p in PAGES if p[0] == nf)
    label = f'Next leg · {n[2]}' if n[2] else ('Last leg' if nf == 'partner.html' else 'Finish')
    line = n[6] if nf != 'index.html' else 'Innovation built for football. Intelligence built to scale.'
    ink = ' nextleg--ink' if f == 'partner.html' else ''
    return (
        '<!-- ========== NEXT LEG — hand the baton to the next page ========== -->\n'
        f'<section class="nextleg{ink}" aria-label="Next page">\n'
        f'  <a class="wrap nextleg__go" href="{nf}">\n'
        f'    <span class="mono">{label}</span>\n'
        f'    <b>{TITLES[nf]} <i aria-hidden="true">→</i></b>\n'
        f'    <span class="nextleg__line">{line}</span>\n'
        '  </a>\n'
        '</section>\n'
    )


def first_heading_h1(html):
    """On inner pages the first section's h2 is the page's h1."""
    i = html.index('<h2 ')
    j = html.index('</h2>', i)
    return html[:i] + '<h1 ' + html[i + 4:j] + '</h1>' + html[j + 5:]


def build():
    head = (SRC / 'head.html').read_text()
    foot = (SRC / 'footer.html').read_text()
    for f, label, n, title, desc, secs, _ in PAGES:
        body = ''.join((SRC / 'sections' / f'{s}.html').read_text() + '\n' for s in secs)
        if f != 'index.html':
            body = first_heading_h1(body)
        h = (head.replace('{{title}}', title).replace('{{desc}}', desc)
             .replace('{{preload}}', PRELOAD if f == 'index.html' else '').replace('{{v}}', V))
        scripts = f'<script src="main.js?v={V}"></script>\n<script src="motion.js?v={V}"></script>\n'
        page = (f'{h}\n{dock(f)}\n<main id="main" class="page page--{f[:-5]}">\n\n{body}{nextleg(f)}\n</main>\n\n'
                f'{foot}\n{scripts}</body>\n</html>\n')
        (ROOT / f).write_text(page)
        print('built', f)


if __name__ == '__main__':
    build()
