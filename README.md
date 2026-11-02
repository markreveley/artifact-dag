# artifact-dag

A directed graph of **definitions**, **claims** and **resources** (outside
pages filed under the definitions they are about), kept as plain Markdown
files in a `dag/` folder of a project's repo, checked by a command-line
validator and drawn by a static HTML viewer.

This repo holds the generic pieces. Each project keeps its nodes under
`dag/` in its own repo and builds the viewer from them.

**Start with [docs/USAGE.md](docs/USAGE.md)**: how to add nodes, check them
and view the graph. The rest of this file is for someone working on the code.

## Pieces

| path               | what                                                        |
|--------------------|-------------------------------------------------------------|
| `SCHEMA.md`        | the node format: frontmatter, ids, edges, body layout       |
| `src/parse.js`     | files in, `{nodes, edges, problems}` out; runs in Node and the browser |
| `src/frontmatter.js` | the small YAML subset the schema allows                   |
| `bin/dagcheck.js`  | CLI validator and JSON export; `--lint` runs the link rules |
| `src/datalog.js`   | a small Datalog evaluator (semi-naive, stratified negation) |
| `src/facts.js`, `src/lint.js` | graph to Datalog facts, and rules to findings     |
| `lint/rules.dl`    | the default lint rules, one per finding code                |
| `examples/dag/`    | an example collection (epistemics) to copy into a project   |
| `viewer/template.html` | the viewer page, with placeholders for the parser and the nodes |
| `bin/build-viewer.js` | builds the viewer page from one or more `dag/` folders  |
| `bin/dag-to-glossary.js` | writes each document's `## Glossary` (and an optional master glossary) from the definitions, per a project's `glossary.config.json`; can draw terms from other projects' DAGs |
| `tutorial/`        | the builder, runtime, styles, crypto bundle and shared widgets for tutorial web editions (`tutorial/README.md`) |
| `docs/USAGE.md`    | the user guide                                              |
| `.claude/skills/dag/` | what Claude does with `dag …` requests                   |

## Use

```sh
npm test                          # unit tests
npm run check -- examples/dag     # validate a collection
npm run check -- examples/dag --json > graph.json
npm run check -- examples/dag --lint
npm run build -- --dag examples/dag --title "Example" > /tmp/viewer.html
```

## The viewer

`bin/build-viewer.js` inlines `src/frontmatter.js`, `src/parse.js` and the
text of every node file into `viewer/template.html`. The result is one HTML
file with no server code: open it from disk or put it on any static host. It
shows the nodes as they were when it was built, so rebuild it after editing.
Never commit a built page.

```sh
npm run build -- --dag <repo>/dag --title "My graph" > viewer.html
npm run build -- --config <repo>/dag-viewer/config.json > viewer.html
```

A project's repo keeps its options in `dag-viewer/config.json`:
`{"dag": "../dag", "title": "My graph"}`. Paths there are relative to the
config file.

**Several collections.** Give `--dag` more than once, or a list in the config
(`"dag": ["../dag", {"path": "../../other/dag", "name": "Other"}]`), and the
page joins them into one graph. Each folder is parsed separately, then joined
on id: the first definition of an id wins (folders in the order given), later
ones are noted in the problems list, and externals and cycles are recomputed
over the whole graph, so a link that is external in one project resolves when
another defines it. A **project** menu narrows the graph to one collection.
A folder is named after the directory that holds it (`identikey-dev/dag` is
`identikey-dev`) unless the config gives a name.

The page loads dagre from cdnjs and fonts from Google Fonts. Without a
network it falls back to a simple layered layout and system fonts.

## History

Until November 2026 the nodes lived in Claude projects' files and the viewer
was published as a Claude artifact that read them through the artifact
runtime, with a "federation" artifact that joined projects through its
database (`bin/push-plan.js`) and a `_bundle.json` cache (`bin/bundle.js`) to
cut file reads. All of that was retired once every project kept its DAG in a
repo; it is in git history before the commit that removed it.
