// A claimgraph is expressed as list of rdf quads.
// A quad contains four Terms, subject, property, object and graph.
// A Term may be either:
// an IRI: `{ Iri: '<iri>' }`,
// a blank node: `{ Blank: '<string>' }`,
// a literal node: `{ Literal: { value: '<string>', datatype: '<iri>' } }`
// or the default graph: `{ DefaultGraph: true }`
//
// In compliance with https://www.w3.org/TR/rdf11-concepts/#section-Graph-Literal
// a literal node must have a language tag if and only if datatype is
// `http://www.w3.org/1999/02/22-rdf-syntax-ns#langString`
//
// The value of any DefualtGraph object must be `true`.
//   Valid: `{ DefaultGraph: true }`
//   Invalid: `{ DefaultGraph: false }`
//   Invalid: `{ DefaultGraph: '' }`
//   Invalid: `{ DefaultGraph: null }`
//
// ```
// { Literal: {
//    value: '<string>',
//    datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString',
//    language: '<tag>',
// } }
// ```
//
// This module implements utilities for operating on claimgraphs if the above format.

import { assert } from '@polkadot/util';
import { deepClone, assertValidClaimGraph } from './common';

export const claims = { Iri: 'https://www.dock.io/rdf2020#claimsV1' };

// Convert from the json-ld claimgraph representation
// https://github.com/digitalbazaar/jsonld.js/blob/983cd849f56180e2ee4552ca25dd52b293174830/lib/toRdf.js
// to this module's representation.
export function fromJsonldjsCg(jcg) {
  return jcg.map(({
    subject, predicate, object, graph,
  }) => [subject, predicate, object, graph].map(fromJsonldjsNode));
}

// convert a single node from json-ld claimgraph representation to this module's representation.
export function fromJsonldjsNode(jn) {
  let ret;
  switch (jn.termType) {
    case 'DefaultGraph':
      return { DefaultGraph: true };
    case 'NamedNode':
      return { Iri: jn.value };
    case 'BlankNode':
      return { Blank: jn.value };
    case 'Literal':
      assert(jn.datatype.termType === 'NamedNode', 'The datatype of an RDF literal must be an IRI');
      ret = { Literal: { value: jn.value, datatype: jn.datatype.value } };
      if (jn.datatype.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString') {
        assert(
          jn.language !== undefined,
          'Language tagged strings are expected to have a language tag.',
        );
        ret.Literal.language = jn.language;
      }
      return ret;
    default:
      throw new TypeError(`Unknown node type: ${jn.termType}`);
  }
}

// Blank node name generator
// An object of this type won't produce the same name twice, even accross multiple calls to
// reallocateNames.
export class Namer {
  constructor() {
    this.nextBlank = 0;
  }

  // get the next available blank node
  next() {
    const ret = { Blank: `_:b${this.nextBlank}` };
    this.nextBlank++;
    return ret;
  }

  // modify claimgraph replacing blank nodes with names allocated by this namer
  reallocateNames(claimgraph) {
    const blanks = allBlanks(claimgraph);
    const renames = {};
    for (const name of blanks) {
      renames[name] = this.next();
    }
    for (const claim of claimgraph) {
      for (let i = 0; i < claim.length; i++) {
        if (claim[i].Blank !== undefined) {
          claim[i] = renames[claim[i].Blank];
        }
      }
    }
  }
}

// Merge multiple claimgraphs without conflating blank node names.
// When merging, blank nodes are renamed as required in order to avoid conflicts.
// Input is a list of claimgraphs.
export function merge(claimgraphs) {
  claimgraphs.forEach(assertValidClaimGraph);
  const cgs = deepClone(claimgraphs);
  const namer = new Namer();
  for (const cg of cgs) {
    namer.reallocateNames(cg);
  }
  return cgs.flat(1);
}

// return the Set() of all bank node names in a claimgraph
function allBlanks(cg) {
  const ret = new Set();
  for (const claim of cg) {
    for (const node of claim) {
      if (node.Blank !== undefined) {
        ret.add(node.Blank);
      }
    }
  }
  return ret;
}
