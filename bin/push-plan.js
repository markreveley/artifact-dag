#!/usr/bin/env node
// Plan the database writes that push one project's bundle to the federation
// artifact. Writes document bodies as JSON files and prints the batches for
// the ArtifactData tool's "batch" action; it never talks to the database.
//
//   push-plan <dag folder> --slug identikey --project chan_... --name "Identikey"
//             --out <dir> [--versions '{"meta": 3, "c0": 2, "c1": 2}']
//
// Layout in the federation artifact's database:
//   projects/<slug>                 {slug, project, name, builtAt, files, chunks: ["c0", ...]}
//   projects/<slug>/chunks/<c0..cN> {files: [{path, text}]}
// Chunks keep each document well under the 256 KiB limit. The meta document
// is written last and names the chunks in use, so a reader never mixes an old
// meta with new chunks; chunks left over from a larger earlier push are
// deleted.
//
// --versions gives the current version of every document that already exists
// (the meta and each chunk, from an ArtifactData get/list). Writes to existing
// documents must carry it; leave it out on a first push.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, relative } from "node:path";

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : dflt; };
const root = args[0];
const slug = opt("slug");
const project = opt("project", "");
const name = opt("name", slug);
const out = opt("out");
const versions = JSON.parse(opt("versions", "{}"));

if (!root || root.startsWith("--") || !slug || !out) {
  console.error('usage: push-plan <dag folder> --slug <slug> --out <dir> [--project chan_...] [--name "Name"] [--versions JSON]');
  process.exit(2);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error(`slug "${slug}" must be lowercase letters, digits and hyphens`);
  process.exit(2);
}

const CHUNK_BYTES = 200 * 1024;   // per chunk document, under the 256 KiB cap
const BATCH_BYTES = 900 * 1024;   // per batch body, under the 1 MiB cap
const BATCH_WRITES = 50;

async function walk(dir) {
  const found = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) found.push(...(await walk(p)));
    else if (ent.isFile() && ent.name.endsWith(".md")) found.push(p);
  }
  return found;
}

const files = [];
for (const p of (await walk(root)).sort()) {
  files.push({ path: relative(root, p).split("\\").join("/"), text: await readFile(p, "utf8") });
}

const size = (v) => Buffer.byteLength(JSON.stringify(v));
const chunks = [[]];
for (const f of files) {
  if (size({ files: [f] }) > CHUNK_BYTES) {
    console.error(`${f.path} alone is over ${CHUNK_BYTES} bytes; split the node`);
    process.exit(1);
  }
  const cur = chunks[chunks.length - 1];
  if (cur.length && size({ files: [...cur, f] }) > CHUNK_BYTES) chunks.push([f]);
  else cur.push(f);
}

await mkdir(out, { recursive: true });
const pin = (key) => (versions[key] ? { if_version: versions[key] } : {});
const chunkIds = chunks.map((_, i) => `c${i}`);
const writes = [];
for (const [i, c] of chunks.entries()) {
  const file = join(out, `${slug}-c${i}.json`);
  const body = { files: c };
  await writeFile(file, JSON.stringify(body));
  writes.push({ bytes: size(body), w: { op: "set", collection: `projects/${slug}/chunks`, doc_id: `c${i}`, file_path: file, ...pin(`c${i}`) } });
}
// Chunks from an earlier, larger push.
for (const key of Object.keys(versions).filter((k) => /^c\d+$/.test(k) && !chunkIds.includes(k))) {
  writes.push({ bytes: 100, w: { op: "delete", collection: `projects/${slug}/chunks`, doc_id: key, ...pin(key) } });
}
const meta = { slug, project, name, builtAt: new Date().toISOString(), files: files.length, chunks: chunkIds };
const metaFile = join(out, `${slug}-meta.json`);
await writeFile(metaFile, JSON.stringify(meta));
writes.push({ bytes: size(meta), w: { op: "set", collection: "projects", doc_id: slug, file_path: metaFile, ...pin("meta") } });

// Split into batches; the meta write stays in the last one.
const batches = [[]];
let bytes = 0;
for (const { bytes: b, w } of writes) {
  const cur = batches[batches.length - 1];
  if (cur.length && (bytes + b > BATCH_BYTES || cur.length >= BATCH_WRITES)) { batches.push([w]); bytes = b; }
  else { cur.push(w); bytes += b; }
}
console.log(JSON.stringify({ files: files.length, chunks: chunkIds.length, batches }, null, 2));
