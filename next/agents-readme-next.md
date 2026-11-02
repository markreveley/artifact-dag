---
type: handoff
audience: agent
updated: 2026-11-02
---

# Next steps for the agent

Read with [`operator-readme-next.md`](operator-readme-next.md). Rewrite both at the end of each thread; delete finished steps.

## State
- The repo names no other project. The projects that run this code, and which of them run it in CI, are in the git-ignored `LOCAL.md` on the owner's machine (the README says so). Treat `SCHEMA.md` and the CLIs as contracts: a breaking change breaks a downstream CI that runs `main`.
- `tutorial/` is moving out: PR #20 removes it; its history went to a separate repo on 2 Nov 2026. #20 merges after the two downstream projects' PRs that repoint their builds (numbers in `LOCAL.md`); one of those needs a CI secret the operator creates first.
- The formal-nodes pilot (`pilot/`) ran on 2 Nov 2026 and stopped by its own rule: 13 of 36 tutorial claims formalized with fidelity "yes" on the agent's reading. Results, the language's limits and what would reopen it: `pilot/README.md`. `pilot/check.mjs` (entailment with mutations) and `pilot/scenario.mjs` (a corpus's norms run over facts) are reusable. No schema change was made; `SCHEMA.md` says so under Claim.
- `threads/2026-11-02-formal-nodes.md` is that thread's exchange, names redacted. Append to it, or start a new file, at the end of a thread.
- The viewer is one static page built from one or more `dag/` folders, joined on id with a project menu. Checked 2 Nov 2026 in headless Chrome against both downstream projects: 564 nodes for one, 842 joined, 0 external.
- The lint fixtures and the `SCHEMA.md` examples use philosophical vocabulary (propositions, credences, grounds, a scale of assent); keep new examples in that register.

## Environment facts
- Node v22 (`node --test`, ES modules, no dependencies). `npm test` (47 tests), `npm run check|build`.
- Code docs: `README.md`. User guide: `docs/USAGE.md`. Node format: `SCHEMA.md`. Skill: `.claude/skills/dag/SKILL.md`.
- Worktrees go under `.claude/worktrees/` (git-ignored). Work is merged to `main` through a PR on GitHub (`markreveley/artifact-dag`). The repo is public: name no other project in any file; `LOCAL.md` is the place for that.
- The auto-mode classifier refuses `git worktree remove --force`, `git branch -D` and `git push --delete`. Use `git worktree remove` on a clean worktree and `git branch -d` on a merged branch, and leave remote branch deletion to GitHub's auto-delete or the operator.

## Next, in order
1. (blocked on operator) Fidelity ratification for the pilot. The operator edits the `% fidelity:` lines in `pilot/library/formal/*.dl`; then run `node pilot/check.mjs pilot/library` and read its last line. 18 or more "yes" of 36 reopens the question, and the proposal to make then is the narrow one in `pilot/README.md` ("What would reopen it", item 1): formal text on `norm` claims plus a scenario runner, not a general `formal` type. Fewer confirms the stop; nothing to do.
2. The tutorial move: #20 merges once the downstream project with CI has merged its repoint PR (its `site` check must be green; the tutorial repo went public on 2 Nov 2026, so no token is involved). After #20: `git branch -d move-tutorial tutorial-split` locally, and the remote `move-tutorial` if GitHub kept it.
3. When a downstream project's claims start describing a policy that also ships as Datalog, reopen the pilot on that corpus: formal text for its `norm` claims, `pilot/scenario.mjs` over real facts, the shipped policy text as the formal node. That is the trigger `pilot/README.md` names.

Settled 2 Nov 2026, so not a step: the viewer stays in this repo and each project builds and publishes its own page (README, "The viewer").

## Pending operator decisions
- Fidelity ratification (step 1).
