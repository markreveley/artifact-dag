# artifact-dag: working rules

Rules for any agent and for people. The global rules in
`~/.dotfiles/agents/AGENTS.md` apply first. `CLAUDE.md` imports this file
and adds nothing. The layout follows
[repo-template](https://github.com/markreveley/repo-template).

## Read first

1. `README.md`: what the repo is and the table of what is where.
2. `next-agents.md` and `next-operator.md`: where the last thread stopped.
   `/start` reads them; `/end` rewrites them. What to work on comes from
   `next-agents.md`.
3. `md/governance/POLICY.md` before any change: its rules are numbered
   (`P8`) and cited below. `md/governance/SCHEMA.md` before touching a
   node, the parser or a CLI. `md/governance/ARCHITECTURE.md` before changing how
   the parts fit, or choosing a tool a decision there already settles.
   `pilot/PROCEDURE.md` before running a pilot.

## Where things are

- Code: `src/`, `bin/`, `lint/rules.dl`, `viewer/template.html`, `test/`.
  Example collection: `examples/dag/`. Pilots: `pilot/`. Evals brought from
  another project: `evals/`. These Markdown folders are content, not
  documents, and are listed in `.layoutignore`.
- `md/`: every document about the repo. `md/governance/` the governing
  documents, `md/docs/USAGE.md` the user guide, `md/analysis/`,
  `md/plans/`, `md/research/` (surveys of outside tools), `md/threads/`. Each folder's README says what belongs in it.
- `.claude/skills/dag/SKILL.md`: what Claude does with `dag …` requests in
  a downstream project. It cites the policy; it does not restate it.
- `LOCAL.md` (git-ignored): the projects that run this code and which of
  them run it in CI. This repo is public: name no other project in any
  tracked file (P9).

## Working

- Node v22, no dependencies. `npm test` (83 tests), `npm run check`,
  `npm run build`. Tests before a PR.
- Changes reach `main` through a PR (P10). Worktrees go under
  `.claude/worktrees/` (git-ignored); never touch another session's.
- `md/governance/SCHEMA.md` and the three CLIs are contracts (P8). Before
  merging a change to the parser, `dagcheck`, `build-viewer` or
  `dag-to-glossary`, run both downstream `dag/` folders and the downstream
  glossary check against `main` and compare; `LOCAL.md` says where they
  are.
- Threads are archived at `/end` into `md/threads/`, redacted with
  `md/threads/redact.json` (git-ignored). After adding a term to the map,
  rescan every tracked file for it (P9). `md/threads/README.md` says how.
- Pilot agents run only through `pilot/procedure.mjs blind`, never as
  subagents: a subagent has tools and the repo states what pilots look
  for. One run per claim per role.
- The lint fixtures and the schema's examples use philosophical vocabulary
  (propositions, credences, grounds, a scale of assent); keep new examples
  in that register.

## Gotchas

- The auto-mode classifier refuses `git worktree remove --force`,
  `git branch -D` and `git push --delete`, and sometimes `gh pr merge`
  unless the operator just asked for it. GitHub deletes a PR's branch on
  merge. Right after a push, `gh pr merge` can report conflicts while
  `gh pr view <n> --json mergeable` still says `UNKNOWN`; wait for
  `MERGEABLE`.
- Headless Chrome (`--headless=new --dump-dom` or `--screenshot`) checks
  the viewer; its window is never narrower than 500px.
- zsh expands a word starting with `=`, so `echo =====` aborts a command
  chain. Use `echo ----`.
- Other sessions may be running in `.claude/worktrees/` here and in the
  downstream repos. Before calling a downstream difference a regression,
  rerun with `main`'s code and look at `git worktree list` and the
  downstream `git log`.
