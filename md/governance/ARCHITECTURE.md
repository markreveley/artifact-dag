# artifact-dag: architecture

> Status: draft v1 · 2026-11-04 · §1 to §4 describe what is built; D1 is decided and not built, gated by universal-ctags being installed (`next-operator.md`, step 3)

## 1. Thesis

A project's definitions, claims and resources are Markdown files in its own
repo; this repo holds the pieces that parse, check, lint and draw them, and
nothing derived from a project is kept beside its files (P1).

## 2. Parts

The README's "Pieces" table lists each file and what it does. In outline:

- **The parser** (`src/parse.js` with `src/frontmatter.js` and
  `src/files.js`) turns a collection's files into nodes, edges, problems and
  external ids. It runs in Node and in the browser.
- **Three CLIs** (`bin/`) on top of it: `dagcheck` validates and exports
  JSON, `build-viewer` writes the viewer page, `dag-to-glossary` writes a
  glossary. They are contracts (P8).
- **The lint**: graph facts (`src/facts.js`) run through a small Datalog
  evaluator (`src/datalog.js`) against `lint/rules.dl` and a collection's
  own `dag/lint.dl`.
- **The viewer** (`viewer/template.html`): one static page with the parser
  and the node files inlined.

## 3. Flow

Files under a project's `dag/` go to the parser; its output goes to the
check, the lint, the glossary or the viewer. Nothing flows back: no tool
writes a node file. Several collections are parsed separately and joined on
id (P2).

## 4. Boundaries and invariants

- The node files are the only source (P1). An output built from them is
  either never committed (the viewer page) or committed as a generated
  view with a check that fails when it drifts (a document's glossary).
- The node format is `SCHEMA.md`; a change to it or to a CLI is checked
  against the downstream collections before it merges (P8).
- Anything derived from code, such as a code graph, stays outside the DAG:
  an index that anchors resolve against, rebuilt from the pin, never nodes.

## 5. Decisions

### D1. Claim anchors resolve against universal-ctags; references wait

Decided by the operator, 4 Nov 2026. Not built.

**The choice.** A claim's code anchor resolves against the JSON that
universal-ctags writes for the pinned checkout (`--output-format=json
--fields=+ne`). The anchor's evidence is a hash of the symbol's lines at the
pin; moving to a new pin, an anchor whose hash is unchanged keeps its
evidence and the rest go to a person. An anchor that matches no tag, or
several, is reported for a person, never marked stale (P7). The ctags output
is not committed. A tool for references across files (which code no claim
covers, what a change affects) is not chosen until that work is scheduled.
The anchor's written form is still an open question in `next-operator.md`.

**The alternatives, and why they lost.**

- **A tree-sitter script of our own** (the claims-to-code gradient analysis,
  recommendation 5): more code to keep than ctags for the same spans, and no
  better languages.
- **Graphify:** a model-free code pass with good cross-file resolution, but
  each symbol has a start line only, so no hash; a large, fast-changing
  Python tool. It remains a candidate for references.
- **SCIP:** full spans and the most stable symbol ids, but an indexer per
  language and a project that builds. It remains the candidate for
  references where a project builds.
- **Understand-Anything:** its graph serves onboarding, and its code
  positions are file and line only.
- **codegraph, ast-grep and the rest:** ids that move with lines, no
  identity at all, or the wrong shape (a service, not a file).

**Why ctags.** The hash needs a span and nothing else. ctags gives an end
line in over a hundred languages from one binary, with no build and no
dependency in this repo. Its weakness, overloads under one name, is the case
the optional line range in the anchor already covers.

**Sources.** `md/analysis/2026-11-03-claims-to-code-gradient/` (the
gradient and the hash), `md/analysis/2026-11-04-graphify-as-code-graph/`,
`md/analysis/2026-11-04-code-graph-alternatives/` (the recommendation), and
the survey `md/research/2026-11-04-code-graph-tools/`.
