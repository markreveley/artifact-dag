---
type: thread
date: 2026-11-02
redacted: true
---

# Formal nodes: from "does this use Datalog?" to a pilot

The exchange of the 2 November 2026 thread, verbatim, without tool calls or
reasoning. The names of other repositories, projects, products and people,
and paths on the operator's machine, are redacted, because this repository
is public and names no other project. Placeholders:

- **[project A]**, **[product A]**: a private project with a DAG of 564 nodes, and the product its tutorial describes
- **[project B]**, **[product B]**: a second private project with a DAG, joined with A's in the viewer
- **[repo C]**: a repo of threads kept as files, with a planned knowledge base
- **[repo D]**: a repo and notation for typed statement graphs that a person ratifies
- **[repo E]**: a repo of evaluation procedures
- **[tutorial repo]**: the repo that `tutorial/` moved to during this thread
- **[path]**: a path on the operator's machine

Bracketed notes in the exchange are the editor's. Everything else is as it was said.

---

**User:** /start

**Assistant:** **Your turn first.** `next/operator-readme-next.md` lists no steps, only one pending question. The next step in the agent file is to talk through the DAG viewer with you.

1. **Publishing:** should CI publish the viewer? That would make every node public.
2. **Build-it-yourself:** or should it stay a page each person builds locally with `npm run build` / `build-viewer --dag`?

Tell me which way you're leaning, or what you want to change about the viewer, and I'll start.

---

**User:** does this use datalog in the payload of nodes? if so where is this documented?

**Assistant:** No, node files don't contain Datalog. A node is a Markdown file with frontmatter, and its format is in `SCHEMA.md`.

Datalog is only used by the linter. `dagcheck <folder> --lint` turns the parsed graph into facts, then runs rules over those facts to report missing links.

Where it's documented:
- **`SCHEMA.md:222` ("Lint findings")** is the main doc: how linting works, the text-matching rules, and a table of each finding code.
- **`src/facts.js:1-12`** lists, in its header comment, the facts a rule can read (`node`, `tag`, `edge`, `in_doc`, `names`, `title_contains`, `not_link`, …).
- **`src/datalog.js:1-9`** says in its header comment which Datalog features the evaluator supports: negation, quoted strings, integers, and `=`, `!=` and `<`, with no arithmetic.
- **`lint/rules.dl`** holds the default rules. A project can add its own in `<folder>/lint.dl`.
- **`docs/USAGE.md:74`** and **`.claude/skills/dag/SKILL.md:48`** each mention `--lint` briefly for users.

There's no standalone guide to writing your own `lint.dl` rules. The syntax lives only in that `datalog.js` header comment and the examples in `lint/rules.dl`.

---

**User:** at one point there was a push to spec out using datalog as a dsl of sorts in the payload of nodes to express claims in a formal/semi-formal manner. let's discuss whether this is currently worth pursuing, or what would trigger it as useful to pursue

**Assistant:** Found the earlier work in [project A] (a Datalog-check script and a `.lp` file). Reading those now.

Reading [project A]'s notes on keeping prose, model and code in step, which is close to what you're describing.

The earlier push happened in **[project A]**, not in this repo, and it was never applied to DAG nodes.

**What exists**
- On 2026-10-27, [project A] added "[repo D]" statement graphs. A statement can carry indented `logic:` lines, and a script uses clingo to check that each inference follows from the statements it rests on (`AGENTS.md:116`).
- It was used in two analysis documents, with about 57 `logic:` lines between them. There's also a standalone model, `agent-identity.lp`, with rules like "authority is the intersection of chain, ceiling and task limit."
- Nothing has been added since that day. None of [project A]'s 102 claim nodes in `dag/` carries logic.
- This repo's Datalog only checks link structure. It doesn't look at what a claim says.

