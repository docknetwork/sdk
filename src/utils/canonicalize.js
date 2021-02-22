// The js interface to rify accepts RDF nodes as strings.
// This module deals with the conversions between the js representation
// of RDF nodes ({ Iri: 'https://example.com' }) and the rify-js representation
// AKA strings.

import { assert } from '@polkadot/util';
import { assertType, assertValidNode } from './common';

// Convert a Node into a cononicalized string representation.
//
// ∀ A, B ∈ Node: canon(A) = canon(B) <-> A = B
export function canon(node) {
  assertValidNode(node);
  return JSON.stringify(orderKeys(node));
}

/// Canonicalize all the nodes in a ruleset.
export function canonRules(rule) {
  return rule.map(({ if_all: ifAll, then }) => ({
    if_all: ifAll.map((claim) => claim.map(canonAtom)),
    then: then.map((claim) => claim.map(canonAtom)),
  }));
}

/// Canonicalize a rule atom.
/// An atom may be either { Bound: Node } or { Unbound: 'string' }
// expect(canonAtom({ Bound: { Iri: 'https://example.com' } }))
//   .toEqual({ Bound: "{\"Iri\":\"https://example.com\"}" });
// expect(canonAtom({ Unbound: "heyo" }))
//   .toEqual({ Unbound: "heyo" });
function canonAtom(atom) {
  assert(Object.keys(atom).length === 1, 'enum must have exactly one tag');
  switch (Object.keys(atom)[0]) {
    case 'Bound':
      assertType(atom.Bound, 'object');
      return { Bound: canon(atom.Bound) };
    case 'Unbound':
      assertType(atom.Unbound, 'string');
      return { Unbound: atom.Unbound };
    default:
      throw new TypeError(`expected bound or unbound rule atom got ${atom}`);
  }
}

/// Canonicalize all the nodes in a proof.
export function canonProof(proof) {
  return proof.map(({ rule_index: ruleIndex, instantiations }) => ({
    rule_index: ruleIndex,
    instantiations: instantiations.map(canon),
  }));
}

/// Parse all the nodes in a conaonicalized proof.
export function decanonProof(proof) {
  return proof.map(({ rule_index: ruleIndex, instantiations }) => ({
    rule_index: ruleIndex,
    instantiations: instantiations.map(JSON.parse),
  }));
}

/// Canonicalize all the nodes in a claimgraph.
export function canonClaimGraph(cg) {
  return cg.map((claim) => claim.map(canon));
}

/// Parse all the nodes in a canonicalized claimgraph.
export function decanonClaimGraph(cg) {
  return cg.map((claim) => claim.map(JSON.parse));
}

// recursively lexically sort the keys in an object
// expect(JSON.stringify(orderKeys(
//   { b: '', a: '' }
// ))).toEqual(JSON.stringify(
//   { a: '', b: '' }
// ));
// expect(JSON.stringify(orderKeys(
//   { b: '', a: { c: '', b: '', a: '' } }
// ))).toEqual(JSON.stringify(
//   { a: { a: '', b: '', c: '' }, b: '' }
// ));
function orderKeys(a) {
  let keys;
  let ret;
  switch (typeof a) {
    case 'string':
      return a;
    case 'object':
      keys = Object.keys(a);
      keys.sort();
      ret = {};
      for (const k of keys) {
        ret[k] = orderKeys(a[k]);
      }
      return ret;
    case 'boolean':
      return a;
    default:
      throw new TypeError(`type error: orderKeys() does not accept type ${typeof a}`);
  }
}
