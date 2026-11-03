# Using the DAG

A project that uses the DAG keeps its nodes in its own repo:

1. **Node files.** Markdown files under `dag/`, one per definition, claim or
   resource. They are the source of truth. The format is in
   [SCHEMA.md](../SCHEMA.md).
2. **The viewer.** An HTML page built from `dag/` by `bin/build-viewer.js`
   (see "Viewing the graph"). It is not committed; build it when you want it.
3. **This repo**, checked out beside the project's (for example
   `~/dev/repos/artifact-dag`). It holds the validator, the viewer and the
   `dag` skill that tells Claude the commands below.

## Viewing the graph

```sh
node <artifact-dag>/bin/build-viewer.js --config dag-viewer/config.json > /tmp/dag.html
open /tmp/dag.html
```

The page holds the nodes as they were when it was built. Rebuild it after
editing.

- Pills are definitions, boxes are claims, square boxes are resources (outside
  pages: articles, repos, papers). The small label above a title is the type
  or, for a claim, its subtype.
- Arrows point from a node to what it builds on: a claim points at the
  definitions it `uses`, a narrower definition points at the broader term it
  `refines`, a resource points at the definitions it is filed under through
  `topics`. Green is `supports`, red dashed is `contradicts`, faint lines
  are `mentions` and `about`.
- A dashed outline is an **external** node: something linked from this
  collection but not defined in it. It may live in another project's `dag/`,
  or still need writing. Build the page from both folders to see it joined
  (`--dag` twice; see the README, "Several collections").
- Click a node to read it in full: the meta-definition or claim text, the
  attributed sub-definitions, sources, a resource's URL and Hacker News
  thread, and every edge in and out. Links in the text jump to that node.
- Filters hide a type; search dims everything that doesn't match on id,
  title, alias, tag or URL. Scroll to zoom, drag to pan, **Fit** to reset.
- The **document** picker (shown once any claim has a `document` field)
  narrows the graph to one document's claims and what they build on, and
  lists those claims in reading order, grouped by section. A claim from a
  document shows previous and next links, so you can read the document
  decomposed, one claim at a time.
- The **problems** button lists what the validator found: missing fields,
  bad ids, links that are not ids, duplicates, cycles, and (as notes, not
  errors) external links and, on a joined page, ids defined in more than one
  project.

## Adding and editing nodes

Edit the files under `dag/` directly, or ask Claude in a session in the
project's repo. Claude reads this repo's `dag` skill and knows the format.
Plain language works:

> Add a definition of "calibration" with Tetlock's version as a
> sub-definition, and link it to credence.

or the shorter command forms below. Claude writes or changes the file,
runs the validator and reports. Changes go to the project's repo through
its usual review (a PR).

## Checking the graph (dagcheck)

```sh
node <artifact-dag>/bin/dagcheck.js dag/          # report
node <artifact-dag>/bin/dagcheck.js dag/ --json   # graph JSON
node <artifact-dag>/bin/dagcheck.js dag/ --lint   # also link findings
```

The report gives node and edge counts and every problem with the file it came
from; exit code 1 means at least one error. The viewer runs the same parser,
so its problems button shows the same problems. It does not run the lint.

`--lint` adds rules that look for missing links rather than broken files. It
reports, for example, a definition whose text names another term without
linking it, a claim with no edge to any other claim, or a claim that depends
on one later in its document. It only reports; each finding is decided by
adding the link or by noting in the node that the word means something else
(`not_links`, see `SCHEMA.md`), and then it stays quiet.

## Commands

Conventions for asking Claude, defined in this repo's `dag` skill. Anything
you'd say in a sentence works too; the short forms make a request
unambiguous.

| say | Claude does |
|---|---|
| `dag check` | runs the validator on `dag/` and posts the report |
| `dag check --json` | same, and writes the parsed graph as `graph.json` |
| `dag lint [--json]` | runs `dagcheck --lint` on `dag/`; posts the counts by code and the warnings for what changed |
| `dag list` | lists every node id with its title, grouped by type, from the validator's JSON |
| `dag show <id>` | posts the node's file contents |
| `dag add def <term>` | creates `dag/definitions/<slug>.md`, drafting the meta-definition from the request or asking for it |
| `dag add claim <statement>` | creates `dag/claims/<slug>.md`, subtype `proposition` unless told, with `subject` set when it is clear |
| `dag add res <url>` | creates `dag/resources/<slug>.md` with a short overview, filed under the definitions in its `topics` |
| `dag link <id> <kind> <id>` | adds the second id to the first node's `<kind>` list (`uses`, `depends_on`, `supports`, `contradicts`, `refines`, `topics`), e.g. `dag link claim:x uses def:y` |
| `dag unlink <id> <kind> <id>` | removes it |
| `dag rename <id> <new-id>` | renames the file and id, and rewrites every reference to it in `dag/` |
| `dag externals` | lists ids linked but not defined here (the validator's `external` notes) |
| `dag view` | builds the viewer and opens it |

Ids are global on purpose: use the same `def:credence` in every project
that means the same thing, and the graphs join cleanly.

## Glossaries

`bin/dag-to-glossary.js --config glossary.config.json` writes the
`## Glossary` section of each listed document from the definitions tagged
for it, and optionally a master glossary of every term. `--check` writes
nothing and exits 1 if a glossary is out of date, for CI. The config format
is at the top of the script.

## Setting up a new project

1. Create `dag/` in the project's repo, empty or with a copy of the
   folders in `examples/dag/` as a starter.
2. Add `dag-viewer/config.json`: `{"dag": "../dag", "title": "<project> DAG"}`.
3. Say in the project's `AGENTS.md` (or `CLAUDE.md`) where artifact-dag is
   checked out, and which commands to run after changing a node.

## Limits worth knowing

- The viewer is read-only and shows a snapshot; edits go to the files.
- The parser accepts a deliberate subset of YAML. Keep frontmatter flat.
