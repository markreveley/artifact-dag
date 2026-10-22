import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseFrontmatter } from "../src/frontmatter.js";
import { parseFile, parseCollection, findCycles } from "../src/parse.js";

test("frontmatter subset", () => {
  const fm = parseFrontmatter([
    'title: "Quoted: title" # comment',
    "aliases: [a, 'b c', d]",
    "sources:",
    "  - One",
    "  - Two # not a comment? yes it is",
    "subtype: proposition",
    "uses: def:x",
  ].join("\n"));
  assert.equal(fm.title, "Quoted: title");
  assert.deepEqual(fm.aliases, ["a", "b c", "d"]);
  assert.deepEqual(fm.sources, ["One", "Two"]);
  assert.equal(fm.subtype, "proposition");
  assert.deepEqual(fm.uses, ["def:x"]);
});

test("definition body splits into value and sub-definitions", () => {
  const { node, edges, problems } = parseFile("d.md", `---
id: def:x
type: definition
title: X
---
The value.

Second paragraph with [[def:y|a link]].

## Sub-definitions

### Someone (1900)
First.

### Other
Second
line.
`);
  assert.deepEqual(problems, []);
  assert.equal(node.value, "The value.\n\nSecond paragraph with [[def:y|a link]].");
  assert.deepEqual(node.subdefinitions, [
    { source: "Someone (1900)", text: "First." },
    { source: "Other", text: "Second\nline." },
  ]);
  assert.deepEqual(edges, [{ from: "def:x", to: "def:y", kind: "mentions" }]);
});

test("files without a type are ignored, bad ids are reported", () => {
  assert.equal(parseFile("n.md", "---\ntitle: note\n---\nhi").node, null);
  assert.equal(parseFile("n.md", "plain text").node, null);
  const r = parseFile("c.md", "---\nid: def:Bad_Id\ntype: claim\ntitle: t\n---\n");
  assert.deepEqual(r.problems.map((p) => p.code), ["bad_id"]);
  const r2 = parseFile("c.md", "---\nid: def:ok\ntype: claim\ntitle: t\n---\n");
  assert.deepEqual(r2.problems.map((p) => p.code), ["prefix_mismatch"]);
});

test("collection: duplicates, externals, cycles", () => {
  const mk = (id, type, extra = "") =>
    ({ path: id + ".md", text: `---\nid: ${id}\ntype: ${type}\ntitle: ${id}\n${extra}---\n` });
  const g = parseCollection([
    mk("def:a", "definition", "uses: [def:b]\n"),
    mk("def:b", "definition", "uses: [def:a]\ncontradicts: [def:zzz]\n"),
    mk("def:a", "definition"),
  ]);
  assert.deepEqual(g.nodes.map((n) => n.id), ["def:a", "def:b"]);
  assert.deepEqual(g.external, ["def:zzz"]);
  const codes = g.problems.map((p) => p.code).sort();
  assert.deepEqual(codes, ["cycle", "duplicate_id", "external"]);
});

test("findCycles ignores contradicts and mentions", () => {
  const edges = [
    { from: "a", to: "b", kind: "contradicts" },
    { from: "b", to: "a", kind: "mentions" },
  ];
  assert.deepEqual(findCycles(["a", "b"], edges), []);
  edges.push({ from: "a", to: "b", kind: "supports" }, { from: "b", to: "a", kind: "uses" });
  assert.equal(findCycles(["a", "b"], edges).length, 1);
});

test("examples parse cleanly", async () => {
  const root = new URL("../examples/dag/", import.meta.url).pathname;
  async function walk(dir) {
    const out = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) out.push(...(await walk(p)));
      else if (e.name.endsWith(".md")) out.push(p);
    }
    return out;
  }
  const files = await Promise.all((await walk(root)).map(async (p) =>
    ({ path: relative(root, p), text: await readFile(p, "utf8") })));
  const g = parseCollection(files);
  assert.equal(g.nodes.length, 11);
  assert.deepEqual(g.problems.filter((p) => p.level === "error"), []);
  assert.deepEqual(g.external, ["claim:simpsons-paradox-example"]);
});
