# From prose to code: the claims-to-code gradient

**Date:** 2026-11-03

**Question.** Could a project trace a direct line from a prose description of
its architecture and purpose, through decomposed DAG claims, to a code graph,
to the code itself? And where do Datalog payloads, tests and proofs sit on
that line? Raised while comparing this repo with Understand-Anything
(see [understand-anything-comparison](../2026-11-03-understand-anything-comparison/understand-anything-comparison.md)).

**Sources read.** This repo's `SCHEMA.md`, `md/docs/USAGE.md`,
`.claude/skills/dag/SKILL.md`, `pilot/PROCEDURE.md` and `lint/rules.dl`.
Project B's `dag/` (163 claims decomposed from its tutorial, 115
definitions, every claim carrying `document`, `section`, `order` and
`sources` lines that pin code by repo, commit, path and line range) and its
by-hand audit of the tutorial against the pinned code. Project A's labs
helper spec, where a failed runner step lists the claims it covers and a
`code:` step awaits a shared code-anchors script planned for this repo.
Understand-Anything's `packages/core/src/fingerprint.ts` and its
`docs/incremental/` audit.

**Method caveat.** A reading, not a run: nothing in §6 was built or tried.
Projects A and B were read at their checkouts on 3 Nov 2026 and are named
here only by letter (P9), so their figures cannot be checked from this
repo. Understand-Anything's fingerprinting, and the conclusion of its
nineteen review rounds, are as its own code and audit state them.

**Settled in the thread that produced this.** Claims written by an agent
are legal and expected; they are unverified until a person ratifies them,
and ratification is a separate act from reviewing the PR. A claim from a
document keeps the source's words (now in the `dag` skill, "Claims from a
document"). A `ratified` field is wanted. The glossary is the set of
definition nodes, which it already is.

---

## 1. The short answer

- **More of the line exists than the question implies.** In project B the
  tutorial is decomposed into claims, each claim's `sources` point at pinned
  code, and an audit folder checks each statement against that code by
  hand, with disagreements filed as issues. In project A the lab runner
  reports the claims a failed step covers, so a test-to-claim edge exists.
  The missing piece is the resolver between a claim and a symbol, which
  project A's labs already plan as a shared code-anchors script here.
- **A direct line exists at every link, but as traceability.** What each
  link mechanically guarantees is a property of the individual claim, not
  of the chain. That is the gradient.
- **The gradient is five levels of evidence a claim can carry.** Ratified,
  anchored, tested, formal, proved (§3). None replaces the one below it,
  because each is about a different thing: the prose, whether the code
  moved, behaviour at runtime, meaning, and meaning under all inputs.
- **The code graph is the addressing layer between claims and code,** not a
  fourth kind of node in the DAG (§4).
- **The deterministic third of Understand-Anything is worth borrowing;** the
  rest is a different product (§5).

## 2. What a claim is, once an agent may write it

Understand-Anything and this repo both let a model write claims. The
difference is what happens afterward. There a claim is a row in generated
JSON with a confidence weight, rebuilt on the next run and never edited by
hand; nobody vouches for it and nobody needs to, because it is disposable.
Here a claim is a file that persists, gets linked to, gets edited, and shows
up in glossaries and the document view. An extracted claim nobody has read
looks identical to one a person ratified. That is the gap, and it is closed
by recording the evidence a claim carries, not by forbidding extraction.

Three consequences for decomposing a document:

- **Instructions are not propositions.** A tutorial says "run this" and "do
  not do that" as much as it asserts facts. The schema anticipates a `norm`
  subtype and nothing uses it yet. A norm says what must or should be done.
  It is not true or false: it is in force or not, and followed or violated.
  Propositions about consequences support it, and code satisfies it rather
  than making it true. Without the subtype a decomposer turns every
  instruction into a strained assertion.
- **Keep the source's words.** A claim that quotes its source can be checked
  against the source in seconds, by a person or a lint rule. One that
  paraphrases cannot. The rule is in the skill now; project B's existing
  claims predate it and read as restatements, so ratification is the moment
  to check each against its section.
- **Terms become definitions.** A term the decomposer meets becomes a
  definition node, not an external id, or the claims' `uses` edges all point
  outside the collection.

## 3. The gradient

