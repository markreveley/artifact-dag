import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
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
  const root = fileURLToPath(new URL("../examples/dag/", import.meta.url));
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
  assert.equal(g.nodes.length, 13);
  assert.deepEqual(g.problems.filter((p) => p.level === "error"), []);
  assert.deepEqual(g.external, ["claim:simpsons-paradox-example"]);
});

test("document, section and order are read; a bad order is a problem", () => {
  const ok = parseFile("c.md", `---
id: claim:x
type: claim
title: X
document: repo/doc.md
section: "2. Keys"
order: 7
---
Body.`);
  assert.equal(ok.node.document, "repo/doc.md");
  assert.equal(ok.node.section, "2. Keys");
  assert.equal(ok.node.order, 7);
  assert.deepEqual(ok.problems, []);
  const bad = parseFile("c.md", "---\nid: claim:y\ntype: claim\ntitle: Y\norder: second\n---\n");
  assert.equal(bad.node.order, null);
  assert.equal(bad.problems[0].code, "bad_order");
  const none = parseFile("d.md", "---\nid: def:z\ntype: definition\ntitle: Z\n---\n");
  assert.equal(none.node.document, "");
  assert.equal(none.node.order, null);
});

test("resource: url and hacker_news fields, topics edges, url required", () => {
  const { node, edges, problems } = parseFile("r.md", `---
id: res:sandboxing-basics
type: resource
title: Software sandboxing basics
url: https://blog.example.com/sandboxing
hacker_news: https://news.ycombinator.com/item?id=1
topics: [def:sandboxing, def:security]
---
An overview.
`);
  assert.deepEqual(problems, []);
  assert.equal(node.url, "https://blog.example.com/sandboxing");
  assert.equal(node.hackerNews, "https://news.ycombinator.com/item?id=1");
  assert.equal(node.value, "An overview.");
  assert.deepEqual(edges, [
    { from: "res:sandboxing-basics", to: "def:sandboxing", kind: "topics" },
    { from: "res:sandboxing-basics", to: "def:security", kind: "topics" },
  ]);
  const r = parseFile("r.md", "---\nid: res:x\ntype: resource\ntitle: X\n---\n");
  assert.deepEqual(r.problems.map((p) => p.code), ["missing_field"]);
  const one = parseFile("r.md", "---\nid: res:y\ntype: resource\ntitle: Y\nurl: https://y\ntopics: def:solo\n---\n");
  assert.deepEqual(one.edges, [{ from: "res:y", to: "def:solo", kind: "topics" }]);
  const r2 = parseFile("r.md", "---\nid: def:x\ntype: resource\ntitle: X\nurl: https://x\n---\n");
  assert.deepEqual(r2.problems.map((p) => p.code), ["prefix_mismatch"]);
});


test("a link that is not a node id is a bad_link error, and no edge", () => {
  const r = parseFile("c.md", "---\nid: claim:c\ntype: claim\ntitle: C\nsubject: Credence\nuses: [def:ok, Credence, def:Bad_Id, note:x]\n---\nSee [[foo:bar]] and [[def:fine]].");
  assert.deepEqual(r.problems.map((p) => p.code), ["bad_link", "bad_link", "bad_link", "bad_link", "bad_link"]);
  assert.ok(r.problems.every((p) => p.level === "error"));
  assert.deepEqual(r.edges.map((e) => `${e.kind} ${e.to}`), ["uses def:ok", "mentions def:fine"]);
});

test("findCycles reports each cycle once, whatever the order of ids", () => {
  const e = (from, to) => ({ from, to, kind: "uses" });
  // a <-> b, then a -> x -> c, and c <-> d: x lies between two cycles.
  const edges = [e("a", "b"), e("b", "a"), e("a", "x"), e("x", "c"), e("c", "d"), e("d", "c")];
  const key = (cs) => cs.map((c) => [...c].sort().join("+")).sort();
  for (const ids of [["a", "b", "x", "c", "d"], ["c", "d", "x", "a", "b"], ["x", "d", "b", "c", "a"]]) {
    assert.deepEqual(key(findCycles(ids, edges)), ["a+b", "c+d"], ids.join());
  }
});

test("examples pass the lint: no errors, no warnings", async () => {
  const root = fileURLToPath(new URL("../examples/dag/", import.meta.url));
  const { lint } = await import("../src/lint.js");
  const files = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith(".md")) files.push({ path: relative(root, p), text: await readFile(p, "utf8") });
    }
  };
  await walk(root);
  const rules = await readFile(new URL("../lint/rules.dl", import.meta.url), "utf8");
  const found = lint(parseCollection(files), rules).filter((f) => f.level !== "info");
  assert.deepEqual(found.map((f) => `${f.code} ${f.node} ${f.target}`), []);
});

