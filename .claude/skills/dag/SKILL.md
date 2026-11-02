---
name: dag
description: Maintain a project's DAG of definition, claim and resource nodes (Markdown files under dag/ in the project's repo) and build its viewer. Use when the user says "dag ..." or asks to add, edit, link, check, list or view definitions, claims, resources (saved links) or the graph.
---

# DAG nodes and viewer

The project keeps a graph of **definitions**, **claims** and **resources**
as Markdown files under `dag/` in its repo. This repo (`artifact-dag`,
called `<repo>` below) holds the schema, parser, validator and viewer. Read
`SCHEMA.md` before writing a node; `docs/USAGE.md` is the user-facing guide
and defines the commands. The project's `AGENTS.md` (or `CLAUDE.md`) says
where `<repo>` is checked out and what else to run after a change (for
example regenerating glossaries); follow it.

## Rules

- Node files are the source of truth. Never keep a parallel copy elsewhere.
- Ids are global: `def:<slug>`, `claim:<slug>` and `res:<slug>`, lowercase, hyphenated.
  Reuse an id that exists in another project when it means the same thing.
- A link to an id not present in this project is fine (an external node).
- Keep frontmatter flat; the parser handles only the subset in SCHEMA.md.
- Definitions: `dag/definitions/<slug>.md`. Claims: `dag/claims/<slug>.md`.
  Resources: `dag/resources/<slug>.md`.
- After any change, run the validator and report errors to the user.
- Changes reach the project's main branch through a PR, unless the project's
  rules say otherwise.

## Claims from a document

To decompose a document into claims, write one claim per atomic statement
under `dag/claims/<document-slug>/`, each with `document: <repo>/<path>`,
`section: "<heading>"` and `order: <n>` in reading order (see SCHEMA.md,
Documents). Link each claim to the definitions it `uses` and to the claims it
`depends_on` or `supports`. The viewer's document picker reads these fields.

## Validator

```sh
node <repo>/bin/dagcheck.js dag/          # report
node <repo>/bin/dagcheck.js dag/ --json   # graph JSON
node <repo>/bin/dagcheck.js dag/ --lint   # also link findings
node <repo>/bin/dagcheck.js dag/ --lint --json
```

Exit code 1 means at least one error. External links are `info`.

`--lint` runs the Datalog rules in `lint/rules.dl` (and `dag/lint.dl` if the
collection has one) and lists findings such as a definition named in text
with no link to it. The linter never edits nodes. For each finding, read the
node and decide: add the edge (`refines` for a narrower term, a wikilink in a
definition, `uses` in a claim), or record that the word is meant in another
sense with `not_links: [def:…]`. Do not add edges from word matches without
reading them; put the decisions in a PR so they are reviewed as a diff.

## Commands (from docs/USAGE.md)

| user says                     | do                                                                                  |
|-------------------------------|-------------------------------------------------------------------------------------|
| `dag check [--json]`          | run the validator; post the report (write `graph.json` for `--json`)                |
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
| `dag view`                    | see below                                                                           |

Plain-language requests that mean one of these get the same treatment.

## Viewing the graph

1. If `dag-viewer/config.json` doesn't exist, create it:
   `{"dag": "../dag", "title": "<project name> DAG"}` (paths are relative to
   the config file).
2. Build outside the repo and open it:
   ```sh
   node <repo>/bin/build-viewer.js --config dag-viewer/config.json > <scratch>/dag.html
   open <scratch>/dag.html
   ```
   Never commit a built page. For a joined view of several projects, pass
   `--dag <folder>` once per project instead of `--config`.
