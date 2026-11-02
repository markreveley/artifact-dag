---
type: handoff
audience: agent
updated: 2026-11-02
---

# Next steps for the agent

Read with [`operator-readme-next.md`](operator-readme-next.md). Rewrite both at the end of each thread; delete finished steps.

## State
- Local only since 2 Nov 2026. PR #18 added `build-viewer --dag`; the PR after it retired the Claude-app pieces: project mode and the files loader in the viewer, the federation (`federation.json`, `bin/push-plan.js`), `bin/bundle.js` and `_bundle.json`, and `docs/platform/`. `README.md`, `docs/USAGE.md` and `.claude/skills/dag/` describe a repo on the Mac. The old design is in git history and in the README's History section.
- The viewer is one static page built from one or more `dag/` folders (several are joined on id, with a project menu). Checked 2 Nov 2026 in headless Chrome: identikey-dev alone gives 564 nodes and 2142 edges, as `dagcheck` does; identikey-dev with lightning-mesh-dev gives 842 nodes, 3460 edges, 0 external.
- Projects using it: identikey-dev, lightning-mesh-dev (both keep `dag/` in their repo). identikey-labs plans `bin/code-anchors.js` here.
- The Claude-app artifacts ("DAG definitions and claims", "Identikey DAG", "DAG federation") still exist but nothing updates them; deleting them is the owner's (identikey-dev operator file, last step).

## Environment facts
- Node v22 (`node --test`, ES modules, no dependencies). `npm test`, `npm run check|build`.
- `tutorial/build.py` needs the Python `markdown` package.
- Code docs: `README.md`. User guide: `docs/USAGE.md`. Node format: `SCHEMA.md`. Skill: `.claude/skills/dag/SKILL.md`.
- Worktrees go under `.claude/worktrees/`. Work is merged to `main` through a PR on GitHub (`markreveley/artifact-dag`). The repo is public.

## Next, in order
1. (blocked on operator) The owner wants to discuss the DAG viewer next (where and how it is published). See the operator file.

## Pending operator decisions
- The viewer's direction: see the operator file.
