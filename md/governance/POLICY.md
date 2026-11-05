# Policy

> Status: in force · 2026-11-04 · the rules this repo and its collections follow

A policy is a rule in force: followed or violated, and checked by a tool, by
a review, or by nobody yet, which each rule says. The rules are numbered so
other documents cite them (`P5`). `SCHEMA.md` beside this file says what a node is;
`md/docs/USAGE.md` says how to work with one; this file says what is
required of it and of the people and agents who write it.

## Nodes

**P1. Node files are the source of truth.** A definition, claim or resource
is its Markdown file under `dag/`. Nothing keeps a parallel copy that is
edited by hand. Anything built from the files is either never committed
(the viewer page, a code-graph index) or committed as a generated view (a
document's `## Glossary`), which is never edited by hand and is checked
against the nodes by a command that fails when it drifts
(`dag-to-glossary --check`).
*Why:* two copies drift; a generated view with a check cannot.
*Checked by:* review, where a committed viewer page is refused; the view's
check, in each project's CI.

**P2. Ids are global.** `def:credence` means the same thing in every project
that uses it, so per-project graphs join cleanly. Reuse an id that exists in
another project when it means the same thing. *Checked by:* `dagcheck`
reports an id defined in more than one joined collection.

**P3. A claim is one atomic statement.** Elaborated as needed, but one thing
that can be ratified, supported or contradicted. A claim that turns out to
hold two is split. *Checked by:* ratification (P6).

**P4. A claim from a document keeps the source's words.** Where one sentence
of the source is the claim, the body is that sentence; where the claim
condenses several, it quotes the one that carries it. Keep every assertion
of the source, including ones nothing else rests on: whether an assertion
matters is shown by its edges, not by leaving it out.
*Why:* a decomposer who rewords a statement has already chosen a reading of
it, and a claim that quotes its source can be checked against the source in
seconds, by a person or a lint rule. *Checked by:* ratification; a
`stale_claim` lint rule is planned (`md/analysis/2026-11-03-claims-to-code-gradient/`).

**P5. A claim written by an agent is legal and expected.** Extraction is the
normal way claims enter a collection. *Checked by:* nothing; this is a
permission, not a requirement.

**P6. An extracted claim is unverified until a person ratifies it.**
Ratification means a person read the claim against its source and accepted
it as atomic (P3) and faithful (P4). It is a separate act from reviewing the
PR that adds the file: the review checks that the file is well formed and
its links resolve; it does not vouch for the claim. *Why:* a claim that
persists, gets linked to and shows up in glossaries must say whether anyone
stands behind it. *Checked by:* the `ratified` field, planned (same
analysis); until then, nothing.

**P7. A lint finding is decided by a person.** For each finding, read the
node and either add the edge or record with `not_links` that the word means
something else. Never add edges from word matches without reading them.
*Why:* the lint finds words, not meanings. *Checked by:* review of the diff,
where each `not_links` entry is visible.

## The repo

**P8. `SCHEMA.md` and the CLIs are contracts.** A breaking change to the node
format, to `dagcheck`, `build-viewer` or `dag-to-glossary` breaks a
downstream CI that runs `main`. Run both downstream `dag/` folders and the
glossary check against `main` before merging such a change. *Checked by:*
the agent, before the PR; `next-agents.md` says how.

**P9. The repo names no other project.** It is public. The projects that run
this code are listed in the git-ignored `LOCAL.md`; a detail that
identifies a private project even with its name cut (its stack, its policy
language) is cut too. Threads, which name them freely, are kept in the
private thread-archive repo, never here (repo-template guideline 10).
*Checked by:* a scan of every tracked file against the private names and
terms in the git-ignored `.local/private-terms.json` (its `replace` and
`check` patterns, as case-insensitive regexes), before a PR and after a
term is added.

**P10. Changes reach `main` through a PR.** `/end` commits where the work is
and opens the PR. *Checked by:* GitHub.

**P11. An analysis holds no open question.** Findings and recommendations
only. A question that blocks the next step goes in `next-operator.md`; any
other, in a plan linked from it. This is the global rule
(`~/.dotfiles/agents/AGENTS.md`, "Docs"). *Checked by:* review.
