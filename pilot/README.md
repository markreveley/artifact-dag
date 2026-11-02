# Pilot: formal nodes

Status: running, started 2 November 2026. The measures and the stopping
rule below were fixed before the first claim was formalized.

## Question

Is it worth adding a node type that carries a formal expression of a claim
(Datalog, to start), with a `formalizes` edge to the claim, and a check that
a claim's expression follows from the expressions of the claims it
`depends_on`?

## Design under test

- **A formal node is separate from the claim.** The claim stays plain
  language. A formal node has `type: formal`, a `language`, a `formalizes`
  list of claim ids, and a body in that language. One claim may have several
  formal nodes; one formal node may cover several claims.
- **The `formalizes` edge is the seam.** It carries the one human judgment,
  "this formula says what that sentence says", and can be reviewed on its
  own. A claim can be settled while its formalization is disputed.
- **Predicates belong to definitions.** A definition may carry formal text
  too (`substance(X) :- in_itself(X), conceived_through_itself(X).`), so the
  vocabulary of the formulas is the vocabulary of the graph.
- **The check (entailment).** For a formalized claim C: the program is the
  formal text of every claim C rests on, directly or through other claims,
  plus the formal text of the definitions they use. For each rule `H :- B`
  in C's text, the body B is frozen (each variable becomes a fresh constant)
  and added as facts; H must then be derived. A fact must be derived. A
  constraint is written `bottom :- B.` and holds when `bottom` is derived
  from frozen B. The premises are first checked to be consistent (`bottom`
  not derived), since anything follows from a contradiction.
- **Mutation.** Each direct premise is dropped in turn. If C still follows,
  that `depends_on` edge is not a premise; it may be evidence (`supports`)
  or nothing.
- **Lifecycle.** A formal node is proposed until a person ratifies its
  `formalizes` edge. In the pilot, ratification is the operator reading the
  prose beside the formula in the results table.
- **No schema change in the pilot.** Formal text lives in `formal/*.dl`
  files with a `% formalizes: <id>` header, and the checker is
  `pilot/check.mjs` on the evaluator in `src/datalog.js`.

## Corpora

**A. The Ethics, Part I: definitions, axioms, propositions 1–8** (Spinoza,
Elwes translation, 1883; public domain; Project Gutenberg #3800). The text
is `ethics/source.md`; the nodes are `ethics/dag/`. It is deductive by
design, so it tests the check more than the method, and it has one known
gap: Proposition 5 assumes that substances distinguished by their attributes
share none, which fails if a substance can have several attributes (the
objection usually credited to Leibniz). The check should find that gap
without being told.

**B. A lending library, from the ground up** (`library/tutorial.md`), a
tutorial written for this pilot on a subject with no connection to any
project. It was written as prose and committed before any of it was
formalized, so that it was not shaped to fit the check. It is expository,
like a product tutorial, which is what the method is meant for. Its nodes
are `library/dag/`.

## Measures

Per claim, recorded in the results table:

1. **Fidelity.** Does the formula say what the sentence says: yes, strained,
   or no. Judged by the operator, reading prose beside Datalog.
2. **Entailment.** Does the claim follow from its `depends_on` as
   formalized: yes, no, or only with a bridge.
3. **Bridges.** A bridge is a premise the derivation needs that no node
   states. Each becomes a candidate claim.
4. **Wrong edges.** A `depends_on` that the mutation shows is not a premise.
5. **Known gap.** Whether Proposition 5's gap was found.

## Stopping rule

Stop, and record what would reopen the question, if either holds:

- fewer than half the claims of corpus B formalize with fidelity "yes";
- the check finds nothing: no bridge, no wrong edge, and Proposition 5's
  gap missed.

Otherwise: add `type: formal` and the `formalizes` edge to `SCHEMA.md`, and
build `dagcheck --entail` from `pilot/check.mjs`.

## Run

```sh
node bin/dagcheck.js pilot/ethics/dag --lint
node pilot/check.mjs pilot/ethics
node bin/dagcheck.js pilot/library/dag --lint
node pilot/check.mjs pilot/library
```

## Results

Pending.
