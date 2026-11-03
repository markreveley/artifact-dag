// Turn a set of Markdown files into nodes, edges and problems. Pure: takes
// `[{path, text}]`, returns data. Runs unchanged in Node and in the browser.

import { splitFrontmatter, parseFrontmatter } from "./frontmatter.js";

export const TYPES = {
  definition: { prefix: "def" },
  claim: { prefix: "claim" },
  resource: { prefix: "res", required: ["url"] },
};

export const EDGE_FIELDS = ["uses", "depends_on", "supports", "contradicts", "refines", "topics"];
// Edge kinds that are required to be acyclic.
export const DAG_KINDS = new Set(["uses", "depends_on", "supports", "refines", "topics"]);

const ID_RE = /^([a-z]+):([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g;

export function parseId(id) {
  const m = ID_RE.exec(id || "");
  return m ? { prefix: m[1], slug: m[2] } : null;
}

const PREFIXES = new Set(Object.values(TYPES).map((t) => t.prefix));

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

// Frontmatter fields that take one value. A list there is reported and
// joined, so the rest of the checks still run instead of crashing later.
const SCALAR_FIELDS = ["id", "type", "title", "subtype", "subject", "document", "section", "order", "url", "hacker_news"];

export function parseFile(path, text) {
  const problems = [];
  const problem = (code, message, level = "error") =>
    problems.push({ level, code, path, message });
  const { front, body } = splitFrontmatter(text);
  if (front == null) return { node: null, edges: [], problems: [] };
  const badLines = [];
  const fm = parseFrontmatter(front, (line) => badLines.push(line));
  if (!fm.type) return { node: null, edges: [], problems: [] }; // not a node, ignore
  for (const line of badLines) problem("bad_frontmatter", `cannot read frontmatter line "${line}": not "key: value" or a list item`);

  const s = {};
  for (const k of SCALAR_FIELDS) {
    const v = fm[k];
    if (Array.isArray(v)) { problem("bad_field", `"${k}" is a list; it takes one value`); s[k] = v.join(", "); }
    else s[k] = v;
  }

  const typeDef = TYPES[s.type];
  if (!typeDef) problem("unknown_type", `type "${s.type}" is not ${Object.keys(TYPES).join(", ")}`);
  for (const f of ["id", "title", ...(typeDef?.required || [])]) if (!s[f]) problem("missing_field", `missing "${f}"`);
  const pid = parseId(s.id);
  if (s.id && !pid) problem("bad_id", `id "${s.id}" is not <prefix>:<slug>`);
  if (s.order !== undefined && !/^\d+$/.test(s.order))
    problem("bad_order", `order "${s.order}" is not a whole number`);
  if (pid && typeDef && pid.prefix !== typeDef.prefix)
    problem("prefix_mismatch", `id "${s.id}" should start with "${typeDef.prefix}:" for type ${s.type}`);

  const { value, sections } = splitBody(body);
  const subSection = sections.find((sec) => /^sub-?definitions$/i.test(sec.title));

  const node = {
    id: s.id || "",
    type: s.type,
    subtype: s.subtype || "",
    title: s.title || "",
    aliases: fm.aliases || [],
    tags: fm.tags || [],
    sources: fm.sources || [],
    subject: s.subject || "",
    document: s.document || "",
    section: s.section || "",
    order: /^\d+$/.test(s.order || "") ? Number(s.order) : null,
    url: s.url || "",
    hackerNews: s.hacker_news || "",
    value,
    subdefinitions: subSection ? parseSubdefinitions(subSection) : [],
    notLinks: fm.not_links || [],
    path,
  };

  const edges = [];
  const seen = new Set();
  // A link must name a node id; anything else is reported, not drawn. A node
  // with no id of its own gets no edges either: there is nothing to draw from.
  const add = (to, kind) => {
    const key = kind + "\u0000" + to;
    if (!to || seen.has(key)) return;
    seen.add(key);
    if (!PREFIXES.has(parseId(to)?.prefix)) {
      problem("bad_link", `${kind === "about" ? "subject" : kind} "${to}" is not a node id (<prefix>:<slug>, prefix ${[...PREFIXES].join(", ")})`);
      return;
    }
    if (node.id) edges.push({ from: node.id, to, kind });
  };
  for (const kind of EDGE_FIELDS) for (const to of fm[kind] || []) add(to, kind);
  if (s.subject) add(s.subject, "about");
  for (const m of body.matchAll(WIKILINK_RE)) add(m[1].trim(), "mentions");

  return { node, edges, problems };
}

// Tarjan's strongly connected components over the DAG kinds; returns one
// representative cycle per component that has one, as a list of ids, or []
// when acyclic. Which cycle of a component is shown, and the order of the
// components, depend on the order of nodeIds and edges; the count does not.
export function findCycles(nodeIds, edges) {
  const ids = new Set(nodeIds);
  const out = new Map([...ids].map((id) => [id, []]));
  for (const e of edges) {
    if (DAG_KINDS.has(e.kind) && ids.has(e.from) && ids.has(e.to)) out.get(e.from).push(e.to);
  }
  const index = new Map(), low = new Map(), stack = [], onStack = new Set(), cycles = [];
  let next = 0;
  const visit = (v) => {
    index.set(v, next);
    low.set(v, next++);
    stack.push(v);
    onStack.add(v);
    for (const w of out.get(v)) {
      if (!index.has(w)) { visit(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    }
    if (low.get(v) !== index.get(v)) return;
    const comp = new Set();
    let w;
    do { w = stack.pop(); onStack.delete(w); comp.add(w); } while (w !== v);
    if (comp.size === 1 && !out.get(v).includes(v)) return;
    // Every node of the component has an edge to another node of it, so a
    // walk that keeps inside the component must revisit a node: that is a cycle.
    const trail = [], pos = new Map();
    let cur = v;
    while (!pos.has(cur)) {
      pos.set(cur, trail.length);
      trail.push(cur);
      cur = out.get(cur).find((t) => comp.has(t));
    }
    cycles.push(trail.slice(pos.get(cur)));
  };
  for (const id of ids) if (!index.has(id)) visit(id);
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
