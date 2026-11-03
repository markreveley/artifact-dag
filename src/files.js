// The files of a collection, for the CLIs: every `.md` file under the folder
// at any depth, in sorted order, `README.md` files left out (a folder's README
// is notes about the folder, never a node). Node only; the three CLIs share
// it so that they agree on what a collection is.

import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export async function listNodeFiles(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await listNodeFiles(p)));
    else if (ent.name.endsWith(".md") && ent.name !== "README.md") out.push(p);
  }
  return out.sort();
}

// `[{path, text}]` as parseCollection takes it: paths relative to the folder,
// with forward slashes.
export async function readNodeFiles(dir) {
  return Promise.all((await listNodeFiles(dir)).map(async (p) =>
    ({ path: relative(dir, p).split(sep).join("/"), text: await readFile(p, "utf8") })));
}