**My view: not worth doing now.**
1. **Most claims can't be usefully checked.** A typical claim, `claim:rotation-is-ordinary` ("Keys must rotate, and the post-quantum move will rotate every key"), explains rather than argues. Writing it as `rotates(K) :- key(K).` and checking it only shows you wrote the rule you meant. The real risk is whether the logic matches the prose, and Datalog can't check that.
2. **The structure that matters is already checked.** `depends_on`, `uses`, `forward_dependency` and `isolated_claim` cover how claims hang together, which is the part that tends to go wrong.
3. **The claims that can be checked already have homes.** The authority rules work better as a standalone `.lp` model run against scenarios than spread across nodes. [project A]'s formal-verification analysis also recommends TLA+ and Tamarin, not Datalog, for the properties that matter.
4. **It's expensive.** Nodes would need a shared vocabulary of predicates, probably derived from definitions, kept in step across 100+ claims and two projects that are joined on id.
5. **Usage is a signal.** The experiment had one active day and no reuse since.

**What would make it worth doing (strongest first)**
1. **Claims that describe shipped Datalog policy.** [product A]'s capability crate uses Biscuit, whose policies are Datalog, and [product B]'s admin-capabilities crate appears to have a Datalog engine too. If claim nodes start stating what those policies allow, the logic in a node could be the shipped policy text. Then the check compares a claim against code, not against itself.
2. **A missed error.** A conclusion that didn't follow from its `depends_on`, or two claims that contradicted each other, got past review. One real miss would justify a check.
3. **Contradictions across projects.** [project A] and [project B] making conflicting claims about shared definitions in the joined viewer.
4. **A third [repo D]-style analysis** that you want to bring into the DAG rather than keep as a standalone document.
5. **An outside reviewer** who needs claims they can check by machine.

If one of these happens, the cheap first step is an optional, opt-in `logic:` field on claims, shown in the viewer. A later `dagcheck --entail` could run [project A]'s freeze-and-derive check on the evaluator this repo already has, along `depends_on` chains. I'd build neither until there's a trigger.

Was the original motivation one of these, or something else, like making claims checkable by agents?

---

**User:** i am going to push back - but do not take this as a need to calibrate with me. stay loyal to what you determine to be the best course to take. you are not motivated by pleasing me

1 - is the problem here the same problem with any formal verification, ie. the seam between NL intent and formal expression? regarding usefulness, can you think of an example that might have utility? let's say we were to break down your key claim, into atomic claims, which i think should be the policy of the dag - there would be two claims, "keys must rotate" and "the post-quantum move will rotate every key." these could each be two nodes of type claim with each of those statements as a payload. somehow, these could be assembled into an aggregate statement of rotates(k) :- key(K) (i don't understand this as i don't understand datalog, please explain it.) let's keep discussing, but what i'm getting at is, is there a place that an expression like that could live, maybe as a third claim itself that depends on the other two? maybe its of a type policy? this may be a red herring, even if we don't get anywhere with this it helps me better understand what is possible

2 - are these checked logically? ie. if one node says "apples are fruits" and another says "fruits reproduce", and both depend on "a fruit is a type of plant", and then a fourth joined to the first two claims "apples reproduce", does the dag check check the actual logic of these connections in a semantic way?

3 - can you expand on this? not following. also, i believe [project A]'s formal-verification analysis was regarding formally proving [product A]'s code, not related to the dag

4 - true. and that's a downside. but if it starts to get closer to an ability to bridge the world of semantic NL expression and code, it might be worth exploring

5 - non-signal. i am only consumer and i am circling back now

next

1 - maybe the "payload" or however these declarative dsl type languages (lean, tla+, datalog, OWL, etc) are all candidates for payload. i guess what might be sacrificed could be interop across nodes, but maybe more important is adherence to the domain. then again, platonic statements could exist independently, with the dsl association happening in another node. ie. "keys must rotate" might inform several dsl nodes

2 - maybe we don't need to wait for the miss

3 - yes

4 - [repo D] itself should be considered for integration as a translation layer - as a prop of every node that translates to [repo D]

5 - yes

