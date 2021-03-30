import { alphaCrawl } from '../../src/crawl.js';
import { ANYCLAIM, MAYCLAIM, MAYCLAIM_DEF_1 } from '../../src/rdf-defs.js';
import { assertValidNode } from '../../src/utils/common.js';

const ATTESTS = 'https://rdf.dock.io/alpha/2021#attestsDocumentContents';
const LIKES = 'http://purl.org/spar/cito/likes';

describe('Crawler', () => {
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
    const resolveGraph = graphResolver({
      'did:root': [
        [{ Iri: 'did:b' }, { Iri: MAYCLAIM }, { Iri: ANYCLAIM }]
      ],
      'did:b': [
        [{ Iri: 'did:b' }, { Iri: ATTESTS }, { Iri: 'b:attestations' }]
      ],
      'b:attestations': [
        [{ Iri: 'did:c' }, { Iri: MAYCLAIM }, { Iri: ANYCLAIM }],
        [{ Iri: 'did:b' }, { Iri: LIKES }, { Iri: 'isbn:978-0-06-245871-1' }],
      ]
      // did:c makes no attestations
    });

    const initialFacts = await resolveGraph({ Iri: 'did:root' });
    let allFacts = await alphaCrawl(initialFacts, RULES, CURIOSITY, resolveGraph);
    expect(allFacts).toEqual(
      [
        [
          { Iri: "did:b" },
          { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
          { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
          { Iri: "did:root" },
        ],
        [
          { Iri: "did:b" },
          { Iri: "https://rdf.dock.io/alpha/2021#attestsDocumentContents" },
          { Iri: "b:attestations" },
          { Iri: "did:b" },
        ],
        [
          { Iri: "b:attestations" },
          { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
          { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
          { Iri: "did:b" },
        ],
        [
          { Iri: "did:b" },
          { Iri: "https://rdf.dock.io/alpha/2021#attestsDocumentContents" },
          { Iri: "b:attestations" },
          { Iri: "did:root" },
        ],
        [
          { Iri: "b:attestations" },
          { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
          { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
          { Iri: "did:root" },
        ],
        [
          { Iri: "did:c" },
          { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
          { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
          { Iri: "b:attestations" },
        ],
        [
          { Iri: "did:b" },
          { Iri: "http://purl.org/spar/cito/likes" },
          { Iri: "isbn:978-0-06-245871-1" },
          { Iri: "b:attestations" },
        ],
        [
          { Iri: "did:b" },
          { Iri: "http://purl.org/spar/cito/likes" },
          { Iri: "isbn:978-0-06-245871-1" },
          { Iri: "did:b" },
        ],
        [
          { Iri: "did:b" },
          { Iri: "http://purl.org/spar/cito/likes" },
          { Iri: "isbn:978-0-06-245871-1" },
          { Iri: "did:root" },
        ],
        [
          { Iri: "did:c" },
          { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
          { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
          { Iri: "did:b" },
        ],
        [
          { Iri: "did:c" },
          { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
          { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
          { Iri: "did:root" },
        ],
      ]
    );
  }, 100);
});


function graphResolver(sg) {
  async function resolveGraph(term) {
    assertValidNode(term);
    if (!('Iri' in term)) {
      return [];
    }
    const iri = term.Iri;
    if (!(iri in sg)) {
      // Some users may wish to customize what happens when a lookup fails
      // for example they may want to log an error, that is up to them.
      // Here we just return the empty graph.
      return [];
    }
    return sg[iri].map((triple) => [triple[0], triple[1], triple[2], { Iri: iri }]);
  }

  return resolveGraph;
}
