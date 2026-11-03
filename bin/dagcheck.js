#!/usr/bin/env node
// Parse a folder of nodes and report problems. Exit 1 on any error.
//   dagcheck <folder>                    human readable report
//   dagcheck <folder> --json             the parsed graph as JSON
//   dagcheck <folder> --lint             also run the lint rules
//   dagcheck <folder> --lint --json      problems and findings as JSON
//   dagcheck <folder> --lint --baseline <file>
//                                        report only warn and info findings
//                                        not in <file>; writes <file> with the
//                                        current ones when it does not exist
//                                        (not in CI: there a missing file is
//                                        an error)
//
// Lint rules are lint/rules.dl, then <folder>/lint.dl when present.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCollection } from "../src/parse.js";
import { lint, findingKey } from "../src/lint.js";
import { readNodeFiles } from "../src/files.js";

const [root, ...flags] = process.argv.slice(2);
const bi = flags.indexOf("--baseline");
const baselinePath = bi >= 0 ? flags[bi + 1] : null;
if (!root || root.startsWith("--") || (bi >= 0 && (!baselinePath || baselinePath.startsWith("--")))) {
  console.error("usage: dagcheck <folder> [--json] [--lint [--baseline <file>]]");
  process.exit(2);
}
const json = flags.includes("--json");
const linting = flags.includes("--lint");
const graph = parseCollection(await readNodeFiles(root));

let findings = [];
let baselined = 0;
if (linting) {
  const here = dirname(fileURLToPath(import.meta.url));
  let rules = await readFile(join(here, "../lint/rules.dl"), "utf8");
  const local = await readFile(join(root, "lint.dl"), "utf8").catch(() => null);
  if (local != null) rules += "\n" + local;
  findings = lint(graph, rules);
  if (baselinePath) {
    // A missing baseline is written from the current findings; one that is
    // there but unreadable (a merge conflict, say) is an error, never replaced.
    const text = await readFile(baselinePath, "utf8").catch((e) => (e.code === "ENOENT" ? null : Promise.reject(e)));
    let old = null;
    if (text != null) {
      try { old = JSON.parse(text); } catch { old = undefined; }
      if (!Array.isArray(old) || !old.every((k) => typeof k === "string")) {
        console.error(`baseline ${baselinePath} is not a JSON list of finding keys; fix or delete it`);
        process.exit(2);
      }
    }
    if (old == null && process.env.CI) {
      // In CI a missing baseline is not written: a wrong path would otherwise
      // create a fresh baseline on every run and hide every finding.
      console.error(`baseline ${baselinePath} does not exist, and CI is set, so it is not created here; commit it or fix the path`);
      process.exit(2);
    }
    if (old == null) {
      const keys = findings.filter((f) => f.level !== "error").map(findingKey).sort();
      await writeFile(baselinePath, JSON.stringify(keys, null, 2) + "\n");
      console.error(`wrote baseline ${baselinePath} (${keys.length} findings)`);
    }
    const known = new Set(old || findings.filter((f) => f.level !== "error").map(findingKey));
    const kept = findings.filter((f) => f.level === "error" || !known.has(findingKey(f)));
    baselined = findings.length - kept.length;
    findings = kept;
  }
}

if (json && linting) {
  console.log(JSON.stringify({ problems: graph.problems, findings }, null, 2));
} else if (json) {
  console.log(JSON.stringify(graph, null, 2));
} else {
  const byType = {};
  for (const n of graph.nodes) byType[n.type] = (byType[n.type] || 0) + 1;
  console.log(`${graph.nodes.length} nodes (${Object.entries(byType).map(([t, c]) => `${c} ${t}`).join(", ")}), ` +
    `${graph.edges.length} edges, ${graph.external.length} external`);
  for (const p of graph.problems) {
    console.log(`${p.level.padEnd(5)} ${p.code.padEnd(16)} ${p.path ? p.path + ": " : ""}${p.message}`);
  }
  if (linting) {
    const count = {};
    for (const f of findings) count[f.level] = (count[f.level] || 0) + 1;
    console.log(`lint: ${["error", "warn", "info"].map((l) => `${count[l] || 0} ${l}`).join(", ")}` +
      (baselined ? ` (${baselined} in baseline)` : ""));
    for (const f of findings) {
      console.log(`${f.level.padEnd(5)} ${f.code.padEnd(19)} ${f.path ? f.path + ": " : ""}${f.message}`);
    }
  }
}
const failed = graph.problems.some((p) => p.level === "error") || findings.some((f) => f.level === "error");
// exitCode, not exit(): exit() can cut off piped output that is still buffered.
process.exitCode = failed ? 1 : 0;
