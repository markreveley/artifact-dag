---
type: handoff
audience: agent
updated: 2026-11-01
---

# Next steps for the agent

Read with [`operator-readme-next.md`](operator-readme-next.md). Rewrite both at the end of each thread; delete finished steps.

## State
- `main` at `a5c4b30` (PR #15 merged: federation push docs). `next/` handoff files committed (operator chose to keep them in the repo).
- Cleaned up 2026-11-01: no other worktrees, no local or remote branches besides `main`. PRs #1–#15 are all merged.
- Verified 2026-11-01: `npm test` passes 43/43. `npm run check -- examples/dag` reports 13 nodes, 30 edges, 1 expected external (`claim:simpsons-paradox-example`).
- Built so far, per git history: schema and parser, viewer, `dag` skill and user guide, lint (Datalog rules), bundle, federation view and `dag push`, resource nodes, `build-viewer --config`, and the tutorial builder and glossary generator.
- The README "Plan" section (`README.md:206`) is out of date: step 1 still says "(this)", and federation (step 4) has shipped. The repo doesn't say whether step 3 (a second viewer instance in another project) is done.
- The tutorial builder (`tutorial/build.py`) has not been run this thread.

## Environment facts
- Node v22 (`node --test`, ES modules, no dependencies). `npm test`, `npm run check|build|bundle`.
- `tutorial/build.py` needs the Python `markdown` package, which isn't installed on this Mac (`pip install markdown`).
- Federation artifact: `federation.json` (URL, home project `chan_01GFKrqThRGDGVhAsbPKomn7`, slug `dag`).
- Code docs: `README.md`. User guide: `docs/USAGE.md`. Node format: `SCHEMA.md`. Artifact platform notes: `docs/platform/`. Project skill: `.claude/skills/dag/SKILL.md`.
- Worktrees go under `.claude/worktrees/`. Work is merged to `main` through a PR on GitHub (`markreveley/artifact-dag`).

## Next, in order
1. (blocked on operator) Find out what this thread should work on. See the operator file, Questions.
2. Once step 3's status is known, bring the README "Plan" section up to date.

## Pending operator decisions
- What to work on next.
- Is Plan step 3 (a second viewer instance) done?
