# Node schema

A node is one Markdown file with YAML-style frontmatter. Two node types exist
today: **definition** and **claim**. Files without a `type` field are ignored,
so a collection folder can hold ordinary notes alongside nodes.

## Where nodes live

By convention nodes live under a `dag/` folder in a project's files, at any
depth. The viewer is told the project and the root folder; nothing else about
the layout matters. File names are free, but `<id without prefix>.md` keeps
things findable (`dag/definitions/entropy.md` for `def:entropy`).

## Ids

Every node has a globally unique `id` of the form `<prefix>:<slug>`:

| type       | prefix  | example                       |
|------------|---------|-------------------------------|
| definition | `def`   | `def:entropy`                 |
| claim      | `claim` | `claim:entropy-never-decreases` |

Slugs are lowercase ASCII letters, digits and hyphens. Ids are global across
projects on purpose: a `def:entropy` in one project and a `def:entropy` in
another are the same node, which is what lets per-project graphs be merged
later. A link to an id that is not in the current collection is not an error;
it renders as an *external* node.

## Common frontmatter

```yaml
---
id: def:entropy          # required
type: definition         # required: definition | claim
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

Inline wikilinks in the body, `[[def:entropy]]`, add a `mentions` edge. The
display text form `[[def:entropy|the entropy]]` is also accepted.

`uses`, `depends_on`, `supports` and `refines` are expected to form a DAG;
the validator reports cycles over those four. `contradicts` and `mentions`
are allowed to cycle.

## Definition

```yaml
---
id: def:credence
type: definition
title: Credence
aliases: [degree of belief, subjective probability]
uses: [def:belief]
---
A credence is the strength with which an agent holds a belief, expressed as a
number between 0 and 1 that behaves like a probability.

## Sub-definitions

### Ramsey (1926)
The degree of belief revealed by the odds at which an agent is willing to bet.

### de Finetti (1937)
A coherent price an agent would set for a bet that pays 1 if the proposition
is true, 0 otherwise.
```

The body above the first `##` heading is the node's **value**: the single
agreed meta-definition. The `## Sub-definitions` section is optional; each
`### <source>` heading underneath is one attributed sub-definition, with the
heading text as the attribution and the paragraph(s) below it as the text.
`aliases` are alternative surface forms of the term.

## Claim

```yaml
---
id: claim:credences-should-be-probabilities
type: claim
subtype: proposition
title: Credences should obey the probability axioms
subject: def:credence
sources:
  - Dutch book argument, Ramsey 1926
uses: [def:credence]
supports: [claim:bayesian-updating-is-rational]
---
An agent whose credences violate the probability axioms can be offered a set
of bets they will each accept and that together guarantee a loss.
```

The body is the claim's **value**: one atomic statement, elaborated as needed.
`subtype` is a free label; `proposition` is the first one in use. Others
likely to follow are `observation`, `hypothesis` and `norm`. `subject` names
the node the claim is about, and adds an `about` edge.

## Recording link decisions: not_links

```yaml
not_links: [def:grant]   # this node's text uses "grant" in another sense
```

An optional list of definition ids on any node. It says the node's text uses
that term's word in a different sense, so no edge belongs there. The linter
(`dagcheck --lint`) stops reporting `unlinked_term` and `narrower_unlinked`
for that pair, and on a claim it also silences `untagged_use` for that
definition. It adds no edge. Keep it for real decisions: a reviewer sees each
entry in the diff.

## Scales

Tag a definition `scale` when it names an ordered set of other definitions
(`custody-ladder`: C0 to C4). Each member `refines` the scale, and the
scale's text wikilinks every member, in order. The linter reports a member
the scale's text does not link as `scale_member`, an error.

## Documents

A claim usually comes from a document that argues it in order. Three
optional fields let the viewer show that document decomposed, claim by claim,
in its reading order:

```yaml
document: identikey-dev/tutorials/identikey-from-the-ground-up.md
section: "9. The XID"
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
            document, section, order,
            value, subdefinitions: [{ source, text }], path }],
  edges: [{ from, to, kind }],          // kind: uses | depends_on | ...
  problems: [{ level, code, path, message }]
}
```

Problem codes: `missing_field`, `bad_id`, `prefix_mismatch`, `duplicate_id`,
`unknown_type`, `cycle`, `bad_order`. External links are reported as `external` at level
`info` so a viewer can count them without treating them as errors.
`notLinks` on a node is its `not_links` list.

## Lint findings

`dagcheck <folder> --lint` derives findings from the parsed graph with the
Datalog rules in `lint/rules.dl`, then any rules in `<folder>/lint.dl`. A
rule derives `finding(Code, Level, Node, Target)`; the facts it can read are
listed at the top of `src/facts.js`. Matching words in text is done in
JavaScript before the rules run: whole words, case-insensitive, with a
plural `s` or `es`; the longest term wins where two overlap ("access token"
names Access token, not Token); a title's trailing parenthetical is dropped
when what remains is no other title ("C2 (managed)" is named by "C2"); a
title or alias of three characters or fewer counts only in capitals
("OP", "XID"). Wikilinks, Markdown link targets and code spans are not
scanned. Only a node's value is scanned, not its sub-definitions.

| code | level | reported when |
|---|---|---|
| `unlinked_term` | warn | a node's text names a definition it has no edge to and no `not_links` entry for |
| `narrower_unlinked` | warn | a definition's title ends with another definition's title ("Access token", Token) and it has no edge to it |
| `scale_member` | error | a definition refines a `scale` whose text does not link it |
| `isolated_claim` | warn | a claim with a `document` and `order` has no `depends_on`, `supports`, `contradicts` or `refines` edge to or from another claim |
| `forward_dependency` | error | a claim `depends_on` a claim later in the same document |
| `untagged_use` | warn | a claim tagged `doc-X` `uses` a definition not tagged `doc-X` |
| `unused_doc_term` | warn | a definition tagged `doc-X` is linked by no claim tagged `doc-X`, when that document has claims |
| `dead_end_definition` | info | a definition has no outgoing edge |

`--json` with `--lint` prints `{ problems, findings }`, each finding
`{ level, code, node, target, path, message }`. `--baseline <file>` reports
only warn and info findings not listed in the file (errors always show), and
writes the file from the current findings when it does not exist, so rules
can be switched on before every old warning is fixed. The linter never
writes edges.
