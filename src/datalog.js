// A small bottom-up Datalog evaluator. Pure, no dependencies, runs in Node and
// in the browser. Semi-naive evaluation, stratified negation, constants
// (quoted strings, integers, lowercase atoms), and the comparisons `=`, `!=`
// and `<` (integers only). No function symbols, no arithmetic.
//
//   const program = parseProgram(`path(X, Y) :- edge(X, Y).
//                                 path(X, Z) :- path(X, Y), edge(Y, Z).`);
//   const db = evaluate(program, { edge: [["a", "b"], ["b", "c"]] });
//   db.get("path")  // [["a","b"], ["b","c"], ["a","c"]]

// ---------- parsing ----------

const PUNCT = [":-", "!=", "(", ")", ",", ".", "=", "<"];

function tokenize(text) {
  const toks = [];
  let i = 0, line = 1;
  while (i < text.length) {
    const c = text[i];
    if (c === "\n") { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === "%") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (c === '"') {
      let s = "", j = i + 1;
      while (j < text.length && text[j] !== '"') {
        if (text[j] === "\\" && j + 1 < text.length) j++;
        if (text[j] === "\n") line++;
        s += text[j++];
      }
      if (j >= text.length) throw new Error(`line ${line}: unterminated string`);
      toks.push({ t: "str", v: s, line });
      i = j + 1;
      continue;
    }
    const num = /^-?\d+/.exec(text.slice(i));
    if (num) { toks.push({ t: "int", v: Number(num[0]), line }); i += num[0].length; continue; }
    const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i));
    if (word) {
      const w = word[0];
      toks.push({ t: /^[A-Z_]/.test(w) ? "var" : "id", v: w, line });
      i += w.length;
      continue;
    }
    const p = PUNCT.find((p) => text.startsWith(p, i));
    if (!p) throw new Error(`line ${line}: unexpected "${c}"`);
    toks.push({ t: p, v: p, line });
    i += p.length;
  }
  return toks;
}

// A term is { var: name } or { const: value }. Each `_` is a fresh variable.
export function parseProgram(text) {
  const toks = tokenize(text);
  let pos = 0, anon = 0;
  const peek = () => toks[pos];
  const where = () => (peek() ? `line ${peek().line}` : "end of input");
  const expect = (t) => {
    const tok = toks[pos];
    if (!tok || tok.t !== t) throw new Error(`${where()}: expected "${t}"`);
    pos++;
    return tok;
  };
  const term = () => {
    const tok = toks[pos++];
    if (!tok) throw new Error("unexpected end of input");
    if (tok.t === "var") return tok.v === "_" ? { var: `_${anon++}` } : { var: tok.v };
    if (tok.t === "str" || tok.t === "int" || tok.t === "id") return { const: tok.v };
    throw new Error(`line ${tok.line}: expected a term, got "${tok.v}"`);
  };
  const atom = () => {
    const name = expect("id").v;
    const args = [];
    if (peek() && peek().t === "(") {
      pos++;
      if (peek() && peek().t !== ")") {
        args.push(term());
        while (peek() && peek().t === ",") { pos++; args.push(term()); }
      }
      expect(")");
    }
    return { kind: "atom", pred: name, args, neg: false };
  };
  const literal = () => {
    const tok = peek();
    if (tok && tok.t === "id" && tok.v === "not") {
      pos++;
      const a = atom();
      a.neg = true;
      return a;
    }
    // A comparison starts with a term followed by an operator; an atom with
    // an identifier followed by "(" or a separator.
    const next = toks[pos + 1];
    if (tok && tok.t === "id" && (!next || ["(", ",", "."].includes(next.t))) return atom();
    const left = term();
    const op = toks[pos++];
    if (!op || !["=", "!=", "<"].includes(op.t)) throw new Error(`${where()}: expected a comparison`);
    return { kind: "cmp", op: op.t, left, right: term() };
  };

  const rules = [];
  while (pos < toks.length) {
    const line = peek().line;
    const head = atom();
    const body = [];
    if (peek() && peek().t === ":-") {
      pos++;
      body.push(literal());
      while (peek() && peek().t === ",") { pos++; body.push(literal()); }
    }
    expect(".");
    rules.push({ head, body, line });
  }
  for (const r of rules) checkSafe(r);
  return rules;
}

