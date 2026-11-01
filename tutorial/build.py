#!/usr/bin/env python3
"""Build the web edition of a tutorial from its Markdown source.

Run:    python3 build.py --config <tutorial web dir>/config.json
        (requires the `markdown` package: pip install markdown)

The config file sits in the tutorial's web directory, which is both input and
output. Paths in it are relative to that directory.

Input:  the tutorial's source text (config "source")
        content/figures.json     where each figure goes: page, anchor phrase, kind, name, caption
        content/examples/*.md    code examples (first line = title, then markdown)
        assets/diagrams/*.svg    static diagrams, inlined
        assets/widgets/*.js      interactives, loaded as classic scripts
Shared: this directory's assets/ (runtime, styles, crypto bundle) and widgets/
        (config "shared_widgets") are copied into the tutorial's assets/ first.
Output: one HTML page per entry in config "pages".

Config keys:
  source, source_label      the Markdown source, and how the footer names it
  builder_label             how the footer names the builder
  brand_long, brand_short   the top bar's brand
  site_title                appended to every page title
  kicker                    shown above the title on the start page
  pages                     [id, title, start heading prefix, end heading prefix]; "index" first
  nav                       [id, label] for the top bar
  index                     {"about", "contents", "first_part"}: headings the start page is cut from
  title_strip               strings removed from the source's "# " title on the start page
  strip                     regular expressions (dot matches newline) removed from every part page
  shared_widgets            names of widgets in this directory's widgets/ that the tutorial uses
"""
import argparse, json, re, html, pathlib, datetime, shutil
import markdown

HERE = pathlib.Path(__file__).resolve().parent

ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("--config", required=True, help="path to the tutorial's web config.json")
args = ap.parse_args()

CONFIG_PATH = pathlib.Path(args.config).resolve()
ROOT = CONFIG_PATH.parent
CFG = json.loads(CONFIG_PATH.read_text())
MD = (ROOT / CFG["source"]).read_text()
FIGS = json.loads((ROOT / "content" / "figures.json").read_text())
PAGES = [tuple(p) for p in CFG["pages"]]
NAV = [tuple(n) for n in CFG["nav"]]
PAGE_IDS = {p[0] for p in PAGES}
PART_NUMS = sorted(int(m.group(1)) for p in PAGE_IDS for m in [re.fullmatch(r"part(\d+)", p)] if m)
FONTS = CFG.get("fonts", "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap")

