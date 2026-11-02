---
type: handoff
audience: operator
updated: 2026-11-02
---

# Next steps for the operator

Read with [`agents-readme-next.md`](agents-readme-next.md).

## 1. Ratify the pilot's fidelity readings

The pilot (`pilot/README.md`) stopped on the agent's reading of which library-tutorial claims formalize faithfully: 13 yes, 15 strained, 8 no. That reading is yours to confirm or change.

1. Open `pilot/library/formal/`. Each file has a line `% fidelity: yes|strained|no — reason` under its `% formalizes:` line, and the Datalog below. The claim's prose is in `pilot/library/dag/claims/`, and the whole tutorial is `pilot/library/tutorial.md`.
2. Where you disagree, change the word. Keep or replace the reason.
3. Run `node pilot/check.mjs pilot/library` and read its last line: `fidelity: N yes, N strained, N no`.
4. Tell the next session the three numbers. 18 or more "yes" reopens the question; fewer confirms the stop.

## 2. Finish the tutorial move

In this order. `LOCAL.md` (git-ignored, on your Mac) names the projects and the PR numbers.

1. In the downstream project that has CI: create the fine-grained token and the `TUTORIAL_TEMPLATE_TOKEN` secret as its own `next/operator-readme-next.md` says (step 0), then merge its PR and check that the `site` workflow is green on `main`.
2. In the other downstream project: merge its PR.
3. Here: merge PR #20, "Move tutorial/ to its own repo". If GitHub leaves the remote branch `move-tutorial`, delete it on the PR page.

## Questions
- The DAG viewer: should CI publish it (every node becomes public), or does it stay a page each person builds locally?
