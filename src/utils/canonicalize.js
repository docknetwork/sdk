// The js interface to rify accepts RDF nodes as strings.
// This module deals with the conversions between the js representation
// of RDF nodes ({ Iri: 'https://example.com' }) and the rify-js representation
// AKA strings.

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
  return rule.map(({ if_all, then }) => {
    return {
      if_all: if_all.map(claim => claim.map(canonAtom)),
      then: then.map(claim => claim.map(canonAtom)),
    };
  });
}

/// Canonicalize a rule atom.
/// An atom may be either { Bound: Node } or { Unbound: 'string' }
// expect(canonAtom({ Bound: { Iri: 'https://example.com' } }))
//   .toEqual({ Bound: "{\"Iri\":\"https://example.com\"}" });
// expect(canonAtom({ Unbound: "heyo" }))
//   .toEqual({ Unbound: "heyo" });
function canonAtom(atom) {
  if (atom.Bound !== undefined) {
    assertType(atom.Bound, 'object');
    return { Bound: canon(atom.Bound) };
  } else if (atom.Unbound !== undefined) {
    assertType(atom.Unbound, 'string');
    return { Unbound: atom.Unbound };
  } else {
    throw `expected bound or unbound rule atom got ${atom}`;
  }
}

/// Canonicalize all the nodes in a proof.
export function canonProof(proof) {
  return proof.map(({ rule_index, instantiations }) => {
    return {
      rule_index,
      instantiations: instantiations.map(canon)
    };
  });
}

/// Parse all the nodes in a conaonicalized proof.
export function decanonProof(proof) {
  return proof.map(({ rule_index, instantiations }) => {
    return {
      rule_index,
      instantiations: instantiations.map(JSON.parse)
    };
  });
}

/// Canonicalize all the nodes in a claimgraph.
export function canonClaimGraph(cg) {
  return cg.map(claim => claim.map(canon));
}

/// Parse all the nodes in a canonicalized claimgraph.
export function decanonClaimGraph(cg) {
  return cg.map(claim => claim.map(JSON.parse));
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
  switch (typeof a) {
    case 'string':
      return a;
    case 'object':
      let keys = Object.keys(a);
      keys.sort();
      let ret = {};
      for (let k of keys) {
        ret[k] = orderKeys(a[k]);
      }
      return ret;
    default:
      throw 'type error: orderKeys() does not accept type ' + typeof a;
  }
}