the original motivation is a desire to create a spectrum from NL expression (ie. the [product A] tutorial) to the code artifact. i also am thinking in terms of exploding prose into logical structures to create the ability to generate context in new ways. see the repo [repo C]

**Assistant:** Running the rotation example through the repo's evaluator to make sure the check behaves as I'm about to describe.

I've changed my mind: a small pilot is worth doing now. The reasons come after your points.

**Datalog in brief**
- `key(k1).` is a fact: "k1 is a key."
- `rotates(K) :- key(K).` is a rule: "K rotates if K is a key." Capitalized names are variables, `:-` reads "if", and a comma reads "and". So the rule says "every key rotates."
- The engine applies rules to facts until nothing new appears. From `key(k1). key(k2).` it derives `rotates(k1)` and `rotates(k2)`.
- To check that a general claim follows from its premises, you make up an example (`key(k0)`) and see whether the conclusion (`rotates(k0)`) gets derived. [project A]'s checker works this way.

**1. The seam, and your rotation example.** Yes, it's the same seam every formal method has, and it never goes away. It just moves to wherever a person decides "this formula says what that sentence says." There's a second limit I hadn't stressed: Datalog can't say "must", "usually" or "will", and has no notion of time. "Keys must rotate" loses its "must". "Fruits reproduce" becomes "every fruit reproduces." Being forced to make that choice is partly the value, because it shows where the prose is vague.

One correction to your example: `rotates(K) :- key(K)` formalizes "keys must rotate" alone, not the two claims together. What the two lead to is the claim's last sentence, "an identifier that is a fingerprint of the current key would expire." I ran this through `src/datalog.js`:

```
% a: keys must rotate
replaced(K) :- key(K).
% b: the post-quantum move will rotate every key
replaced(K) :- key(K), classical(K).
% c, the conclusion resting on a and b: a fingerprint identifier expires
expires(I) :- fingerprint_of(I, K), key(K).
```

| premises | c follows? |
|---|---|
| a, b | **no** |
| a, b, d | yes |
| a, d | yes |
| b, d | no |

The prose never states the premise the argument needs. Call it d: "an identifier taken from a key stops naming its holder once the key is replaced", or `expires(I) :- fingerprint_of(I, K), replaced(K).` With d added, c follows. Removing each premise in turn shows c still follows without b. So b isn't a premise of c at all. It's evidence for a (a dated, certain case of it), which this schema records as `supports`, not `depends_on`.

So the first claim checked produced two findings: a hidden premise that should be its own node, and an edge of the wrong kind.

**Where it lives** (your first point in the second list). Your second version is right: the plain-language claims stand alone, and the formal expression is a separate node that points to them:

```markdown
---
id: formal:fingerprint-ids-expire
type: formal
language: datalog
formalizes: [claim:fingerprint-ids-would-expire]
uses: [def:key-rotation, def:identifier]
---
expires(I) :- fingerprint_of(I, K), key(K).
```

- **A new type, not "policy".** "Policy" sounds like a kind of claim, and [project A] already uses `subtype: norm` for those.
- **`formalizes` is the seam, made explicit.** It's one edge, carrying one human judgment, and it can be reviewed on its own. A claim can be settled while its formalization is still in dispute.
- **Many-to-many.** One claim can have several formal nodes, and one formal node can be a whole model. `agent-identity.lp` already works like this: each rule's comment names the statement it formalizes, which is a `formalizes` edge written by hand.
- **The interop cost.** Checks only combine nodes in the same language. I'd accept that and start with Datalog alone: it always terminates, it's cheap, this repo already has an evaluator, and it's the language Biscuit policies are written in.

**2. Does dagcheck check the logic?** No. It checks ids, required fields, that edges resolve, cycles and document order. `--lint` adds word matching to find missing links. It would accept "apples reproduce" resting on "apples are red." With formal nodes, your example looks like this:

