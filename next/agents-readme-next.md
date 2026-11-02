---
type: handoff
audience: agent
updated: 2026-11-01
---

# Next steps for the agent

Read with [`operator-readme-next.md`](operator-readme-next.md). Rewrite both at the end of each thread; delete finished steps.

## State
- `main` has PR #15 (federation push docs) and PR #16 (these `next/` files; the operator chose to commit them). PR #17 brings the README Plan up to date.
- Cleaned up 2026-11-01: no other worktrees, no local or remote branches besides `main`. PRs #1–#15 are all merged.
- Verified 2026-11-01: `npm test` passes 43/43. `npm run check -- examples/dag` reports 13 nodes, 30 edges, 1 expected external (`claim:simpsons-paradox-example`).
- Built so far, per git history: schema and parser, viewer, `dag` skill and user guide, lint (Datalog rules), bundle, federation view and `dag push`, resource nodes, `build-viewer --config`, and the tutorial builder and glossary generator.
- All four README Plan steps are done. Step 3, the second instance, is the "Identikey DAG" artifact (slug `2ebe86e8-782b-4ca7-becf-ec5ef42ed536`, published 2026-10-23, built from `viewer/template.html`). The home viewer is "DAG definitions and claims" (`59e0283c-41ba-4c4b-a987-cf783e8644aa`), and the federation view is "DAG federation" (`ae552cb1-2c01-4a3e-9968-71cd993e82af`).
- The tutorial builder (`tutorial/build.py`) has not been run this thread.

## Environment facts
- Node v22 (`node --test`, ES modules, no dependencies). `npm test`, `npm run check|build|bundle`.
- `tutorial/build.py` needs the Python `markdown` package, which isn't installed on this Mac (`pip install markdown`).
- Federation artifact: `federation.json` (URL, home project `chan_01GFKrqThRGDGVhAsbPKomn7`, slug `dag`).
- Code docs: `README.md`. User guide: `docs/USAGE.md`. Node format: `SCHEMA.md`. Artifact platform notes: `docs/platform/`. Project skill: `.claude/skills/dag/SKILL.md`.
- Worktrees go under `.claude/worktrees/`. Work is merged to `main` through a PR on GitHub (`markreveley/artifact-dag`).

## Next, in order
1. (blocked on operator) Find out what to work on next. See the operator file, Questions.

## Pending operator decisions
- What to work on next. The original plan is finished, and the repo records no further roadmap.
