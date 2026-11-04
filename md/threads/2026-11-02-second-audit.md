---
type: thread
date: 2026-11-02
source: Claude Code session transcript, filtered and redacted
---

# Second adversarial review: five reproduced bugs fixed (PR #36), docs and pilot notes brought in line

The exchange of a working session, from Claude Code's session transcript. Kept: the user's turns
and the assistant's text replies. Removed: tool calls, tool output, thinking, injected skill and
system text, and housekeeping slash commands. The transcript was read while the session ran, so
the assistant's last reply may be missing.
Names of other repositories, projects and products are replaced by placeholders:

- **[project A]**: a private project with a DAG, and [product A] the product its tutorial describes
- **[project B]**: a second private project with a DAG, joined with A's in the viewer; [product B] its product
- **[repo C]**: a repo of threads kept as files, with a planned knowledge base
- **[repo D]**: a repo and notation for typed statement graphs that a person ratifies
- **[repo E]**: a repo of evaluation procedures
- **[tutorial repo]**: the repo that `tutorial/` moved to
- **[identifier type]**: [product A]'s identifier
- **[stack detail]**: a detail of a private project's stack, cut

---
**User:**
do an adversarial code and content review of this repo

**Assistant:**
I'll start by mapping the repo, then review both the code and the written content with an adversarial eye.

Tests pass and the leak grep is clean. Next I'm reproducing the suspected code bugs and reading the content files (USAGE, skill, pilot, next, threads).

Done with the checks. Writing up the review now.

Overall: the library is in decent shape. The Datalog evaluator, the lint rules, and the viewer's HTML escaping held up under adversarial inputs, all 72 tests pass, and no private name or stack term from the redaction list appears in any tracked file. I found five real bugs, all reproduced, one of which is a regression from the last audit's fix.

## Bugs reproduced

1. **Cycle detection can miss a cycle.** In `src/parse.js:152`, the walk from a stuck node follows its first stuck neighbour. When that neighbour is a dead-end branch hanging off the cycle, the walk ends there, the cycle node is marked walked, and the cycle is never reported. Repro: `def:p uses [def:d, def:q]`, `def:q uses [def:p]` gives zero problems and exit 0. The `walked` set came in with commit af074a1, the fix for the double report. Neither downstream DAG hides a cycle today, checked with a Tarjan pass. A fix that passes the existing tests plus this case: walk only over nodes that are stuck in both the forward and the reversed Kahn pass.

2. **One node can blank the whole built page.** `bin/build-viewer.js:63` escapes `</` but not `<!--` or `<script`. A node whose text contains `<!--<script>` puts the HTML tokenizer into the script double-escaped state, the real closing tag no longer closes the script, and the page shows "loading" forever. Verified in headless Chrome. Escaping `<` as `\u003c` in the JSON covers this and the `</` case together.

3. **`--lint` crashes on a list-valued scalar field.** The frontmatter reader turns `title: [Alpha, Beta]` into an array for any key, then `src/facts.js:20` fails with `s.trim is not a function`. The validator reports nothing before the crash. Coerce or report non-list keys given lists.

4. **`--title` is passed as a string replacement.** `bin/build-viewer.js:66` uses the string form of `replace`, so `$&` and `$'` are interpreted. `--title 'Cost $& more'` yields `<title>Cost __TITLE__amp; more</title>`. The other two replacements already use the function form.

5. **A malformed wikilink is invisible to both tools.** `[[credence]]` or `[[def credence]]` is silently dropped in `src/parse.js:111`, since only `x:y`-shaped targets reach `bad_link`. Then `src/facts.js:15` blanks every `[[...]]` before scanning, so `unlinked_term` cannot see the word either. SCHEMA.md says a wikilink naming a non-id is a `bad_link` error. Either make the code match or change the sentence.

## Hazards and smaller issues

- **Baseline footgun in CI.** `bin/dagcheck.js:65` writes a fresh baseline when the path does not exist and exits 0. A typo'd or uncommitted baseline path in CI suppresses every warn and info finding on every run, with only a stderr line. Refuse to create one when `CI` is set, or require an explicit write flag.
- **The viewer re-runs layout on every keystroke.** The search handler calls `render`, which calls `layout`. Measured on the 564-node downstream graph in headless Chrome: about 540 ms per render and 520 ms per search keystroke. Search and selection only change classes, so positions can be cached until the node set changes.
- **CDN script with no integrity hash.** `viewer/template.html:203` loads dagre from cdnjs without `integrity` or `crossorigin`. A published page embeds every node, so a compromised CDN gets all of them. Vendoring, already step 3 in the handoff, would close this.
- **Three walkers disagree.** `dagcheck` includes `README.md` and skips symlinked files; `build-viewer` and `dag-to-glossary` exclude `README.md` and follow symlinks. SCHEMA says both read every `.md` under the folder. A `dag/README.md` with a `type` field is validated but never shown.
- **Apostrophes open a quote in the comment stripper.** `title: Spinoza's Ethics # from Elwes` keeps the comment in the title, because `src/frontmatter.js:20` treats the apostrophe as an opening quote.
- **Unparseable frontmatter is dropped silently.** `uses: [def:y` becomes the id `[def:y` and a `bad_link` error that points at the wrong cause. Nested mappings vanish with no message. A `bad_frontmatter` problem would help.
- **Edges from a node with no id are kept** with an empty `from`, reaching the facts table and the viewer.
- **Latent crash in finding sort.** `src/lint.js:50` calls `localeCompare` on code and target. A rule in a project's `dag/lint.dl` that derives a numeric target would crash the sort once two findings share level, code and path.
- **Flag-first invocation.** `dagcheck --lint dag/` takes the flag as the folder and dies with an ENOENT stack.
- **Duplication.** Four wikilink regexes with different label rules, five HTML escapers, and the directory walker copied into six files. The glossary's regex requires a non-empty label where the others accept an empty one.
- **`.claude/worktrees/` is not in `.gitignore`.** It is ignored only by this machine's global excludes. The handoff says it is git-ignored, which is true only here.

