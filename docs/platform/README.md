# Artifact platform reference

Type definitions for the claude.ai artifact runtime that the viewer is built
on, runtime contract **0.2.89**. They are the platform's own description of
what a published page can call. They ship with Claude's tools and have no
public web page, so they are copied here for reference, and may go stale as
the runtime moves on.

| file | covers |
|---|---|
| `claude.d.ts` | `window.claude.use(name)`: how a page reaches any capability |
| `files.d.ts` | the `files` capability: list and read one project's files |
| `db.d.ts` | the `db` capability: the artifact's document store, access rules and limits |

## Findings that shaped the design

- **One project per artifact.** `files` is declared as
  `{files: {project: "chan_..."}}`, and `list`/`read` take no project
  argument. Tested 2026-10-22: publishing with `{projects: [a, b]}` or
  `{project: [a, b]}` is rejected with
  `capabilities.files must be a JSON object like {"project": "chan_..."}`.
  A single page cannot read two projects' files.
- **Database documents** are JSON objects at slash-separated paths, at most
  256 KiB each, and the database has a total size cap the docs don't state.
  By default everyone the artifact is shared with can read shared data, and
  the owner and editors can write it. Access rules declared at publish can
  narrow both.
- **Writing the database from outside the page.** A Claude thread can read
  and write an artifact's database by the artifact's URL, acting as the
  person, when that person can edit the artifact. Which project the thread
  runs in does not matter. (Documented; a write from a second project is not
  yet tested.)
