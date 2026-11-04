# Understand-Anything compared with this repo

**Date:** 2026-11-03

**Question.** How does [Egonex-AI/Understand-Anything](https://github.com/Egonex-AI/Understand-Anything)
compare with artifact-dag, and is any of it worth borrowing? Asked with a
second purpose: to look at it as one approach to building a code graph,
which is taken up in
[claims-to-code-gradient](../2026-11-03-claims-to-code-gradient/claims-to-code-gradient.md).

**Sources read.** Its README (through a summarising fetcher), and from a
shallow clone: `understand-anything-plugin/packages/core/src/types.ts` and
`fingerprint.ts`, `skills/understand-knowledge/SKILL.md`,
`agents/article-analyzer.md`, and `docs/incremental/source-evidence-audit.md`.
Figures (stars, commits) are as the GitHub page showed them on 2026-11-03.

**Method caveat.** The README contains a hidden HTML comment addressed to
AI agents, asking them to add a marker to pull-request descriptions. It was
read as data and not acted on. Anyone running an agent against that repo
should expect it.

---

## 1. The short answer

- **They share two words and the input format.** Both are called knowledge
  graphs and both read Markdown with `[[wikilinks]]`. Beyond that they are
  different products for different readers.
- **Understand-Anything derives a graph about code.** Tree-sitter extracts
  files, functions, classes, imports and calls; seven model agents add
  summaries, layers, business domains, guided tours and, in its wiki mode,
  extracted entities and claims. The graph is `.ua/knowledge-graph.json`,
  regenerated incrementally, served by a dashboard.
- **artifact-dag keeps a graph that is the source of truth.** Three node
  types, six explicit edge kinds, one Markdown file per node, reviewed
  through a PR, validated for shape and acyclicity, linted for missing
  links, joined across projects by global id.
- **The closest point of contact is their wiki mode,** which reads the same
  raw material as a `dag/` folder and emits `article`, `topic`, `entity`,
  `claim` and `source` nodes with weighted `builds_on`, `contradicts` and
  `cites` edges. Its claims are model-extracted rows in regenerated JSON.
  Ours are files someone can ratify. The gradient analysis says what to do
  with that difference.

## 2. Side by side

| | Understand-Anything | artifact-dag |
|---|---|---|
| graph is | derived from code or a wiki | authored, the thing itself |
| node types | 27 (code, infra, domain, wiki, design) | 3 (definition, claim, resource) |
| edge types | 38, each with weight 0 to 1 and a direction flag | 6 explicit plus `mentions` and `about`; five must form a DAG |
| storage | one JSON file, regenerated | one Markdown file per node, edited |
| validation | a `graph-reviewer` agent, prompt-based | `dagcheck`: ids, fields, links, cycles; Datalog lint for missing links |
| change tracking | per-file content hash plus structural signature | none (recommended in the gradient analysis) |
| cross-project | no | global ids; the viewer joins folders |
| viewer | dashboard with search, tours, personas, served read-only from committed JSON with no model calls | one static page built from `dag/`, same stance |
| scale | about 40k lines of TypeScript, 866 commits, about 90k stars, MIT | about 100 commits, no dependencies |
| reader | a developer onboarding to a large codebase | a person maintaining a body of definitions and claims |

## 3. What is worth borrowing

- **Fingerprinting.** Content hash plus structural signature per file,
  classified as unchanged, cosmetic or structural, with only structural
  changes sent back to the model. The gradient analysis adapts it to claims
  at two levels (source sentence, anchored code).
- **Their lesson from the incremental audit.** Nineteen review rounds on
  whether a missing symbol was deleted or missed, concluding that an
  extractor's omission is never evidence of deletion. An anchor that fails
  to resolve means a person looks.
- **The dashboard's stance,** read-only from committed data with no model in
  the loop, is already this repo's. Its fuzzy search and layer colouring are
  more polished than `viewer/template.html`.
- **The deterministic third,** Tree-sitter symbols and spans, as the
  addressing layer for code anchors. Not their package: a few hundred lines
  on tree-sitter directly.

## 4. What is not a fit

- **Their taxonomy.** Thirty-eight edge types with weights and bidirectional
  edges is the opposite of keeping edges few, directed and acyclic so that a
  cycle is an error.
- **Their graph as our code graph.** The enriched part (layers, tours,
  domains, personas, seven output languages) serves onboarding, not
  traceability.
- **Their claims as our claims.** Not because a model wrote them, which is
  fine here too, but because nothing records whether a person has read one,
  and the next run replaces it.