## Content and the pilots

- README's Pieces table says the fixtures trip every lint rule. They hold no resources, so the two resource rules are only covered inline in `test/lint.test.js`.
- `examples/dag/README.md` says the fixtures have every feature "but the first", meaning `refines`. Three fixture definitions use `refines`.
- SCHEMA says the `observation` subtype is "likely to follow". The example collection already uses it.
- SCHEMA describes `narrower_unlinked` as a title ending with another title. `src/facts.js:113` also matches aliases and paren-stripped forms.
- USAGE's `dag check --json` writes `graph.json` into the project repo. Say where it goes, or that it should be ignored.
- **The Spinoza pilot has one claim and no control.** Four agents each get a chance to surface the ambiguity, and the README already admits the model may know the Leibniz objection from training. A pass is therefore cheap and a fail is the only informative result. A control run on a proposition with no known flaw, and a pre-registered definition of "names the objection", would make the result readable either way.
- **The source handed to D biases the reading.** It includes the proof of Proposition V and Propositions VI to VIII, which restate V as "an identical attribute", the single-attribute reading. D is told to decompose the statement only, but its vocabulary will be shaped by that phrasing. Worth stating in the README before the run rather than after.
- **Registration-once fidelity.** `states` says "at most once" and the statement says "once"; the record gives fidelity "yes" by allocating the rest to `def:member`. Step 6 allows that through its allocation question, but by the letter of its definitions the difference-accepted case is "strained". The record should name which clause it used.
- `formal/def-member.dl` makes `member` and `registered` mutual synonyms, so one predicate is redundant. Step 2's line-by-line ratification, still open, is where that should be caught.

Everything from the previous audit's list is addressed in the current tree. Item 1 above is the one place where that fix introduced a new fault.

Recap: five reproduced bugs, with the masked cycle and the page-blanking node the two to fix first, then the baseline and layout hazards. The content is mostly current. The pilot critique is the one place where a decision is yours before the run: whether to add a control and note the proof's bias. I changed nothing in the repo.

---

**User:**
fix what you deem worthy of fixing

**Assistant:**
I'll fix the bugs on a branch with tests, then check both downstream DAGs read-only before and after so nothing breaks their CI. First, checking what the stricter parsing would hit downstream.

Let me verify the main worktree actually exists and compare both script versions head to head on the real config in check mode.

The fixes are on branch `review-fixes`, pushed, and open as [PR #36](https://github.com/markreveley/artifact-dag/pull/36). It is mergeable and not merged. All 83 tests pass, up from 72.

**What I fixed**

- Cycle detection now uses Tarjan's SCC. The old walk missed a cycle whose first edge led into a dead-end branch or into another cycle, and `dagcheck` passed such a graph with exit 0.
- The viewer build writes `<` as `\u003c` in the inlined JSON, so a node containing `<!--<script>` can no longer blank the page. Verified in headless Chrome.
- A list in a one-value field is a `bad_field` error instead of crashing `--lint`. Unreadable frontmatter lines are `bad_frontmatter`. A plain wikilink like `[[credence]]` is a `bad_link`, as SCHEMA already said. A node with no id gets no edges. An apostrophe inside a word no longer opens a quote.
- `--title` with `$&` no longer corrupts the page title.
- `dagcheck` rejects a flag in the folder's place, and in CI it refuses to create a missing baseline file.
- One shared file walker in `src/files.js` for the three CLIs. `README.md` is never a node, and SCHEMA now says so.
- The viewer caches layout until the shown node set changes. A search keystroke on the 564-node downstream graph went from about 520 ms to about 12 ms.
- Docs brought in line: SCHEMA, README, USAGE, the examples README. The Spinoza pilot README notes the proof's one-attribute phrasing and the lack of a control before the run. Measures and stopping rule are untouched. The control question is in `next/` as your decision.

**What I checked before pushing**

- Both downstream DAGs give byte-identical `dagcheck --json` and `--lint --json` output on main and on the branch.
- The downstream glossary check gives identical results on main and on the branch. Main itself now reports 6 files out of date there, because another session committed to [project A] and is changing the glossary tool on the `glossary-introduced-in-bold` worktree branch during this review. Both branches touch `bin/dag-to-glossary.js`, but `git merge-tree` reports no conflict. I did not touch that worktree.

**Left undone on purpose**

- No `integrity` hash on the dagre script tag. Vendoring dagre, already step 3 in the handoff, closes it better.
- The `def-member.dl` redundancy and the pilot tools' own file walkers, since `pilot/` is not part of the library.

Next step is yours: review and merge PR #36, and answer the control question in `next/operator-readme-next.md` when you decide on the Spinoza run.

---

**User:**
merge it

**Assistant:**
PR #36 is merged into `main` as commit e684b50. Local `main` is updated, the `review-fixes` branch is deleted locally and on GitHub, and all 83 tests pass on `main`.

Still open for you: the Spinoza control question in `next/operator-readme-next.md`, and the `glossary-introduced-in-bold` worktree branch from the other session, which now needs to merge `main` before its own PR.

---

**User:**
/end
