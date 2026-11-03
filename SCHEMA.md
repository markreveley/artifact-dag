# Node schema

A node is one Markdown file with YAML-style frontmatter. Three node types
exist today: **definition**, **claim** and **resource**. Files without a `type` field are ignored,
so a collection folder can hold ordinary notes alongside nodes.

## Where nodes live

By convention nodes live under a `dag/` folder in a project's repo, at any
depth. The validator and the viewer are given that folder and read every
`.md` file under it; nothing else about the layout matters. File names are
free, but `<id without prefix>.md` keeps things findable
(`dag/definitions/entropy.md` for `def:entropy`).

## Ids

Every node has a globally unique `id` of the form `<prefix>:<slug>`:

| type       | prefix  | example                       |
|------------|---------|-------------------------------|
| definition | `def`   | `def:entropy`                 |
| claim      | `claim` | `claim:entropy-never-decreases` |
| resource   | `res`   | `res:shannon-1948`            |

Slugs are lowercase ASCII letters, digits and hyphens. Ids are global across
projects on purpose: a `def:entropy` in one project and a `def:entropy` in
another are the same node, which is what lets per-project graphs be merged
later. A link to an id that is not in the current collection is not an error;
it renders as an *external* node.

## Common frontmatter

```yaml
---
id: def:entropy          # required
type: definition         # required: definition | claim | resource
title: Entropy           # required
tags: [thermodynamics]   # optional
sources:                 # optional, attributions for the node as a whole
  - Shannon 1948, "A Mathematical Theory of Communication"
uses: [def:information]  # optional edge fields, see below
---
```

## Edges

Edges are directed, from the file that declares them to the id they name.
Explicit edges come from these frontmatter fields, each a list of ids:

| field        | meaning                                              |
|--------------|------------------------------------------------------|
| `uses`       | this node relies on that definition's meaning        |
| `depends_on` | this node is only meaningful if that node holds      |
| `supports`   | this claim is evidence for that claim                |
| `contradicts`| this claim is evidence against that claim            |
| `refines`    | this node is a narrower version of that node         |
| `topics`     | this resource is about that definition               |

Inline wikilinks in the body, `[[def:entropy]]`, add a `mentions` edge. The
display text form `[[def:entropy|the entropy]]` is also accepted.

`uses`, `depends_on`, `supports`, `refines` and `topics` are expected to form
a DAG; the validator reports cycles over those five. `contradicts` and `mentions`
are allowed to cycle.

## Definition

From `examples/dag/definitions/credence.md`:

```yaml
---
id: def:credence
type: definition
title: Credence
aliases: [degree of belief, subjective probability]
tags: [epistemics, probability]
uses: [def:belief, def:proposition]
---
A credence is the strength with which an agent holds a [[def:belief]] in a [[def:proposition]], expressed as a number between 0 and 1 that behaves like a probability.

## Sub-definitions

### Ramsey (1926)
The degree of belief revealed by the odds at which an agent is willing to bet.

### de Finetti (1937)
A coherent price an agent would set for a bet that pays 1 if the proposition is true and 0 otherwise.
```

The body above the first `##` heading is the node's **value**: the single
agreed meta-definition. The `## Sub-definitions` section is optional; each
`### <source>` heading underneath is one attributed sub-definition, with the
heading text as the attribution and the paragraph(s) below it as the text.
`aliases` are alternative surface forms of the term.

## Claim

From `examples/dag/claims/conditionalization-is-rational.md`:

```yaml
---
id: claim:conditionalization-is-rational
type: claim
subtype: proposition
title: Rational agents update by conditionalization
subject: def:conditionalization
tags: [epistemics]
sources:
  - Lewis 1999, "Why Conditionalize?"
uses: [def:conditionalization, def:evidence]
depends_on: [claim:credences-should-be-probabilities]
---
An agent who plans to update by any rule other than conditionalization is vulnerable to a diachronic Dutch book, so conditionalization is the uniquely rational update rule.
```

The body is the claim's **value**: one atomic statement, elaborated as needed.
`subtype` is a free label; `proposition` is the first one in use. Others
likely to follow are `observation`, `hypothesis` and `norm`. `subject` names
the node the claim is about, and adds an `about` edge.

