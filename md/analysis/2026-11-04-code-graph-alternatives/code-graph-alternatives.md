# Code graph: the alternatives to Graphify

**Date:** 2026-11-04

**Question.** Is there a tool that should be considered over Graphify for the
code graph that claim anchors resolve against? Asked straight after
[graphify-as-code-graph](../2026-11-04-graphify-as-code-graph/graphify-as-code-graph.md),
which found Graphify records a symbol's start line only.

**Sources read.** The survey [code-graph-tools](../../research/2026-11-04-code-graph-tools/code-graph-tools.md), which holds the
candidates, the facts and their sources.

**Method caveat.** Nothing was installed or run; the survey's caveats
apply. The recommendation on ctags rests on its documented `end` field,
not yet tried here.

---

## 1. The short answer

- **Two tools beat Graphify on the one thing the anchor needs,** a full span
  per symbol: SCIP and universal-ctags.
- **The anchor hash needs only spans, so ctags is enough for it.** One small
  binary, over a hundred languages, an `end` line on every tag, no build of
  the project. Its ids are path, scope and name, so overloads collide; an
  anchor that matches two tags is reported for a person to look at.
- **References are a separate need, and nothing is required yet.** SCIP gives
  compiler-grade references and stable symbol ids, at the cost of an indexer
  per language and a project that builds. Graphify gives confidence-tagged
  references with no build. Choose when code-to-claims coverage or blast
  radius is scheduled, not before.
- **Graphify's Markdown cite resolver is the part with no substitute,** and
  it is small: a cite form plus a lookup in a symbol table. Written here in
  Node against ctags output, it removes the reason to run Graphify at all for
  claim-to-code edges.

## 2. The candidates

The survey ([code-graph-tools](../../research/2026-11-04-code-graph-tools/code-graph-tools.md), §2 and §3) compares SCIP,
universal-ctags, Graphify, codegraph and ast-grep, and rules out the rest.
For need 1, a full span under a name that survives lines moving, only
SCIP and ctags qualify.

## 3. What each gives the anchor

- **SCIP.** A symbol is `scheme manager package version descriptors`, for
  example a path then `Class#method().`. The definition occurrence's
  enclosing range is the nearest enclosing AST node, so its bytes are the
  symbol's text. Two cautions: drop the version part before comparing across
  pins, or a version bump reads as a change; function-local symbols are
  numbered per file and not stable.
- **ctags.** Each tag has path, name, kind, scope and start and end line. A
  hash of those lines at each pin gives the cross-pin check across every
  language a project uses, with no build. An overloaded name gives two tags;
  the anchor then needs its optional lines, or a person picks.
- **codegraph** has spans, but its id moves when a line is added above the
  symbol and it writes SQLite only: heavier than ctags, and no better here.

## 4. Recommendations

These replace recommendation 1 and refine recommendation 3 of
[graphify-as-code-graph](../2026-11-04-graphify-as-code-graph/graphify-as-code-graph.md);
its findings about Graphify stand.

1. Resolve anchors with universal-ctags: `ctags --output-format=json
   --fields=+ne` on the pinned checkout, a hash of the symbol's lines at the
   pin, and the cross-pin check comparing hashes. An anchor that resolves to
   no tag or to several is reported for a person (the gradient analysis's
   "omission is not deletion").
2. Keep the anchor form `<repo>@<commit>:<path>#<symbol>`, with `<symbol>`
   in ctags's scope form (`Class.method`) and optional lines to disambiguate.
3. Write the Markdown cite resolver here, in Node, against the ctags symbol
   table, if claim bodies are to cite code inline. It needs no Graphify.
4. Leave references undecided until code-to-claims coverage or blast radius
   is scheduled. Then choose SCIP where the project builds and its languages
   have indexers, Graphify where it does not.
5. Before step 1, install universal-ctags and run it on both downstream
   checkouts: record tag counts, how many anchors already in their `sources`
   lines resolve, and how many are ambiguous.
