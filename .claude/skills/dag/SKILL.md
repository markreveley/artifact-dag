---
name: dag
description: Maintain a project's DAG of definition and claim nodes (Markdown files under dag/ in the project's files) and its viewer artifact. Use when the user says "dag ..." or asks to add, edit, link, check, list or publish definitions, claims or the graph viewer.
---

# DAG nodes and viewer

The project keeps a graph of **definitions** and **claims** as Markdown
files under `dag/` in its project files (`/mnt/project-files/dag/`). A
viewer artifact reads that folder directly. This repo (`artifact-dag`) holds
the schema, parser and viewer template. Read `SCHEMA.md` before writing a
node; `docs/USAGE.md` is the user-facing guide and defines the commands.

## Rules

- Node files are the source of truth. Never keep a parallel copy elsewhere.
- Ids are global: `def:<slug>` and `claim:<slug>`, lowercase, hyphenated.
  Reuse an id that exists in another project when it means the same thing.
- A link to an id not present in this project is fine (an external node).
- Keep frontmatter flat; the parser handles only the subset in SCHEMA.md.
- Definitions: `dag/definitions/<slug>.md`. Claims: `dag/claims/<slug>.md`.
- After any change, run the validator and report errors to the user.
- Project files are a network mount: write, then re-read about ten seconds
  later before building on it. Other threads may write too, so read a file
  immediately before changing it.
- Project files have no editor in the app, so a request to "edit" a node
  means you edit the file. Don't suggest converting nodes to Claude Docs.

## Claims from a document

To decompose a document into claims, write one claim per atomic statement
under `dag/claims/<document-slug>/`, each with `document: <repo>/<path>`,
`section: "<heading>"` and `order: <n>` in reading order (see SCHEMA.md,
Documents). Link each claim to the definitions it `uses` and to the claims it
`depends_on` or `supports`. The viewer's document picker reads these fields.

## Validator

```sh
node <repo>/bin/dagcheck.js /mnt/project-files/dag/          # report
node <repo>/bin/dagcheck.js /mnt/project-files/dag/ --json   # graph JSON
```

Exit code 1 means at least one error. External links are `info`.

## Bundle

After every change under `dag/`, rebuild the bundle the viewer loads from:

```sh
node <repo>/bin/bundle.js /mnt/project-files/dag/
```

It writes `dag/_bundle.json` (every `.md` file's path, byte size and text).
The viewer uses an entry only while the file's listed size matches, and reads
other files one by one, so a stale bundle only slows loading. An edit that
keeps a file's exact size would show the old text until the next rebuild.
If the project mirrors `dag/` in a repo, copy `_bundle.json` there too.

## Commands (from docs/USAGE.md)

| user says                     | do                                                                                  |
|-------------------------------|-------------------------------------------------------------------------------------|
| `dag check [--json]`          | run the validator; post the report (attach `graph.json` for `--json`)               |
| `dag list`                    | ids and titles grouped by type, from the validator's JSON                           |
| `dag show <id>`               | post the file's contents                                                            |
| `dag add def <term>`          | write a definition; draft the meta-definition from the request or ask for it         |
| `dag add claim <statement>`   | write a claim, `subtype: proposition` unless told otherwise; set `subject` if clear  |
| `dag link A <kind> B`         | add B to A's `<kind>` list (`uses`, `depends_on`, `supports`, `contradicts`, `refines`) |
| `dag unlink A <kind> B`       | remove it                                                                           |
| `dag rename <id> <new-id>`    | rename the file and id, and rewrite every reference in `dag/`                       |
| `dag externals`               | the validator's `external` notes                                                    |
| `dag publish`                 | see below                                                                           |
| `dag republish`               | rebuild and publish to the project's existing viewer URL                            |
| `dag push`                    | push this project's nodes to the federation view; see below                         |

Plain-language requests that mean one of these get the same treatment.

## Publishing the viewer

1. If `dag/` doesn't exist, offer to copy `examples/dag/definitions` and
   `examples/dag/claims` into it as a starter, or create it empty.
2. Build with this project's id (the `chan_...` id of the current project):
   ```sh
   node <repo>/bin/build-viewer.js --project chan_XXXX --title "<project name> DAG" > <scratch>/viewer.html
   ```
3. Publish `viewer.html` with the Artifact tool, declaring
   `capabilities: {files: {project: "chan_XXXX"}}` with the same id, and
   `icon: "graph"`. Keep a copy at `/mnt/project-files/dag-viewer/viewer.html`.
4. Post the link. Tell the user the page will ask once for permission to
   read the project's files, and that an outside viewer sees the example.

For `dag republish`, publish to the existing artifact's URL (find it with
the Artifact tool's list action if this thread didn't publish it).

## Pushing to the federation view

The federation artifact (URL in `<repo>/federation.json`) shows its home
project's `dag/` live plus every bundle other projects push into its
database, joined on ids. One artifact cannot read several projects' files
(see `docs/platform/README.md`), so this push is how a project joins.

`dag push`, in any project with this repo attached. `<dag>` is
`/mnt/project-files/dag/` in a project thread, or a local copy of the
project's `dag/` when the push runs from Claude Code on the user's machine
(see "When the write is blocked").

1. Validate: `node <repo>/bin/dagcheck.js <dag>`. Stop and show any
   problems.
2. Pick the slug: the project's name in lowercase with hyphens
   (`identikey`). `list` collection `projects` on the federation URL with
   the ArtifactData tool. If a document there already has this project's
   `project` id, reuse its slug. Write only under `projects/<slug>`, and
   never touch other projects' documents.
3. Read what's there: `get` collection `projects`, doc `<slug>` (note its
   `version`), and `list` collection `projects/<slug>/chunks` (note each
   chunk's `version`). Both are absent on a first push.
4. Plan the writes:
   ```sh
   node <repo>/bin/push-plan.js <dag> --slug <slug> \
     --project chan_XXXX --name "<project name>" --out <scratch>/push \
     --versions '{"meta": <v>, "c0": <v>, ...}'
   ```
   Leave out `--versions` on a first push. With it, every write to an
   existing document is pinned to that version (`if_version`), and chunks
   that the new plan no longer uses get delete writes. The planner prints
   `files` (node files plus `README.md`), `chunks` and `batches`.
5. Send each batch, in order, as one ArtifactData `batch` call, with the
   writes exactly as printed, `file_path` included. The meta document is in
   the last batch.
6. If a pinned write fails on a version mismatch, someone pushed in
   between: go back to step 3 and plan again. Never force it.
7. Confirm: `get` `projects`/`<slug>` and check that `files` and `chunks`
   match the plan. Report how many nodes were pushed, link the federation
   view, and give the versions the next push will need (each write's
   result shows them).

### When the write is blocked

In a cloud thread in auto mode, the safety check can block the database
write, because the write publishes the project's nodes to everyone the
federation view is shared with. Steps 1–4 still work. Hand the push to a
Claude Code session on the user's machine, where the user approves the
prompt. That session needs a local `dag/` that matches the project: the
project's GitHub mirror (for example `identikey-dev`), pulled. Check that
`dagcheck` gives the same node count there as in the project before
pushing.

Pushing from the home project is unnecessary; the view reads it live.
After `dag push` was used once, push again after each batch of node edits.
