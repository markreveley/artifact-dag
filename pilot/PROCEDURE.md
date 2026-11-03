# Procedure: formalizing claims and ratifying the formalization

Status: proposed on 2 November 2026, during the formal-nodes pilot
(`README.md`). It replaces the pilot's original way of judging fidelity
(the agent's own reading of its own Datalog); see "Amendment to the pilot"
at the end. Not adopted outside `pilot/`.

The procedure turns a source document into atomic claims, gives some of
them a formal expression, and ends with a person's judgment that each
formal expression says what its claim says. Every step's output is a file,
so the judgment can be checked later.

## Terms

- **Source document.** The prose being decomposed.
- **Claim.** A node holding one statement from the source.
- **Atomic.** A claim is atomic if it cannot be split into two statements
  each of which could be true while the other is false. "Registration
  happens once, and every member has a card" is not atomic.
- **Statement.** The text of a claim: the source's own words where
  possible, cut down to the one statement.
- **Predicate.** A word of the formal vocabulary, with numbered blanks:
  `registration(R, M)` has two. A predicate's name carries no meaning to
  the machine; meaning enters only through its predicate line.
- **Predicate line.** One line of English saying what a predicate's blanks
  are: `registration(R, M): R is a registration of the member M.` Each
  predicate has exactly one, stored with the definition of the term it
  belongs to.
- **Vocabulary.** All predicates and their predicate lines.
- **Rule.** A line of Datalog built from predicates. Three forms:
  - `A :- B, C.` A holds whenever B and C hold.
  - `bottom :- B, C.` B and C must never hold together (a prohibition).
  - `A.` A fact.
- **Formal file.** One file per claim, holding its statement, its rules,
  their restatement and the judgment (format below).
- **States.** An English restatement of a claim's rules, written by someone
  who has not seen the statement.
- **Example.** A small case written in English from the statement, with
  its facts in the vocabulary and an expected verdict: *forbidden* (the
  rules derive `bottom`), *allowed* (they do not), or *expects* a named
  conclusion.
- **Fidelity.** The ratifier's judgment of a formal file: *yes*,
  *strained* or *no* (defined in step 6).

## Roles

| role | does | sees | does not see |
|---|---|---|---|
| decomposer (an agent) | proposes atomic claims and vocabulary | the source document | |
| formalizer, A (an agent) | writes a claim's rules | the statement, the vocabulary | the examples, the states |
| stater, B (an agent) | writes the states | the rules, the predicate lines they use | the statement, the examples |
| example writer, C (an agent or the ratifier) | writes the examples | the statement, the vocabulary | the rules, the states |
| ratifier (a person) | ratifies claims, vocabulary and fidelity | everything | |
| scripts | copy text, run rules, count | files | |

A, B and C are separate agent runs, each given only what its row allows.
The separation is what makes the comparison in step 6 mean anything: B
cannot echo the statement, and C cannot fit the examples to the rules.

## Steps

1. **Decompose.** The decomposer splits the source into atomic claims and
   records, for each, where in the source it comes from. The ratifier
   accepts, splits or merges each one. A claim that turns out not to be
   atomic later (step 6) comes back here.

2. **Vocabulary.** The decomposer proposes predicates for the terms the
   claims use, each with its predicate line, in the formal file of the
   term's definition. The ratifier accepts each predicate line once. Claims
   never define predicates; a claim that needs a new one sends it back to
   this step. When several claims describe one event or object, the
   predicates name it (`registration(R, M)`, `at_desk(R)`), so the claims
   stay atomic and still meet in the vocabulary. A helper predicate defined
   by a rule (`has_registration(M) :- registration(_, M).`) belongs to the
   vocabulary too, with its own predicate line.

3. **Formalize.** A writes the rules for one claim, using only the
   vocabulary. A script copies the claim's statement into the formal file
   unchanged. If the claim cannot be expressed in rules, A says why in the
   note and writes none.

4. **State.** B writes `states`: what the rules say, in plain English, no
   more and no less.

5. **Examples.** C writes two or more examples from the statement, at least
   one the claim allows and one it forbids (or one conclusion it should
   produce). A script runs the claim's rules, with the vocabulary's own
   rules, over each example's facts and records whether the verdict
   matched.

6. **Compare.** The ratifier reads the statement against `states`, and
   reads the example results, asking four questions of the statement:
   - **Domain:** whom or what does it apply to?
   - **Modality:** is it a must, a may, or an is?
   - **Subject:** which event or object is it about, and do neighbouring
     claims share it?
   - **Allocation:** what do the definitions or the context already supply,
     and what does this claim add? What the context supplies is written
     down, in a definition's formal file, never left implicit in a claim's
     rules.

   Then sets fidelity and writes the note:
   - **yes**: `states` says what the statement says, and every example
     passes.
   - **strained**: they differ, and the ratifier accepts the difference as
     the best the language can do; the note says what is lost.
   - **no**: the statement cannot be expressed in the language.

   Where they differ and the difference is not accepted, the ratifier names
   the step at fault, and the claim goes back to it:
   - the claim holds two statements: step 1;
   - a predicate line is wrong, or a predicate is missing: step 2;
   - the rules say something else: step 3;
   - `states` misreads the rules: step 4;
   - an example misreads the statement: step 5.

   A failing example is never accepted as strained. Either the rules or the
   example is wrong.

7. **Check the argument** (optional; only for documents that argue step by
   step). For each claim that depends on others, check that its rules
   follow from theirs (`check.mjs`). A failure is a missing premise: it
   becomes a new claim, through step 1.

8. **Record.** Commit the files, naming the ratifier in the commit. A formal
   file whose statement, rules or predicate lines change after
   ratification loses its fidelity line and goes back through steps 4 to 6.

## File format

A claim's formal file:

```
% formalizes: claim:<id>
% statement:  <copied from the claim, by script>
% states:     <written by B>
% fidelity:   <yes | strained | no, set by the ratifier>
% note:       <the ratifier's reason; for strained, what is lost>
% ratified:   <ratifier, date>
<rules, written by A>
```

A definition's formal file holds its predicate lines and any rules the
term itself implies:

```
% formalizes: def:<id>
% predicate   registration(R, M): R is a registration of the member M.
<rules>
```

Examples, one file per claim, written by C:

```
% example:  a member registered twice
% expect:   forbidden
registration(r1, m1). registration(r2, m1).

% example:  a member registered once
% expect:   allowed
registration(r1, m1).
```

Lines that start with `%` are comments: Datalog ignores them.

## Tools

| step | tool |
|---|---|
| 3 | `node pilot/procedure.mjs statement <corpus> <claim>`: copy the statement into the formal file; clears states, examples, fidelity, note and ratified if it changed |
| 3, 4, 5 | `node pilot/procedure.mjs packet <corpus> <claim> A\|B\|C`: print exactly what that role is given, with its instructions |
| 4, 6 | `node pilot/procedure.mjs set <corpus> <claim> states\|fidelity\|note\|ratified <text>` |
| 5 | `node pilot/procedure.mjs examples <corpus> <claim> [--write]`: run each example, report verdicts, record the tally |
| 6 | `check.mjs`: count fidelity |
| 7 | `check.mjs`: check the argument |

The agents are separate runs given only their packet, with no access to
files.

## Amendment to the pilot

The pilot fixed its measures and stopping rule before it ran: fidelity
"yes" for at least half the claims of the tutorial corpus. Its fidelity
readings were the agent's own, judging its own Datalog, with nothing for
the ratifier to compare in plain English. This procedure replaces that
judgment with steps 3 to 6. The measures and the threshold are unchanged;
the agent's earlier readings are superseded once a claim has been through
step 6.
