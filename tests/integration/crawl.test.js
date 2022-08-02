import { create } from 'ipfs-http-client';
import { newEngine } from '@comunica/actor-init-sparql-rdfjs';
import { crawl, graphResolver } from '../../src/crawl.js';
import { ANYCLAIM, MAYCLAIM, MAYCLAIM_DEF_1 } from '../../src/rdf-defs.js';
import { documentLoader, addDocument } from '../cached-document-loader.js';

const ipfsDefaultConfig = 'http://127.0.0.1:5001';

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
  const { cid } = await ipfsClient.add(content);
  return `ipfs://${cid.toV1()}`;
}

describe('Crawler', () => {
  let ipfsClient;
  let rootatt_iri;
  let batt_iri;

  beforeAll(async () => {
    ipfsClient = create(ipfsDefaultConfig);

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

    const failedLookups = [];
    const resolveGraph = graphResolver(
      ipfsClient,
      documentLoader,
      (term, _err) => failedLookups.push(term),
    );
    const initialFacts = await resolveGraph({ Iri: 'did:root' });
    const allFacts = await crawl(initialFacts, RULES, CURIOSITY, resolveGraph, newEngine());
    expect(failedLookups).toEqual([{ Iri: 'did:c' }]);
    expect(allFacts).toEqual(
      [
        [
          { Iri: 'did:root' },
          { Iri: 'https://rdf.dock.io/alpha/2021#attestsDocumentContents' },
          { Iri: rootatt_iri },
          { Iri: 'did:root' },
        ],
        [
          { Iri: rootatt_iri },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:root' },
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: rootatt_iri },
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:root' },
        ],
        [
          { Iri: 'did:root' },
          { Iri: 'https://rdf.dock.io/alpha/2021#attestsDocumentContents' },
          { Iri: batt_iri },
          { Iri: 'did:b' },
        ],
        [
          { Iri: 'did:root' },
          { Iri: 'https://rdf.dock.io/alpha/2021#attestsDocumentContents' },
          { Iri: batt_iri },
          { Iri: 'did:root' },
        ],
        [
          { Iri: 'did:root' },
          { Iri: 'https://rdf.dock.io/alpha/2021#attestsDocumentContents' },
          { Iri: batt_iri },
          { Iri: rootatt_iri },
        ],
        [
          { Iri: batt_iri },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:b' },
        ],
        [
          { Iri: batt_iri },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:root' },
        ],
        [
          { Iri: batt_iri },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: rootatt_iri },
        ],
        [
          { Iri: 'did:c' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: batt_iri },
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'http://purl.org/spar/cito/likes' },
          { Iri: 'isbn:978-0-06-245871-1' },
          { Iri: batt_iri },
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'http://purl.org/spar/cito/likes' },
          { Iri: 'isbn:978-0-06-245871-1' },
          { Iri: 'did:b' },
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'http://purl.org/spar/cito/likes' },
          { Iri: 'isbn:978-0-06-245871-1' },
          { Iri: 'did:root' },
        ],
        [
          { Iri: 'did:b' },
          { Iri: 'http://purl.org/spar/cito/likes' },
          { Iri: 'isbn:978-0-06-245871-1' },
          { Iri: rootatt_iri },
        ],
        [
          { Iri: 'did:c' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:b' },
        ],
        [
          { Iri: 'did:c' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: 'did:root' },
        ],
        [
          { Iri: 'did:c' },
          { Iri: 'https://rdf.dock.io/alpha/2021#mayClaim' },
          { Iri: 'https://rdf.dock.io/alpha/2021#ANYCLAIM' },
          { Iri: rootatt_iri },
        ],
      ],
    );
  });

  test('graphResolver', async () => {
    const resolveGraph = graphResolver(ipfsClient, documentLoader);
    const initialfacts = await resolveGraph({ Iri: 'did:root' });
    expect(initialfacts).toEqual([
      [
        { Iri: 'did:root' },
        { Iri: 'https://rdf.dock.io/alpha/2021#attestsDocumentContents' },
        { Iri: 'ipfs://bafybeifrrafsw7gs7mwlzooxejrv6hljun46c7j4zfyc4mep3vn73zbkxa' },
        { Iri: 'did:root' },
      ],
    ]);
  });
});
