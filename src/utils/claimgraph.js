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
  return [];
}

// convert a single node from json-ld claimgraph representaion to this module's representation.
function fromJsonldjsNode(jn) {
  return [];
}

// Merge two claimgraphs without conflating blank node names.
// When merging, blank nodes are renamed as required in order to avoid conflicts.
export function merge(cga, cgb) {
  return [];
}

// Convert a Node into a cononicalized string representation.
//
// ∀ A, B ∈ Node: canon(A) = canon(B) <-> A = B
export function canon(node) {
  return "";
}

// Convert to Explicit Ethos form.
// See https://www.w3.org/TR/WD-rdf-syntax-971002/ , 2.2. Utility Relations; "Layer 1", reification
export function asEE(cg, issuer) {
  return [];
}

// It's common to use shorthand like `rdf:type`. This function let's us do something similar.
// expect(rdf('type')).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
function rdf(keyword) {
  if (!['type', 'subject', 'predicate', 'object'].includes(keyword)) {
    throw `are you sure ${keyword} is part of the rdf: context?`;
  }
  return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' + keyword;
}
