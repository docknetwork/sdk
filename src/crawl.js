/*
eslint no-await-in-loop: "off",
no-constant-condition: ["error", { "checkLoops": false }]
*/

import { deepClone } from './utils/common';
import { queryNextLookup } from './utils/rdf';
import { inferh } from './utils/cd';
import { canon } from './utils/canonicalize';

// Crawl the rdf dataset composed of DIDs and turtle documents on ipfs. Return the graph
// representing all knowlege obtained while crawling.
export default async function crawl(
  initialFacts,
  rules,
  curiosityQuery,
  resolveGraph,
) {
  let facts = deepClone(initialFacts);
  const lookedup = new Set();
  const marknew = (term) => {
    // Add term to lookedup.
    // Return whether the term was already present in the set.
    const str = canon(term);
    const isnew = !lookedup.has(str);
    lookedup.add(str);
    return isnew;
  };

  while (true) {
    // reason over what we have so far
    facts = facts.concat(inferh(facts, rules));

    // lookup any interesting documents
    const interesting = await queryNextLookup(facts, curiosityQuery);
    const novel = interesting.filter(marknew);
    const newfacts = [...await Promise.all(novel.map(resolveGraph))];
    facts = facts.concat(...newfacts);

    if (newfacts.length === 0) {
      break;
    }
  }

  return facts;
}
