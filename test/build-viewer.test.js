import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

const here = new URL("..", import.meta.url).pathname;
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
