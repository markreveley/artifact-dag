#!/usr/bin/env node
// Write <folder>/_bundle.json: every node file's text in one file, so the
// viewer can load a collection with one read instead of one per node.
//   bundle <folder>
// Each entry keeps its path (relative to the folder) and its size in bytes.
// The viewer uses an entry only while the listed file still has that size,
// and reads any other file directly, so a stale bundle is slower, not wrong
// (except an edit that keeps a file's exact size: rebuild after editing).

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p)));
    else if (ent.isFile() && ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

const [root] = process.argv.slice(2);
if (!root) {
  console.error("usage: bundle <folder>");
  process.exit(2);
}
const paths = (await walk(root)).sort();
const files = await Promise.all(
  paths.map(async (p) => {
    const buf = await readFile(p);
    return { path: relative(root, p).split("\\").join("/"), size: buf.length, text: buf.toString("utf8") };
  }),
);
await writeFile(join(root, "_bundle.json"), JSON.stringify({ version: 1, files }) + "\n");
console.log(`${files.length} files bundled into ${join(root, "_bundle.json")}`);
