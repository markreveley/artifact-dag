---
type: handoff
audience: operator
updated: 2026-11-05
---

# Next steps for the operator

Read with [`next-agents.md`](next-agents.md).

## 1. Say go on the claims-to-code steps

The thread of 3 Nov 2026 settled, in
[`md/analysis/2026-11-03-claims-to-code-gradient/claims-to-code-gradient.md`](md/analysis/2026-11-03-claims-to-code-gradient/claims-to-code-gradient.md)
(§6), four steps the agent takes in order once you say so:

1. `ratified: <person>, <date>` on claims: parsed, shown in the viewer, counted by the lint per document.
2. The source sentence on document claims, and a `stale_claim` lint rule.
3. Anchor syntax by symbol with a text hash, and the cross-pin check (the code-anchors script a downstream project plans; it lands here). Anchors resolve against universal-ctags output, which gives every symbol an end line in every language with no build ([`md/analysis/2026-11-04-code-graph-alternatives/code-graph-alternatives.md`](md/analysis/2026-11-04-code-graph-alternatives/code-graph-alternatives.md), §4). Graphify was read first ([`md/analysis/2026-11-04-graphify-as-code-graph/graphify-as-code-graph.md`](md/analysis/2026-11-04-graphify-as-code-graph/graphify-as-code-graph.md)) and has no spans; it stays a candidate for references later.
4. `norm` as a used subtype.

Each changes `md/governance/SCHEMA.md` or a CLI, so each is run against both downstream `dag/` folders before merging, as `next-agents.md` says.

## 2. Say when to run the Spinoza pilot

It is confirmed and amended (`pilot/2026-11-02-spinoza-one-claim/README.md`,
"Amendment"). Start a session, run `/start`, and say "run it". You'll be
needed to ratify the blind decomposer's claims and predicate lines (steps 1
and 2) and at step 6.

## 3. Install universal-ctags

Claim anchors resolve against its output (`md/governance/ARCHITECTURE.md`,
D1). The machine has only macOS's BSD `ctags`, which lacks JSON output and
end lines, and the agent may not install software unasked. Run:

```sh
brew install universal-ctags && ctags --version | head -1
```

The first line should read `Universal Ctags 6.2.1` or later. Then say so in
a session: the agent's first run is on both downstream checkouts, counting
tags and how many of their existing `sources` anchors resolve or are
ambiguous (`md/analysis/2026-11-04-code-graph-alternatives/code-graph-alternatives.md`,
§4, item 5). It comes before step 1's anchor work.

## 4. Answer the governance-as-DAG questions

[`md/plans/2026-11-04-governance-as-dag/governance-as-dag.md`](md/plans/2026-11-04-governance-as-dag/governance-as-dag.md)
designs governance as inherited nodes with generated `POLICY.md` views.
Its four questions, each with a recommendation, wait on you before step 2:
where the global collection lives (recommended: repo-template), pin or
track `main` (pin), `POLICY.md` hand-edited until the generator exists
(yes), and the order against the claims-to-code steps (their `ratified`
step first). Then say go.

## 5. (optional) Delete the old raw export

`.local/2026-11-02-library-pilot-run.raw-export.md` (git-ignored) is the
`/export` the first thread file was made from. thread-archive now holds that
thread whole, so it is redundant. The agent leaves deletions to you:

```sh
rm ~/dev/repos/artifact-dag/.local/2026-11-02-library-pilot-run.raw-export.md
```

## Questions
- **`PROCEDURE.md` stays in `pilot/` until adopted.** The governance README points at it and says it moves to `md/governance/` when a pilot adopts it. Say if it should move now instead.
- **Where does a document claim's source sentence live?** As the body itself where one sentence is the claim (the skill now says so), and otherwise in a field the parser keeps (`quote:`) rather than in `sources`, so the `stale_claim` rule has one place to read. Say if you want it elsewhere.
- **Anchor form.** `<repo>@<commit>:<path>#<symbol>` with optional lines, hash of the symbol's text at the pin. The downstream `sources` lines today pin by line range only; they keep working, with no hash and so no cross-pin check. `<symbol>` would be in ctags's scope form (`Class.method`), with the optional lines picking between overloads. The alternative is a cite in the claim's body, `path::Class::method`, resolved by a small Node resolver here (alternatives analysis, §4). Say which, or if the form should differ.
- **Code to claims.** Extracting unverified claims from code, to find code no claim covers, is legal under the thread's ruling but not scheduled. Say if it goes on the list, and for which project.
- **A control for the Spinoza pilot?** With one claim and four agents, each a chance to surface the ambiguity, a pass is cheap. Running the same procedure on a proposition with no known flaw (III or VI, say) would show what the agents produce when there is nothing to find. The pilot README notes this under "Noted before the run"; the measures and stopping rule are unchanged. Say yes, no, or which proposition.
