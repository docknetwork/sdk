// A claimgraph is expressed as list of rdf triples.
// A triple contains three Nodes, subject, property, and object.
// A Node may be either:
// an IRI: `{ Iri: '<iri>' }`,
// a blank node: `{ Blank: '<string>' }`,
// or a literal node: `{ Literal: { value: '<string>', datatype: '<iri>' } }`
//
// This module implements utilities for operating on claimgraphs if the above format.

export const claims = { Iri: 'https://www.dock.io/rdf2020#claimsV1' };

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
    case 'NamedNode':
      return { Iri: jn.value };
    case 'BlankNode':
      return { Blank: jn.value };
    case 'Literal':
      assert(jn.datatype.termType === 'NamedNode', 'The datatype of an RDF literal must be an IRI');
      return { Literal: { value: jn.value, datatype: jn.datatype.value } };
    default:
      throw 'Unknown node type: ' + jn.termType;
  }
}

// Merge multiple claimgraphs without conflating blank node names.
// When merging, blank nodes are renamed as required in order to avoid conflicts.
// Input is a list of claimgraphs.
export function merge(claimgraphs) {
  claimgraphs.forEach(assertValidClaimGraph);
  let cgs = deepClone(claimgraphs);
  let namer = new Namer();
  for (let cg of cgs) {
    namer.reallocateNames(cg);
  }
  return cgs.flat(1);
}

// Convert a Node into a cononicalized string representation.
//
// ∀ A, B ∈ Node: canon(A) = canon(B) <-> A = B
export function canon(node) {
  return JSON.stringify(orderKeys(node));
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

// Convert to Explicit Ethos form.
// See https://www.w3.org/TR/WD-rdf-syntax-971002/ , 2.2. Utility Relations; "Layer 1", reification
export function asEE(claimgraph, issuerIRI) {
  let cg = deepClone(claimgraph);
  let namer = new Namer();
  namer.reallocateNames(cg);
  let ret = [];
  for (let [s, p, o] of cg) {
    let statement = namer.next();
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
  if (!['type', 'subject', 'predicate', 'object'].includes(keyword)) {
    throw `are you sure ${keyword} is part of the rdf: context?`;
  }
  return { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' + keyword };
}

// return the Set() of all bank node names in a claimgraph
function allBlanks(cg) {
  let ret = new Set();
  for (let claim of cg) {
    for (let node of claim) {
      if (node.Blank !== undefined) {
        ret.add(node.Blank);
      }
    }
  }
  return ret;
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
    let ret = { Blank: `_:b${this.nextBlank}` };
    this.nextBlank++;
    return ret;
  }

  // modify claimgraph replacing blank nodes with names allocated by this namer
  reallocateNames(claimgraph) {
    const blanks = allBlanks(claimgraph);
    let renames = {};
    for (let name of blanks) {
      renames[name] = this.next();
    }
    for (let claim of claimgraph) {
      for (let i = 0; i < claim.length; i++) {
        if (claim[i].Blank !== undefined) {
          claim[i] = renames[claim[i].Blank];
        }
      }
    }
  }
}

// deep copy a json serializable object
function deepClone(obj) {
  // https://jsben.ch/E55IQ
  return JSON.parse(JSON.stringify(obj));
}

function assertValidClaimGraph(cg) {
  for (let claim of cg) {
    for (let node of claim) {
      assertValidNode(node);
    }
  }
}

function assertValidNode(node) {
  let ks = Object.keys(node);
  assert(ks.length === 1, 'enum representaion invalid. enum must be exactly one variant');
  let tag = ks[0];
  let value = node[tag];
  switch (tag) {
    case 'Iri':
      assertType(value, 'string');
      break;
    case 'Blank':
      assertType(value, 'string');
      break;
    case 'Literal':
      assertType(value, 'object');
      assert(Object.keys(value).length == 2);
      assertType(value.value, 'string');
      assertType(value.datatype, 'string');
      break;
    default:
      throw 'Bad node tag: ' + tag;
  }
}

function assertType(a, typ) {
  if (typeof a !== typ) {
    throw `Type error. Expected type ${typ}. Got ${a} which has type ${typeof a}.`;
  }
}

function assert(b, s) {
  if (!b) {
    let m = 'assertion failed';
    if (s !== undefined) {
      m += ' ' + s;
    }
    throw m;
  }
}