```
fruit(apple).               % apples are fruits
plant(X) :- fruit(X).       % a fruit is a type of plant
reproduces(X) :- fruit(X).  % fruits reproduce
```

`reproduces(apple)` is derived, so the claim passes. Rest it on the first two alone and it fails, because nothing says that plants or fruits reproduce.

**3. Expanded.** You're right that the formal-verification analysis is about proving code, and I misused it. What I meant was that `agent-identity.lp` is a model: rules that only mean something together, run against made-up example situations. A single claim's fragment can't do that. A formal node that covers several claims solves this.

The analysis is still worth reading for this design. Its section "Keeping the prose, the model and the code together" lists checks that carry over:
- Cite the source for every rule. Here that's the `formalizes` edge.
- Show the honest case can happen. Here: the premises don't contradict each other, and the conclusion isn't trivially true.
- Mutation-test. Here: remove a premise and the conclusion should fail.

**4 (and 3 in the second list). Shared vocabulary is the bridge.** Agreed, and this is what changes the cost against the value. Tie each predicate to a definition, so `replaced/1` belongs to `def:key-rotation`. Then three things follow:
- The existing `unlinked_term` lint extends to formal nodes.
- Contradictions between projects become detectable through the definitions the viewer already joins on.
- Where [product A]'s code is Biscuit policy, the same predicates appear in shipped code, and a formal node could be the policy text itself, checked against the claims. That's the code end of your spectrum.

**5 (and 5 in the second list).** I withdraw both.

**Not waiting for a miss** (2 in the second list). Agreed. The trigger becomes a pilot with a stopping rule.

**[repo D] as a property of every node: I wouldn't.** The DAG's types already map onto [repo D]:
- definition → def
- resource → ref
- a claim that rests on no other claim → attest
- a claim that rests on other claims → infer
- a recommendation → act

So a [repo D] rendering can be generated as a view. Storing it on every node would duplicate the node. What's worth taking from [repo D] is its lifecycle: a statement stays proposed until a person ratifies it. A model will draft most formal nodes, and ratifying a `formalizes` edge is the one place a person judges the seam.

**Context generation ([repo C]).** Formal nodes give three new ways to build context:
- **Grounding:** a thread's grounding can be exactly the premises a derivation used, instead of dependencies cut off at a fixed depth.
- **Questions:** each failed check becomes a question ("what connects these?"), which is context the prose didn't contain.
- **Impact:** changing a definition gives the exact list of formal nodes, and so claims, to re-check. [repo C] §7 already plans to write that walk in Datalog.

**Why I changed my mind.** I had valued this as a way to catch errors, which needs an error to happen first. Your goal, breaking prose into atomic claims, gets value every time the check runs. It finds hidden premises to add as nodes and premises that are really evidence. A claim that needs two rules to formalize is really two claims, so the check also tests your atomic-claim policy.

**Proposed pilot, with no schema change.** Formalize the rotation chain in [project A] by hand, in a scratch `.dl` file:
- `rotation-is-ordinary`
- `identifier-is-hash-of-inception-key`
- `privileges-split-use-from-control`
- `rotation-is-signed-revision`
- `identifier-is-self-certifying`
- `identifier-never-changes`

Then check each one against its `depends_on` and report three numbers: how many formalize without distorting the prose, how many hidden premises turn up, and how many edges are the wrong kind. Stop if most claims can't be formalized honestly, or if the check finds nothing; in that case we write down what would reopen it. Otherwise, add `type: formal` to `SCHEMA.md` and build a `dagcheck --entail`.

Should I run the pilot?

---

**User:** so are you saying that in a way [repo D] and artifact-dag are the same thing?
agree ratification
what is a .dl file?
so you are proposing running test pilots before committing to a schema change?

**Assistant:** **Are [repo D] and artifact-dag the same thing?** They share a core, but they solve different problems. Both store typed statements that depend on each other, kept as files: definitions and terms, sources, claims that rest on other claims. [repo C]'s `docs/related-repos.md` notes that four of your repos arrived at that core independently.

