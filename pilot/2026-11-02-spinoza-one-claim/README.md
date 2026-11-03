# Pilot: one claim from the Ethics

Set up 2 November 2026. The claim, the measures and the stopping rule below
were confirmed by the operator the same day, before anything was
formalized. Not run.

## Question

Does [`../PROCEDURE.md`](../PROCEDURE.md) recover the meaning of a claim from
a text that no one in the loop wrote, and does it surface a known flaw in
that claim without being told?

The earlier single-claim pilot ([`../2026-11-02-registration-once/`](../2026-11-02-registration-once/))
used a source the agent had written, so it could show the procedure working
but not that it recovers someone else's meaning.

## The source

[`source.md`](source.md): Spinoza, *Ethics*, Part I, definitions, axioms and
propositions I to VIII, in Elwes's 1883 translation (public domain).

## The claim

**Proposition V:** "There cannot exist in the universe two or more
substances having the same nature or attribute."

Why this one: it has a known flaw, so the pilot has an answer to check
against. Spinoza's proof shows only that two substances cannot share their
*whole* nature; it does not rule out two substances that share one
attribute and differ in another (the objection usually credited to
Leibniz). The statement's "the same nature or attribute" hides exactly that
ambiguity: one attribute in common, or all of them?

The claim is the proposition, not its proof. Its vocabulary comes from
Definitions III, IV and V (substance, attribute, mode).

## Measures

1. **Fidelity**, set by the ratifier at step 6, with the note.
2. **Where the ambiguity surfaces, if anywhere**, and in whose output:
   A's `CANNOT` or `MISSING`, B's `states`, C's examples (in particular,
   whether C writes a case of two substances sharing one attribute and
   differing in another, and what C expects of it), or the step 6
   comparison.
3. **What step 6 sends back**, if anything, and to which step.

The ratifier already knows of the flaw, so the ratifier's own judgment at
step 6 cannot count as surfacing it. Only the agents' outputs count for
measure 2.

## Stopping rule

- **The procedure passes** if measure 2 finds the ambiguity in at least one
  agent's output, without the agents having been told of it.
- **It fails** if all three agents' outputs read "same nature or attribute"
  one way without remark. Then record why, and what the procedure would
  need to catch it (for example, a step that asks the example writer for a
  boundary case).

## Amendment, 2 November 2026, before the run

An audit of the setup found two ways the agents could be told of the flaw.
The operator chose to close both before running. The claim, the measures
and the stopping rule above are unchanged.

1. **Steps 1 and 2 are a blind agent's.** As set up, the session's agent
   would have split the proposition and written the predicate lines. That
   agent has read this README, and its predicate lines reach A and C: the
   round-1 pilot met this very ambiguity in choosing between
   `same_attribute` and `distinguished_by_attribute`. The decomposer (D)
   is now a separate run given only [`task.md`](task.md) and
   [`source.md`](source.md). The ratifier still accepts, splits or merges
   its claims and accepts each predicate line. The session's agent copies
   outputs into files unchanged.
2. **No agent can see the repo.** D, A, B and C run through
   `node pilot/procedure.mjs blind`: no tools, no files, no memory, from an
   empty folder. As set up they would have been subagents told not to read
   files, in a repo that states the flaw here, in the round-1 README and in
   both thread files.

D is now an agent that has not been told of the flaw, so its output counts
for measure 2 like A's, B's and C's: a split of "nature or attribute", a
predicate that separates sharing one attribute from sharing all, or a note.

What blindness cannot rule out is a model that knows the *Ethics*, and the
objection, from its training. Each run's answer is kept in `runs/` with the
model that gave it, and the results say if an output names the objection or
its author.

## Results

Not run.
