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
| `bin/dagcheck.js`  | CLI validator and JSON export; `--lint` runs the link rules |
| `src/datalog.js`   | a small Datalog evaluator (semi-naive, stratified negation) |
| `src/facts.js`, `src/lint.js` | graph to Datalog facts, and rules to findings     |
| `lint/rules.dl`    | the default lint rules, one per finding code                |
| `examples/dag/`    | an example collection (epistemics) to copy into a project   |
| `viewer/template.html` | the viewer page, with placeholders for the parser and config |
| `bin/bundle.js`    | writes `_bundle.json`, every node in one file, so the viewer loads fast |
| `bin/push-plan.js` | plans the database writes that push a project's nodes to the federation view |
| `federation.json`  | the federation artifact's URL and home project |
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
   A project's repo keeps these options in `dag-viewer/config.json`
   (`{"project": "chan_XXXX", "root": "dag", "title": "My graph"}`) and
   builds with `npm run build -- --config <repo>/dag-viewer/config.json`.
   The built page is not committed anywhere; the artifact's versions record
   what was published.
3. Publish `viewer.html` as a Claude artifact declaring the `files`
   capability for the same project: `capabilities: {files: {project: "chan_XXXX"}}`.
   Only a member of the project can publish that declaration.

Press Reload after editing a file. How the page loads is under Architecture.

## Architecture

Four places are involved, and only two of them talk to each other while the
graph loads.

| where | what lives there | who changes it |
|---|---|---|
| GitHub (`artifact-dag`) | schema, parser, viewer template, `bundle.js`, `dagcheck.js` | Claude threads, through PRs |
| GitHub (the project's repo, e.g. `identikey-dev`) | a version-controlled mirror of `dag/` | Claude threads, through PRs |
| Project files (the Library) | `dag/`: the node files and `_bundle.json`. The source of truth | Claude threads; people through the app |
| claude.ai artifact | `viewer.html`, one page per project | Claude, by publishing |

**The page.** The viewer is a single HTML file with no server code. claude.ai
hosts it as an artifact at `claude.ai/artifact/<id>` and shows it in a
sandboxed iframe embedded in the claude.ai page you are using (the chat or
project view is the host). The frame runs JavaScript, which does all the
work: listing, reading, parsing and drawing. It runs on its own origin, so it
cannot reach claude.ai's page, your cookies or other artifacts.

Nothing deploys it automatically. A Claude thread runs `bin/build-viewer.js`,
which inlines `src/` into `viewer/template.html` with the project's id, and
uploads the result with its artifact publish tool to the artifact's existing
URL; each publish adds a version. The publish also declares what the page may
use, here the `files` capability for one project. The artifact is private to
its owner until they share it.

Limits on what the page can be:

- At most 16 MB, with no server-side code.
- Scripts only from approved CDNs (cdnjs, jsDelivr, unpkg and a few others;
  dagre comes from cdnjs), stylesheets only from Google Fonts, everything
  else inline.
- Anything beyond static behavior goes through capabilities claude.ai offers
  and the publish declares: project files, a shared database, asking Claude,
  and others.

The page runs only while it is open; its state (the parsed graph, the
selection) lives in that tab's memory and is gone when the tab or panel
closes. Every open loads from scratch.

**Reading files.** The page cannot reach the files directly. claude.ai
injects `window.claude` into the frame, and `claude.use("files")` returns two
functions. Each call goes from the page to claude.ai, which checks that the
viewer may open the project's files (asking once) and answers from project
storage:

- `list(folder)` returns the name and byte size of every file under `dag/`,
  without contents. One call (one per 500 files).
- `read(path)` returns one file's bytes.

These calls are the only way in: the page runs in your browser, which has no
direct route to project storage. claude.ai's files service limits how fast
one page may call (the limits are not published). A burst gets some calls
back as `rate_limited` with a wait time instead of the file, and the page
waits and retries them. The viewer sends at most four reads at a time; that
is its own choice, to avoid tripping the limit, not a limit of the host. One
`read` per node therefore takes minutes for a few hundred nodes.

**The bundle.** `bin/bundle.js dag/` writes `dag/_bundle.json`: for each
`.md` file, its path, its byte size at bundle time, and its text. A load is:

1. `list` the folder: every file's current size, no contents.
2. `read` `_bundle.json`: every file's text and its recorded size.
3. For each listed `.md` file, use the bundle's text when the sizes match.
   `read` that file directly when the sizes differ or the bundle lacks it.
   A file no longer listed is dropped.

With a current bundle that is two calls. A bundle that is behind costs one
extra `read` per changed file and still shows current text. The one gap is
an edit that leaves a file's byte size exactly the same: the sizes match and
the old text shows. `list` gives no hash or edit time to check instead, so
rebuild the bundle after every change to `dag/` (the `dag` skill does). With
no bundle, the page reads every file as before.

**Storage the page could use instead.** If the publish declares it, an
artifact gets a small document database kept by claude.ai: collections of
JSON documents the page can get, list, query, set, update and delete. Every
viewer of the artifact sees the same data, and a Claude thread can read and
write it too. Separately, the browser's own storage (`localStorage`) keeps
data per viewer on one device. The viewer uses neither.

The bundle is a file in the project's files, not the artifact's own database,
so it carries the same permission as the nodes: someone the artifact is
shared with but who cannot open the project's files sees only the built-in
example. If the files can't be read (viewer outside the project, access
declined, no `dag/` folder) a banner says so and the example stays.

