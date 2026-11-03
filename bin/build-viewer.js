#!/usr/bin/env node
// Build the viewer page for one or more folders of nodes.
//   build-viewer --dag <folder> [--dag <folder> ...] [--title "Name"] > viewer.html
//   build-viewer --config dag-viewer/config.json > viewer.html
// The page inlines the nodes as they are now, so it needs no server: open it
// as a file or put it on any static host, and rebuild it after editing.
// Several folders become one graph joined on ids. Each is labelled with the
// name of the directory that holds it (ethics/dag: "ethics").
// The config file holds {"dag": <entry> or [<entry>, ...], "title": "Name"},
// where an entry is a path or {"path": ..., "name": ...}; paths are relative
// to the config file. Flags override it.

import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readNodeFiles } from "../src/files.js";

const here = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : undefined; };
const flags = (name) => args.flatMap((a, i) => (a === "--" + name && i + 1 < args.length ? [args[i + 1]] : []));
const configPath = flag("config");
const file = configPath ? JSON.parse(await readFile(configPath, "utf8")) : {};

const entry = (e, base) => {
  const path = resolve(base, typeof e === "string" ? e : e.path);
  return { path, name: (typeof e === "object" && e.name) || basename(dirname(path)) };
};
const folders = flags("dag").length
  ? flags("dag").map((p) => entry(p, "."))
  : [file.dag ?? []].flat().map((e) => entry(e, dirname(configPath)));
if (!folders.length) {
  console.error('usage: build-viewer (--dag <folder> [--dag <folder> ...] | --config file.json) [--title "Name"]');
  process.exit(2);
}
const title = flag("title") ?? file.title ?? "Definitions and claims";

// ESM modules become one inline script: drop imports, strip `export`.
const inline = (src) => src.replace(/^import .*$/gm, "").replace(/^export /gm, "");
const parser = (await Promise.all(["frontmatter.js", "parse.js", "merge.js", "markdown.js"]
  .map((f) => readFile(join(here, "src", f), "utf8")))).map(inline).join("\n");

const slugs = new Set();
const sources = [];
for (const { path, name } of folders) {
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dag";
  while (slugs.has(slug)) slug += "-2";
  slugs.add(slug);
  sources.push({ slug, name, files: await readNodeFiles(path) });
}

// A `<` inside the JSON is written as <: `</script` would end the
// inline script early, and `<!--` followed by `<script` would make the HTML
// parser miss the real closing tag. Every replacement takes a function, so
// `$&` and the like in a title or a node are not read as patterns.
const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
const safeTitle = title.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const html = (await readFile(join(here, "viewer/template.html"), "utf8"))
  .replace(/__TITLE__/g, () => safeTitle)
  .replace("/*__PARSER__*/", () => parser)
  .replace("__SOURCES__", () => json(sources));
process.stdout.write(html);
