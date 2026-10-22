# artifact-dag

A directed graph of **definitions** and **claims**, kept as plain Markdown
files in a Claude project's files and viewed as a Claude artifact that reads
those files directly. No build, no sync: edit a file, reload the viewer.

This repo holds the generic pieces. Each project that wants a graph attaches
the repo, keeps its nodes under `dag/` in its project files, and publishes its
own instance of the viewer.

## Pieces

| path               | what                                                        |
|--------------------|-------------------------------------------------------------|
| `SCHEMA.md`        | the node format: frontmatter, ids, edges, body layout       |
| `src/parse.js`     | files in, `{nodes, edges, problems}` out; runs in Node and the browser |
| `src/frontmatter.js` | the small YAML subset the schema allows                   |
| `bin/dagcheck.js`  | CLI validator and JSON export                               |
| `examples/dag/`    | an example collection (epistemics) to copy into a project   |

## Use

```sh
npm test                          # unit tests
npm run check -- examples/dag     # validate a collection
npm run check -- examples/dag --json > graph.json
```

## Plan

1. **Schema and parser** (this). Node format, parser, validator, examples.
2. **Viewer.** A single HTML artifact template that reads one project's
   `dag/` folder with the artifact `files` capability, parses it with
   `src/parse.js`, and draws the graph with node detail on click.
3. **Second instance.** Attach the repo to another project and publish a
   second viewer, to prove the template is reusable without edits.
4. **Federation (optional).** A view that unions several projects' graphs,
   possible because ids are global and cross-project links are allowed.
