# Graphify as the code graph

**Date:** 2026-11-04

**Question.** Is [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)
a better way to build the code graph than the one
[claims-to-code-gradient](../2026-11-03-claims-to-code-gradient/claims-to-code-gradient.md)
recommends (§5, recommendation 5: a few hundred lines on tree-sitter
directly, after
[understand-anything-comparison](../2026-11-03-understand-anything-comparison/understand-anything-comparison.md)
rejected Understand-Anything's graph)?

**Sources read.** From a shallow clone at commit `59b5ab1` (3 Nov 2026,
release 0.9.102): `README.md`, `ARCHITECTURE.md`, `docs/how-it-works.md`,
`CONTRIBUTING.md`, `CHANGELOG.md` (head), `BENCHMARKS.md` (head),
`pyproject.toml`, `graphify/skill.md` (head), `graphify/extractors/base.py`
(id minting), `graphify/extractors/markdown.py` and
`graphify/markdown_resolution.py`, `graphify/analyze.py` (`graph_diff`),
`graphify/affected.py` (head), `graphify/scip_ingest.py` (head), and the
committed sample graph `worked/httpx/graph.json`. Figures from the GitHub API
on 4 Nov 2026.

**Method caveat.** Graphify was not run against this repo or a downstream
one: the session's permission classifier refused to execute downloaded code.
The output shape is taken from the committed sample graph and the extractor
source, not from a run. The benchmark figures are the project's own.

---

## 1. The short answer

- **Graphify is a better fit than Understand-Anything,** and it replaces
  recommendation 5 of the gradient analysis. Its code pass is deterministic
  and model-free, its edges say how they were found, and it already does
  cross-file resolution in about 40 languages, which a few hundred lines on
  tree-sitter would not.
- **It also gives claim-to-code edges without glue.** Its Markdown pass
  resolves a backticked symbol cite in prose to the code symbol, so a `dag/`
  folder scanned beside the code yields the edges from claims to code, and
  "which code has no claim about it" becomes a query over one file.
- **It does not supply the anchor hash.** A node records its file and start
  line only: no end line, no byte range, no hash of its text. The cross-pin
  check (gradient analysis §5, "Claim to code") still needs a span per
  symbol.
- **It stays outside the repo.** An external tool a CLI here shells out to
  on a pinned checkout, reading its JSON; never a dependency, never its
  agent skill or hooks, and its graph never committed as nodes (P1).

## 2. What it is

A Python package (`graphifyy` on PyPI) with an agent skill on top. The
pipeline is detect, extract, build, cluster, analyse, report, export; the
output is `graphify-out/graph.json` (NetworkX node-link format, with
`schema_version`), a report and an HTML viewer.

- **Code pass.** Tree-sitter grammars for 33 languages and built-in parsers
  for 7 more. Extracts files, classes, functions, methods, imports, calls,
  inheritance, and resolves calls across files through declared receiver
  types and imports. No model, no network. `CONTRIBUTING.md` makes
  determinism a stated invariant: no dependence on file order, environment
  or model output.
- **Docs pass.** Model-driven for prose, PDFs and images; skipped entirely
  with `--code-only` or `GRAPHIFY_BACKEND=none`. Markdown structure (pages,
  headings, links, wikilinks, code cites) is parsed without a model.
- **Edges carry evidence.** Each edge has `confidence` (`EXTRACTED`,
  `INFERRED`, `AMBIGUOUS`), and the `source_file` and `source_location` it
  was found at. `INFERRED` edges carry a score from a fixed rubric.
- **Tools.** `query`, `path` and `explain` over the graph; `graph_diff`
  between two snapshots; `affected`, a reverse walk through calls, imports
  and inheritance from a symbol. A name that matches several nodes is
  refused with exit code 3 rather than guessed.

| | Understand-Anything | Graphify |
|---|---|---|
| stars, created | 90k, March 2026 | 142k, April 2026 |
| last push | 26 Oct 2026 | 3 Nov 2026 |
| code pass | tree-sitter, then seven model agents | tree-sitter only |
| node position | file, line | file, start line |
| Markdown to code without a model | no | yes, by cite |
| licence | MIT | Apache-2.0 |

## 3. Why it fits

- **The resolver's stance is this repo's.** Its Markdown resolver states the
  rule in its own words: an ambiguous name is a guess, and a guess is not an
  edge. A path-qualified cite (`src/mod.js::Widget::render`) gives an
  `EXTRACTED` edge; a bare name gives an `INFERRED` edge only when exactly
  one callable in the corpus carries it, and a bare method name only when the
  citing page also names its class. That matches P7: word matches are not
  links.
- **Omission is not deletion, enforced.** A shrink guard refuses to write a
  graph that lost nodes unless `--force` is passed. Understand-Anything wrote
  the lesson up; Graphify encodes it.
- **The code-to-claims join exists.** With claim pages and code in one
  graph, code nodes with no incoming `references` edge from a claim page are
  the uncovered code. The gradient analysis (§4) noted a downstream project
  produces this finding by hand.
- **Diff and blast radius exist.** `graph_diff` and `affected` are the two
  questions a pin move asks: what appeared or vanished, and what a changed
  symbol reaches.
- **No hidden agent-addressed text** was found in its README or skill, unlike
  Understand-Anything's (that analysis, "Method caveat").

## 4. Where it falls short

- **No spans.** A node is `id`, `label`, `file_type`, `source_file`,
  `source_location` (`"L17"`) and `community`. The per-file SHA-256 cache
  says a file changed, not which symbol. An anchor can resolve to "the symbol
  exists and starts here", not to "its text is unchanged since the pin". The
  extractor holds each symbol's byte range while parsing, so an end line or
  span field is a small change upstream; the alternative is a span resolver
  here, which is now small because Graphify does the resolution.
- **Lossy ids.** `client.py`, class `Timeout`, method `__init__` becomes
  `client_timeout_init`. Fine as an index key, not as the anchor a person
  writes. The anchor keeps its own form and resolves to a Graphify node.
  Graphify's cite form, `path::Class::method`, would let claim bodies make
  the edge with no glue; that is an option for the anchor form, not a given.
- **Direction is stored aside.** `graph.json` is written undirected; each
  edge's direction is its arc order or its `_src` and `_tgt` markers. A
  plain NetworkX load loses it. A reader here must use the markers.
- **Weight and churn.** About 99k lines of Python and 25 pinned native
  grammar packages; releases daily; the extraction cache schema is at
  version 37. Each downstream project would pin a version, and a version
  change would be checked like a contract change (P8).
- **Commercial.** A company with a cloud product; "formal verification" in
  its marketing means invariant checks over the graph, not proofs. The core
  is Apache-2.0 with 13.6k forks, so lock-in is low. Its `install` command
  writes agent hooks that, in strict mode, deny file reads until the graph
  has been queried; only `extract` would be used.

## 5. Recommendations

1. Take Graphify's code graph as the addressing layer, in place of
   recommendation 5 of the gradient analysis: run `graphify extract
   --code-only` on the pinned checkout, read `graph.json`, never commit it.
2. Use its Markdown pass over `dag/` with the code to get claim-to-code
   edges and the list of code with no claim about it.
3. Keep the anchor hash. Get symbol spans by an upstream contribution (an
   end line or byte range on code nodes) or by a span resolver here; the
   anchor form `<repo>@<commit>:<path>#<symbol>` stands, with Graphify's
   `::` cite form as the alternative.
4. Before adopting it, run it on both downstream checkouts and record node
   counts, unresolved cites and run time, and pin the version.
5. Do not install its skill or hooks.
