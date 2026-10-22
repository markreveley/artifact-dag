# artifact-dag

A directed graph of **definitions** and **claims**, kept as plain Markdown
files in a Claude project's files and viewed as a Claude artifact that reads
those files directly. No build, no sync: edit a file, reload the viewer.

This repo holds the generic pieces. Each project that wants a graph attaches
the repo, keeps its nodes under `dag/` in its project files, and publishes its
own instance of the viewer.

**Start with [docs/USAGE.md](docs/USAGE.md)**: how the DAG looks and works
from inside a Claude project, how nodes get added without a terminal or a
file editor, and the `dag …` commands Claude understands there. The rest of
this file is for someone working on the code.

## Pieces

| path               | what                                                        |
|--------------------|-------------------------------------------------------------|
| `SCHEMA.md`        | the node format: frontmatter, ids, edges, body layout       |
| `src/parse.js`     | files in, `{nodes, edges, problems}` out; runs in Node and the browser |
| `src/frontmatter.js` | the small YAML subset the schema allows                   |
| `bin/dagcheck.js`  | CLI validator and JSON export                               |
| `examples/dag/`    | an example collection (epistemics) to copy into a project   |
| `viewer/template.html` | the viewer page, with placeholders for the parser and config |
| `bin/bundle.js`    | writes `_bundle.json`, every node in one file, so the viewer loads fast |
| `bin/build-viewer.js` | stamps one project's id into the template, inlining `src/` |
| `docs/USAGE.md`    | the user guide, written for the Claude project view          |
| `.claude/skills/dag/` | what Claude does with `dag …` requests in a project that has this repo |

## Use

```sh
npm test                          # unit tests
npm run check -- examples/dag     # validate a collection
npm run check -- examples/dag --json > graph.json
npm run bundle -- examples/dag    # write examples/dag/_bundle.json
```

## Publish a viewer for a project

1. Put nodes under `dag/` in the project's files (copy `examples/dag/` to start).
2. Build the page for that project:
   ```sh
   npm run build -- --project chan_XXXX --title "My graph" > viewer.html
   ```
3. Publish `viewer.html` as a Claude artifact declaring the `files`
   capability for the same project: `capabilities: {files: {project: "chan_XXXX"}}`.
   Only a member of the project can publish that declaration.

The page lists `dag/` recursively, then reads `dag/_bundle.json` (written by
`bin/bundle.js`) for the text of every file in one call. A file whose listed
size differs from its bundle entry, or that the bundle lacks, is read on its
own, so a stale or missing bundle is slower, not wrong. The one exception is
an edit that keeps a file's exact byte size: rebuild the bundle after every
change to `dag/`. The page then parses the files in the
browser, and lays the graph out with dagre. Its first frame shows the built-in
example collection, then the project's files replace it. If the files can't
be read (viewer outside the project, access declined, no `dag/` folder) a
banner says so and the example stays. Press Reload after editing a file.

## Plan

1. **Schema and parser** (this). Node format, parser, validator, examples.
2. **Viewer.** A single HTML artifact template that reads one project's
   `dag/` folder with the artifact `files` capability, parses it with
   `src/parse.js`, and draws the graph with node detail on click.
3. **Second instance.** Attach the repo to another project and publish a
   second viewer, to prove the template is reusable without edits.
4. **Federation (optional).** A view that unions several projects' graphs,
   possible because ids are global and cross-project links are allowed.
