# Pilot: one claim, from a sentence to ratified Datalog

2 November 2026. The reference example for [`../PROCEDURE.md`](../PROCEDURE.md):
one sentence of a source taken through every step, with each step's output
kept. It was run as a dry run of the procedure, so it had no measures or
stopping rule fixed in advance; its purpose was to see the procedure work
and to correct it where it did not. It is not continued.

## Question

Can the procedure carry one claim from a sentence of prose to Datalog that
the ratifier accepts, judging in plain English, without reading Datalog?

## The source

One sentence of [`source.md`](source.md), section 2 of a tutorial written for
an earlier pilot on an invented subject (a lending library):

> Registration happens once, at the desk, and the library issues a card.

## What happened, step by step

**Step 1, decompose.** The decomposer (the session's agent) proposed three
atomic claims, because the sentence makes three statements that can each be
true while another is false:

| claim | statement | fate |
|---|---|---|
| `claim:lib-2a` | Registration happens once. | carried through to step 6, ratified |
| `claim:lib-2a-desk` | Registration happens at the desk. | kept; back at step 2: A needs a predicate |
| `claim:lib-2a-card` | The library issues a card. | kept; back at step 2: A needs a predicate |

The ratifier kept all three. "At the desk" is a leaf: nothing in the source
rests on it, but it is an assertion of the source, and a rule a system
could enforce. "Issues a card" is load-bearing: four later claims of the
source rest on cards existing.

The decomposer's first wording of the third claim was "At registration, the
library issues a card". The ratifier read the source differently
(registration first, then the card), which showed that "at registration"
was the decomposer's reading, not the source's. The statement went back to
the source's words.

**Step 2, vocabulary.** Predicate lines, in the definitions' formal files:

```
% predicate member(M): M is a member of the library.
% predicate registered(M): the library has registered M.
% predicate registration(R, M): R is an occasion on which the library registered M.
% predicate card(C): C is a library card.
% predicate card_of(C, M): the card C was issued to the member M.
```

Proposed by the decomposer; not yet ratified line by line.

**Step 3, formalize.** Agent A, given only each statement and the
vocabulary:

- for 2a: `bottom :- registration(R1, M), registration(R2, M), R1 != R2.`
  A flagged that "once" can mean at most once or exactly once, and that
  this rule says only the first.
- for 2a-desk: no rule. The vocabulary cannot say where a registration
  happens; A proposed `% predicate at_desk(R): the registration occasion R
  took place at the library desk.`
- for 2a-card: no rule. Nothing ties a card to a registration; A proposed
  `% predicate issued_at(C, R): the card C was issued on the registration
  occasion R.` and noted that "issues a card" says a card comes to exist,
  which a rule can only enforce as a prohibition.

**Step 4, state.** Agent B, given only 2a's rule and the predicate line it
uses, wrote:

> The library never registers the same M on two different occasions: for
> any M, there cannot be two distinct occasions R1 and R2 that are both
> occasions on which the library registered M.

**Step 5, examples.** Agent C, given only the statements and the
vocabulary, wrote three cases for 2a: registered twice (forbidden),
registered once (allowed), two members registered once each (allowed). All
three pass against A's rule ([`examples/lib-2a.dl`](examples/lib-2a.dl)). For
2a-desk, C reported that no forbidden case could be written: the same gap A
found, found independently. C's cases for 2a-card were written for the
earlier wording and were discarded when the statement changed.

**Step 6, compare.** The ratifier judged "once" by its domain: over all
people, at most once (a person need not register); over members, at least
once (a member is someone who registered). So "exactly once, for members".
The "at least once for members" half is what "member" means, so it was
allocated to the definition, not the claim: `def:member` gained

```
% predicate has_registration(M): the library has registered M on some occasion.
has_registration(M) :- registration(_, M).
bottom :- member(M), not has_registration(M).
```

and 2a, saying only "at most once", was ratified with fidelity **yes**
([`formal/lib-2a.dl`](formal/lib-2a.dl)). The "yes" rests on step 6's
allocation question: `states` and the statement differ by the half that
`def:member` now carries, and the note says so. Read by the definitions of
step 6 alone, without allocation, the same difference would be "strained".

## Where it stops

- The predicate lines above were proposed by the decomposer and used, but
  never ratified line by line, so step 2 is not finished; 2a's fidelity
  rests on them.
- `def:member`'s new rules have not been through steps 4 to 6.
- `lib-2a-desk` and `lib-2a-card` wait at step 2 for `at_desk(R)` and
  `issued_at(C, R)`.
- The other claims of the source were never formalized under the
  procedure.

## Insights

1. **The ratifier can judge without reading the formal language.** With a
   blind restatement and examples run against the rules, every judgment the
   ratifier made was English against English.
2. **Separate roles turn one judgment into independent ones.** A, B and C
   agreed on 2a without seeing each other's work; A and C found the same
   vocabulary gap on their own.
3. **Atomicity is found, not assumed.** The sentence that looked like one
   claim was three.
4. **Part of a claim's meaning can belong to a definition.** Deciding
   *whom* "once" applies to moved half of it into `def:member`. The
   vocabulary is where context is written down.
5. **Atomic claims meet again in the vocabulary.** Predicates that name the
   shared event (the registration occasion R) reconnect the three claims
   without merging them.
6. **Rewording during decomposition smuggles in a reading.** The fix is a
   rule (keep the source's words) and a tool (the statement is copied by
   script after step 1).
7. **The ratifier's questions generalize.** Domain, modality, subject,
   allocation: four questions to ask of any statement.
8. **A source written by someone in the loop cannot test meaning
   recovery.** Arguing about what "once" means was arguing about the
   pilot's own prose. A text by someone else is the real test.

Insights 4 to 7 changed `PROCEDURE.md` (steps 1, 2 and 6) in the same pull
request as this pilot.

## Files

| path | what |
|---|---|
| `source.md` | the source passage |
| `dag/claims/` | the three atomic claims |
| `dag/definitions/` | `member`, `card` |
| `formal/lib-2a.dl` | the ratified formal file |
| `formal/lib-2a-desk.dl`, `formal/lib-2a-card.dl` | statements only; stopped at step 2 |
| `formal/def-member.dl`, `formal/def-card.dl` | the vocabulary |
| `examples/lib-2a.dl` | C's examples for 2a |

```sh
node bin/dagcheck.js pilot/2026-11-02-registration-once/dag --lint
node pilot/procedure.mjs examples pilot/2026-11-02-registration-once claim:lib-2a
```
