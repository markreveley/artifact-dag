# Code graph: the alternatives to Graphify

**Date:** 2026-11-04

**Question.** Is there a tool that should be considered over Graphify for the
code graph that claim anchors resolve against? Asked straight after
[graphify-as-code-graph](../2026-11-04-graphify-as-code-graph/graphify-as-code-graph.md),
which found Graphify records a symbol's start line only.

**Sources read.** For each tool, its repository through the GitHub API
(stars, last push, latest release, licence) and its docs or source where the
span and id question turned on them: SCIP's `scip.proto` and `docs/CLI.md`;
the span code in scip-typescript, scip-python and scip-go; codegraph's
`src/extraction/tree-sitter-helpers.ts` and `src/db/schema.sql`. Searches for
newer tools. The reading was done by a research subagent and checked here
where a recommendation rests on it (SCIP's enclosing range, read in
`scip.proto`).

**Method caveat.** Nothing was installed or run. Universal-ctags's JSON
output and `end` field are from its documentation, not fetched this session
or tried: the machine has only the BSD `ctags` that ships with macOS. The
SCIP enclosing range was not found in scip-java or scip-clang by a filename
search; that is not evidence they lack it. Figures are as of 4 Nov 2026.

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

| tool | full span | stable id | cross-file refs | run, output | licence | state |
|---|---|---|---|---|---|---|
| SCIP indexers and `scip` CLI | yes, `enclosing_range` | yes, language-defined descriptor | yes, with roles | one indexer per language; `index.scip`, `scip print --json` | Apache-2.0 | CLI v0.10.0 (Sep 2026); indexers pushed within two weeks |
| universal-ctags | yes, `--fields=+e` | path, scope, name | no | one C binary; `--output-format=json` | GPL-2.0, fine for a tool run as a command | v6.2.1, pushed Nov 2026 |
| Graphify | start line only | lossy | yes, confidence-tagged | Python CLI; JSON | Apache-2.0 | daily releases |
| codegraph (colbymchenry) | yes, lines and columns | no, hashes the start line; `qualified_name` usable | yes | npm CLI or MCP; SQLite | MIT | v1.6.2 (Oct 2026) |
| ast-grep | yes, per match | none, patterns are written by hand | no | one Rust binary; `--json` | MIT | 0.51.1 (Nov 2026) |

Ruled out:

- **LSIF:** superseded by SCIP.
- **stack-graphs:** archived September 2025.
- **Kythe and Glean:** need build integration or a server.
- **CodeQL:** heavy, and its licence limits use on closed code.
- **Joern:** a JVM code property graph for security work.
- **Aider's repo map and Serena:** in-process agent aids that write no file.
- **Graph-database and model-service tools** (CodeGraphContext,
  code-graph-rag, Potpie): the wrong shape for a file read from a pinned
  checkout.
- **Tools under a year old with a few hundred stars:** too young to pin.

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
- **codegraph** has spans but an id that moves when a line is added above the
  symbol, and SQLite-only output; it is no better than ctags for this and
  heavier.

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