Formal text on claims (a claim's expression in Datalog) is not part of the
schema. It is paused, not rejected: README.md, "Paused: formal text on
nodes", says where it stands, and `pilot/` holds the pilots that test it.

## Resource

From `examples/dag/resources/sep-formal-belief.md`:

```yaml
---
id: res:sep-formal-belief
type: resource
title: Formal Representations of Belief (SEP)
url: https://plato.stanford.edu/entries/formal-belief/
tags: [epistemics, reference]
topics: [def:credence, def:belief]
---
Stanford Encyclopedia of Philosophy survey of the ways a belief state can be
modelled, from all-or-nothing belief to graded credence.
```

A resource is an outside page worth keeping: an article, a repo, a paper, a
video. `url` is required and is the page itself. `hacker_news` is optional,
the Hacker News thread that led to it
(`hacker_news: https://news.ycombinator.com/item?id=<n>`); for a post with
no outside link (an Ask HN), `url` and `hacker_news` are the same thread. The body is the
resource's **value**, an overview in the collection's own words.

`topics` lists the definitions the resource is about. A topic is an ordinary
definition (`def:credence`), so topics can `refine` broader topics, and the
viewer shows each resource hanging off the terms it is filed under. Other
fields a collection finds useful (`added`, `status`) are allowed; the parser
keeps only the ones listed under Parsed shape.

## Recording link decisions: not_links

```yaml
not_links: [def:ground]   # this node's text uses "ground" in another sense
```

An optional list of definition ids on any node. It says the node's text uses
that term's word in a different sense, so no edge belongs there. The linter
(`dagcheck --lint`) stops reporting `unlinked_term` and `narrower_unlinked`
for that pair, and on a claim it also silences `untagged_use` for that
definition. It adds no edge. Keep it for real decisions: a reviewer sees each
entry in the diff.

## Scales

Tag a definition `scale` when it names an ordered set of other definitions
(`assent`: doubt, then conviction). Each member `refines` the scale, and the
scale's text wikilinks every member, in order. The linter reports a member
the scale's text does not link as `scale_member`, an error.

## Pervasive terms

Tag a definition `pervasive` when nearly every node names it and a link from
each would only make it a hub: a collection's own subject (`def:ethics` in
a collection about the Ethics), or a citation marker. `unlinked_term` never
reports it. Nodes can still link it where the link means something.

## Documents

A claim usually comes from a document that argues it in order. Three
optional fields let the viewer show that document decomposed, claim by claim,
in its reading order:

```yaml
document: ethics/part-one.md
section: "Prop. V"
order: 31
```

`document` names the source, conventionally `<repo>/<path>`; every node with
the same value belongs to one document. `section` is the heading the claim
comes from. `order` is a whole number giving its place in the document;
numbers only need to sort, not be consecutive. The fields are allowed on
definitions too, but a definition used by many documents is better tagged
than given one `document`.

## Frontmatter syntax

The parser understands a deliberate subset of YAML so that it can run with no
dependencies both in Node and inside the viewer page:

- `key: scalar`
- `key: [a, b, c]` flow lists
- block lists with `- item` lines under a key
- quoted strings with `"..."` or `'...'`
- comments starting with `#` outside quotes

Nested mappings are not supported. Keep frontmatter flat.

## Parsed shape

`parseCollection` returns:

```js
{
  nodes: [{ id, type, subtype, title, aliases, tags, sources, subject,
            document, section, order, url, hackerNews, notLinks,
            value, subdefinitions: [{ source, text }], path }],
  edges: [{ from, to, kind }],          // kind: uses | depends_on | topics | ...
  problems: [{ level, code, path, message }],
  external: [id, ...]                   // linked but not in the collection
}
```

`notLinks` on a node is its `not_links` list.

Problem codes, all errors: `missing_field`, `bad_id`, `prefix_mismatch`,
`duplicate_id`, `unknown_type`, `cycle`, `bad_order`, and `bad_link` (an
edge field, `subject` or wikilink names something that is not
`<prefix>:<slug>` with a known prefix; no edge is drawn). External links are
reported as `external` at level `info`, so a viewer can count them without
treating them as errors. A page joining several collections adds `shared`,
also `info`, for an id defined in more than one; the first collection's
version is shown.

## Lint findings

`dagcheck <folder> --lint` derives findings from the parsed graph with the
Datalog rules in `lint/rules.dl`, then any rules in `<folder>/lint.dl`. A
rule derives `finding(Code, Level, Node, Target)`; the facts it can read are
listed at the top of `src/facts.js`. Matching words in text is done in
JavaScript before the rules run: whole words, case-insensitive, with a
plural `s` or `es`, a space in a term also matching a hyphen; the longest term wins where two overlap ("prior credence"
names Prior credence, not Credence); a title's trailing parenthetical is
dropped when what remains is no other title ("Necessity (logical)" is named
by "Necessity"); a title or alias of three characters or fewer counts only
in capitals ("PSR", "QED"). Wikilinks, Markdown link targets and code spans are not
scanned. Only a node's value is scanned, not its sub-definitions.

| code | level | reported when |
|---|---|---|
| `unlinked_term` | warn | a node's text names a definition it has no edge to (directly, or through a definition that refines it) and no `not_links` entry for, unless that definition is tagged `pervasive` |
| `narrower_unlinked` | warn | a definition's title ends with another definition's title ("Prior credence", Credence) and it has no edge to it, directly or through a definition that refines it |
| `scale_member` | error | a definition refines a `scale` whose text does not link it |
| `isolated_claim` | warn | a claim with a `document` and `order` has no `depends_on`, `supports`, `contradicts` or `refines` edge to or from another claim |
| `forward_dependency` | error | a claim `depends_on` a claim later in the same document |
| `untagged_use` | warn | a claim tagged `doc-X` `uses` a definition not tagged `doc-X` |
| `unused_doc_term` | warn | a definition tagged `doc-X` is linked by no claim tagged `doc-X`, when that document has claims |
| `dead_end_definition` | info | a definition has no outgoing edge |
| `topic_not_definition` | warn | a resource's `topics` names a node in the collection that is not a definition |
| `untopiced_resource` | info | a resource has no `topics` |

`--json` with `--lint` prints `{ problems, findings }`, each finding
`{ level, code, node, target, path, message }`. `--baseline <file>` reports
only warn and info findings not listed in the file (errors always show), and
writes the file from the current findings when it does not exist, so rules
can be switched on before every old warning is fixed. The linter never
writes edges.