test("SCHEMA.md's examples are the example collection's files, verbatim", async () => {
  const schema = await readFile(new URL("../md/governance/SCHEMA.md", import.meta.url), "utf8");
  const quoted = [...schema.matchAll(/From `(examples\/dag\/[^`]+)`:\n\n```yaml\n([\s\S]*?)```/g)];
  assert.equal(quoted.length, 3);
  for (const [, path, block] of quoted) {
    const file = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.equal(block.trimEnd(), file.trimEnd(), path);
  }
});

test("findCycles finds a cycle whose first edge leads away from it", () => {
  const e = (from, to) => ({ from, to, kind: "uses" });
  const key = (cs) => cs.map((c) => [...c].sort().join("+")).sort();
  // p's first edge goes to d, a dead end hanging off the p <-> q cycle.
  assert.deepEqual(key(findCycles(["p", "q", "d"], [e("p", "d"), e("p", "q"), e("q", "p")])), ["p+q"]);
  // a's first edge leads to the other cycle.
  assert.deepEqual(key(findCycles(["a", "b", "x", "c", "d"], [e("a", "x"), e("a", "b"), e("b", "a"), e("x", "c"), e("c", "d"), e("d", "c")])), ["a+b", "c+d"]);
  assert.deepEqual(findCycles(["s"], [e("s", "s")]), [["s"]]);
  const g = parseCollection([
    { path: "p.md", text: "---\nid: def:p\ntype: definition\ntitle: P\nuses: [def:d, def:q]\n---\n" },
    { path: "q.md", text: "---\nid: def:q\ntype: definition\ntitle: Q\nuses: [def:p]\n---\n" },
    { path: "d.md", text: "---\nid: def:d\ntype: definition\ntitle: D\n---\n" },
  ]);
  assert.deepEqual(g.problems.map((p) => p.code), ["cycle"]);
});

test("a list in a one-value field is bad_field, and the node still parses and lints", async () => {
  const r = parseFile("d.md", "---\nid: def:a\ntype: [definition]\ntitle: [Alpha, Beta]\n---\nbody");
  assert.deepEqual(r.problems.map((p) => `${p.code} ${p.message}`),
    ['bad_field "type" is a list; it takes one value', 'bad_field "title" is a list; it takes one value']);
  assert.equal(r.node.title, "Alpha, Beta");
  const { lint } = await import("../src/lint.js");
  const rules = await readFile(new URL("../lint/rules.dl", import.meta.url), "utf8");
  assert.doesNotThrow(() => lint(parseCollection([{ path: "d.md", text: "---\nid: def:a\ntype: definition\ntitle: [Alpha, Beta]\n---\nbody" }]), rules));
});

test("a wikilink that is not an id is a bad_link, like an edge field", () => {
  const r = parseFile("c.md", "---\nid: claim:c\ntype: claim\ntitle: C\n---\nSee [[credence]], [[def credence]] and [[def:credence]].");
  assert.deepEqual(r.problems.map((p) => p.message), [
    'mentions "credence" is not a node id (<prefix>:<slug>, prefix def, claim, res)',
    'mentions "def credence" is not a node id (<prefix>:<slug>, prefix def, claim, res)',
  ]);
  assert.deepEqual(r.edges.map((e) => e.to), ["def:credence"]);
});

test("a node without an id gets no edges", () => {
  const r = parseFile("n.md", "---\ntype: claim\ntitle: No id\nuses: [def:z]\n---\n");
  assert.deepEqual(r.problems.map((p) => p.code), ["missing_field"]);
  assert.deepEqual(r.edges, []);
});

test("frontmatter lines that cannot be read are reported on nodes, not on notes", () => {
  const r = parseFile("x.md", "---\nid: def:x\ntype: definition\nmeta:\n  nested: value\ntitle: X\n- stray\n---\n");
  assert.deepEqual(r.problems.map((p) => `${p.code} ${p.message}`), [
    'bad_frontmatter cannot read frontmatter line "nested: value": not "key: value" or a list item',
    'bad_frontmatter cannot read frontmatter line "- stray": not "key: value" or a list item',
  ]);
  assert.deepEqual(parseFile("note.md", "---\ntitle: a note\n  nested: value\n---\n").problems, []);
});

test("an apostrophe inside a word is not a quote", () => {
  const fm = parseFrontmatter("title: Spinoza's Ethics # Elwes\naliases: [Spinoza's Ethics, the Ethics]\nsources:\n  - Spinoza's Ethics # 1677\n  - 'quoted # kept'");
  assert.equal(fm.title, "Spinoza's Ethics");
  assert.deepEqual(fm.aliases, ["Spinoza's Ethics", "the Ethics"]);
  assert.deepEqual(fm.sources, ["Spinoza's Ethics", "quoted # kept"]);
});
