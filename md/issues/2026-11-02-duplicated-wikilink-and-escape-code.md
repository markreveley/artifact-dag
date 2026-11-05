# Four wikilink patterns and five HTML escapers

| | |
|---|---|
| Found by | [the second audit](../audits/2026-11-02-second-adversarial-audit.md), at `35661d4` |
| Rechecked | 2026-11-05 at `67f437c`: still open; the directory walker, found copied in the same reading, was shared in `236b047` |
| Tracker | not filed |

1. **Wikilink patterns.** *Expected:* one pattern, so every tool agrees on
   what a link and its label are. *Observed:* `src/parse.js:17`,
   `src/markdown.js:15`, `src/facts.js:15` and `bin/dag-to-glossary.js:86`
   each have their own. The glossary's requires a non-empty label
   (`[^\]]+`) where the parser's and the viewer's accept an empty one, so
   `[[def:x|]]` is a link with an empty label to the parser and the viewer
   and not a link at all to the glossary. *Status:* open.
2. **HTML escapers.** *Expected:* one. *Observed:* `src/markdown.js:6`
   (`escapeHtml`), three copies of `esc` in `viewer/template.html` (lines
   230, 386, 434) and `bin/build-viewer.js:57`, which leaves `"` unescaped
   (safe where it is used, as text in the page's `<title>` and `<h1>`, never in an attribute). *Status:* open.
