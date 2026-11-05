# threads/

- [2026-11-02-library-pilot-run](2026-11-02-library-pilot-run.md)
- [2026-11-02-formal-text-paused](2026-11-02-formal-text-paused.md)
- [2026-11-02-audit](2026-11-02-audit.md)
- [2026-11-02-second-audit](2026-11-02-second-audit.md)
- [2026-11-03-understand-anything-the-gradient-and-repo-template](2026-11-03-understand-anything-the-gradient-and-repo-template.md): 3 and 4 Nov in one file

**In this repo.** The map lists the private projects that run this code and
the terms that would identify them (their stack, their policy language);
`LOCAL.md` holds the legend. Quoted material from a private repo is kept by
the operator's standing decision and reported to them each time
(`md/governance/POLICY.md`, P9).

---

<!-- pinned from repo-template md/threads/README.md @ 120a4bd; refresh from the template, do not edit by hand -->
## About this folder (repo-template `120a4bd`)

The exchange of each working thread: the user's turns and the agent's text
replies, written at `/end` from the session transcript. Tool calls, tool
output, thinking and system text are dropped. A thread file is history: it
is not edited afterwards except to redact.

**Belongs here:** one file per thread, written by the `/end` skill's
`thread-from-export.mjs`.

**Does not:** anything written by hand; raw exports (`raw/`, git-ignored);
the redaction map (`redact.json`, git-ignored).

**Names:** `YYYY-MM-DD-<slug>.md`, the slug saying what the thread did.

**Redaction.** A public repo names no private project. `redact.json` maps
each private name, and each term that would identify the project even with
its name cut, to a placeholder; the script refuses to write a file in which
a mapped name survives, and prints the lines to review. After adding a term
to the map, rescan every tracked file for it: a term added later is not
applied to files already written. Quoted material from a private source
that the map cannot catch is reported to the operator, who decides. The map
format is at the top of the script (`~/.claude/skills/end/thread-from-export.mjs`).
