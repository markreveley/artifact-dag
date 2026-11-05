# Second adversarial audit: code and content

| | |
|---|---|
| Scope | as [the first audit](2026-11-02-adversarial-audit.md): the code and the written content, the pilots included |
| Commit checked | `35661d4` (`main`, 2 Nov 2026, after the first audit's fixes) |
| Date | 2026-11-02 |
| Run by | an agent in a Claude Code session, at the operator's request; each bug reproduced, the viewer ones in headless Chrome |
| Fixes | PR #36, merged as `e684b50`: `236b047` (library), `2bf742e` (docs and pilot notes). Both downstream `dag/` folders gave byte-identical `dagcheck --json` and `--lint --json` output on `main` and on the branch, and the downstream glossary check gave the same result on both (P8) |
| Written up | 2026-11-05, from those commits and the thread file, which is in git history at `ad20960:threads/2026-11-02-second-audit.md` and in thread-archive |

**Changed since the first audit.** Every item on the first audit's list
was addressed in the tree checked. One of its fixes introduced a new fault:
the `walked` set added in `af074a1` to report a cycle once could hide a
cycle (the first row below). Tests went from 72 to 83. Paths are as they
were at `35661d4`.

## Code

| item | result | fix |
|---|---|---|
| Datalog evaluator, lint rules, the viewer's HTML escaping, under adversarial input | held | |
| 72 tests pass; no private name in a tracked file (P9) | held | |
| Every cycle is found | did not hold: a cycle whose first edge led into a dead-end branch or another cycle was missed, exit 0 | `236b047`: Tarjan's SCC |
| One node cannot break the built page | did not hold: a node holding `<!--<script>` left the page loading forever | `236b047`: `<` written as `<` in the inlined JSON |
| `--lint` on a list in a one-value field | did not hold: crashed | `236b047`: `bad_field` |
| `--title` taken literally | did not hold: `$&` was read as a pattern | `236b047`: function replacement |
| A wikilink that is not an id is a `bad_link`, as SCHEMA says | did not hold: dropped silently, and hidden from `unlinked_term` | `236b047` |
| A missing baseline in CI | did not hold: written fresh, exit 0, hiding every finding | `236b047`: an error when `CI` is set |
| Viewer search speed | did not hold: layout re-ran on every keystroke, about 520 ms on 564 nodes | `236b047`: positions cached, about 12 ms |
| The three CLIs read the same files | did not hold: `README.md` and symlinks treated differently | `236b047`: one walker, `src/files.js`; `README.md` is never a node |
| An apostrophe inside a word | did not hold: opened a quote | `236b047` |
| Unreadable frontmatter is reported | did not hold: dropped or misreported | `236b047`: `bad_frontmatter` |
| A node with no id has no edges | did not hold | `236b047` |
| Lint findings sort when a collection rule derives a number | did not hold: latent crash | `236b047` |
| `dagcheck --lint dag/` (flag first) | did not hold: ENOENT stack | `236b047`: a usage error |
| `.claude/worktrees/` git-ignored in the repo | did not hold: only in one machine's global excludes | `236b047` |
| The dagre script tag carries an integrity hash | did not hold | open: [issue](../issues/2026-11-02-dagre-without-integrity.md) |
| One wikilink pattern and one HTML escaper | did not hold: four patterns with different label rules, five escapers | walker shared (`236b047`); the rest open: [issue](../issues/2026-11-02-duplicated-wikilink-and-escape-code.md) |

## Content and pilots

| item | result | fix |
|---|---|---|
| README: the fixtures trip every lint rule | did not hold: no resources, so the two resource rules are covered only in `test/lint.test.js` | `2bf742e` |
| `examples/dag/README.md` on `refines` | did not hold | `2bf742e` |
| SCHEMA: `observation` "likely to follow"; `narrower_unlinked` by title only | did not hold: in use; also matches aliases | `2bf742e` |
| USAGE: where `dag check --json` writes | did not hold: into the project repo, unsaid | `2bf742e` |
| Spinoza pilot readable whether it passes or fails | did not hold: one claim, no control | `2bf742e` notes it before the run; a control is the operator's decision (`next-operator.md`) |
| Spinoza source neutral between the readings | did not hold: the proof and VI to VIII restate V as "an identical attribute" | `2bf742e`: noted in the pilot README before the run |
| Registration-once record names the step-6 clause its "yes" rests on | did not hold | `2bf742e` |
| `formal/def-member.dl` free of redundant predicates | did not hold: `member` and `registered` are mutual synonyms | open: [issue](../issues/2026-11-02-def-member-mutual-synonyms.md) |

## Not checked

- The pilot tools' own file walkers, left apart from `src/files.js` since
  `pilot/` is not part of the library.
- Whether a blind agent knows the Spinoza objection from training (as in
  the first audit).
