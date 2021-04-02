import crawl from '../../src/crawl.js';
import { ANYCLAIM, MAYCLAIM, MAYCLAIM_DEF_1 } from '../../src/rdf-defs.js';
import { assertValidNode } from '../../src/utils/common.js';
import { documentLoader, addDocument } from '../cached-document-loader.js';
import createClient from 'ipfs-http-client';
import { dereferenceFromIPFS, parseRDFDocument } from '../../src/utils/rdf';
import { fromJsonldjsCg } from '../../src/utils/claimgraph';
import jsonld from 'jsonld';
import assert from 'assert';
import deepEqual from 'deep-equal';

const ipfsDefaultConfig = 'http://localhost:5001';

const ATTESTS = 'https://rdf.dock.io/alpha/2021#attestsDocumentContents';

const ipfs_content = {
  rootatt: `
    @prefix dockalpha: <https://rdf.dock.io/alpha/2021#> .
    <did:b> dockalpha:mayClaim dockalpha:ANYCLAIM .
  `,
  batt: `
    @prefix dockalpha: <https://rdf.dock.io/alpha/2021#> .
    <did:c> dockalpha:mayClaim dockalpha:ANYCLAIM .
    <did:b> <http://purl.org/spar/cito/likes> <isbn:978-0-06-245871-1> .
  `,
};

async function ipfsAdd(ipfsClient, content) {
  let { cid } = await ipfsClient.add(content);
  return 'ipfs://' + cid.toV1();
}

describe('Crawler', () => {
  let ipfsClient;
  let rootatt_iri;
  let batt_iri;

  beforeAll(async (done) => {
    ipfsClient = createClient(ipfsDefaultConfig);

    rootatt_iri = await ipfsAdd(ipfsClient, ipfs_content.rootatt);
    batt_iri = await ipfsAdd(ipfsClient, ipfs_content.batt);

    addDocument('did:root', {
      '@id': 'did:root',
      [ATTESTS]: { '@id': rootatt_iri },
    });
    addDocument('did:b', {
      '@id': 'did:root',
      [ATTESTS]: { '@id': batt_iri },
    });

    done();
  });

  test('happy path', async () => {
    const RULES = [
      ...MAYCLAIM_DEF_1,
      {
        if_all: [
          [
            { Unbound: 'a' },
            { Bound: { Iri: ATTESTS } },
            { Unbound: 'doc' },
            { Unbound: 'a' },
          ],
        ],
        then: [
          [
            { Unbound: 'doc' },
            { Bound: { Iri: MAYCLAIM } },
            { Bound: { Iri: ANYCLAIM } },
            { Unbound: 'a' },
          ],
        ],
      },
    ];
    const CURIOSITY = `
      prefix dockalpha: <https://rdf.dock.io/alpha/2021#>

      select ?lookupNext where {
        graph <did:root> {
          ?lookupNext dockalpha:mayClaim dockalpha:ANYCLAIM .
        }
      }
    `;

    let { resolveGraph, listFailedLookups, } = graphResolver(ipfsClient);
    const initialFacts = await resolveGraph({ Iri: 'did:root' });
    let allFacts = await crawl(initialFacts, RULES, CURIOSITY, resolveGraph);
    expect(allFacts).toEqual(
      [
        [
          { Iri: 'did:root' },
          { Iri: 'https://rdf.dock.io/alpha/2021#attestsDocumentContents' },
          { Iri: rootatt_iri },
          { Iri: 'did:root' }
        ],
        [
          { Iri: rootatt_iri },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:root' }
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: rootatt_iri }
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:root' }
        ],
        [
          { Iri: 'did:root' },
          { Iri: 'https://rdf.dock.io/alpha/2021#attestsDocumentContents' },
          { Iri: batt_iri },
          { Iri: 'did:b' }
        ],
        [
          { Iri: 'did:root' },
          { Iri: 'https://rdf.dock.io/alpha/2021#attestsDocumentContents' },
          { Iri: batt_iri },
          { Iri: 'did:root' }
        ],
        [
          { Iri: 'did:root' },
          { Iri: 'https://rdf.dock.io/alpha/2021#attestsDocumentContents' },
          { Iri: batt_iri },
          { Iri: rootatt_iri }
        ],
        [
          { Iri: batt_iri },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:b' }
        ],
        [
          { Iri: batt_iri },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:root' }
        ],
        [
          { Iri: batt_iri },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: rootatt_iri }
        ],
        [
          { Iri: 'did:c' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: batt_iri }
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'http://purl.org/spar/cito/likes' },
          { Iri: 'isbn:978-0-06-245871-1' },
          { Iri: batt_iri }
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'http://purl.org/spar/cito/likes' },
          { Iri: 'isbn:978-0-06-245871-1' },
          { Iri: 'did:b' }
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'http://purl.org/spar/cito/likes' },
          { Iri: 'isbn:978-0-06-245871-1' },
          { Iri: 'did:root' }
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'http://purl.org/spar/cito/likes' },
          { Iri: 'isbn:978-0-06-245871-1' },
          { Iri: rootatt_iri }
        ],
        [
          { Iri: 'did:c' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:b' }
        ],
        [
          { Iri: 'did:c' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:root' }
        ],
        [
          { Iri: 'did:c' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: rootatt_iri }
        ]
      ]
    );
    expect(listFailedLookups()).toEqual([{ Iri: 'did:c' }]);
  }, 1000);
});

function graphResolver(ipfsClient) {
  async function resolve(term) {
    assertValidNode(term);
    if (!('Iri' in term)) {
      console.log('attempted to lookup non-iri', term);
      return [];
    }
    const iri = term.Iri;
    let triples;
    let ipfsPrefix = 'ipfs://';
    if (iri.startsWith(ipfsPrefix)) {
      let cid = iri.slice(ipfsPrefix.length);
      const body = await dereferenceFromIPFS(cid, ipfsClient);
      triples = await parseRDFDocument(body, { format: 'text/turtle' });
    } else {
      const jld = (await documentLoader(iri)).document;
      triples = await jsonldToCg(jld);
    }
    return triples.map(([s, p, o]) => [s, p, o, { Iri: iri }]);
  }

  let failedLookups = [];

  async function resolveGraph(term) {
    try {
      return await resolve(term);
    } catch (e) {
      failedLookups.push(term);
      return [];
    }
  }

  function listFailedLookups() {
    return defensive_copy(failedLookups);
  }

  return {
    resolveGraph,
    listFailedLookups,
  };
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

function defensive_copy(x) {
  return JSON.parse(JSON.stringify(x));
}