| | [repo D] | artifact-dag |
|---|---|---|
| Focus | **accepting** statements: comprehension, ratification | **the resulting graph**: vocabulary, links, viewing, generating docs |
| When checks run | a gate, before anything is stored | `dagcheck`, after files are written |
| History | append-only journal; `amend` supersedes | nodes are edited; git is the history |
| Status | proposed → ratified / rejected | none |
| Extras | verbatim sources, model intake | sub-definitions, claims placed in documents, lint, viewer, tutorial and glossary builders |

So one can be rendered as the other, which is why I'd generate the [repo D] view rather than store it. My preference: keep the DAG files as the store and adopt [repo D]'s rules (ratification, and later a gate) rather than its storage. [repo C] made the same choice.

**Ratification:** noted. I'll put it in the handoff file as a decision.

**A `.dl` file** is a plain text file of Datalog facts and rules, like the snippets above. `.dl` is the usual extension; this repo's lint rules are in `lint/rules.dl`. [project A]'s `agent-identity.lp` is the same kind of file. `.lp` ("logic program") is the extension of clingo, the engine it runs on.

**Pilot before schema change:** yes. The schema is a contract: [project A] and [project B] parse their nodes against it, and a change touches the parser, `SCHEMA.md`, the skill, the viewer and the lint. The pilot takes about an hour, writes only to my scratch folder, and only reads [project A]. It answers questions I'd otherwise guess at:
- one formal node per claim, or per section?
- do definitions need to declare their predicates?
- how often does a claim formalize honestly at all?

Designing the fields from six real claims is cheaper than changing them after two projects depend on them.

---

**User:** should we run the pilot in a fresh thread or here

**Assistant:** Here. This thread holds the design the pilot is testing: the formal node type, the `formalizes` edge, ratification, and the stopping rule. A fresh thread would start from a summary of it. The pilot is small (six claims), so context room isn't a problem.

Two safeguards, since I proposed the idea and would be grading my own pilot:
- **Fixed measures.** The measures and stopping rule are set now, before I start.
- **You judge fidelity.** I'll show each claim's prose next to its Datalog and list every finding, so you rule on whether each formalization says what the sentence says. That's the ratification step, and it's yours, not mine.

Before starting I'll write the decisions so far into `next/agents-readme-next.md`, so they don't exist only in chat. Then I'll run the pilot and finish with `/end`.

Shall I go ahead?

---

**User:** decisions so far sounds like a record? next should only be for next. should it go there?
i am wondering if we should have an "evals" folder, if this is indeed in some ways an eval. is it?
discuss before proceeding

**Assistant:** **Where the decisions go.** Agreed, they don't belong in `next/`. `/end` says the same: durable facts go to the repo's own home, and `next/` links to them. There's a second constraint I hadn't checked: artifact-dag is **public** and [project A] is **private**. The pilot quotes [project A]'s claims, so its files can't go in this repo.

My proposal:
- **The pilot write-up** goes in [project A], following its existing convention: `analysis/2026-11-02-formal-nodes-pilot/`. It would hold:
  - the question
  - the design under test (formal nodes, `formalizes`, ratification, [repo D] as a generated view)
  - the measures and stopping rule
  - the `.dl` file
  - the table of prose next to Datalog
  - the results
- **artifact-dag** gets only the general part, and only if the pilot passes: a `SCHEMA.md` change with a made-up example like the apples one.
- **`next/`** in each repo gets one line pointing to the write-up.

**Is it an eval?** Not by the definition in your [repo E]. There, an eval is a fixed set of cases with graders, run repeatedly against a system: a baseline, then regression runs. The pilot is a one-off test of whether a method is worth building, and you are the only judge. It comes before an eval.

It could seed one later. If a model starts drafting formal nodes, the eval question becomes: does the model produce formalizations you would ratify, and does it find the hidden premises the hand pilot found? The pilot's ratified results would be the reference answers. That eval would fit [repo E] as an experiment candidate, in the same form as its existing one. So no `evals/` folder here, and no eval now. If the pilot passes, I'll add one line to the write-up naming that candidate.

