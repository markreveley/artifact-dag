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
- Instances: `2026-11-02-formal-nodes/` (round 1, stopped; its corpora removed, in git history at `f6901b0`), `2026-11-02-registration-once/` (the reference example: one claim taken from a sentence to ratified Datalog), `2026-11-02-spinoza-one-claim/` (set up, not run).
- `threads/2026-11-02-library-pilot-run.md` is this thread's exchange, from `/export`: user turns and assistant text only, other projects' names replaced by placeholders (the mapping is in `LOCAL.md`). Quoted material from private repos is kept, by the operator's decision. A new thread gets a new file.
- The viewer is one static page built from one or more `dag/` folders, joined on id with a project menu. Checked 2 Nov 2026 in headless Chrome against both downstream projects: 564 nodes for one, 842 joined, 0 external.
- The lint fixtures and the `SCHEMA.md` examples use philosophical vocabulary (propositions, credences, grounds, a scale of assent); keep new examples in that register.

## Environment facts
- Node v22 (`node --test`, ES modules, no dependencies). `npm test` (47 tests), `npm run check|build`.
- Code docs: `README.md`. User guide: `docs/USAGE.md`. Node format: `SCHEMA.md`. Skill: `.claude/skills/dag/SKILL.md`.
- Worktrees go under `.claude/worktrees/` (git-ignored). Work is merged to `main` through a PR on GitHub (`markreveley/artifact-dag`). The repo is public: name no other project in any file; `LOCAL.md` is the place for that.
- The auto-mode classifier refuses `git worktree remove --force`, `git branch -D` and `git push --delete`. Use `git worktree remove` on a clean worktree and `git branch -d` on a merged branch, and leave remote branch deletion to GitHub's auto-delete or the operator.

## Next, in order
1. (blocked on operator) The Spinoza pilot: the operator confirms the claim (Proposition V proposed), the measures and the stopping rule in `pilot/2026-11-02-spinoza-one-claim/README.md`. Commit that before step 3.
2. Run it: step 1 (Proposition V's statement as one atomic claim, or split if it is not), step 2 (predicate lines from Definitions III to V, for the operator to ratify), then A, B and C as separate agents given only `procedure.mjs packet` output, then step 6 with the operator. Record results in the instance README.
3. When a downstream project's claims start describing a policy that also ships as Datalog, that is the trigger to pilot formal text on its `norm` claims (`pilot/2026-11-02-formal-nodes/README.md`, "What would reopen it").

Settled 2 Nov 2026, so not a step: the viewer stays in this repo and each project builds and publishes its own page (README, "The viewer").

## Pending operator decisions
- The Spinoza pilot's claim, measures and stopping rule (step 1).
