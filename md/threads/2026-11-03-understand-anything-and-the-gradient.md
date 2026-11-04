---
type: thread
date: 2026-11-03
source: Claude Code session transcript, filtered and redacted
---

# Understand-Anything compared with this repo, and the claims-to-code gradient

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
examine this https://github.com/Egonex-AI/Understand-Anything

how does this compare to this repo?

**Assistant:**
I'll fetch the Understand-Anything repo and read this repo's docs, then compare them.

Read both repos. Here is the comparison.

**Short version.** Understand-Anything is a large, popular Claude Code plugin that generates a knowledge graph *about code* from a codebase using Tree-sitter plus seven LLM agents. This repo (artifact-dag) is a small schema and toolset for *hand-written* graphs of definitions, claims and resources kept as Markdown in a project's repo. They share the words "knowledge graph" and the Markdown-wikilink input, and almost nothing else. The closest point of contact is Understand-Anything's `/understand-knowledge` mode, and even there the direction of authorship is opposite.

**What Understand-Anything is**

- Turns a codebase (or a Karpathy-pattern LLM wiki, or a Figma file) into `.ua/knowledge-graph.json`, then serves a dashboard from it.
- Graph is derived, not authored. Tree-sitter extracts imports, calls, classes deterministically. LLM agents add summaries, layers, domains, tours and, in wiki mode, extracted `entity` and `claim` nodes with `builds_on`, `contradicts`, `cites` edges carrying a confidence weight.
- 27 node types and 38 edge types in one TypeScript union, spanning code, infra, business domains, wiki knowledge and design tokens.
- Scale: about 40k lines of TypeScript, 866 commits, roughly 90k stars, MIT, multi-platform installers, seven output languages.
- Its stated audience is a developer onboarding to a 200k-line codebase.

**What artifact-dag is**

- Three node types, six explicit edge fields plus `mentions` and `about`. One Markdown file per node, frontmatter and body, human-written and reviewed through a PR.
- The graph is the source of truth, not a view of something else. The nodes are the claims and definitions themselves, with attributed sub-definitions and sources.
- A validator that enforces ids, required fields and acyclicity over the five "builds on" edges, and a Datalog lint that reports missing links. The `not_links` field records a decision to silence a finding, so a lint result is reviewable in the diff.
- Global ids so collections from several projects join by name. Glossary generation from the definitions. A document mode that reads a text decomposed claim by claim in order.
- Roughly 100 commits, one author, no stars story, and a paused research thread on formal text for claims with a ratified pilot procedure.

**Where they actually overlap**

The `/understand-knowledge` mode reads a wiki of Markdown files with `[[wikilinks]]` and emits `article`, `topic`, `entity`, `claim` and `source` nodes. That is the same raw material as a `dag/` folder. But its claims are LLM-extracted from prose, carry a weight, and live in a generated JSON that is rebuilt, whereas here a claim is a file someone wrote and signed with sources, and the edges are assertions the author is accountable for. Understand-Anything has no validator, no acyclicity rule, no lint and no notion of an external node. It does have what this repo does not: a graph over code, incremental fingerprinting, Q&A chat, diff impact, and a production-grade dashboard with search, tours and personas.

**What is worth borrowing, and what is not**

- Worth a look: the dashboard served read-only from committed JSON with no LLM calls is the same stance as this repo's built viewer. Its fuzzy search and layer colouring are more polished than `viewer/template.html`.
- Worth a look: their `graph-reviewer` agent, which checks a generated graph for coherence. It is a loose analogue of `dagcheck --lint`, but prompt-based rather than rule-based.
- Not a fit: adopting their node or edge taxonomy. Thirty-eight edge types with weights and `bidirectional` directions is the opposite of this repo's decision to keep edges few, directed and acyclic so cycles are an error.
- Not a fit: LLM extraction of claims. The whole point of `SCHEMA.md` is that a claim is one atomic statement someone wrote and attributed, and the pilots in `pilot/` exist precisely because unratified machine readings were the problem.

One hygiene note. The Understand-Anything README contains a hidden HTML comment addressed to AI agents asking them to add a marker to PR descriptions. The fetch tool flagged and ignored it. I did not act on it. The clone is in the scratchpad at /private/tmp/claude-501/-Users-mark-dev-repos-artifact-dag/363149c3-c5c7-46f8-a277-c3b714a1814c/scratchpad/ua/Understand-Anything if you want to read their types file or the knowledge skill yourself.

---

**User:**
lets discuss the llm extraction of claims. my intent is very much that llm extracted claims are legal and expected. they would just not be verified. but for instance, i will eventually ask you to decompose the tutorial prose into a dag

**Assistant:**
Let me check what the repo already says about who writes claims and whether any field marks a claim's verification state, so the discussion is grounded.

