---
type: handoff
audience: operator
updated: 2026-11-02
---

# Next steps for the operator

Read with [`agents-readme-next.md`](agents-readme-next.md).

## 1. Confirm the next pilot

Read `pilot/2026-11-02-spinoza-one-claim/README.md`: the claim (Proposition V of the *Ethics*), what will be measured, and the stopping rule. Say "go", or change any of the three. The agent commits it before anything is formalized.

## 2. Delete the merged branches on GitHub

Eleven merged PR branches are still on GitHub, because the repo doesn't delete head branches on merge. From this repo:

```sh
git push origin --delete dryrun end move-tutorial pilot procedure ratify scrub thread-archiving threads viewer-decision wrap
```

To stop it recurring: GitHub → markreveley/artifact-dag → Settings → General → Pull Requests → tick "Automatically delete head branches".

## Questions
- None.