const varsOf = (terms) => terms.filter((t) => "var" in t).map((t) => t.var);

function checkSafe(rule) {
  const bound = new Set();
  for (const l of rule.body) if (l.kind === "atom" && !l.neg) varsOf(l.args).forEach((v) => bound.add(v));
  const need = [...varsOf(rule.head.args)];
  for (const l of rule.body) {
    if (l.kind === "cmp") need.push(...varsOf([l.left, l.right]));
    else if (l.neg) need.push(...varsOf(l.args).filter((v) => !v.startsWith("_")));
  }
  for (const v of need) {
    if (!bound.has(v)) throw new Error(`line ${rule.line}: variable ${v} is not bound by a positive literal`);
  }
}

// ---------- relations ----------

const keyOf = (tuple) => JSON.stringify(tuple);

class Relation {
  constructor() { this.tuples = []; this.keys = new Set(); this.indexes = new Map(); }
  add(tuple) {
    const k = keyOf(tuple);
    if (this.keys.has(k)) return false;
    this.keys.add(k);
    this.tuples.push(tuple);
    for (const idx of this.indexes.values()) push(idx, keyOf(idx.mask.map((i) => tuple[i])), tuple);
    return true;
  }
  // Tuples whose positions in `mask` equal `values`.
  match(mask, values) {
    if (!mask.length) return this.tuples;
    const name = mask.join(",");
    let idx = this.indexes.get(name);
    if (!idx) {
      idx = new Map();
      idx.mask = mask;
      for (const t of this.tuples) push(idx, keyOf(mask.map((i) => t[i])), t);
      this.indexes.set(name, idx);
    }
    return idx.get(keyOf(values)) || [];
  }
}
function push(map, k, v) {
  const a = map.get(k);
  if (a) a.push(v); else map.set(k, [v]);
}

// ---------- stratification ----------

// Assigns each predicate a stratum so that a predicate is computed after
// everything it depends on, strictly after anything it negates. Throws when a
// predicate depends negatively on itself through recursion.
export function stratify(rules) {
  const preds = new Set();
  for (const r of rules) {
    preds.add(r.head.pred);
    for (const l of r.body) if (l.kind === "atom") preds.add(l.pred);
  }
  const stratum = new Map([...preds].map((p) => [p, 0]));
  const limit = preds.size;
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of rules) {
      const h = r.head.pred;
      for (const l of r.body) {
        if (l.kind !== "atom") continue;
        const need = stratum.get(l.pred) + (l.neg ? 1 : 0);
        if (stratum.get(h) < need) {
          if (need > limit) throw new Error(`program is not stratifiable: ${h} depends negatively on itself through ${l.pred}`);
          stratum.set(h, need);
          changed = true;
        }
      }
    }
  }
  return stratum;
}

// ---------- evaluation ----------

const resolve = (t, env) => ("var" in t ? env.get(t.var) : t.const);

function compare(op, a, b) {
  if (op === "=") return a === b;
  if (op === "!=") return a !== b;
  return Number.isInteger(a) && Number.isInteger(b) && a < b;
}

// Order a rule body for joining: positive atoms in written order, each filter
// (comparison or negation) right after the literal that binds its last var.
function plan(rule) {
  const pos = rule.body.filter((l) => l.kind === "atom" && !l.neg);
  const filters = rule.body.filter((l) => !(l.kind === "atom" && !l.neg));
  const steps = [];
  const bound = new Set();
  const pending = [...filters];
  const flush = () => {
    for (let i = 0; i < pending.length; i++) {
      const f = pending[i];
      const vs = f.kind === "cmp" ? varsOf([f.left, f.right]) : varsOf(f.args).filter((v) => !v.startsWith("_"));
      if (vs.every((v) => bound.has(v))) { steps.push(f); pending.splice(i--, 1); }
    }
  };
  flush();
  for (const a of pos) {
    steps.push(a);
    varsOf(a.args).forEach((v) => bound.add(v));
    flush();
  }
  return steps;
}

