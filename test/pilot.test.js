// The pilot tools (pilot/): procedure.mjs, check.mjs and scenario.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PILOT = fileURLToPath(new URL("../pilot/", import.meta.url));
const REFERENCE = join(PILOT, "2026-11-02-registration-once");
const tool = (name, args, opts = {}) => spawnSync("node", [join(PILOT, name), ...args], { encoding: "utf8", ...opts });
const procedure = (...args) => tool("procedure.mjs", args);

// A pilot instance in a temporary folder, from {path: text}.
function instance(files) {
  const dir = mkdtempSync(join(tmpdir(), "pilot-"));
  for (const [p, text] of Object.entries(files)) {
    mkdirSync(join(dir, p, ".."), { recursive: true });
    writeFileSync(join(dir, p), text);
  }
  return dir;
}
const claim = (id, text) => `---\nid: ${id}\ntype: claim\ntitle: ${id}\n---\n${text}\n`;

test("procedure: claims whose ids differ only in their first word get their own files", () => {
  const dir = instance({ "dag/a.md": claim("claim:card-issued", "The card is issued."), "dag/b.md": claim("claim:desk-issued", "The desk issues it.") });
  assert.equal(procedure("statement", dir, "claim:card-issued").status, 0);
  assert.equal(procedure("set", dir, "claim:card-issued", "fidelity", "yes").status, 0);
  assert.equal(procedure("statement", dir, "claim:desk-issued").status, 0);
  assert.match(readFileSync(join(dir, "formal/card-issued.dl"), "utf8"), /formalizes: claim:card-issued[\s\S]*fidelity:\s+yes/);
  assert.match(readFileSync(join(dir, "formal/desk-issued.dl"), "utf8"), /formalizes: claim:desk-issued/);
});

test("procedure: never writes over a formal file that formalizes another node", () => {
  const other = "% formalizes: claim:elsewhere\n% fidelity:   yes\nbottom :- p(X).\n";
  const dir = instance({ "dag/a.md": claim("claim:x", "X holds."), "formal/x.dl": other });
  // claim:x has no file naming it, so its new file would be x.dl, which is taken.
  const r = procedure("statement", dir, "claim:x");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /formalizes claim:elsewhere, not claim:x/);
  assert.equal(readFileSync(join(dir, "formal/x.dl"), "utf8"), other);
});

test("procedure: the reference pilot's examples still pass", () => {
  const r = procedure("examples", REFERENCE, "claim:lib-2a");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /3 of 3 pass/);
});

test("procedure: D's packet is the task, the source and any ratified claims, and only D takes no claim", () => {
  const dir = instance({ "task.md": "Decompose the second sentence.\n", "source.md": "First. Second, and third.\n" });
  const r = procedure("packet", dir, "-", "D");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^ROLE: decomposer \(D\)/);
  assert.match(r.stdout, /\nTASK\nDecompose the second sentence\.\n\nSOURCE\nFirst\. Second, and third\.\n$/);
  mkdirSync(join(dir, "dag"));
  writeFileSync(join(dir, "dag", "c.md"), claim("claim:second", "Second."));
  assert.match(procedure("packet", dir, "-", "D").stdout, /RATIFIED CLAIMS\nclaim:second: Second\.\n$/);
  assert.equal(procedure("packet", dir, "-", "A").status, 2);
  assert.equal(procedure("packet", dir, "claim:second", "D").status, 2);
  assert.equal(procedure("packet", instance({ "source.md": "x" }), "-", "D").status, 1);
});

test("procedure: blind gives the packet, and nothing else, to a claude with no tools in an empty folder", () => {
  const bin = mkdtempSync(join(tmpdir(), "fake-claude-"));
  const log = join(bin, "log.json");
  // A stand-in for the claude CLI: records how it was called, answers JSON.
  writeFileSync(join(bin, "claude"), `#!/usr/bin/env node
const fs = require("fs");
const input = fs.readFileSync(0, "utf8");
fs.writeFileSync(${JSON.stringify(log)}, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), files: fs.readdirSync("."), input }));
console.log(JSON.stringify({ result: "THE ANSWER", is_error: false, modelUsage: { "model-x": {} } }));
`);
  chmodSync(join(bin, "claude"), 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const r = tool("procedure.mjs", ["blind", REFERENCE, "claim:lib-2a", "C", "--model", "m1"], { env });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, "THE ANSWER\n");
  assert.match(r.stderr, /model: model-x/);
  const call = JSON.parse(readFileSync(log, "utf8"));
  const i = call.args.indexOf("--tools");
  assert.equal(call.args[i + 1], "");
  for (const flag of ["-p", "--safe-mode", "--strict-mcp-config", "--no-session-persistence"]) assert.ok(call.args.includes(flag), flag);
  assert.deepEqual(call.args.slice(-2), ["--model", "m1"]);
  assert.deepEqual(call.files, []);
  assert.ok(!call.cwd.startsWith(fileURLToPath(new URL("..", import.meta.url))));
  assert.equal(existsSync(call.cwd), false); // removed afterwards
  assert.equal(call.input + "\n", procedure("packet", REFERENCE, "claim:lib-2a", "C").stdout);
});

test("check: fidelity's reason comes from the note line, and bottom prints bare", () => {
  const r = tool("check.mjs", [REFERENCE]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /fidelity yes: at most once; at least once for each member/);
  assert.ok(!r.stdout.includes("% note:"));
  assert.match(r.stdout, / bottom :- registration\(R1, M\)/);
});

test("scenario: --show takes its list after a space or an =; by default every derived predicate shows", () => {
  const dir = instance({
    "formal/sub/x.dl": "% formalizes: claim:x\nflag(A) :- thing(A).\nother(A) :- flag(A).\nbottom :- thing(b).\n",
    "s.dl": "thing(a). thing(b).\n",
  });
  const run = (...a) => tool("scenario.mjs", [dir, join(dir, "s.dl"), ...a]).stdout;
  assert.equal(run("--show", "flag"), "1 rule(s) broken:\n  claim:x\nflag: (a) (b)\n");
  assert.equal(run("--show=flag"), "1 rule(s) broken:\n  claim:x\nflag: (a) (b)\n");
  assert.equal(run(), "1 rule(s) broken:\n  claim:x\nflag: (a) (b)\nother: (a) (b)\n");
});