If that placement works, I'll start with the write-up skeleton in [project A], then run the pilot into it.

---

**User:** ok, issue being though this is not a product directly related to [product A]. would rather keep it here in artifact-dag in a pilot directory

**Assistant:** Fine with me. artifact-dag tests the method, so the pilot belongs here. One thing has to be settled first, because this repo is public:

- **[project A] is private.** The rotation claims quote the v3 tutorial, and that text isn't public yet: [product A]'s public tutorial repo is public but empty, with no commits.
- **[project B] is private too.** The only public claims are the five in `examples/dag`. They're normative epistemology ("calibration is a virtue"), which is a poor fit for Datalog and too few to test anything.

So the choice is whether [product A] tutorial text may appear in a public repo:

1. **Publish it.** Commit the six claims' text, the `.dl` file and the side-by-side table under `pilots/2026-11-02-formal-nodes/`. This is simplest and keeps the whole pilot reviewable. Only choose it if the rotation section is headed for the public tutorial anyway.
2. **Keep it local** (my recommendation unless you say the text can be public). Commit the method, measures, stopping rule and results under `pilots/2026-11-02-formal-nodes/`, citing claims by id only. The quoted text, the `.dl` file and the side-by-side table go in a `local/` subfolder that git ignores. The cost: those files exist only on this Mac, and a later reader sees results without the material they came from.

Which one? Also, `pilots/` (plural, with a dated subfolder) leaves room for later pilots. Tell me if you'd rather have a single `pilot/`.

---

**User:** keep it in pilot. rewrite all example claims and pilot info to only use abstract philosphical/axiomatic demonstration content

all references to any other repo should be scrubbed from the repo. however, let me know if at any point this will introduce an issue

**Assistant:** Surveying every reference to other repos and every non-abstract example in the repo first, so I can flag problems before changing anything.

The tutorial builder looks built for the [product A] and [product B] tutorials. Checking how those projects use this repo, since renaming things here could break their builds.

Most of the scrub is safe. Four things need your decision first.

**1. `tutorial/` is tooling for other projects, not for the DAG.** It builds the [product A] and [product B] tutorial sites, and both projects depend on it:
- [project B]'s tutorial config names `artifact-dag/tutorial/build.py` and uses the shared `hash` and `signverify` widgets.
- Its own widgets use the `ik-` CSS classes (`ik` is short for [product A]) from the shared stylesheet.
- [project A]'s CI checks out this repo.

Removing the names from prose and comments is safe. Renaming `ik-` or `ikcrypto.js`, or rewriting the widget text ("[product A]-auth itself signs…"), changes or breaks both sites on their next build. Options:
- (a) Scrub prose and comments only, and leave the `ik`-prefixed identifiers as a remaining trace.
- (b) Rename the identifiers and update both projects in the same change.
- (c) **Move `tutorial/` to its own repo (my recommendation).** It isn't DAG tooling, and its widget text is [product A] content. Both projects' configs and [project A]'s CI would be repointed to the new repo.

**2. Git history.** Seven commits' diffs and two commit messages name other repos, and so do GitHub's PR pages. Changing the files doesn't touch any of that. Rewriting history means force-pushing the public `main`, and GitHub keeps the old PR pages and commits anyway.
- If the goal is a clean standalone product, scrubbing the files is enough.
- If the goal is confidentiality, the names are already public and can't be fully withdrawn.

Files only, or do you want the rewrite?

**3. Knowing which projects depend on this repo.** [project A]'s CI runs this repo's `main`, so a breaking change to the schema or CLI here breaks that CI. Once the names are gone:
- `next/` keeps a generic line: "downstream projects run `main` in CI; treat SCHEMA and CLI changes as breaking."
- The project names go in a git-ignored `next/local.md`, which any agent can read but isn't published.