// Run `steps` against `rel(pred, i)`, which returns the relation to read for
// the positive atom at step i. Calls `emit(env)` for each solution.
function solve(steps, rel, db, emit) {
  const go = (i, env) => {
    if (i === steps.length) return emit(env);
    const l = steps[i];
    if (l.kind === "cmp") {
      if (compare(l.op, resolve(l.left, env), resolve(l.right, env))) go(i + 1, env);
      return;
    }
    if (l.neg) {
      // Unbound `_` positions in a negated atom match anything.
      const r = db.get(l.pred);
      if (!r) return go(i + 1, env);
      const mask = [], vals = [];
      l.args.forEach((t, j) => {
        const v = "var" in t ? env.get(t.var) : t.const;
        if (v !== undefined) { mask.push(j); vals.push(v); }
      });
      if (!r.match(mask, vals).length) go(i + 1, env);
      return;
    }
    const r = rel(l.pred, i);
    if (!r) return;
    const mask = [], vals = [];
    l.args.forEach((t, j) => {
      const v = resolve(t, env);
      if (v !== undefined) { mask.push(j); vals.push(v); }
    });
    for (const tuple of r.match(mask, vals)) {
      const next = new Map(env);
      let ok = true;
      l.args.forEach((t, j) => {
        if (!ok || !("var" in t)) return;
        const have = next.get(t.var);
        if (have === undefined) next.set(t.var, tuple[j]);
        else if (have !== tuple[j]) ok = false;
      });
      if (ok) go(i + 1, next);
    }
  };
  go(0, new Map());
}

// Evaluate `rules` over the extensional `facts` ({ pred: [tuple, ...] }).
// Returns a Map from every predicate to its list of tuples.
export function evaluate(rules, facts = {}) {
  const db = new Map();
  const relOf = (p) => { if (!db.has(p)) db.set(p, new Relation()); return db.get(p); };
  for (const [p, tuples] of Object.entries(facts)) {
    const r = relOf(p);
    for (const t of tuples) r.add(t);
  }
  const stratum = stratify(rules);
  const levels = [...new Set(rules.map((r) => stratum.get(r.head.pred)))].sort((a, b) => a - b);

  for (const level of levels) {
    const here = rules.filter((r) => stratum.get(r.head.pred) === level);
    const inLevel = new Set(here.map((r) => r.head.pred));
    const plans = here.map((r) => ({ rule: r, steps: plan(r) }));
    const derive = (rule, env) => rule.head.args.map((t) => resolve(t, env));

    // First round: every rule against the full database.
    let delta = new Map();
    for (const { rule, steps } of plans) {
      solve(steps, (p) => db.get(p), db, (env) => {
        const t = derive(rule, env);
        if (relOf(rule.head.pred).add(t)) pushDelta(delta, rule.head.pred, t);
      });
    }
    // Later rounds: only rules with a recursive atom, with that atom read
    // from the previous round's new tuples.
    while ([...delta.values()].some((r) => r.tuples.length)) {
      const next = new Map();
      for (const { rule, steps } of plans) {
        steps.forEach((l, i) => {
          if (l.kind !== "atom" || l.neg || !inLevel.has(l.pred) || !delta.has(l.pred)) return;
          solve(steps, (p, j) => (j === i ? delta.get(p) : db.get(p)), db, (env) => {
            const t = derive(rule, env);
            if (relOf(rule.head.pred).add(t)) pushDelta(next, rule.head.pred, t);
          });
        });
      }
      delta = next;
    }
  }
  const out = new Map();
  for (const [p, r] of db) out.set(p, r.tuples);
  return out;
}

function pushDelta(delta, pred, tuple) {
  if (!delta.has(pred)) delta.set(pred, new Relation());
  delta.get(pred).add(tuple);
}
