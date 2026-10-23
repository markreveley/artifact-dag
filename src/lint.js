// Run Datalog lint rules over a parsed collection. Pure: takes the graph and
// the rules' text, returns findings. The default rules are in lint/rules.dl.

import { parseProgram, evaluate } from "./datalog.js";
import { toFacts } from "./facts.js";

const LEVELS = { error: 0, warn: 1, info: 2 };

const MESSAGES = {
  unlinked_term: (f, word) => `names ${f.target}${word ? ` ("${word}")` : ""} with no edge to it; link it, or add it to not_links`,
  narrower_unlinked: (f) => `title is a narrower ${f.target} but has no edge to it; add refines, or add it to not_links`,
  scale_member: (f) => `refines scale ${f.target}, whose text does not link it`,
  isolated_claim: () => "has no depends_on, supports, contradicts or refines edge to or from another claim",
  forward_dependency: (f) => `depends_on ${f.target}, which comes later in the document`,
  untagged_use: (f, _, tag) => `uses ${f.target}, which is not tagged ${tag}`,
  unused_doc_term: (f) => `is tagged ${f.target} but no claim tagged ${f.target} uses it`,
  dead_end_definition: () => "has no outgoing edge",
};

// `rules` is one Datalog program text (defaults plus any collection rules).
// Returns [{ level, code, node, target, path, message }], sorted by level,
// code, then path.
export function lint(graph, rules) {
  const facts = toFacts(graph);
  const db = evaluate(parseProgram(rules), facts);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const word = new Map();
  for (const [n, t, w] of facts.names) if (!word.has(n + " " + t)) word.set(n + " " + t, w);
  const docTags = new Map();
  for (const [n, t] of facts.doc_tag) docTags.set(n, [...(docTags.get(n) || []), t]);

  const out = [];
  for (const [code, level, node, target] of db.get("finding") || []) {
    const f = { level, code, node, target, path: byId.get(node)?.path || "" };
    const msg = MESSAGES[code];
    if (code === "untagged_use") {
      // One finding per claim/definition pair; name the tags it is missing.
      const have = new Set(byId.get(target)?.tags || []);
      const missing = (docTags.get(node) || []).filter((t) => !have.has(t));
      f.message = msg(f, null, missing.join(", "));
    } else {
      f.message = msg ? msg(f, word.get(node + " " + target)) : target ? `${node} -> ${target}` : node;
    }
    out.push(f);
  }
  return out.sort((a, b) =>
    (LEVELS[a.level] ?? 3) - (LEVELS[b.level] ?? 3) ||
    a.code.localeCompare(b.code) || a.path.localeCompare(b.path) || a.target.localeCompare(b.target));
}

// A finding's identity for baselines: stable across message wording.
export const findingKey = (f) => `${f.code} ${f.node} ${f.target}`;
