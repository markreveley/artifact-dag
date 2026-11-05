# Adversarial audit of the repo

| | |
|---|---|
| Scope | the whole repo: layout, the README and `docs/`, the handoff (`next/` then), the code (`bin/`, `src/`, `test/`), `pilot/`, `examples/` |
| Commit checked | `0c78297` (`main`, 2 Nov 2026) |
| Date | 2026-11-02 |
| Run by | an agent in a Claude Code session, at the operator's request; every bug below was reproduced in a scratch folder, not read off the code |
| Fixes | PR #35, merged as `1221f1c`: `227b117` (thread file), `c72f2c0` (pilots), `af074a1` (library), `199630b` (docs and examples), `7af9f5f` (the operator's decisions) |
| Written up | 2026-11-05, from those commits and the thread file, which is in git history at `ad20960:threads/2026-11-02-audit.md` and in thread-archive |

Paths are as they were at `0c78297`: `SCHEMA.md` and `docs/USAGE.md` sat
where `md/governance/SCHEMA.md` and `md/docs/USAGE.md` are now. A later
audit of the same scope is
[2026-11-02-second-adversarial-audit](2026-11-02-second-adversarial-audit.md).

## Layout and privacy

| item | result | fix |
|---|---|---|
| Library code apart from docs, pilots, handoff and threads | held | |
| No tracked file holds a term from the private names list (P9) | did not hold: a thread file named details of a private project's stack, and was already pushed | `227b117` reworded it; the terms went on the private check list. The operator ruled to leave history as it is |

## Code

| item | result | fix |
|---|---|---|
| 47 tests pass | held | 72 after the fixes |
| Datalog evaluator and lint rules; the rules match SCHEMA's table | held | |
| `dagcheck` keeps a baseline file it cannot read | did not hold: a corrupt baseline was overwritten, hiding every warning | `af074a1`: refused |
| `dag-to-glossary` reads tags and uses as the parser does | did not hold: its own reader dropped block lists, so a term vanished | `af074a1`: the shared parser; downstream glossary output unchanged |
| A malformed id in an edge field is an error | did not hold: reported as an external link (`info`) | `af074a1`: `bad_link` |
| A cycle is reported once, whatever the file order | did not hold: twice in one order; `dagcheck` did not sort files and the viewer did | `af074a1`: sorted, reported once |
| Viewer page: doctype, charset, viewport | did not hold | `af074a1` |
| Viewer: a linked node's title is escaped | did not hold | `af074a1` |
| Viewer: a hidden duplicate's edges are left out of a joined page | did not hold | `af074a1`; the merge and the Markdown moved to `src/` to be tested in Node |
| `build-viewer` from a path with a space | did not hold | `af074a1` |

## Docs and examples

| item | result | fix |
|---|---|---|
| USAGE's `refines` direction | did not hold: backwards | `199630b` |
| SCHEMA on formal text | did not hold: "not adopted", against the README's "paused" | `199630b` |
| Wording from when nodes lived in Claude projects | did not hold: SCHEMA, `examples/dag/README.md`, `pilot/check.mjs` | `199630b`, `c72f2c0` |
| One command table | did not hold: the skill copied USAGE's, and they had drifted | `199630b`: the skill points to USAGE |
| SCHEMA's examples match `examples/dag/` | did not hold; its resource example broke the philosophical-register rule | `199630b`: quoted from `examples/dag/`, a test keeps them in step |
| `dag-to-glossary` documented in USAGE | did not hold | `199630b` |
| The example collection passes its own lint | did not hold: 5 `unlinked_term` warnings; `conditionalization` wrongly `refines` credence | `199630b` |
| The examples show the document fields, `not_links`, scales and `pervasive` | did not hold | `199630b`: `examples/dag/README.md` says what is not shown and that the lint fixtures have most of it |
| The handoff matches the repo (test count, pilot states) | held | |

## Pilots

| item | result | fix |
|---|---|---|
| The Spinoza pilot's agents cannot learn its answer | did not hold: the decomposer who wrote the predicate lines knew the flaw, and the lines reached A and C | `c72f2c0`: the decomposer is a blind run (D) from a neutral `task.md`; the pilot README's "Amendment" |
| Blindness is enforced | did not hold: subagents were told not to read files, in a repo that states the flaw | `c72f2c0`: `procedure.mjs blind` gives the packet to `claude -p` with no tools, in an empty folder |
| `procedure.mjs` never writes over a ratified file | did not hold: two claim ids shared one formal file | `c72f2c0`: files named by full id (`lib-2a.dl`) |
| `procedure.mjs statement` on a pilot with no `formal/` yet | did not hold (found while fixing) | `c72f2c0` |
| `PROCEDURE.md` and `pilot/README.md` match the tools' files and steps | did not hold | `c72f2c0` |
| The reference pilot's state | did not hold: "done", with predicate lines never ratified line by line | `c72f2c0` |
| `check.mjs` reads the current file format | did not hold: took the note line as the fidelity reason; called a ratified norm "fails" | `c72f2c0` |
| `scenario.mjs` takes `--show` as its usage line says | did not hold; its defaults belonged to a deleted corpus | `c72f2c0` |

The operator also confirmed that the blind decomposer's output counts for
the Spinoza pilot's measure 2 (`7af9f5f`).

## Not checked

- Test coverage as such: the glossary tool, the pilot tools and the
  viewer's runtime code had no tests, and the fixes added them
  (`af074a1`, `c72f2c0`).
- A known objection reaching a blind agent from its training cannot be
  checked; each answer is saved with its model, and the results note any
  output that names the objection.
