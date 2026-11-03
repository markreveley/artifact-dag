# Pilot: formal nodes (round 1)

Started and stopped 2 November 2026. Its corpora were removed afterwards;
this file is the record. The question it raised about fidelity led to
[`../PROCEDURE.md`](../PROCEDURE.md) and to the next two pilots.

The measures and the stopping rule below were fixed before the first claim
was formalized.

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

Both were removed after the round; see Run for where they are.

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

The corpora were removed on 2 November 2026, when the pilot was reduced
to one claim (see "What happened next"). They are in git history at
commit `f6901b0`, as `pilot/ethics/` and `pilot/library/`; from a checkout
of that commit:

```sh
node pilot/check.mjs pilot/ethics            # --no-bridges: before the bridges were added
node pilot/check.mjs pilot/library
node pilot/scenario.mjs pilot/library pilot/library/scenario.dl
```

## Results

### Corpus A: the Ethics

Nine propositions (VI has a corollary). The first run, with the text's own
citations as `depends_on`, gave III follows, the rest fail. Eight bridge
claims were then added (`ethics/dag/claims/bridges/`), each a premise the
derivation needed that no node stated.

| Prop. | Fidelity | Before | After | What the check found |
|---|---|---|---|---|
| I | strained: "prior" has no definition; Bridge 1 gives it one | fails | follows | "Clear from Deff. iii and v" needs Bridge 1: what is conceived through itself is prior to what is conceived through another |
| II | strained: "attributes are different" read as sharing none | fails | follows | The condition "whose attributes are different" is **idle**: the derivation never uses it. Bridge 2a is unneeded; Bridge 2b (the converse of Axiom V) carries it alone, by negation as failure |
| III | yes | follows | follows | From Axioms IV and V, nothing added |
| IV | strained: a constraint, since Datalog derives no disjunction | fails | fails | No bridge short of the proposition itself: the step from "only substances and modes exist" to "only attributes and modes distinguish" is the proposition. In effect a premise |
| V | yes, as a constraint | fails | follows, with "same attribute" **idle** and Prop. I unneeded | Vacuous: the derivation goes through Prop. IV's "not distinguished by attribute, not by mode", which negation as failure grants to any frozen case. The known gap was not found by the check; it was met at formalization time, in choosing between `same_attribute` and `distinguished_by_attribute`, and the idle condition is its only symptom |
| VI | yes | fails | follows, with `substance(Y)` **idle** | The stronger corollary is already derivable: a substance cannot be produced by anything, substance or not. The text's citing Prop. II where Prop. V is meant is invisible, because "different attributes" holds by negation as failure |
| VI cor. | yes | fails | follows, with Prop. VI, Axiom I, Bridges 6 and 7 **unneeded** | The first proof (through Prop. VI and Axiom I) does not carry it; the second does, and Bridge 2a already contains what Bridges 6 and 7 add. Axiom I is never used |
| VII | yes | fails | follows, with Prop. VI cor. **unneeded** | Bridge 8 ("what is not produced externally is self-caused") uses negation as failure, so the corollary it was written to rest on is not needed |
| VIII | yes, as a constraint | fails | fails | Needs the converse of Def. II, "a finite thing is limited by some other thing of its nature": an existential, outside Datalog |

Measures: fidelity 6 yes, 3 strained; entailment 7 of 9 after bridges, the
two failures for reasons the language cannot fix (a disjunction, an
existential); bridges 8; unneeded edges 5, of which 3 are artefacts of
negation as failure; the known gap not found by the check.

### Corpus B: the library

Thirty-six claims. Fidelity, on the agent's reading: **13 yes, 15
strained, 8 no**. The operator ratifies in `library/formal/*.dl`: each
file shows the claim's statement (`% says:`), the agent's reading
(`% fidelity:`) and the Datalog; changing the word on the fidelity line is
the ratification, and `check.mjs` recounts. What made a claim strained or
no:

| cause | claims |
|---|---|
| a statement of purpose ("exists to", "serves one aim", "not a punishment") | 1b, 4e, 10c |
| a permission ("may"), which has no opposite to forbid until the rule around it is stated | 3a, 3c, 5b, 6a, 7d, 8b |
| time, a change of state, or a retraction (a due date replaced, a hold lapsing, a charge cancelled) | 5b, 5d, 6c, 6d, 9c |
| arithmetic or a sum (an amount per day, a limit) | 7b, 7d, 9b |
| a characterisation, or a statement about the records' shape | 1a, 2b, 2c, 10a, 10b |
| an existential (a card is issued), a counterfactual, a proportion of time | 2a, 5e, 4d |

