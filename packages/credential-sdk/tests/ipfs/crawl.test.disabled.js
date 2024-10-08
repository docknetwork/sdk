import { newEngine } from "@comunica/actor-init-sparql-rdfjs";
import { createHelia } from "helia";
import { strings } from "@helia/strings";
import {
  crawl,
  graphResolver,
  ANYCLAIM,
  MAYCLAIM,
  MAYCLAIM_DEF_1,
} from "../../dist/esm/rdf-and-cd";
import { documentLoader, addDocument } from "../utils/cached-document-loader";

const ipfsDefaultConfig = "http://127.0.0.1:5001";

const ATTESTS = "https://rdf.dock.io/alpha/2021#attestsDocumentContents";

const ipfsContent = {
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
  const cid = await ipfsClient.add(content);
  return `ipfs://${cid.toV1()}`;
}

describe("Crawler", () => {
  let ipfsClient;
  let rootattIri;
  let battIri;

  beforeAll(async () => {
    ipfsClient = strings(await createHelia(ipfsDefaultConfig));

    rootattIri = await ipfsAdd(ipfsClient, ipfsContent.rootatt);
    battIri = await ipfsAdd(ipfsClient, ipfsContent.batt);

    addDocument("did:root", {
      "@id": "did:root",
      [ATTESTS]: { "@id": rootattIri },
    });
    addDocument("did:b", {
      "@id": "did:root",
      [ATTESTS]: { "@id": battIri },
    });
  });

  test("happy path", async () => {
    const RULES = [
      ...MAYCLAIM_DEF_1,
      {
        if_all: [
          [
            { Unbound: "a" },
            { Bound: { Iri: ATTESTS } },
            { Unbound: "doc" },
            { Unbound: "a" },
          ],
        ],
        then: [
          [
            { Unbound: "doc" },
            { Bound: { Iri: MAYCLAIM } },
            { Bound: { Iri: ANYCLAIM } },
            { Unbound: "a" },
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
      (term, _err) => failedLookups.push(term)
    );
    const initialFacts = await resolveGraph({ Iri: "did:root" });
    const allFacts = await crawl(
      initialFacts,
      RULES,
      CURIOSITY,
      resolveGraph,
      newEngine()
    );
    expect(failedLookups).toEqual([{ Iri: "did:c" }]);
    expect(allFacts).toEqual([
      [
        { Iri: "did:root" },
        { Iri: "https://rdf.dock.io/alpha/2021#attestsDocumentContents" },
        { Iri: rootattIri },
        { Iri: "did:root" },
      ],
      [
        { Iri: rootattIri },
        { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
        { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
        { Iri: "did:root" },
      ],
      [
        { Iri: "did:b" },
        { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
        { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
        { Iri: rootattIri },
      ],
      [
        { Iri: "did:b" },
        { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
        { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
        { Iri: "did:root" },
      ],
      [
        { Iri: "did:root" },
        { Iri: "https://rdf.dock.io/alpha/2021#attestsDocumentContents" },
        { Iri: battIri },
        { Iri: "did:b" },
      ],
      [
        { Iri: "did:root" },
        { Iri: "https://rdf.dock.io/alpha/2021#attestsDocumentContents" },
        { Iri: battIri },
        { Iri: "did:root" },
      ],
      [
        { Iri: "did:root" },
        { Iri: "https://rdf.dock.io/alpha/2021#attestsDocumentContents" },
        { Iri: battIri },
        { Iri: rootattIri },
      ],
      [
        { Iri: battIri },
        { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
        { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
        { Iri: "did:b" },
      ],
      [
        { Iri: battIri },
        { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
        { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
        { Iri: "did:root" },
      ],
      [
        { Iri: battIri },
        { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
        { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
        { Iri: rootattIri },
      ],
      [
        { Iri: "did:c" },
        { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
        { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
        { Iri: battIri },
      ],
      [
        { Iri: "did:b" },
        { Iri: "http://purl.org/spar/cito/likes" },
        { Iri: "isbn:978-0-06-245871-1" },
        { Iri: battIri },
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
        { Iri: "did:b" },
        { Iri: "http://purl.org/spar/cito/likes" },
        { Iri: "isbn:978-0-06-245871-1" },
        { Iri: rootattIri },
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
      [
        { Iri: "did:c" },
        { Iri: "https://rdf.dock.io/alpha/2021#mayClaim" },
        { Iri: "https://rdf.dock.io/alpha/2021#ANYCLAIM" },
        { Iri: rootattIri },
      ],
    ]);
  });

  test("graphResolver", async () => {
    const resolveGraph = graphResolver(ipfsClient, documentLoader);
    const initialfacts = await resolveGraph({ Iri: "did:root" });
    expect(initialfacts).toEqual([
      [
        { Iri: "did:root" },
        { Iri: "https://rdf.dock.io/alpha/2021#attestsDocumentContents" },
        {
          Iri: "ipfs://bafkreiddpez3cqhuje7j3b3xwuhyydis5lzsihdavxnigejhtpnod6eiha",
        },
        { Iri: "did:root" },
      ],
    ]);
  });
});
