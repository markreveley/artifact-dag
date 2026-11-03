import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../bin/dag-to-glossary.js", import.meta.url));

// A project with two definitions (one with block-list tags), a document
// decomposed into two claims, and the document's glossary to fill.
function project() {
  const dir = mkdtempSync(join(tmpdir(), "glossary-"));
  const put = (p, text) => { mkdirSync(join(dir, p, ".."), { recursive: true }); writeFileSync(join(dir, p), text); };
  put("dag/definitions/belief.md", "---\nid: def:belief\ntype: definition\ntitle: Belief\ntags:\n  - doc-essay\n  - epistemics\n---\nAn attitude toward a [[def:credence|graded]] proposition.\n\n## Sub-definitions\n\n### Hume (1739)\nA lively idea.\n");
  put("dag/definitions/credence.md", "---\nid: def:credence\ntype: definition\ntitle: 'Credence'\ntags: [doc-essay] # graded\n---\nA degree of belief.\n");
  put("dag/claims/one.md", '---\nid: claim:one\ntype: claim\ntitle: One\ndocument: me/essay.md\nsection: "1. Start"\norder: 1\nuses:\n  - def:belief\n---\nOne.\n');
  put("dag/claims/two.md", '---\nid: claim:two\ntype: claim\ntitle: Two\ndocument: me/essay.md\nsection: "2. Next"\norder: 2\nuses: [def:credence, def:belief]\n---\nTwo.\n');
  put("essay.md", "# Essay\n\n## 1. Start\n\nText, with **credences** in bold.\n\n## 2. Next\n\nText.\n\n## Glossary\n\nTerms used here.\n\n---\n\nAfter.\n");
  put("glossary.config.json", JSON.stringify({ dag: "dag", master: "glossary.md", docs: [["doc-essay", "Essay", "essay.md"]] }));
  return dir;
}
const run = (dir, ...args) => spawnSync("node", [SCRIPT, "--config", join(dir, "glossary.config.json"), ...args], { encoding: "utf8" });

// Belief is introduced where a claim first uses it (section 1); Credence is
// written in bold in section 1, which wins over the claim that uses it in 2.
test("a document's glossary: every tagged term, block lists included, with where each is introduced", () => {
  const dir = project();
  assert.equal(run(dir).status, 0);
  assert.equal(readFileSync(join(dir, "essay.md"), "utf8"), `# Essay

## 1. Start

Text, with **credences** in bold.

## 2. Next

Text.

## Glossary

Terms used here.

### Belief

An attitude toward a [graded](#credence) proposition.

**Hume (1739):** A lively idea. *Introduced in section [1](#1-start).*

### Credence

A degree of belief. *Introduced in section [1](#1-start).*

---

After.
`);
});

test("the master glossary lists every term with the documents it appears in", () => {
  const dir = project();
  run(dir);
  const master = readFileSync(join(dir, "glossary.md"), "utf8");
  assert.match(master, /\*\*Covers:\*\* every technical term in the 1 documents in this repository \(2 terms\)/);
  assert.match(master, /### Belief\n\nAn attitude toward a \[graded\]\(#credence\) proposition\.\n\n\*\*Hume \(1739\):\*\* A lively idea\.\n\n\*Appears in:\* Essay\./);
});

test("--check writes nothing and exits 1 when a glossary is out of date, 0 when not", () => {
  const dir = project();
  const before = readFileSync(join(dir, "essay.md"), "utf8");
  assert.equal(run(dir, "--check").status, 1);
  assert.equal(readFileSync(join(dir, "essay.md"), "utf8"), before);
  run(dir);
  assert.equal(run(dir, "--check").status, 0);
});

test("no --config is a usage error", () => {
  assert.equal(spawnSync("node", [SCRIPT]).status, 2);
  assert.throws(() => execFileSync("node", [SCRIPT], { stdio: "pipe" }));
});