# --- shared assets ----------------------------------------------------------------
def copy_if_changed(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists() or dst.read_bytes() != src.read_bytes():
        shutil.copyfile(src, dst)
        print("copied", dst.relative_to(ROOT))

for name in ("style.css", "site.js", "ikcrypto.js"):
    copy_if_changed(HERE / "assets" / name, ROOT / "assets" / name)
for name in CFG.get("shared_widgets", []):
    copy_if_changed(HERE / "widgets" / f"{name}.js", ROOT / "assets" / "widgets" / f"{name}.js")

lines = MD.split("\n")

def find_line(prefix):
    for i, l in enumerate(lines):
        if l.startswith(prefix):
            return i
    raise SystemExit(f"heading not found: {prefix}")

def slice_md(start, end):
    s = find_line(start)
    e = find_line(end) if end else len(lines)
    return "\n".join(lines[s:e])

def heading_id(plain):
    mm = re.match(r"(\d+)\. ", plain)
    if mm: return f"s{mm.group(1)}"
    return re.sub(r"[^a-z0-9]+", "-", plain.lower()).strip("-")

def md_slug(h):
    # the anchor slug dag-to-glossary writes: lower case, letters, digits, spaces, "_" and "-" kept, spaces to "-"
    return re.sub(r"[^\w _-]", "", h.lower()).replace(" ", "-")

# section number -> page, and unnumbered ### heading text -> (page, id), for links;
# MD_ANCHOR maps a heading's Markdown slug (as glossaries link it) to its page and id
SECTION_PAGE, NAMED_HEADING, MD_ANCHOR = {}, {}, {}
for pid, _, start, end in PAGES:
    if not start: continue
    text = slice_md(start, end)
    for m in re.finditer(r"^### ((\d+)\. .+)$", text, re.M):
        SECTION_PAGE[int(m.group(2))] = pid
        MD_ANCHOR[md_slug(m.group(1).strip())] = f"{pid}.html#s{m.group(2)}"
    for m in re.finditer(r"^### (?!\d+\. )(.+)$", text, re.M):
        plain = re.sub(r"[`*_]", "", m.group(1)).strip()
        NAMED_HEADING[plain] = (pid, heading_id(plain))
        MD_ANCHOR[md_slug(m.group(1).strip())] = f"{pid}.html#{heading_id(plain)}"

# --- figures -------------------------------------------------------------------
def example_html(name):
    p = ROOT / "content" / "examples" / f"{name}.md"
    text = p.read_text().split("\n", 1)
    title, body = text[0].strip(), text[1] if len(text) > 1 else ""
    inner = markdown.markdown(body, extensions=["fenced_code"])
    inner = inner.replace("<p>", '<p class="ik-note" style="padding:0.5rem 1rem 0.75rem">')
    return f'<div class="ex-title">{html.escape(title)}</div>{inner}'

def figure_html(fig, idx):
    kind, name, cap = fig["kind"], fig["name"], fig["caption"]
    cap_html = markdown.markdown(cap).replace("<p>", "").replace("</p>", "")
    fid = f"fig-{name}"
    if kind == "widget":
        opts = html.escape(json.dumps(fig.get("opts", {})), quote=True)
        body = '<div class="ik-body"></div>'
        attrs = f' data-widget="{name}" data-opts="{opts}"'
        cls = "is-widget"
    elif kind == "diagram":
        svg = (ROOT / "assets" / "diagrams" / f"{name}.svg").read_text()
        svg = re.sub(r"<\?xml[^>]*\?>\s*", "", svg)
        body = f'<div class="ik-body"><div class="diagram-scroll">{svg}</div></div>'
        attrs = ""
        cls = "is-diagram"
    elif kind == "example":
        body = f'<div class="ik-body">{example_html(name)}</div>'
        attrs = ""
        cls = "is-example"
    else:
        raise SystemExit(f"unknown figure kind {kind}")
    return f'<figure class="ik-figure {cls}" id="{fid}"{attrs}>{body}<figcaption>{cap_html}</figcaption></figure>'

def place_figures(md_text, page_id):
    """Insert <!--FIG:i--> placeholders after the block containing each anchor."""
    blocks = md_text.split("\n\n")
    for i, fig in enumerate(FIGS):
        if fig["page"] != page_id: continue
        hits = [bi for bi, b in enumerate(blocks) if fig["after"] in b]
        if len(hits) != 1:
            raise SystemExit(f"anchor for {fig['name']} matched {len(hits)} blocks")
        bi = hits[0]
        # an anchor inside a list (an item or its continuation paragraph): place the figure after the whole list
        is_list = lambda b: bool(re.match(r'^(\d+\.|[-*+]) |^    \S', b))
        if is_list(blocks[bi]):
            while bi + 1 < len(blocks) and is_list(blocks[bi + 1]):
                bi += 1
        blocks[bi] = blocks[bi] + f"\n\n<!--FIG:{i}-->"
    return "\n\n".join(blocks)

# --- markdown -> html, then post-processing --------------------------------------
def convert(md_text):
    h = markdown.markdown(md_text, extensions=["tables", "fenced_code", "sane_lists"])
    # heading ids: "### 12. Title" -> id="s12"; other h2/h3 -> slug
    def hid(m):
        tag, inner = m.group(1), m.group(2)
        plain = re.sub(r"<[^>]+>", "", inner)
        return f'<{tag} id="{heading_id(plain)}">{inner}</{tag}>'
    h = re.sub(r"<(h[23])>(.*?)</\1>", hid, h)
    # h4 (glossary entries under letter headings): the slug dag-to-glossary links to
    h = re.sub(r"<h4>(.*?)</h4>", lambda m: f'<h4 id="{md_slug(re.sub(r"<[^>]+>", "", m.group(1)))}">{m.group(1)}</h4>', h)
    # in-page links to a numbered section ("#12-each-node-owns-a-24") go to that section's page
    h = re.sub(r'href="#([^"]+)"', lambda m: f'href="{MD_ANCHOR[m.group(1)]}"' if m.group(1) in MD_ANCHOR else m.group(0), h)
    # tables scroll inside a wrapper
    h = h.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
    # cross-references: "section 12" -> link; "Part 3" -> page link (outside tags/code/headings)
    out, i = [], 0
    for m in re.finditer(r"<(h[1-4]|code|pre|a)\b.*?</\1>|<[^>]+>", h, re.S):
        out.append(xref(h[i:m.start()])); out.append(m.group(0)); i = m.end()
    out.append(xref(h[i:]))
    return "".join(out)

PART_RE = re.compile(r"\bPart (" + "|".join(str(n) for n in PART_NUMS) + r")\b(?!\.)") if PART_NUMS else None

def xref(text):
    def sec(m):
        n = int(m.group(2)); pg = SECTION_PAGE.get(n)
        if not pg: return m.group(0)
        return f'<a class="xref" href="{pg}.html#s{n}">{m.group(1)} {n}</a>'
    text = re.sub(r"\b([Ss]ections?) (\d+)", sec, text)
    if PART_RE:
        text = PART_RE.sub(lambda m: f'<a class="xref" href="part{m.group(1)}.html">Part {m.group(1)}</a>', text)
    return text

def fill_figures(h):
    return re.sub(r"<!--FIG:(\d+)-->", lambda m: figure_html(FIGS[int(m.group(1))], int(m.group(1))), h)

# --- page template --------------------------------------------------------------
def nav_html(current):
    return "".join(
        f'<a href="{pid}.html"' + (' aria-current="page"' if pid == current else "") + f">{html.escape(label)}</a>"
        for pid, label in NAV)

def pager_html(idx):
    prev = PAGES[idx - 1] if idx > 0 else None
    nxt = PAGES[idx + 1] if idx + 1 < len(PAGES) else None
    parts = []
    if prev: parts.append(f'<a class="prev" href="{prev[0]}.html"><small>Previous</small>{html.escape(prev[1])}</a>')
    if nxt: parts.append(f'<a class="next" href="{nxt[0]}.html"><small>Next</small>{html.escape(nxt[1])}</a>')
    return f'<nav class="pager">{"".join(parts)}</nav>'

WIDGET_SCRIPTS = sorted(p.name for p in (ROOT / "assets" / "widgets").glob("*.js"))

def page(pid, title, body, idx):
    scripts = "".join(f'<script src="assets/widgets/{n}"></script>' for n in WIDGET_SCRIPTS)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(title)} · {html.escape(CFG["site_title"])}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="topbar"><div class="topbar-inner"><a class="brand" href="index.html"><span class="brand-long">{html.escape(CFG["brand_long"])}</span><span class="brand-short">{html.escape(CFG["brand_short"])}</span></a><nav aria-label="Parts">{nav_html(pid)}</nav></div></header>
