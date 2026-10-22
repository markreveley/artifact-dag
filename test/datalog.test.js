import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProgram, evaluate, stratify } from "../src/datalog.js";

const run = (text, facts) => evaluate(parseProgram(text), facts);
const sorted = (tuples) => [...tuples].map((t) => JSON.stringify(t)).sort();

test("joins two relations on a shared variable", () => {
  const db = run(`grand(X, Z) :- parent(X, Y), parent(Y, Z).`, {
    parent: [["a", "b"], ["b", "c"], ["b", "d"], ["e", "f"]],
  });
  assert.deepEqual(sorted(db.get("grand")), sorted([["a", "c"], ["a", "d"]]));
});

test("computes recursive closure to a fixpoint", () => {
  const db = run(`
    path(X, Y) :- edge(X, Y).
    path(X, Z) :- path(X, Y), edge(Y, Z).`, {
    edge: [["a", "b"], ["b", "c"], ["c", "d"], ["d", "b"]],
  });
  const got = sorted(db.get("path"));
  for (const t of [["a", "d"], ["b", "b"], ["d", "c"]]) assert.ok(got.includes(JSON.stringify(t)), t.join());
  assert.equal(got.length, 3 + 3 + 3 + 3);
});

test("handles mutual recursion", () => {
  const db = run(`
    even(z).
    odd(Y) :- even(X), succ(X, Y).
    even(Y) :- odd(X), succ(X, Y).`, {
    succ: [["z", "one"], ["one", "two"], ["two", "three"]],
  });
  assert.deepEqual(sorted(db.get("even")), sorted([["z"], ["two"]]));
  assert.deepEqual(sorted(db.get("odd")), sorted([["one"], ["three"]]));
});

test("stratified negation sees the finished lower stratum", () => {
  const db = run(`
    reach(X) :- start(X).
    reach(Y) :- reach(X), edge(X, Y).
    unreached(X) :- node(X), not reach(X).`, {
    start: [["a"]], edge: [["a", "b"], ["b", "c"]], node: [["a"], ["b"], ["c"], ["d"]],
  });
  assert.deepEqual(db.get("unreached"), [["d"]]);
});

test("anonymous variables in a negated atom match anything", () => {
  const db = run(`lonely(X) :- node(X), not edge(X, _).`, {
    node: [["a"], ["b"]], edge: [["a", "b"]],
  });
  assert.deepEqual(db.get("lonely"), [["b"]]);
});

test("negating a predicate with no tuples succeeds", () => {
  const db = run(`ok(X) :- node(X), not missing(X).`, { node: [["a"]] });
  assert.deepEqual(db.get("ok"), [["a"]]);
});

test("constants: strings, atoms and integers", () => {
  const db = run(`
    hit(X) :- e(X, "depends_on", 3).
    hit(X) :- e(X, supports, _).`, {
    e: [["a", "depends_on", 3], ["b", "depends_on", 4], ["c", "supports", 1]],
  });
  assert.deepEqual(sorted(db.get("hit")), sorted([["a"], ["c"]]));
});

test("integer < compares numbers and rejects non-integers", () => {
  const db = run(`before(A, B) :- at(A, X), at(B, Y), X < Y.`, {
    at: [["a", 1], ["b", 2], ["c", "3"]],
  });
  assert.deepEqual(db.get("before"), [["a", "b"]]);
});

test("= and != filter bindings", () => {
  const db = run(`
    pair(X, Y) :- n(X), n(Y), X != Y.
    same(X, Y) :- n(X), n(Y), X = Y.`, { n: [["a"], ["b"]] });
  assert.equal(db.get("pair").length, 2);
  assert.equal(db.get("same").length, 2);
});

test("a repeated variable inside one atom must match itself", () => {
  const db = run(`loop(X) :- edge(X, X).`, { edge: [["a", "a"], ["a", "b"]] });
  assert.deepEqual(db.get("loop"), [["a"]]);
});

test("rejects a program with negation through recursion", () => {
  assert.throws(() => stratify(parseProgram(`p(X) :- q(X), not p(X).`)), /not stratifiable/);
  const mutual = parseProgram(`
    p(X) :- n(X), not q(X).
    q(X) :- n(X), not p(X).`);
  assert.throws(() => evaluate(mutual, { n: [["a"]] }), /not stratifiable/);
});

test("rejects unsafe rules", () => {
  assert.throws(() => parseProgram(`p(X) :- q(Y).`), /X is not bound/);
  assert.throws(() => parseProgram(`p(X) :- q(X), not r(Y).`), /Y is not bound/);
  assert.throws(() => parseProgram(`p(X) :- q(X), Y < X.`), /Y is not bound/);
});

test("reports syntax errors with a line number", () => {
  assert.throws(() => parseProgram(`p(X) :- q(X)\nr(X).`), /line 2/);
  assert.throws(() => parseProgram(`p("open).`), /unterminated/);
});

test("comments and string escapes", () => {
  const db = run(`% a comment
    q("say \\"hi\\"").  % trailing`, {});
  assert.deepEqual(db.get("q"), [['say "hi"']]);
});
