# Governance as a DAG

**Date:** 2026-11-04

**Question.** `md/governance/POLICY.md` is a list of atomic, numbered rules
that cite each other and are cited from other files. Would writing
governance as nodes in a collection help, and would agents follow rules
better from a graph than from a prose list? Raised while repo-template's
layout is being rolled out across several repos, so the goal is the
complete design, not a compromise made before one is needed.

**Sources read.** `md/governance/POLICY.md`, `md/governance/SCHEMA.md`,
`src/parse.js`, `src/frontmatter.js`, `bin/dagcheck.js`; `evals/README.md`,
`evals/LIKELIHOOD_ANALYSIS.md`, `evals/NEXT_EXPERIMENT.md`; repo-template's
README and `md/plans/README.md`; the git-ignored `LOCAL.md` for which
downstream project runs `main` in CI. Every `P<n>` citation in tracked
Markdown, found with grep.

**Method caveat.** The outside studies in §3 are cited from memory and were
not fetched for this reading. The repo's own eval is N=3, and the eval's
own analysis says it is confounded.

---

## 1. The short answer

Yes. Almost all of it fits today's schema. A rule is a claim with
`subtype: norm` (the schema already expects that subtype), and a record of
what an agent did is a claim with `subtype: observation` (already in use).
`supports` and `contradicts` from an observation to a norm mean compliance
and violation. The same edges into the norm's rationale claim test the
rule's *Why*. No new node type is needed. A new edge field (`checked_by`)
is needed only for enforcement, which can come last.

There is no evidence that agents follow rules better from a graph placed in
their context than from prose. The repo's one test is confounded, and its
control was never run. The case for the graph rests on three things the
evidence does support: loading only the rules that apply to the task, checks
that run mechanically, and the work of decomposing the rules.

## 2. What the graph gives

- **Citations become links.** P4, P6, P8, P9 and P10 are cited in
  `AGENTS.md`, the skill, `pilot/PROCEDURE.md`, the handoff files and the
  threads. Nothing checks that a citation resolves. As ids, they can be
  checked, and a change to a rule can list everything that cites it.
- **"Checked by" becomes a query.** P5, P6 and part of P4 say "nothing yet".
  As an edge, the rules with no check can be listed.
- **Rationale becomes evidence-bearing.** Each *Why* is a claim the norm
  `depends_on`. Observations that contradict it accumulate against the
  reason, not the rule. A rule whose reason keeps failing is the one to
  revisit.
- **Global rules are inherited, not copied.** P11 restates the global
  "Docs" rule from `~/.dotfiles/agents/AGENTS.md`. That is a parallel copy
  (against P1) where a global id (P2) belongs. Under inheritance, the repo
  declares the global collection once and keeps no node, number or
  citation stub for P11.
- **Readable views are generated.** A committed `POLICY.md` with a
  "generated" header, checked against the nodes the way a lockfile is
  checked, keeps P1 intact. Slug ids with titles in the views replace `P8`,
  which an agent can use but a person cannot read.

## 3. Evidence on graphs and recall

- **`evals/purity-test`** (brought from another project, commit `fa3db1d`;
  assessed in `evals/LIKELIHOOD_ANALYSIS.md`): with the DAG, the agent
  followed the compound assertions 9 times out of 9; with prose, 2 out of 9.
  N=3, one task, one model, scored by an LLM. The DAG version also contained
  more specific instructions than the prose. `evals/NEXT_EXPERIMENT.md`
  designs the control (Condition C: the compounds written as equally
  specific prose). Nothing in `evals/` shows it was run.
- **Outside work** (from memory):
  - Fatemi et al. 2023, "Talk like a Graph": how a graph is encoded as text
    changes results a lot, and multi-hop reasoning over a serialized graph
    is weak.
  - Liu et al. 2023, "Lost in the Middle": recall falls for material in the
    middle of a long context.
  - 2025 work on following many instructions at once: adherence falls as
    the number of instructions grows.
  - GraphRAG helps with corpus-wide questions, not with following
    instructions.
- **Reading.** Putting the whole graph in front of an agent is not shown to
  help. Choosing a smaller, relevant set to load (the rules for this role
  and this task, with their reasons) is supported. `LIKELIHOOD_ANALYSIS.md`
  also argues that decomposition may improve the rules when they are
  written, whatever format the agent finally reads.

## 4. Downstream contract

`src/parse.js` rejects an unknown `type` (`unknown_type`) and ignores
unknown frontmatter fields. Norms and observations are claims, so they need
no parser change. Adding a `checked_by` edge field is additive: no existing
downstream node changes meaning. The risk is the lint. One downstream
project's CI runs `dagcheck --lint` from `main` on every push (`LOCAL.md`),
so a new lint rule that fires on existing downstream nodes would add
findings there. Enforcement lints written to match only `norm` and
`observation` claims fire on nothing downstream today. They still get the
P8 run before merging.

## 5. Recommendations

1. Build governance as a collection of `norm`, `observation` and rationale
   claims, with resources for the tools that check them. Schema first, no
   enforcement.
2. Keep one global collection that repos inherit whole, pinned to a commit.
   A repo holds nodes only for its own rules and for `refines` of global
   ones.
3. Generate the readable views (`POLICY.md`, the policy part of each role's
   `AGENTS.md`) and check them against the nodes. Do not hand-edit them.
4. Run Condition C on governance itself: prose `POLICY.md`, a selected
   subset as prose, and the same subset as nodes. Measure the violations
   recorded per run.
5. Add the enforcement lints and `checked_by` last.

The steps are in
[`md/plans/2026-11-04-governance-as-dag/governance-as-dag.md`](../../plans/2026-11-04-governance-as-dag/governance-as-dag.md).
