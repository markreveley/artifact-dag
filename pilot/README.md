# Pilots

A pilot is a bounded test of whether a method is worth building into
artifact-dag, run on a small corpus before anything changes in `SCHEMA.md`
or the tools. Nothing under `pilot/` is part of the library.

This file says what a pilot is and how to run one. What a particular pilot
asked, did and found is in its own folder.

## What is here

| path | what |
|---|---|
| `PROCEDURE.md` | the procedure under test: turning a source into atomic claims, formalizing a claim, and ratifying the formalization |
| `procedure.mjs` | tools for the procedure's steps (`statement`, `packet`, `blind`, `examples`, `set`) |
| `check.mjs` | counts fidelity across a pilot's formal files; checks that a claim's rules follow from the claims it depends on (the procedure's step 7) |
| `scenario.mjs` | runs every rule of a pilot over a file of facts and reports which claims the facts break |
| `<date>-<name>/` | one pilot instance |

## A pilot instance

One folder per pilot, named `<date it started>-<short name>`:

```
<date>-<name>/
  README.md        the question, the measures and stopping rule, what was done, results, insights
  source.md        the source text, or the part of it the pilot uses, with where it comes from
  task.md          what the decomposer (D) is asked to do; it names nothing the pilot looks for
  runs/            each agent run's answer, as returned: <step>-<role>[-<claim>].txt
  dag/             claim and definition nodes, in the format of SCHEMA.md
  formal/          one formal file per formalized node (format in PROCEDURE.md)
  examples/        one examples file per claim (format in PROCEDURE.md)
```

## Running one

1. **Before anything is formalized,** write the instance README: the
   question, what will be measured, and the stopping rule. Commit it, with
   `source.md`. A source written for the pilot is committed as prose before
   it is decomposed, so it is not shaped to fit.
2. **Run the procedure** (`PROCEDURE.md`), one claim at a time. Each agent
   (D, A, B, C) is a separate blind run given only its packet; save each
   answer under `runs/` before using it, and copy it into the files
   unchanged:

   ```sh
   I=pilot/<instance>; mkdir -p $I/runs
   node pilot/procedure.mjs blind $I - D > $I/runs/1-D.txt             # steps 1-2
   #   ratifier accepts, splits or merges the claims and accepts each predicate
   #   line; claims go into $I/dag, predicate lines into $I/formal/def-*.dl
   node pilot/procedure.mjs statement $I <claim-id>
   node pilot/procedure.mjs blind $I <claim-id> A > $I/runs/3-A-<slug>.txt
   #   A's RULES go under the header of the claim's formal file
   node pilot/procedure.mjs blind $I <claim-id> B > $I/runs/4-B-<slug>.txt
   node pilot/procedure.mjs set $I <claim-id> states "<B's text>"
   node pilot/procedure.mjs blind $I <claim-id> C > $I/runs/5-C-<slug>.txt
   #   C's cases go into $I/examples/<slug>.dl
   node pilot/procedure.mjs examples $I <claim-id> --write
   node pilot/procedure.mjs set $I <claim-id> fidelity yes             # step 6: also note, ratified
   ```

   `blind` prints the model each run used on stderr; the instance README
   records it. `packet` prints a packet without running it, to read what an
   agent will be given.

3. **Validate** the nodes with the library's own checker:
   `node bin/dagcheck.js pilot/<instance>/dag --lint`.
4. **Record** the results and insights in the instance README. A change the
   pilot shows the procedure needs goes into `PROCEDURE.md`, in the same
   commit, and the instance README says so.
5. **Decide** against the stopping rule. A pilot that passes leads to a
   proposal for `SCHEMA.md` or the tools; one that stops records what would
   reopen it.

Sources in this public repo name no other project. A pilot on private
material keeps that material out of the repo.

## Instances

| folder | question | state |
|---|---|---|
| [`2026-11-02-formal-nodes/`](2026-11-02-formal-nodes/) | Is a `formal` node type, Datalog joined to claims and checked for entailment, worth adding? | round 1 stopped on unratified readings, a decision the two below supersede; its corpora removed; led to `PROCEDURE.md`. The idea is paused, not rejected |
| [`2026-11-02-registration-once/`](2026-11-02-registration-once/) | Does the procedure carry one claim from a sentence to ratified Datalog? | done as a dry run, the reference example: 2a ratified; its predicate lines not yet ratified line by line |
| [`2026-11-02-spinoza-one-claim/`](2026-11-02-spinoza-one-claim/) | Does the procedure recover the meaning of a claim from a text no one in the loop wrote? | confirmed; not run |
