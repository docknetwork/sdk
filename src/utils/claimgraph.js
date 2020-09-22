// A claimgraph is expressed as list of rdf triples.
// A triple contains three Nodes, subject, property, and object.
// A Node may be either:
// an IRI: `{ "Iri": "<string>" }`,
// a blank node: `{ "Blank": "<string>" }`,
// or a blank node: `{ "Literal": { "value": "<string>", "type": <Node> } }`.
//
// This module implementes utilities for operating on claimgraphs if the above format.

export const claims = "https://www.dock.io/rdf2020#claimsV1";

// Convert from the json-ld claimgraph representaion
// https://github.com/digitalbazaar/jsonld.js/blob/983cd849f56180e2ee4552ca25dd52b293174830/lib/toRdf.js
// to this module's representation.
export function fromJsonldjsCg(jcg) {
  return jcg.map(
    ({ subject, predicate, object }) => [subject, predicate, object].map(fromJsonldjsNode)
  );
}

// convert a single node from json-ld claimgraph representaion to this module's representation.
function fromJsonldjsNode(jn) {
  switch (jn.termType) {
    case "NamedNode":
      return { Iri: jn.value };
    case "BlankNode":
      return { Blank: jn.value };
    case "Literal":
      return { Literal: { value: jn.value, type: fromJsonldjsNode(jn.datatype) } };
    default:
      throw "Unknown node type: " + jn.termType;
  }
}

// Merge two claimgraphs without conflating blank node names.
// When merging, blank nodes are renamed as required in order to avoid conflicts.
export function merge(cga, cgb) {
  todo();
  return [];
}

// Convert a Node into a cononicalized string representation.
//
// ∀ A, B ∈ Node: canon(A) = canon(B) <-> A = B
export function canon(node) {
  return JSON.stringify(orderKeys(node));
}

// recursively lexically sort the keys in an object
// expect(JSON.stringify(orderKeys(
//   { "b": "", "a": "" }
// ))).toEqual(JSON.stringify(
//   { "a": "", "b": "" }
// ));
// expect(JSON.stringify(orderKeys(
//   { "b": "", "a": { "c": "", "b": "", "a": "" } }
// ))).toEqual(JSON.stringify(
//   { "a": { "a": "", "b": "", "c": "" }, "b": "" }
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
      throw "type error: " + typeof a;
  }
}

// Convert to Explicit Ethos form.
// See https://www.w3.org/TR/WD-rdf-syntax-971002/ , 2.2. Utility Relations; "Layer 1", reification
export function asEE(cg, issuerIRI) {
  let usedBlanks = new Set();
  for (let claim of cg) {
    for (let node of claim) {
      if (node.Blank !== undefined) {
        usedBlanks.add(node.Blank);
      }
    }
  }
  let nextBlank = 0;
  let ret = [];
  for (let [s, p, o] of cg) {
    while (usedBlanks.has(blank(nextBlank))) {
      nextBlank++;
    }
    let statment = { Blank: blank(nextBlank) };
    ret.push([{ Iri: issuerIRI }, { Iri: claims }, statment]);
    ret.push([statment, { Iri: rdf('subject') }, s]);
    ret.push([statment, { Iri: rdf('predicate') }, p]);
    ret.push([statment, { Iri: rdf('object') }, o]);
    nextBlank++;
  }
  return ret;
}

function blank(n) {
  return `_:b${n}`;
}

// It's common to use shorthand like `rdf:type`. This function let's us do something similar.
// expect(rdf('type')).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
function rdf(keyword) {
  if (!['type', 'subject', 'predicate', 'object'].includes(keyword)) {
    throw `are you sure ${keyword} is part of the rdf: context?`;
  }
  return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' + keyword;
}