<div class="page">
<main class="prose">
{body}
{pager_html(idx)}
<footer class="site-footer"><p class="ik-note">Generated from <code>{html.escape(CFG["source_label"])}</code> on {datetime.date.today().strftime('%-d %b %Y')} by <code>{html.escape(CFG["builder_label"])}</code>. Interactives run entirely in your browser; nothing is sent anywhere.</p></footer>
</main>
<aside class="rail" aria-label="On this page"><h2>On this page</h2><ol></ol></aside>
</div>
<script src="assets/ikcrypto.js"></script>
{scripts}
<script src="assets/site.js"></script>
</body>
</html>
"""

# --- build each page ------------------------------------------------------------
def build_index():
    ix = CFG["index"]
    about = slice_md(ix["about"], ix["contents"])
    contents = slice_md(ix["contents"], ix["first_part"])
    # title + lead from the top of the file
    head = "\n".join(lines[:find_line(ix["about"])])
    title = next(l for l in head.split("\n") if l.startswith("# "))[2:]
    for s in CFG.get("title_strip", []):
        title = title.replace(s, "")
    h = f'<p class="kicker">{html.escape(CFG["kicker"])}</p><h1>{html.escape(title)}</h1>'
    h += convert(about)
    # contents: numbered items and unnumbered section headings become links, part headers page links;
    # sections and parts not yet in the edition stay plain text
    c = contents
    def numbered(m):
        n = int(m.group(1))
        if n not in SECTION_PAGE: return m.group(0)
        return f"- [{m.group(1)}. {m.group(2)}]({SECTION_PAGE[n]}.html#s{m.group(1)})"
    c = re.sub(r"^- (\d+)\\\. (.+)$", numbered, c, flags=re.M)
    def named(m):
        hit = NAMED_HEADING.get(m.group(1).strip())
        if not hit: return m.group(0)
        return f"- [{m.group(1)}]({hit[0]}.html#{hit[1]})"
    c = re.sub(r"^- (?!\[)(?!\d+\\\. )(.+)$", named, c, flags=re.M)
    def part(m):
        if f"part{m.group(1)}" not in PAGE_IDS: return m.group(0)
        return f"**[Part {m.group(1)}. {m.group(2)}](part{m.group(1)}.html)** {m.group(3)}"
    c = re.sub(r"^\*\*Part (\d)\. (.+?)\*\* (\(.+\))$", part, c, flags=re.M)
    c = c.replace("Glossary · Sources", "[Glossary](glossary.html#glossary) · [Sources](glossary.html#sources)")
    h += convert(c)
    h += f'<p class="ik-note">This edition is generated from the tutorial source, {html.escape(CFG["source_label"])} ({len(MD.split())} words). {len([f for f in FIGS if f["kind"]=="widget"])} interactives, {len([f for f in FIGS if f["kind"]=="diagram"])} diagrams, {len([f for f in FIGS if f["kind"]=="example"])} code examples.</p>'
    return h

for idx, (pid, title, start, end) in enumerate(PAGES):
    if pid == "index":
        body = build_index()
    else:
        md_text = slice_md(start, end)
        md_text = place_figures(md_text, pid)
        for pattern in CFG.get("strip", []):
            md_text = re.sub(pattern, "", md_text, flags=re.S)
        body = fill_figures(convert(md_text))
        # promote the Part heading to h1 with a kicker
        body = re.sub(r'<h2 id="([^"]+)">Part (\d)\. (.*?)</h2>', r'<p class="kicker">Part \2</p><h1 id="\1">\3</h1>', body, count=1)
        body = re.sub(r'<h2 id="glossary">(.*?)</h2>', r'<h1 id="glossary">\1</h1>', body, count=1)
    (ROOT / f"{pid}.html").write_text(page(pid, title, body, idx))
    print("wrote", f"{pid}.html", len(body), "chars")

print(f"{len(FIGS)} figures in map; pages built.")
