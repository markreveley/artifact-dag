---
name: dag
description: Maintain a project's DAG of definition, claim and resource nodes (Markdown files under dag/ in the project's files) and its viewer artifact. Use when the user says "dag ..." or asks to add, edit, link, check, list or publish definitions, claims, resources (saved links) or the graph viewer.
---

# DAG nodes and viewer

The project keeps a graph of **definitions** and **claims** as Markdown
files under `dag/` in its project files (`/mnt/project-files/dag/`). A
viewer artifact reads that folder directly. This repo (`artifact-dag`) holds
the schema, parser and viewer template. Read `SCHEMA.md` before writing a
node; `docs/USAGE.md` is the user-facing guide and defines the commands.

Some projects keep the folder elsewhere in their files, for example
`/mnt/project-files/<repo>/dag/` when the Library mirrors each repo's
layout. The project's instructions or the mirroring repo's `CLAUDE.md` say
so. Then use that folder wherever this skill says `/mnt/project-files/dag/`,
and set `"root": "<repo>/dag"` (the path inside the project's files) in its
`dag-viewer/config.json`, or the viewer will look for a top-level `dag/`
and show the example.

## Rules

- Node files are the source of truth. Never keep a parallel copy elsewhere.
- Ids are global: `def:<slug>`, `claim:<slug>` and `res:<slug>`, lowercase, hyphenated.
  Reuse an id that exists in another project when it means the same thing.
- A link to an id not present in this project is fine (an external node).
- Keep frontmatter flat; the parser handles only the subset in SCHEMA.md.
- Definitions: `dag/definitions/<slug>.md`. Claims: `dag/claims/<slug>.md`.
  Resources: `dag/resources/<slug>.md`.
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
node <repo>/bin/dagcheck.js /mnt/project-files/dag/ --lint   # also link findings
node <repo>/bin/dagcheck.js /mnt/project-files/dag/ --lint --json
```

Exit code 1 means at least one error. External links are `info`.

`--lint` runs the Datalog rules in `lint/rules.dl` (and `dag/lint.dl` if the
collection has one) and lists findings such as a definition named in text
with no link to it. The linter never edits nodes. For each finding, read the
node and decide: add the edge (`refines` for a narrower term, a wikilink in a
definition, `uses` in a claim), or record that the word is meant in another
sense with `not_links: [def:…]`. Do not add edges from word matches without
reading them; put the decisions in a PR so they are reviewed as a diff.

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
| `dag lint [--json]`           | run `dagcheck --lint`; post the counts by code and the warnings for what changed     |
| `dag list`                    | ids and titles grouped by type, from the validator's JSON                           |
| `dag show <id>`               | post the file's contents                                                            |
| `dag add def <term>`          | write a definition; draft the meta-definition from the request or ask for it         |
| `dag add claim <statement>`   | write a claim, `subtype: proposition` unless told otherwise; set `subject` if clear  |
| `dag add res <url>`           | write a resource with `url`; draft a short overview; file it under `topics` definitions |
| `dag link A <kind> B`         | add B to A's `<kind>` list (`uses`, `depends_on`, `supports`, `contradicts`, `refines`, `topics`) |
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
2. Build from the project's `dag-viewer/config.json` (beside `dag/`, or in
   the DAG folder's repo, as that project's rules say). If it doesn't exist,
   create it with this project's id (the `chan_...` id of the current
   project): `{"project": "chan_XXXX", "root": "dag", "title": "<project name> DAG"}`.
   ```sh
   node <repo>/bin/build-viewer.js --config <path>/dag-viewer/config.json > <scratch>/viewer.html
   ```
3. Publish `viewer.html` with the Artifact tool, declaring
   `capabilities: {files: {project: "chan_XXXX"}}` with the same id, and
   `icon: "graph"`. Don't keep a copy of the built page; it is rebuilt from
   this repo and the config each time.
4. Post the link. Tell the user the page will ask once for permission to
   read the project's files, and that an outside viewer sees the example.

For `dag republish`, publish to the existing artifact's URL (find it with
the Artifact tool's list action if this thread didn't publish it).

## Pushing to the federation view

The federation artifact (URL in `<repo>/federation.json`) shows its home
project's `dag/` live plus every bundle other projects push into its
database, joined on ids. One artifact cannot read several projects' files
(see `docs/platform/README.md`), so this push is how a project joins.

`dag push`, in any project with this repo attached:

1. Pick the slug: the project's name in lowercase with hyphens
   (`identikey`). Reuse the slug already in the database for this project if
   there is one (match on `project` in `projects` documents).
2. Read what's there with the ArtifactData tool on the federation URL:
   `get` collection `projects`, doc `<slug>` (note its `version`), and `list`
   collection `projects/<slug>/chunks` (note each chunk's `version`). Both
   are absent on a first push.
3. Plan the writes:
   ```sh
   node <repo>/bin/push-plan.js /mnt/project-files/dag/ --slug <slug> \
     --project chan_XXXX --name "<project name>" --out <scratch>/push \
     --versions '{"meta": <v>, "c0": <v>, ...}'
   ```
   Leave out `--versions` on a first push.
4. Send each batch it prints, in order, as one ArtifactData `batch` call.
   The meta document is in the last batch.
5. Report how many nodes were pushed and link the federation view. A
   pinned write that fails means someone pushed in between: re-read and
   re-plan.

Pushing from the home project is unnecessary; the view reads it live.
After `dag push` was used once, push again after each batch of node edits.
