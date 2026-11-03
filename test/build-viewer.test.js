import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

const here = fileURLToPath(new URL("..", import.meta.url));
const builder = join(here, "bin/build-viewer.js");
const build = (...args) => execFileSync("node", [builder, ...args], { encoding: "utf8" });
const sources = (html) => JSON.parse(html.match(/const SOURCES = (.*);/)[1]);
const example = join(here, "examples/dag");

test("no folder is a usage error", () => {
  assert.equal(spawnSync("node", [builder]).status, 2);
});

test("one folder is inlined, README.md left out", () => {
  const [s, ...rest] = sources(build("--dag", example));
  assert.equal(rest.length, 0);
  assert.equal(s.name, "examples");
  assert.ok(s.files.some((f) => f.path === "definitions/evidence.md" && /id: def:evidence/.test(f.text)));
  assert.ok(!s.files.some((f) => f.path.endsWith("README.md")));
});

test("several folders get distinct slugs", () => {
  const ss = sources(build("--dag", example, "--dag", example));
  assert.deepEqual(ss.map((s) => s.slug), ["examples", "examples-2"]);
});

test("config paths are relative to the config file; names can be given", () => {
  const cfg = join(mkdtempSync(join(tmpdir(), "build-viewer-")), "sub", "config.json");
  mkdirSync(dirname(cfg));
  const rel = relative(dirname(cfg), example);
  writeFileSync(cfg, JSON.stringify({ dag: [rel, { path: rel, name: "Second" }], title: "T" }));
  const html = build("--config", cfg);
  assert.deepEqual(sources(html).map((s) => s.name), ["examples", "Second"]);
  assert.match(html, /<title>T<\/title>/);
});

test("the page is a standards-mode UTF-8 document with a phone viewport", () => {
  const html = build("--dag", example);
  assert.match(html, /^<!DOCTYPE html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">/);
});

test("the page inlines the parser, the merge and the Markdown, with no imports or exports left", () => {
  const html = build("--dag", example);
  const script = html.slice(html.indexOf("<script>\n"));
  for (const fn of ["function parseFrontmatter", "function parseCollection", "function mergeSources", "function renderMarkdown"]) assert.ok(script.includes(fn), fn);
  assert.ok(!/^\s*(import|export) /m.test(script));
});

test("it builds from a checkout whose path has a space", () => {
  const root = join(mkdtempSync(join(tmpdir(), "build viewer ")), "artifact dag");
  for (const d of ["bin", "src", "viewer"]) cpSync(join(here, d), join(root, d), { recursive: true });
  const html = execFileSync("node", [join(root, "bin/build-viewer.js"), "--dag", example], { encoding: "utf8" });
  assert.equal(sources(html)[0].name, "examples");
});

test("a node's text cannot end the inline script or swallow it, and a title is not a replacement pattern", () => {
  const dir = mkdtempSync(join(tmpdir(), "build-viewer-"));
  writeFileSync(join(dir, "evil.md"), "---\nid: def:evil\ntype: definition\ntitle: Evil\n---\nText with </script> and <!--<script> inside.\n");
  const html = build("--dag", dir, "--title", "Cost $& more");
  const line = html.slice(html.indexOf("const SOURCES")).split("\n")[0];
  assert.ok(!/<\/script|<!--|<script/.test(line), "raw tags in the inlined sources");
  assert.match(sources(html)[0].files[0].text, /<\/script> and <!--<script>/);
  assert.match(html, /<title>Cost \$&amp; more<\/title>/);
});
