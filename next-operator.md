---
type: handoff
audience: operator
updated: 2026-11-04
---

# Next steps for the operator

Read with [`next-agents.md`](next-agents.md).

## 1. Say go on the claims-to-code steps

The thread of 3 Nov 2026 settled, in
[`md/analysis/2026-11-03-claims-to-code-gradient/claims-to-code-gradient.md`](md/analysis/2026-11-03-claims-to-code-gradient/claims-to-code-gradient.md)
(§6), four steps the agent takes in order once you say so:

1. `ratified: <person>, <date>` on claims: parsed, shown in the viewer, counted by the lint per document.
2. The source sentence on document claims, and a `stale_claim` lint rule.
3. Anchor syntax by symbol with a text hash, and the cross-pin check (the code-anchors script a downstream project plans; it lands here). The code graph it resolves against is now Graphify's, not a tree-sitter script of our own ([`md/analysis/2026-11-04-graphify-as-code-graph/graphify-as-code-graph.md`](md/analysis/2026-11-04-graphify-as-code-graph/graphify-as-code-graph.md), §5); Graphify gives no symbol spans, so the hash still needs a span resolver or an upstream patch.
4. `norm` as a used subtype.

Each changes `md/governance/SCHEMA.md` or a CLI, so each is run against both downstream `dag/` folders before merging, as `next-agents.md` says.

## 2. Say when to run the Spinoza pilot

It is confirmed and amended (`pilot/2026-11-02-spinoza-one-claim/README.md`,
"Amendment"). Start a session, run `/start`, and say "run it". You'll be
needed to ratify the blind decomposer's claims and predicate lines (steps 1
and 2) and at step 6.

## Questions
- **`PROCEDURE.md` stays in `pilot/` until adopted.** The governance README points at it and says it moves to `md/governance/` when a pilot adopts it. Say if it should move now instead.
- **Where does a document claim's source sentence live?** As the body itself where one sentence is the claim (the skill now says so), and otherwise in a field the parser keeps (`quote:`) rather than in `sources`, so the `stale_claim` rule has one place to read. Say if you want it elsewhere.
- **Anchor form.** `<repo>@<commit>:<path>#<symbol>` with optional lines, hash of the symbol's text at the pin. The downstream `sources` lines today pin by line range only; they keep working, with no hash and so no cross-pin check. The alternative is Graphify's cite form, `path::Class::method` in a claim's body, which its Markdown pass turns into a claim-to-code edge with no glue (graphify analysis, §4). Say which, or if the form should differ.
- **Running Graphify on the downstream checkouts.** The agent's permission classifier refused to execute it this session. Run `uvx --from graphifyy graphify extract <checkout> --code-only` yourself, or allow it, so step 4 of the graphify analysis's recommendations can run.
- **Spans: upstream or here?** Graphify records a symbol's start line only. Either contribute an end line or byte range upstream, or write a small span resolver here. Say which.
- **Code to claims.** Extracting unverified claims from code, to find code no claim covers, is legal under the thread's ruling but not scheduled. Say if it goes on the list, and for which project.
- **A control for the Spinoza pilot?** With one claim and four agents, each a chance to surface the ambiguity, a pass is cheap. Running the same procedure on a proposition with no known flaw (III or VI, say) would show what the agents produce when there is nothing to find. The pilot README notes this under "Noted before the run"; the measures and stopping rule are unchanged. Say yes, no, or which proposition.
