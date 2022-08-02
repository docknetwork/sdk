/*
eslint no-await-in-loop: "off",
no-constant-condition: ["error", { "checkLoops": false }]
*/

import jsonld from 'jsonld';
import assert from 'assert';
import deepEqual from 'deep-equal';
import { deepClone, assertValidNode } from './utils/common';
import { queryNextLookup, dereferenceFromIPFS, parseRDFDocument } from './utils/rdf';
import { inferh } from './utils/cd';
import { canon } from './utils/canonicalize';
import { Namer, fromJsonldjsCg } from './utils/claimgraph';

// Crawl the rdf dataset composed of DIDs and turtle documents on ipfs. Return the graph
// representing all knowledge obtained while crawling.
export async function crawl(
  initialFacts,
  rules,
  curiosityQuery,
  resolveGraph,
  engine,
) {
  // namer is used to ensure blank node hygiene whenever adding new claimgraphs
  const namer = new Namer();

  let facts = deepClone(initialFacts);
  namer.reallocateNames(facts);

  const lookedup = new Set();
  const marknew = (term) => {
    // Add term to lookedup.
    // Return whether the term was already present in the set.
    // like https://doc.rust-lang.org/std/collections/btree_set/struct.BTreeSet.html#method.insert
    const str = canon(term);
    const isnew = !lookedup.has(str);
    lookedup.add(str);
    return isnew;
  };

  while (true) {
    // reason over what we have so far
    facts = facts.concat(inferh(facts, rules));

    // lookup any interesting documents
    const interesting = await queryNextLookup(facts, curiosityQuery, engine);
    const novel = interesting.filter(marknew);
    const newfacts = [...await Promise.all(novel.map(resolveGraph))];
    for (const nf of newfacts) {
      namer.reallocateNames(nf);
    }
    facts = facts.concat(...newfacts);

    if (newfacts.length === 0) {
      break;
    }
  }

  return facts;
}

// construct a document fetcher for use in the crawler
export function graphResolver(
  ipfsClient,
  documentLoader,
  onFailedLookup = (_term, err) => { throw err; },
) {
  async function resolve(term) {
    assertValidNode(term);
    if (!('Iri' in term)) {
      throw new Error(`attempted to lookup non-iri ${JSON.stringify(term)}`);
    }
    const iri = term.Iri;
    let triples;
    const ipfsPrefix = 'ipfs://';
    if (iri.startsWith(ipfsPrefix)) {
      const cid = iri.slice(ipfsPrefix.length);
      const body = await dereferenceFromIPFS(cid, ipfsClient);
      triples = await parseRDFDocument(body, { format: 'text/turtle' });
    } else {
      const jld = (await documentLoader(iri)).document;
      triples = await jsonldToCg(jld);
    }
    return triples.map(([s, p, o]) => [s, p, o, { Iri: iri }]);
  }

  async function resolveGraph(term) {
    try {
      return await resolve(term);
    } catch (err) {
      onFailedLookup(term, err);
      return [];
    }
  }

  return resolveGraph;
}

async function jsonldToCg(jld, documentLoader) {
  const exp = await jsonld.expand(jld, { documentLoader });
  const cg = fromJsonldjsCg(await jsonld.toRDF(exp));
  for (const claim of cg) {
    assert(deepEqual(claim[3], { DefaultGraph: true }), 'illegal subgraph was specified');
    claim.pop();
    assert(claim.length === 3);
  }
  return cg;
}