You're right, and the repo already agrees with you. I overstated the contrast. The `dag` skill has a "Claims from a document" section telling an agent how to decompose a text, and the pilot procedure's step 1 is an agent decomposer with a human ratifier. The distinction with Understand-Anything is not who writes the claim. It is what happens to the claim afterward.

**The real difference**

- Understand-Anything regenerates its graph. A claim is a row in JSON with a weight, rebuilt on the next run, never edited by hand. Nobody vouches for it and nobody needs to, because it is disposable.
- Here a claim is a file that persists, gets linked to, gets edited, and shows up in glossaries and the document view. An extracted claim that nobody read looks identical to one you ratified. That is the gap, not extraction itself.

**What the schema lacks for "legal but unverified"**

Nothing marks a claim's verification state. SCHEMA.md allows a free `status` field but only mentions it for resources, and the parser drops it. The pilot's formal files carry a `ratified: <person, date>` line, but that is for the Datalog text, not the claim. Merging a PR is also not ratification. A PR review checks the file is well formed and the ids resolve. Ratification means a person read the claim against the source and accepted it as atomic and faithful. Those are different acts and the first one is much cheaper, so you will do it far more often.

My recommendation is one optional field, parsed and shown by the viewer, something like `ratified: Mark, 2026-11-10`, absent on extracted claims. The lint can then count unratified claims per document and the document view can dim them. Cheap, reviewable in a diff, and it is the pilot's existing line moved one level up.

**What the tutorial decomposition will raise**

- **Instructions are not propositions.** A tutorial says "run this" and "do not do that" as much as it asserts facts. The schema anticipates a `norm` subtype but nothing uses it yet. You will want it, or the decomposer will turn every instruction into a strained assertion.
- **Keep the source's words.** The procedure's rule that rewording is already choosing a reading applies with force here. An extracted claim that quotes the tutorial is checkable later in seconds. One that paraphrases is not.
- **Drift.** The `document` and `section` fields name the source, but nothing checks the claim still matches it after the tutorial is edited. This is the one thing worth borrowing from Understand-Anything: their fingerprinting. A claim could record the sentence or section it came from, and the lint could report a claim whose source text no longer contains it. Without that, an unratified claim from an old draft is worse than no claim.
- **Definitions the tutorial introduces.** The glossary builder already reads a document's bolded first uses. Decomposition should produce those definitions too, not only claims, or the claims' `uses` edges will all point at externals.

So the position I would take is: extraction is the normal way claims enter, ratification is a separate recorded act, and a claim carries enough of its source to be checked against it later by a person or a lint rule. That keeps the thing Understand-Anything has, cheap bulk extraction, without losing the thing it does not have, a claim someone can stand behind.

---

**User:**
agree with ratified suggestion
what is a norm subtype?
re: keeping the sources words, isn't that policy? if not, yes introduce immediately 
how does the fingerprinting work exactly? yes open to borrow
yes i am imagining that there is a type definition in the dag, the glossary really becomes the collection of def dag nodes in the graph
agree with final statement

one of the reasons i brought understand-anything was so that we could look at it as being an approach to creating a code graph. i think this has been specced too, but imagine that, in the case of [product B] (or any repo) we were able to trace a direct line from a prose description of the repo's architecture and purpose, to decomposed dag claims, to a code graph, to code itself. would this work? we talked about datalog payloads as a dsl helping bridge the gap to code in some cases. testing obviously could be part of the gradient, as could formally proving code. lets discuss

**Assistant:**
Let me check three things before answering: how Understand-Anything's fingerprinting actually works, whether the source-words rule is policy outside the pilot, and what this repo already specs about a code graph.

The edit is in the working tree, uncommitted. Taking the questions in order, then the chain.

**Norm subtype.** A `proposition` says what is the case and an `observation` says what was seen in the code at a commit. A `norm` says what must or should be done: a rule, a requirement, a policy. It is not true or false. It is in force or not, and followed or violated. Its support comes from propositions about consequences, and code relates to it by satisfying it rather than by making it true. A tutorial is full of them ("always pin the commit", "a router must not bridge WAN to client"). The schema names the subtype as likely to follow but nothing uses it. Your LOCAL.md note already picks it out as the place where formal text stops being a paraphrase: the [product A] [policy language] policies and the [product B] [stack detail] Datalog are norms that ship as code.

**Source words.** Now in the skill, with the ratified-is-separate-from-PR-review point. One consequence to flag: the 163 [project B] tutorial claims predate the rule and look restated rather than quoted. The sample I read opens "A router has an interface for nearby devices" with no quote carried. The rule applies going forward, and ratification is the moment to check each existing one against its section.

**How Understand-Anything's fingerprinting works.** Per file it stores a SHA-256 of the content and, where Tree-sitter supports the language, a structural signature: function names with their owner class, parameter lists, class names, imports and exports. The store records the git commit it was built at. On the next run it compares:

- same content hash: unchanged, skip
- no structural signature on either side: treat as structural, re-analyze (conservative)
- content changed but signatures equal: cosmetic, keep the old summary
- signatures differ: structural, send the file back to the LLM