**What we learned about the platform.** Details and the type definitions
are in [docs/platform/](docs/platform/README.md).

- *An artifact belongs to its author, not to a project.* A project's files
  are something the artifact is granted at publish, and only a member of
  that project can publish the grant.
- *One project per artifact.* The `files` grant names exactly one project,
  and the page's `list`/`read` calls take no project argument. Declaring two
  projects is rejected at publish (tested 2026-10-22). So no single page can
  read several projects' Libraries, and a cross-project view has to get the
  other projects' nodes some other way (see Federation).
- *The page lives only while it is open.* In the projects view the artifact
  opens as a modal iframe; closing it ends the page, and opening another
  project's viewer starts a fresh page. That is fine for one viewer per
  project, because every open loads from scratch in two calls.
- *Busy answers.* The files service answers `rate_limited` to bursts and
  while its permission prompt is open. The page waits the given time and
  retries rather than giving up.
- *The database is reachable from any project.* A Claude thread reads and
  writes an artifact's database by the artifact's URL, acting as the person,
  when that person can edit the artifact. Which project the thread runs in
  does not matter. A page itself can write only its own database.
- *Database limits.* Documents are JSON objects at slash-separated paths, at
  most 256 KiB each, with a total size cap the docs don't state. By default
  everyone the artifact is shared with can read shared data and only the
  owner and editors write; access rules declared at publish can narrow both.

**Federation.** The federation view is the same template built with
`--federation`. It reads its home project's `dag/` through `files`, and
reads `projects/<slug>` documents from its own database, each naming the
chunk documents (`projects/<slug>/chunks/c0...`, under 200 KiB each) that
hold a pushed project's files. Other projects get there by `dag push`: a
thread in that project runs `bin/push-plan.js` and sends the writes with
its database tool, acting as the owner. The page parses each project
separately, joins on id (first definition wins, later ones are noted), and
recomputes externals and cycles over the whole graph. The database rules
let anyone the artifact is shared with read, and only editors write.

**Where Claude works.** A Claude thread runs in a cloud container with clones
of the attached repos. The project's files are mounted there at
`/mnt/project-files/` (`/mnt` is the Unix convention for mounted
filesystems), so a thread edits nodes and runs `dagcheck`/`bundle.js` on the
same files the viewer reads. The page never talks to that container.

## Plan

1. **Schema and parser** (this). Node format, parser, validator, examples.
2. **Viewer.** A single HTML artifact template that reads one project's
   `dag/` folder with the artifact `files` capability, parses it with
   `src/parse.js`, and draws the graph with node detail on click.
3. **Second instance.** Attach the repo to another project and publish a
   second viewer, to prove the template is reusable without edits.
4. **Federation (optional).** A view that unions several projects' graphs,
   possible because ids are global and cross-project links are allowed.