Each level is the strongest evidence a claim carries. A lint that counts
claims per level per document gives a project one number it can move, and
says plainly which claims rest on nothing but a person having once read
them.

| level | what it says | checked by | exists today |
|---|---|---|---|
| **ratified** | a person read the claim against its source and accepted it as atomic and faithful | a `ratified: <person>, <date>` line, absent on extracted claims | the pilot's formal files carry the line; the schema does not |
| **anchored** | the claim names the code it is about, and that code has not moved since someone checked | an anchor by symbol, with a hash of the anchored text at the pin, compared across pins | project B's `sources` pin by line range, with no hash |
| **tested** | an executable step covers the claim and reports it on failure | the runner | project A's labs |
| **formal** | the claim's Datalog is the shipped rule, not a paraphrase of it | the engine that runs the rule | the paused pilot; the trigger is a project whose claims describe a policy that also ships as Datalog (README, "Paused: formal text on nodes") |
| **proved** | the claim is a theorem about the code | a verified subset of the implementation language, or a model checker for the protocol | nothing; worth it only for the two or three invariants an architecture rests on |

Two readings of the table:

- **The levels are not a ladder a claim climbs.** Ratification is about the
  prose. Anchoring is about whether the code moved. A test is about
  behaviour. Formal text and proofs are about meaning. A proved claim whose
  statement nobody ratified is a proof of something the document may not
  say.
- **Only norms reach the formal level cheaply.** Where a product already
  runs a Datalog engine for policy, a norm's formal text is the policy, and
  the distance between claim and code is zero. For a proposition, formal
  text is a paraphrase in another notation, which is what the first pilot
  round stopped on.

## 4. The code graph as addressing layer

A claim anchored by line range rots with every edit of the file. A claim
anchored by symbol rots only when the symbol is renamed or removed. A
Tree-sitter pass over the pinned repo gives symbol spans, so an anchor can be
written `<repo>@<commit>:<path>#<symbol>` and resolved to lines on demand.
The same pass yields calls and imports, which answers a question the DAG
cannot ask on its own: which code has no claim about it.

That reverse direction, code to claims, is where extraction in the
Understand-Anything style is legitimately useful, and as unverified as any
other extracted claim. The join of the two directions is the docs-versus-code
finding that project B currently produces by hand.

The code graph therefore stays outside the DAG: a derived index that anchors
resolve against, rebuilt from the pin, never committed as nodes.

## 5. Fingerprinting, and what to borrow

Understand-Anything stores, per file, a SHA-256 of the content and, where
Tree-sitter supports the language, a structural signature: function names
with their owner class, parameter lists, class names, imports and exports,
with the git commit the store was built at. On the next run it classifies
each file: same hash, unchanged; no structural signature on either side,
structural (conservative); content changed but signatures equal, cosmetic;
signatures differ, structural. Only structural files go back to the model.

Its `docs/incremental/` audit records nineteen review rounds on one
question, whether a symbol missing from a new extraction was deleted or
merely missed by the extractor, and concludes that a best-effort extractor's
omission is never evidence of deletion. Keep that rule: an anchor that fails
to resolve means a person looks, never that the claim is stale.

Borrow at two levels, neither needing their 27 node types:

- **Claim to prose.** The claim carries its source sentence. A lint rule,
  `stale_claim`, reports a claim whose sentence no longer occurs in the named
  document under the named section. String containment; no parser.
- **Claim to code.** A pinned anchor never goes stale, it goes old. Record a
  hash of the anchored text at the pin. When the project moves to a new pin,
  every claim whose anchored text hashes the same carries its evidence
  forward, and only the rest need re-audit. That is their
  cosmetic-versus-structural split without the model in the loop.

## 6. Recommendations

1. Add `ratified` to the schema: optional, `<person>, <date>`, parsed, shown
   by the viewer, counted by the lint per document.
2. Give document claims their source sentence, and add `stale_claim`.
3. Define the anchor syntax by symbol with a text hash, and the cross-pin
   check. This is the code-anchors script project A's labs plan, and it
   belongs in this repo beside the other CLIs.
4. Use `norm` as a subtype, and keep the pilot trigger for formal text on
   norms as the README states it.
5. Do not import Understand-Anything's graph. Its deterministic part,
   Tree-sitter symbols and spans, is a few hundred lines on top of the
   tree-sitter package; its enriched part has a different reader.
