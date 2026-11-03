---
type: handoff
audience: agent
updated: 2026-11-02
---

# Next steps for the agent

Read with [`operator-readme-next.md`](operator-readme-next.md). Rewrite both at the end of each thread; delete finished steps.

## State
- The repo names no other project. The projects that run this code, and which of them run it in CI, are in the git-ignored `LOCAL.md` on the owner's machine (the README says so). Treat `SCHEMA.md` and the CLIs as contracts: a breaking change breaks a downstream CI that runs `main`.
- `tutorial/` is gone (PR #20, 2 Nov 2026): the tutorial builder lives in its own public repo, and both downstream projects build from it. The README's History section records the move.
- Pilots live in `pilot/`: `README.md` says what a pilot is and how to run one, `PROCEDURE.md` is the procedure under test (atomic claims, a vocabulary of predicates, rules written blind of the examples, a blind English restatement, examples run against the rules, the ratifier comparing English with English), `procedure.mjs` its tools. One folder per instance holds that pilot's question, material and results. Keep the two apart: no instance results in `pilot/README.md` or `PROCEDURE.md`.
- Instances: `2026-11-02-formal-nodes/` (round 1, stopped on unratified readings and superseded by the other two; its corpora removed, in git history at `f6901b0`), `2026-11-02-registration-once/` (the reference example: one claim taken from a sentence to ratified Datalog), `2026-11-02-spinoza-one-claim/` (confirmed by the operator, not run).
- Formal text on nodes (Datalog payloads on claims) is paused and unresolved, not rejected: the operator asked on 2 Nov 2026 to keep it alive, and the README's "Paused: formal text on nodes" section (PR #33) records it. Don't describe round 1 as a rejection, and don't retire `pilot/check.mjs` or `pilot/scenario.mjs`. Without it, Datalog's role in the library is the lint: graph facts (`src/facts.js`) run through `lint/rules.dl`, plus a collection's own `dag/lint.dl`, which no downstream project has yet (checked 2 Nov 2026).
- `threads/` holds each thread's exchange, written at `/end` (step 4 of the global `/end` skill): `node ~/.claude/skills/end/thread-from-export.mjs --session threads/<name>.md --map threads/redact.json --title "…"` reads this session's transcript directly; a `/export` into `threads/raw/` is the fallback. `threads/redact.json` (and `threads/raw/`) are git-ignored and exist only in the main checkout, so run it there; the map lists the private names and is never committed. Quoted material from private repos is kept, by the operator's decision, but reported to them each time. A detail that identifies a private project even with its name redacted (its stack, its policy language) is cut (operator, 2 Nov 2026); the map lists such terms too. `threads/2026-11-02-library-pilot-run.md` is the first.
- The viewer is one static page built from one or more `dag/` folders, joined on id with a project menu. Checked 2 Nov 2026 in headless Chrome against both downstream projects: 564 nodes for one, 842 joined, 0 external.
- The lint fixtures and the `SCHEMA.md` examples use philosophical vocabulary (propositions, credences, grounds, a scale of assent); keep new examples in that register.

## Environment facts
- Node v22 (`node --test`, ES modules, no dependencies). `npm test` (47 tests), `npm run check|build`.
- Code docs: `README.md`. User guide: `docs/USAGE.md`. Node format: `SCHEMA.md`. Skill: `.claude/skills/dag/SKILL.md`.
- Worktrees go under `.claude/worktrees/` (git-ignored). Work is merged to `main` through a PR on GitHub (`markreveley/artifact-dag`). `/end` commits where the work is: on `main` it commits and pushes `main`; on a branch it opens a PR and merges it. The repo is public: name no other project in any file; `LOCAL.md` is the place for that.
- The auto-mode classifier refuses `git worktree remove --force`, `git branch -D` and `git push --delete`, and sometimes `gh pr merge` ("merge without review") unless the operator has just asked for that merge. Use `git worktree remove` on a clean worktree and `git branch -d` on a merged branch. GitHub now deletes a PR's branch when it merges (`delete_branch_on_merge` turned on 2 Nov 2026).
- Pilot agents (the procedure's A, B and C) run as separate subagents whose whole prompt is the `procedure.mjs packet` output plus "do not read files or use tools". A packet for several claims at once is fine within one role; never give one agent two roles.
- zsh: a word starting with `=` is expanded, so `echo =====` fails and aborts a command chain. Use `echo ----`.

## Next, in order
1. (when the operator says) Run the Spinoza pilot. Its claim (Proposition V), measures and stopping rule are confirmed in `pilot/2026-11-02-spinoza-one-claim/README.md`; the operator asked not to run it in the thread that set it up.
   Steps: step 1 (Proposition V's statement as one atomic claim, or split if it is not), step 2 (predicate lines from Definitions III to V, for the operator to ratify), then A, B and C as separate agents given only `procedure.mjs packet` output, then step 6 with the operator. Record results in the instance README.
2. When a downstream project's claims start describing a policy that also ships as Datalog, that is the trigger to pilot formal text on its `norm` claims (README, "Paused: formal text on nodes"; `pilot/2026-11-02-formal-nodes/README.md`, "What would reopen it").
3. (optional, when there is time) Vendor dagre into the viewer so a built page lays out offline. Today the page loads dagre from cdnjs and, without a network, falls back to a simple layered layout (README, "The viewer"). A downstream project raised it on 2 Nov 2026; the README's sentence changes with it.

Settled 2 Nov 2026, so not a step: the viewer stays in this repo and each project builds and publishes its own page (README, "The viewer").

## Pending operator decisions
- None.
