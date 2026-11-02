import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

const here = new URL("..", import.meta.url).pathname;
const build = (...args) => execFileSync("node", [join(here, "bin/build-viewer.js"), ...args], { encoding: "utf8" });
const constant = (html, name) => JSON.parse(html.match(new RegExp(`const ${name} = (.*);`))[1]);

test("project mode inlines no local nodes", () => {
  const html = build("--project", "chan_test", "--title", "T");
  assert.equal(constant(html, "CONFIG").project, "chan_test");
  assert.equal(constant(html, "CONFIG").local, false);
  assert.equal(constant(html, "LOCAL"), null);
});

test("local mode inlines a folder's nodes", () => {
  const html = build("--dag", join(here, "examples/dag"));
  const config = constant(html, "CONFIG");
  assert.equal(config.local, true);
  assert.equal(config.project, null);
  const local = constant(html, "LOCAL");
  assert.ok(local.some((f) => f.path === "dag/definitions/evidence.md" && /id: def:evidence/.test(f.text)));
  assert.ok(!local.some((f) => f.path.endsWith("README.md")));
});

test("a dag path in the config file is relative to it", () => {
  const cfg = join(mkdtempSync(join(tmpdir(), "build-viewer-")), "config.json");
  writeFileSync(cfg, JSON.stringify({ dag: relative(dirname(cfg), join(here, "examples/dag")) }));
  const local = constant(build("--config", cfg), "LOCAL");
  assert.ok(local.some((f) => f.path === "dag/definitions/evidence.md"));
});
