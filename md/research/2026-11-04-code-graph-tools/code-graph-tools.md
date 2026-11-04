# Code graph tools: a survey

**Date:** 2026-11-04

**Question.** Which tools could serve as the code graph that claim anchors
resolve against, and what does each give? Needed, in order: (1) symbols per
file with a stable identity and a full span, extracted without a model; (2)
references, calls and imports across files; (3) a command run on a pinned
checkout that writes a file, in several languages, with no library
dependency in this repo; (4) code cites in Markdown prose resolved to
symbols. What the repo should do about it is
[code-graph-alternatives](../../analysis/2026-11-04-code-graph-alternatives/code-graph-alternatives.md).

**Sources read.** Each tool's repository through the GitHub API (`gh api
repos/<owner>/<repo>`: stars, last push, latest release, licence). SCIP's
[`scip.proto`](https://github.com/sourcegraph/scip/blob/main/scip.proto) and
[`docs/CLI.md`](https://github.com/sourcegraph/scip/blob/main/docs/CLI.md);
the enclosing-range code in scip-typescript (`src/FileIndexer.ts`),
scip-python (its `enclosing_range_class` snapshots) and scip-go
(`internal/visitors/visitor_file.go`). codegraph's
`src/extraction/tree-sitter-helpers.ts` and `src/db/schema.sql`
([colbymchenry/codegraph](https://github.com/colbymchenry/codegraph)).
Graphify from
[graphify-as-code-graph](../../analysis/2026-11-04-graphify-as-code-graph/graphify-as-code-graph.md).
Web searches for tools new in 2026. A research subagent did the reading;
SCIP's enclosing range was checked again in `scip.proto` afterwards.

**Method caveat.** Nothing was installed or run. Universal-ctags's JSON
output and `end` field are from [its documentation](https://docs.ctags.io)
as known, not fetched this session; the machine has only macOS's BSD
`ctags`. The enclosing range was not found in scip-java or scip-clang by a
filename search, which is not evidence they lack it. Whether the
`tree-sitter tags` command writes JSON was not checked. No text addressed to
agents was seen in anything fetched. Figures are as of 4 Nov 2026.

---

## 1. Surveyed

SCIP and its indexers, LSIF, universal-ctags, stack-graphs and
tree-sitter-graph, tree-sitter's `tags` queries, ast-grep, Glean, Kythe,
CodeQL, Joern, Aider's repo map, Serena, codegraph (colbymchenry),
CodeGraphContext, code-graph-rag, Potpie, zoekt, and newer small tools
(cymbal, optave/codegraph, cartog, codegraph-rust, ontoindex). Graphify and
Understand-Anything were read earlier and are included for comparison.

## 2. The serious candidates

| tool | full span | stable id | cross-file refs | languages | run, output | licence | state, 4 Nov 2026 | weight |
|---|---|---|---|---|---|---|---|---|
| SCIP (`scip-*` indexers, `scip` CLI) | yes, `enclosing_range` on the definition | yes: `scheme manager package version descriptors` | yes, with roles (definition, reference, import) | one indexer per language family | `index.scip` (protobuf); `scip print --json`; `scip expt-convert` to SQLite | Apache-2.0 (scip-python: unstated) | CLI 870 stars, v0.10.0 (3 Sep 2026); scip-typescript v0.6.1 (3 Nov 2026); every indexer pushed within two weeks | medium: each indexer needs the project's dependencies or a build |
| universal-ctags | yes, `--fields=+e` adds `end` | path, scope and name; overloads collide | no (import and include tags only, `--extras=+r`) | over 100, by parser or regex | `ctags --output-format=json`, one JSON object per line | GPL-2.0 | 7.3k stars, v6.2.1 (25 Oct 2025), pushed 3 Nov 2026 | one C binary |
| Graphify | start line only | lossy (`client_timeout_init`) | yes, tagged by confidence | about 40 | Python CLI; JSON | Apache-2.0 | 142k stars, pushed 3 Nov 2026 | about 99k lines of Python |
| codegraph (colbymchenry) | yes, start and end line and column | no: a hash of path, kind, name and start line; `qualified_name` usable | yes, calls and imports | many (tree-sitter, WASM) | npm CLI or MCP server; SQLite only | MIT | 76.6k stars, v1.6.2 (3 Oct 2026) | npm package, about 10 dependencies |
| ast-grep | yes, per match | none: patterns written by hand | no | tree-sitter languages | `sg run --json` | MIT | 16.4k stars, 0.51.1 (2 Nov 2026) | one Rust binary |

## 3. Ruled out, and why

- **LSIF:** superseded by SCIP; lsif-node archived in 2022.
- **stack-graphs:** archived 9 Sep 2025. **tree-sitter-graph:** no push since
  December 2024.
- **Kythe:** needs build integration (Bazel); last push 18 Sep 2026.
- **Glean:** a server and a Haskell toolchain.
- **CodeQL:** databases of several gigabytes; the licence limits use on code
  that is not open source.
- **Joern:** a JVM code property graph aimed at security analysis.
- **Aider's repo map:** computed in process, not written to a file; Aider
  last pushed 22 May 2026.
- **Serena:** an LSP toolkit served to agents over MCP; writes no file.
- **CodeGraphContext, code-graph-rag, Potpie:** graph databases or model
  services. Spans not checked.
- **cymbal (374 stars), optave/codegraph (99), cartog, codegraph-rust,
  ontoindex:** too young to pin. Spans not checked.
- **zoekt:** code search, not a graph.

## 4. Details that bear on an anchor

- **SCIP's span.** `Occurrence.enclosing_range`, now the
  `typed_enclosing_range` oneof, is the half-open range of the "nearest
  non-trivial enclosing AST node"; on a definition that is the whole symbol,
  body and decorators included.
- **SCIP's id.** The package version is part of the symbol, so two pins of
  the same code differ in it unless it is dropped before comparing.
  Function-local symbols are `local <n>`, numbered per file.
- **codegraph's id** moves when a line is added above the symbol.
- **ctags's scope form** names a method with its class (`Class.method`);
  two overloads of one name give two tags with different lines.
