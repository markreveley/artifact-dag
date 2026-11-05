# governance/

The documents that govern this repo, in the layout
[repo-template](https://github.com/markreveley/repo-template) sets:
`ARCHITECTURE.md`, `POLICY.md`, `SCHEMA.md`, `PROCEDURE.md`, `DOCTRINE.md`,
each present only when it has content.

| file | here | status |
|---|---|---|
| `POLICY.md` | [POLICY.md](POLICY.md) | in force; the rules are numbered so other documents cite them |
| `SCHEMA.md` | [SCHEMA.md](SCHEMA.md) | the node format, a contract: downstream repos and their CI read it (POLICY P8) |
| `PROCEDURE.md` | [`pilot/PROCEDURE.md`](../../pilot/PROCEDURE.md) | under test in pilots, not adopted outside `pilot/`; moves here when adopted |
| `ARCHITECTURE.md` | [ARCHITECTURE.md](ARCHITECTURE.md) | draft: the parts, the flow, the boundaries, and the decisions (ARCHITECTURE D1, claim anchors on universal-ctags) |
| `DOCTRINE.md` | none | |

---

<!-- pinned from repo-template md/governance/README.md @ efe325f; refresh from the template, do not edit by hand -->
## About this folder (repo-template `efe325f`)

The documents that govern the repo. Five fixed names, each present only when
it has content; a repo deletes the stubs it has no use for and lists the
rest in its README.

| file | says | changed by |
|---|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | how the thing is built: the parts, the flow between them, the boundaries, and the decisions with their reasons | a design decision |
| [`POLICY.md`](POLICY.md) | the rules in force: each one numbered, with why it holds and what checks it | a ruling by the operator |
| [`SCHEMA.md`](SCHEMA.md) | the formats and contracts of the data the repo holds or emits | a breaking change, announced to whatever reads the data |
| [`PROCEDURE.md`](PROCEDURE.md) | the step-by-step methods the repo runs, each numbered, saying which steps a person does | a method being tried and adopted |
| [`DOCTRINE.md`](DOCTRINE.md) | what the repo holds to be true and what it values: the principles the policies derive from and the architecture serves | an argument, recorded in an analysis |

How they relate: doctrine says why, policy says what is required, procedure
says how it is done, schema says what the data looks like, architecture
says how the parts fit. A rule nobody checks and nothing enforces is
doctrine, not policy. A policy cites the doctrine it serves; a procedure
cites the policies it satisfies; an architecture decision cites both.

**Does not belong here:** a guide (`docs/`), a plan, an analysis, a
document about one piece of the repo only (`docs/`).