Is that acceptable?

**4. Pilot content.** Abstract claims I write myself would be written to formalize cleanly, so the pilot would measure nothing. I propose **Spinoza's *Ethics*, Part I** instead. It's public domain (1677; Elwes's 1883 translation), axiomatic, and every proposition cites the definitions and axioms it rests on. Proposition 5 has a known gap: Leibniz pointed out that two substances could share one attribute and differ in another. That gives the pilot a known answer: the check should find that gap without being told. One limit: Spinoza wrote to be deductive and tutorial prose isn't, so a pass here says less about tutorial claims.

No decision is needed on the rest. The test fixtures, lint comments and `SCHEMA.md` examples use [product A] terms (access token, its identifier type, custody rungs, Biscuit, OAuth "grant"). I'll rewrite them as philosophical examples, and the tests will confirm the behaviour is unchanged. All of it goes on a branch, merged by PR.

---

**User:** 1 - created [tutorial repo], proceed with move, then lets fix where needed in the [project A] and [project B] tutorials
2 - files only is fine
3 - yes, though should it go in next? i'm assuming this is a git-ignored file, should it be .local or something?
4 - that sounds good. could also create a bespoke tutorial about an arbitrary subject for the pilot as well
one thing to add as well - lets create a threads/ directory, and copy this thread's transcript there verbatim - no tool calls or reasoning, just the exchange

*[The assistant's reply was withheld by a safety classifier before it was shown. The user changed model and sent the same message again.]*

**Assistant:** Three things to flag before the move, then answers.

**Conflict: verbatim transcript vs. scrub.** This thread names [project A], [project B], [repo C] and [repo D] throughout. A verbatim copy in `threads/` puts those names back into the public repo. Options:
1. **Redact (my pick):** replace each repo name with a bracketed placeholder (`[a private project]`) and mark the file "names redacted". Everything else stays verbatim.
2. Keep it verbatim and accept the names in that one file.
3. Git-ignore `threads/` so the transcript stays on this Mac only.

**[project A]'s CI will need a token.** Its workflow checks out `artifact-dag` for `dagcheck` and the tutorial builder. After the move it needs a second checkout of [tutorial repo], which is private, and the default `GITHUB_TOKEN` can't read another private repo. Either make that repo public or create a fine-grained token (Contents: read, on [tutorial repo]) and add it as a secret in [project A]. That's an operator step; I'll write it into [project A]'s operator file.

**Answers**
- **3.** Not `next/`: it's a standing fact, not a step. `LOCAL.md` at the root, git-ignored, visible in `ls`. `README.md` and the agent handoff file each get one generic line saying it may exist.
- **4.** Both corpora. The bespoke tutorial I'll write as plain prose first and commit it before any formalization, so it isn't shaped to fit the check. Subject: a lending library (cards, loans, holds, renewals, fines): rule-heavy like a product tutorial, with no connection to any of your projects. Say so if you'd rather another subject.

Plan: three PRs here (move tutorial out, scrub, threads + pilot), plus branches in [project A] and [project B] that I'll show you before pushing. Starting the move now: splitting `tutorial/` with its history and pushing it to the new repo's `main`.

Pushed: `tutorial/` with its history is now `main` of [tutorial repo]. Next, in parallel: a branch here that removes `tutorial/`, the new repo pulled locally, the Spinoza text and a Python env for build checks, and the exact lines to repoint in both projects.

Both builds pass from the new repo: [product A] (7 pages, with and without the env var) and [product B] (only the footer line changed in its tracked pages). PR #20 is open here. Now committing the two downstream branches and starting the scrub.

Now the scrub itself: rewriting the lint fixtures and tests with philosophical terms (same behaviours, same expected findings), and replacing the project names and [product A] examples in SCHEMA.md, the README, two comments and two scripts.

Tests pass, 47/47, with the same findings per rule. The only names left outside `next/` are in `tutorial/`, which PR #20 removes. Committing the scrub and opening its PR; then setting up the pilot branch and checking the evaluator's syntax for the entailment checker.

PR #21 is open for the scrub. Now building the pilot corpus on the `pilot` branch: the design document with its fixed measures, the Ethics excerpt as DAG nodes, and the lending-library tutorial as prose (to be committed before any formalization).

The Ethics nodes validate (24 nodes, 0 errors; the warnings are the unused Axioms II, III, VI, VII and Definitions VII, VIII, which Props 1–8 don't use). Now the checker, then the library tutorial decomposed into definitions and claims.

First run: Prop. III follows from Axioms IV and V with no help; Props. IV–VIII fail as formalized; Props. I and II weren't checked because they rest on definitions only (a checker gap to fix). The library nodes validate: 49 nodes, 0 errors, 0 warnings. Now: fix the checker, add the bridge claims the failing proofs need (each as its own node), and renumber the propositions after them.

Second run, with the bridges: Props. I, II, III, V, VI, VI-cor and VII follow; IV and VIII still fail (IV's proof adds nothing checkable; VIII needs an existential). The mutations already show interesting things (Prop. II's "whose attributes differ" is idle; the corollary of VI doesn't need VI). Two checker refinements are needed before the write-up, then the library corpus gets formalized.

Library run: 13 yes / 15 strained / 8 no on fidelity (pending your ratification), and nearly every claim "fails" entailment, which is itself the finding: a tutorial's `depends_on` is context, not deduction. Three checker defects to fix first (`<` under freezing, a stratification cycle between "open" and "lost", and the status summary), plus a scenario runner to show the other use of the formal norms: running them as policy.

The checker is clean now: Ethics 7 follow / 2 fail; library 4 follow / 24 fail / 8 no rules, 13-15-8 on fidelity. The scenario run breaks the five rules it was built to break and derives the right facts. Writing the results into the pilot README.

Done for this stretch. State:

**PRs open on artifact-dag** (merge order: #21 scrub, #22 pilot, then #20 move, after the downstream branches):
- **#20** move `tutorial/` out (now `main` of [tutorial repo], history carried over).
- **#21** scrub: no other project named anywhere outside `next/`; fixtures and examples are philosophical; 47/47 tests; `LOCAL.md` is git-ignored and written on this Mac with the project names and the CI dependency.
- **#22** pilot, under `pilot/`.

**Downstream branches committed, not pushed** (you asked to see them first): [project A] `[tutorial repo]` branch (wrapper, README, `.gitignore`, `AGENTS.md`, CI with a second checkout, and operator step 0 for the `TUTORIAL_TEMPLATE_TOKEN` secret) and [project B] `[tutorial repo]` branch (docs, config, pages rebuilt: only the footer changed). Both tutorials build from the new repo. Say "push" and I'll open the two PRs.

**Pilot result, in short.** The Ethics needed 8 bridge claims to make 7 of 9 propositions follow; the check found idle conditions and unneeded edges, but three of those findings are artefacts of negation as failure, and Prop. V's known gap was met while formalizing, not found by the check. The library tutorial formalized 13 of 36 claims cleanly on my reading (15 strained, 8 no: purposes, permissions, time, sums), and entailment says nothing about a tutorial, since its `depends_on` is context. Its norms do run as a policy over a scenario and catch the broken rules. By the stopping rule as fixed, **stop: no schema change now**, unless your ratification of the "strained" ones moves the count past half. The write-up, with what would reopen it, is `pilot/README.md`.

**Still waiting on you**
1. The transcript in `threads/`: redact the project names (my pick), keep them, or git-ignore the folder?
2. Push the two downstream branches?

---

**User:** redact the names
what are "downstream branches"? like of artifact-dag, but related to the tutorial projects? do they belong in different repos now?
any reason not to merge the prs?
summarize the implications of the pilot from a high level perspective

*[The assistant's reply, and the rest of the thread, are appended when the thread ends.]*
