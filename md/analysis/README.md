# analysis/

- [2026-11-03-understand-anything-comparison](2026-11-03-understand-anything-comparison/understand-anything-comparison.md): Understand-Anything against this repo; what to borrow (fingerprinting) and what not.
- [2026-11-03-claims-to-code-gradient](2026-11-03-claims-to-code-gradient/claims-to-code-gradient.md): the five levels of evidence a claim can carry, and the code graph as addressing layer.
- [2026-11-04-graphify-as-code-graph](2026-11-04-graphify-as-code-graph/graphify-as-code-graph.md): Graphify fits, but records start lines only, so no anchor hash.
- [2026-11-04-code-graph-alternatives](2026-11-04-code-graph-alternatives/code-graph-alternatives.md): anchors on universal-ctags, references deferred; became ARCHITECTURE D1.
- [2026-11-04-governance-as-dag](2026-11-04-governance-as-dag/governance-as-dag.md): governance as `norm` and `observation` claims; its plan is in `../plans/`.

A survey that an analysis rests on is in `../research/`.

---

<!-- pinned from repo-template md/analysis/README.md @ 120a4bd; refresh from the template, do not edit by hand -->
## About this folder (repo-template `120a4bd`)

Dated findings and recommendations: what was looked at, what was found, what
to do about it. An analysis is a record of a reading at a date; it is not
updated afterwards except to fix an error, and a later reading is a new
analysis that links to it.

**Belongs here:** a comparison of options or tools, a reading of a source
against the repo's own position, the result of an audit or experiment, a
research report.

**Does not:** open questions (they go in `next-operator.md` or a plan),
steps to take (a plan, linked from the analysis's recommendations), a rule
the analysis argues for (once adopted, `governance/POLICY.md`, citing the
analysis).

**Names:** `YYYY-MM-DD-<slug>/<slug>.md`. The folder holds the analysis's
material: data, scripts, excerpts.

**Form:** a header block before the first section, then numbered sections,
the first of them the short answer:

```
# <title>

**Date:** YYYY-MM-DD

**Question.** <what was asked, and why>

**Sources read.** <what was read, by path or link; what was not read and why>

**Method caveat.** <what the reading could not check: fetched through a summariser, figures as of a date, claims taken from the source itself>

---

## 1. The short answer
```
