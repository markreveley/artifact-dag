// Turn a set of Markdown files into nodes, edges and problems. Pure: takes
// `[{path, text}]`, returns data. Runs unchanged in Node and in the browser.

import { splitFrontmatter, parseFrontmatter } from "./frontmatter.js";

export const TYPES = {
  definition: { prefix: "def" },
  claim: { prefix: "claim" },
};

export const EDGE_FIELDS = ["uses", "depends_on", "supports", "contradicts", "refines"];
// Edge kinds that are required to be acyclic.
export const DAG_KINDS = new Set(["uses", "depends_on", "supports", "refines"]);

const ID_RE = /^([a-z]+):([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g;

export function parseId(id) {
  const m = ID_RE.exec(id || "");
  return m ? { prefix: m[1], slug: m[2] } : null;
}

// Split the body into the value (text before the first H2) and sections.
function splitBody(body) {
  const lines = body.split(/\r?\n/);
  const sections = [];
  let valueLines = [];
  let cur = null;
  for (const line of lines) {
    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (h2) { cur = { title: h2[1], lines: [] }; sections.push(cur); continue; }
    (cur ? cur.lines : valueLines).push(line);
  }
  return { value: valueLines.join("\n").trim(), sections };
}

function parseSubdefinitions(section) {
  const out = [];
  let cur = null;
  for (const line of section.lines) {
    const h3 = /^###\s+(.+?)\s*$/.exec(line);
    if (h3) { cur = { source: h3[1], text: [] }; out.push(cur); continue; }
    if (cur) cur.text.push(line);
  }
  return out.map((s) => ({ source: s.source, text: s.text.join("\n").trim() }));
}

export function parseFile(path, text) {
  const problems = [];
  const { front, body } = splitFrontmatter(text);
  if (front == null) return { node: null, edges: [], problems };
  const fm = parseFrontmatter(front);
  if (!fm.type) return { node: null, edges: [], problems }; // not a node, ignore

  const problem = (code, message, level = "error") =>
    problems.push({ level, code, path, message });

  const typeDef = TYPES[fm.type];
  if (!typeDef) problem("unknown_type", `type "${fm.type}" is not definition or claim`);
  for (const f of ["id", "title"]) if (!fm[f]) problem("missing_field", `missing "${f}"`);
  const pid = parseId(fm.id);
  if (fm.id && !pid) problem("bad_id", `id "${fm.id}" is not <prefix>:<slug>`);
  if (fm.order !== undefined && !/^\d+$/.test(fm.order))
    problem("bad_order", `order "${fm.order}" is not a whole number`);
  if (pid && typeDef && pid.prefix !== typeDef.prefix)
    problem("prefix_mismatch", `id "${fm.id}" should start with "${typeDef.prefix}:" for type ${fm.type}`);

  const { value, sections } = splitBody(body);
  const subSection = sections.find((s) => /^sub-?definitions$/i.test(s.title));

  const node = {
    id: fm.id || "",
    type: fm.type,
    subtype: fm.subtype || "",
    title: fm.title || "",
    aliases: fm.aliases || [],
    tags: fm.tags || [],
    sources: fm.sources || [],
    subject: fm.subject || "",
    document: fm.document || "",
    section: fm.section || "",
    order: /^\d+$/.test(fm.order || "") ? Number(fm.order) : null,
    value,
    subdefinitions: subSection ? parseSubdefinitions(subSection) : [],
    notLinks: fm.not_links || [],
    path,
  };

  const edges = [];
  const seen = new Set();
  const add = (to, kind) => {
    const key = kind + "\u0000" + to;
    if (!to || seen.has(key)) return;
    seen.add(key);
    edges.push({ from: node.id, to, kind });
  };
  for (const kind of EDGE_FIELDS) for (const to of fm[kind] || []) add(to, kind);
  if (fm.subject) add(fm.subject, "about");
  for (const m of body.matchAll(WIKILINK_RE)) {
    const target = m[1].trim();
    if (parseId(target)) add(target, "mentions");
  }

  return { node, edges, problems };
}

// Kahn's algorithm over the DAG kinds; returns one representative cycle per
// strongly connected remainder, as a list of ids, or [] when acyclic.
export function findCycles(nodeIds, edges) {
  const ids = new Set(nodeIds);
  const out = new Map([...ids].map((id) => [id, []]));
  const indeg = new Map([...ids].map((id) => [id, 0]));
  for (const e of edges) {
    if (!DAG_KINDS.has(e.kind) || !ids.has(e.from) || !ids.has(e.to)) continue;
    out.get(e.from).push(e.to);
    indeg.set(e.to, indeg.get(e.to) + 1);
  }
  const queue = [...ids].filter((id) => indeg.get(id) === 0);
  const done = new Set();
  while (queue.length) {
    const id = queue.pop();
    done.add(id);
    for (const t of out.get(id)) {
      indeg.set(t, indeg.get(t) - 1);
      if (indeg.get(t) === 0) queue.push(t);
    }
  }
  const stuck = [...ids].filter((id) => !done.has(id));
  if (!stuck.length) return [];
  // Walk from a stuck node until we revisit one; that walk is a cycle.
  const cycles = [];
  const used = new Set();
  for (const start of stuck) {
    if (used.has(start)) continue;
    const trail = [];
    const pos = new Map();
    let cur = start;
    while (cur !== undefined && !pos.has(cur)) {
      pos.set(cur, trail.length);
      trail.push(cur);
      cur = out.get(cur).find((t) => !done.has(t));
    }
    if (cur === undefined) continue;
    const cycle = trail.slice(pos.get(cur));
    cycle.forEach((id) => used.add(id));
    cycles.push(cycle);
  }
  return cycles;
}

export function parseCollection(files) {
  const nodes = [];
  const edges = [];
  const problems = [];
  const byId = new Map();
  for (const { path, text } of files) {
    const r = parseFile(path, text);
    problems.push(...r.problems);
    if (!r.node) continue;
    if (r.node.id) {
      if (byId.has(r.node.id)) {
        problems.push({ level: "error", code: "duplicate_id", path,
          message: `id "${r.node.id}" is also defined in ${byId.get(r.node.id).path}` });
        continue;
      }
      byId.set(r.node.id, r.node);
    }
    nodes.push(r.node);
    edges.push(...r.edges);
  }
  const external = new Set();
  for (const e of edges) if (!byId.has(e.to)) external.add(e.to);
  for (const id of [...external].sort()) {
    problems.push({ level: "info", code: "external", path: "",
      message: `"${id}" is linked but not in this collection` });
  }
  for (const cycle of findCycles(byId.keys(), edges)) {
    problems.push({ level: "error", code: "cycle", path: byId.get(cycle[0]).path,
      message: `cycle: ${[...cycle, cycle[0]].join(" -> ")}` });
  }
  return { nodes, edges, problems, external: [...external].sort() };
}
