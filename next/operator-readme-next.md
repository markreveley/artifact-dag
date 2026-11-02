---
type: handoff
audience: operator
updated: 2026-11-02
---

# Next steps for the operator

Read with [`agents-readme-next.md`](agents-readme-next.md).

## 1. Ratify the pilot's fidelity readings

The pilot (`pilot/README.md`) stopped on the agent's reading of which library-tutorial claims formalize faithfully: 13 yes, 15 strained, 8 no. That reading is yours to confirm or change.

1. Open `pilot/library/formal/`. Each file shows the claim (`% claim:`, `% says:`), then `% fidelity: yes|strained|no — reason`, then the Datalog. Lines starting with `%` are comments; the rest are rules. The 15 files marked `strained` are the ones that decide it.
2. Where you disagree, change the word. Keep or replace the reason.
3. Run `node pilot/check.mjs pilot/library` and read its last line: `fidelity: N yes, N strained, N no`.
4. Tell the next session the three numbers. 18 or more "yes" reopens the question; fewer confirms the stop.

## 2. One local branch to delete

`git branch -D tutorial-split` in this repo. It is the split-out history that became the tutorial repo's `main`; nothing depends on it, and the agent's permissions do not allow a force delete.

## Questions
- None.
