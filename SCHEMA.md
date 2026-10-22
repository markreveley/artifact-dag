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
            value, subdefinitions: [{ source, text }], path }],
  edges: [{ from, to, kind }],          // kind: uses | depends_on | ...
  problems: [{ level, code, path, message }]
}
```

Problem codes: `missing_field`, `bad_id`, `prefix_mismatch`, `duplicate_id`,
`unknown_type`, `cycle`. External links are reported as `external` at level
`info` so a viewer can count them without treating them as errors.