Entailment: 4 follow, 24 fail, 8 have no rules. The four that follow are
2c (vacuously: its condition is idle), 4a and 7a (each restates a
definition) and 7b (from `def:overdue`, with 7a unneeded). The 24 failures
are not faults in the tutorial. They are norms, and a norm does not follow
from the claims it is written after: in expository prose `depends_on` means
"rests on", not "is entailed by". The check as designed has nothing to say
about a tutorial, and its mutations say nothing either.

The other use of the same formal text did work. `scenario.mjs` runs every
rule of the corpus as one program over `library/scenario.dl`, a day's
facts, and reports which claims it breaks: 2d (a replaced card presented at
the desk), 5b and 5d (a renewal after the due date, and while another
member's hold is pending), 8a (the reference copy lent), and 2b, which
fires because nothing in the corpus ever derives `works(C)`: a vocabulary
gap the run exposed. It derives `overdue(l1)`, the fine, `owes(alice, l1)`,
who may borrow, who may place a hold on the title with one copy out and one
reference, and which copy may be lent to whom.

Found by decomposing and formalizing, not by the check: the prose refers to
"the queue" in section 5 before section 6 introduces holds; "every copy is
out" in section 6 is settled only by section 8; "still out" in section 9
had to be read as "not returned", because reading it as "open" made the
program go round in a circle (the evaluator refused it).

### Against the stopping rule

- Corpus B: 13 of 36 formalize with fidelity "yes". Fewer than half. The
  first condition holds. **Stop.**
- The second condition does not hold: the check found 8 bridges and 5
  unneeded edges in corpus A, and three limits of the language.

So: no `type: formal` and no `dagcheck --entail` now. The decision rests
on the "strained" reading: if the operator ratifies most of the 15 as
"yes", corpus B passes (28 of 36) and the question reopens. That judgment
is the seam the design puts on the `formalizes` edge, and it is the
operator's.

### What would reopen it

1. **Norms as policy, not claims as arguments.** The value in corpus B was
   the 13 rule-like claims run as a program, not entailment. A narrower
   proposal: formal text only for claims of subtype `norm`, a scenario
   runner, no entailment check. The trigger: a project whose claims
   describe a policy that also ships as code in a Datalog dialect (an
   authorization policy, for instance). The formal node is then the
   policy text taken from the code, not a paraphrase written for the
   node, so fidelity becomes the question "does the code's rule say what
   the prose says", and the scenario runner evaluates the real policy
   over example facts. That is the bridge from prose to code with nothing
   in the middle, and it is the only form of this idea the pilot supports.
2. **A language, or conventions, for time and retraction.** Day numbers
   and "current" predicates got half way; replaced due dates, lapsing
   holds and cancelled charges did not fit.
3. **A sound entailment check.** Negation as failure made 3 of the 5
   unneeded-edge findings and Prop. V's vacuous derivation. Soundness
   needs positive-only premises, or checking in every model rather than
   the least one, which is a different tool. If the deductive use (corpus
   A) is what matters, this comes first.

What the pilot leaves behind whatever happens: `check.mjs` and
`scenario.mjs`; two corpora with the agent's formalizations, which are
reference answers for a later evaluation of model-drafted formal nodes;
and the list of limits above.

## What happened next

**Amendment, 2 November 2026.** The fidelity readings above were the
agent's own, judging its own Datalog, with nothing for the ratifier to
compare in plain English. Asked to ratify them, the operator could not do
so without reading Datalog, and the readings had no independent evidence
behind them. That led to `../PROCEDURE.md`: a blind restatement of the
rules (`states`) and examples written from the statement and run against
the rules, so that the ratifier compares English with English. The
measures and the threshold were left as they were.

**Reduced to one claim.** Rather than re-run 36 claims through the new
procedure, the pilot was cut down to one claim taken all the way through:
[`../2026-11-02-registration-once/`](../2026-11-02-registration-once/).
The library corpus was not continued, and the Ethics corpus was replaced
by a single-claim pilot,
[`../2026-11-02-spinoza-one-claim/`](../2026-11-02-spinoza-one-claim/).
The stopping rule above was never applied to ratified readings, so this
round's decision ("stop") rests on unratified readings and is superseded
by those pilots.

## Insights

1. **The value sat in writing the formula, not in the checker.** Bridges,
   the Proposition V gap, forward references in the tutorial and
   vocabulary gaps were all met while formalizing; the derivation found
   less, and part of what it found was an artefact of negation as failure.
2. **Datalog fits norms, not arguments.** In expository prose `depends_on`
   means "rests on", not "is entailed by"; entailment had nothing to say.
   The rule-like claims did run as a program over a day's facts.
3. **One language will not cover a document.** No disjunction, no
   existentials, no time, no arithmetic, and an unsound entailment check
   under negation as failure. Formal text belongs per language, beside a
   plain-language claim that stays the source of meaning.
4. **A fidelity reading by the formalizer is not evidence.** The person
   who wrote the formula grades it generously and in a language the
   ratifier may not read. This is what `PROCEDURE.md` fixes.