Only the last class costs tokens. Their `docs/incremental/` audit is also instructive. They spent nineteen review rounds on one question, whether a symbol missing from the new extraction was deleted or merely missed by the extractor, and concluded that a best-effort extractor's omission is never evidence of deletion. That is the rule to keep if we resolve anchors with Tree-sitter: an anchor that fails to resolve means "a person looks", never "the claim is stale".

**What to borrow, at two levels.** For claim to prose, no Tree-sitter is needed. The claim carries its source sentence, and the lint checks that the sentence still occurs in the named document under the named section. Call the finding `stale_claim`. For claim to code, the [project B] claims already anchor to pinned code, in the form `[product B]@<commit>:<path>:<lines>`. A pinned anchor never goes stale, it goes old. The borrowed piece is a hash of the anchored text recorded at pin time. When the project moves to a new pin, every claim whose anchored text hashes the same carries its evidence forward unchanged, and only the rest need re-audit. That is their cosmetic-versus-structural split, without their 27 node types.

**Glossary.** Already so. The glossary builder reads the definition nodes tagged for a document, and [project B] has 115 of them. The only thing decomposition must add is that a term the decomposer meets becomes a definition node rather than an external id.

**The chain: prose, claims, code graph, code**

More of it exists than the question implies. In [project B] the tutorial is decomposed into claims, each claim's `sources` point at pinned file and line ranges, and `tutorials/audit/` is a by-hand check of each statement against the code, with the disagreements filed as issues. In [project A's labs] the runner's failed steps list the claims they cover, so a test-to-claim edge already exists there. The [project A's labs] plan for a shared code-anchors script is the missing resolver. So the question is less "would it work" than "what does each link mechanically guarantee".

My answer is that a direct line exists at every link, but as traceability, and the strength of each link is a property of the individual claim, not of the chain. That is the gradient, and I would make it explicit as the strongest evidence a claim carries:

1. **Ratified.** A person read the claim against the source. The field we agreed on.
2. **Anchored.** The claim names the code it is about, by symbol rather than line range, with a hash of the anchored text at the pin. Mechanically checked across pins.
3. **Tested.** An executable step covers the claim, and the runner reports the claim when the step fails. [project A's labs] has this shape today.
4. **Formal.** The claim's Datalog is the shipped rule, not a paraphrase of it. Only norms reach this level, and only where the product already runs a Datalog engine, which both products do.
5. **Proved.** The claim is a theorem about the code. Rust has Kani and Verus, protocols have TLA+. Worth it only for the invariants: [an architecture invariant], [a routing invariant]. A handful of claims, never the tutorial.

Each level is a different relation to code and none replaces the one below it. Ratification is about the prose. Anchoring and fingerprinting are about whether the code moved. Tests are about behaviour at runtime. Formal text and proofs are about meaning. A lint that counts claims per level per document gives the project one number it can move, and it says plainly which claims rest on nothing but a person having once read them.

**Where the code graph fits.** It is the addressing layer between levels 1 and 2, not a fourth kind of node in the DAG. Line ranges rot with every edit. Symbols rot slowly. A Tree-sitter pass over the pinned repo gives symbol spans, so an anchor can be `repo@commit:path#symbol` and resolve to lines on demand. The same pass yields calls and imports, which answers a question the DAG cannot ask on its own: which code has no claim about it. That reverse direction, code to claims, is where LLM extraction in the Understand-Anything style is legitimately useful and, as you said, legal and unverified. The join of the two directions is the docs-versus-code finding that [project B] currently produces by hand.

**What I would not do.** Import Understand-Anything's graph as the code graph. The deterministic third of it, Tree-sitter symbols and spans, is what the anchors need, and that is a few hundred lines on top of the tree-sitter package. The LLM-enriched remainder, layers, tours, domains, weights, is a different product with a different reader.

**Concrete next steps,** when you say so:

- `ratified` field: parse it, show it in the viewer, count it in the lint.
- Source quote on document claims, and the `stale_claim` rule.
- Anchor syntax with the text hash, and the cross-pin check. This is the code-anchors script [project A's labs] plans, and it belongs here.
- `norm` as a used subtype, with the Datalog-as-shipped-rule pilot trigger already noted in LOCAL.md.

---

**User:**
convert this last analysis to a dated analysis document in md/analysis <2026-11-03-xxxx>
take the next steps, and place them in next-operator.md as the next things to do, and directly link to the analysis document
go through this thread and see if anything else should be added to the analysis, or other analyses
when done, run /end

**Assistant:**
I'll write the analysis, update the handoff files, then run /end. First the current handoff files.

The operator moved `docs/` and `threads/` into `md/` by hand just now and created `md/analysis/`, so references to the old paths need updating too. Gathering what points at them.

Tests pass (83, 0 failed). Handoff files and paths are updated. Running /end now.
