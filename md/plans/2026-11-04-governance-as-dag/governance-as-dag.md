# Governance as a DAG

> Status: proposed · 2026-11-05 · from [governance-as-dag](../../analysis/2026-11-04-governance-as-dag/governance-as-dag.md)

The complete design for writing repo governance as nodes, inherited across
the repos that follow repo-template. It is built in full, but enforcement
lands last.

## Decisions

- **D1. Nodes are the source; prose is a generated view.** Each rule is a
  node. `POLICY.md`, and the policy section of each role's `AGENTS.md`, are
  generated from the nodes and committed with a "generated from …, do not
  edit" header. `npm run check` fails when a view differs from its nodes,
  the way a lockfile is checked (P1 holds: the view is checked, so it cannot
  drift).
- **D2. A rule is a claim with `subtype: norm`.** Its body keeps the rule's
  words (P4). Its id is a slug (`claim:schema-is-contract`); views show
  titles, never numbers. `P<n>` citations are retired once the views are
  generated.
- **D3. A rule's *Why* is its own claim.** The norm `depends_on` it. Several
  norms may rest on one rationale.
- **D4. A record is a claim with `subtype: observation`.** "Agent X did Y in
  run R on date D", with `sources` pointing at the thread, CI log or commit.
  `contradicts` a norm means a violation; `supports` a norm means
  compliance. The same edges into a rationale claim test the reason. The
  subtype of the target tells the two apart, so no new edge kind is needed.
  Like every extracted claim, an observation is unverified until ratified
  (P6).
- **D5. A check is a resource.** `res:dagcheck`, `res:review`,
  `res:github-branch-protection`. Until enforcement lands, a norm names its
  check in the body as a wikilink (a `mentions` edge). `checked_by` becomes
  an edge field in step 7.
- **D6. One global collection, inherited whole.** Rules that hold in every
  repo live in one collection. A repo declares it in
  `dag/governance/inherits.json` (`{"collections": [{"repo": …,
  "path": …, "commit": …}]}`), pinned to a commit and bumped on purpose. A
  repo keeps nodes only for its own rules and for norms that `refines` a
  global one. An inherited rule has no local node, number or citation stub:
  P11 leaves this repo.
- **D7. Norms say whom they bind.** Optionally an `applies_to` field
  (`agent`, `operator`, `pilot-agent`, …). The generator uses it to build
  each role's view, so an agent loads only its rules and their reasons.
- **D8. Enforcement lands last.** The schema and the collection come first.
  Lints and `checked_by` come after the views and the experiment, written to
  match only `norm` and `observation` claims, so they fire on nothing in a
  downstream collection that has neither (analysis §4).

## Steps

1. **Ratification first.** The claims-to-code plan's step 1 (`ratified:
   <person>, <date>`, parsed and shown) is needed here too: norms and
   observations are ratified like any claim. Take it from that plan and do
   not duplicate it.
2. **Write the global collection** where the operator decides (question 1).
   Decompose this repo's POLICY.md, the global "Docs" rule and
   repo-template's README "Conventions" into norms and rationale claims,
   keeping the source's words (P4) and a resource for each check (D5). The
   operator ratifies each node.
3. **Write this repo's local collection** in `dag/governance/`, with only
   the rules this repo alone has, plus `inherits.json`. It sits outside
   `md/`, whose `governance/` folder holds only the five governing
   documents (operator, 5 Nov 2026).
4. **The generator.** A script reads the local folder and the inherited
   folders at their pins, and writes `POLICY.md` (titles, bodies, *Why*,
   check) with a generated header. Add a check mode to `npm run check`.
   Then replace `P<n>` citations in tracked files with titles or ids. It
   stays a script in `bin/`, not a contract (P8), until a downstream repo
   runs it.
5. **Observations by hand.** Write the observations the threads already
   hold (for example, the 2 Nov 2026 thread file that named a private
   project's policy language: it contradicts the norm that the repo names
   no other project). Then have `/end` propose observations for the
   operator to ratify.
6. **The experiment**, before any enforcement, as Condition C applied to
   governance. Three contexts for the same agent tasks: today's prose
   `POLICY.md`; a role-and-task subset written as prose; the same subset as
   nodes. Fix the measures and stopping rule first, with the operator, and
   record the result in an analysis (the operator ratifies it).
7. **Enforcement.** Add `checked_by` as an edge field (additive) and lints
   for: a norm with no check, a citation to a missing rule, a norm with no
   rationale, a rationale contradicted by a ratified observation that no
   one has answered, and the same rule stated in two collections. Run both
   downstream `dag/` folders and the glossary check against `main` before
   merging (P8).
8. **Roll out** to the other repo-template repos: each gets `inherits.json`,
   a local folder (often empty) and a generated `POLICY.md`. repo-template's
   own stub `POLICY.md` becomes a generated view.

## Questions

1. **Where does the global collection live?** repo-template (which every
   repo already follows), dotfiles (where the global agent rules live), or
   a new repo. Recommended: repo-template. dotfiles keeps agent-tool facts
   that are not repo governance (the `gws` notes, MCP pitfalls).
2. **Pin or track?** D6 pins to a commit. Tracking `main` is simpler, but
   a change to a global rule would then change every repo's generated view
   without a commit in that repo. Recommended: pin.
3. **Does `POLICY.md` stay hand-edited until step 4?** Recommended: yes,
   with new rules added there as now.
4. **Order against the claims-to-code steps.** This plan needs their
   step 1 (`ratified`) and nothing else from them. Recommended: claims-to-code
   step 1, then this plan's steps 2 to 6, then the rest of either.
