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
| `docs/USAGE.md`    | the user guide                                              |
| `.claude/skills/dag/` | what Claude does with `dag …` requests                   |
| `pilot/`           | pilots: bounded tests of a method before it is built in. What a pilot is and how to run one (`pilot/README.md`), the procedure under test (`pilot/PROCEDURE.md`) and its tools, and one folder per pilot |
| `threads/`         | the exchange of working threads, made at `/end` from `/export` (user turns and assistant text, other projects' names redacted). The redaction map `threads/redact.json` and raw exports in `threads/raw/` are git-ignored |

A git-ignored `LOCAL.md` at the root may hold notes that stay on one machine,
such as which projects run this code and which of them run it in CI. This
repo is public, so nothing in it names those projects.

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

The viewer stays in this repo, because it is built on the same parser as
`dagcheck`. What belongs to a project is its built page, which embeds that
project's nodes: each project builds its own and decides whether to publish
it, knowing that a published page makes every node in it public.

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
A folder is named after the directory that holds it (`ethics/dag` is
`ethics`) unless the config gives a name.

The page loads dagre from cdnjs and fonts from Google Fonts. Without a
network it falls back to a simple layered layout and system fonts.

## History

Until November 2026 the nodes lived in Claude projects' files and the viewer
was published as a Claude artifact that read them through the artifact
runtime, with a "federation" artifact that joined projects through its
database (`bin/push-plan.js`) and a `_bundle.json` cache (`bin/bundle.js`) to
cut file reads. All of that was retired once every project kept its DAG in a
repo; it is in git history before the commit that removed it.

Until November 2026 this repo also held `tutorial/`, a builder for the web
editions of tutorials. It is tooling for tutorials, not for the DAG, and
moved to its own repo with its history.
