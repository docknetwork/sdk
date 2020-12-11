// A claimgraph is expressed as list of rdf triples.
// A triple contains three Nodes, subject, property, and object.
// A Node may be either:
// an IRI: `{ Iri: '<iri>' }`,
// a blank node: `{ Blank: '<string>' }`,
// or a literal node: `{ Literal: { value: '<string>', datatype: '<iri>' } }`
//
// In compliance with https://www.w3.org/TR/rdf11-concepts/#section-Graph-Literal
// a literal node must have a language tag if and only if datatype is
// `http://www.w3.org/1999/02/22-rdf-syntax-ns#langString`
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
import { deepClone, assertValidClaimGraph, assertType } from './common';

export const claims = { Iri: 'https://www.dock.io/rdf2020#claimsV1' };

// Convert from the json-ld claimgraph representation
// https://github.com/digitalbazaar/jsonld.js/blob/983cd849f56180e2ee4552ca25dd52b293174830/lib/toRdf.js
// to this module's representation.
export function fromJsonldjsCg(jcg) {
  return jcg.map(
    ({ subject, predicate, object }) => [subject, predicate, object].map(fromJsonldjsNode),
  );
}

// convert a single node from json-ld claimgraph representation to this module's representation.
function fromJsonldjsNode(jn) {
  switch (jn.termType) {
    case 'NamedNode':
      return { Iri: jn.value };
    case 'BlankNode':
      return { Blank: jn.value };
    case 'Literal':
      assert(jn.datatype.termType === 'NamedNode', 'The datatype of an RDF literal must be an IRI');
      let ret = { Literal: { value: jn.value, datatype: jn.datatype.value } };
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
class Namer {
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

//

/**
 * Convert claimgraph to Explicit Ethos form.
 * https://www.w3.org/TR/WD-rdf-syntax-971002/ , 2.2. Utility Relations; "Layer 1", reification
 *
 * @param {Object[]} claimgraph
 * @param {string} issuerIRI
 * @returns {Object[]}
 */
export function asEE(claimgraph, issuerIRI) {
  assertType(issuerIRI, 'string');
  const cg = deepClone(claimgraph);
  const namer = new Namer();
  namer.reallocateNames(cg);
  const ret = [];
  for (const [s, p, o] of cg) {
    const statement = namer.next();
    ret.push([{ Iri: issuerIRI }, claims, statement]);
    ret.push([statement, rdf('subject'), s]);
    ret.push([statement, rdf('predicate'), p]);
    ret.push([statement, rdf('object'), o]);
  }
  return ret;
}

// It's common to use shorthand like `rdf:type`. This function let's us do something similar.
// expect(rdf('type')).toEqual({ Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' });
function rdf(keyword) {
  assert(
    ['type', 'subject', 'predicate', 'object'].includes(keyword),
    'unknown member of the rdf: context',
  );
  return { Iri: `http://www.w3.org/1999/02/22-rdf-syntax-ns#${keyword}` };
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
