import { deepClone } from './utils/common.js';
import { queryNextLookup } from './utils/rdf.js';
import { inferh } from './utils/cd.js';
import { canon } from './utils/canonicalize.js';

// Crawl the rdf dataset composed of DIDs and turtle documents on ipfs. Return the graph
// representing all knowlege obtained while crawling.
export async function alphaCrawl(
  initialFacts,
  rules,
  curiosityQuery,
  graphResolver,
) {
  let facts = deepClone(initialFacts);
  const lookedup = [];

  while (true) {
    let fresh = false;

    // reason over what we have so far
    facts = facts.concat(inferh(facts, rules));

    // lookup any interesting documents
    for (const term of await queryNextLookup(facts, curiosityQuery)) {
      const cterm = canon(term);
      if (!lookedup.includes(cterm)) {
        facts = facts.concat(await graphResolver(term));
        fresh = true;
        lookedup.push(cterm);
      }
    }

    if (!fresh) { break; }
  }

  return facts;
}
