# Public Attestation

This feature should be considered *Alpha*.

[RFC](https://github.com/docknetwork/planning/blob/master/rfc/0014-public-attestation.md)

VCDM Verifiable credentials are a way to prove an *attestation*. Valid credentials prove statements of the form `Issuer claims X`, where `X` is itself a statement. One property of verifiable credentials is that the holder may keep them private simply by not sharing them with other parties. That property will be sometimes useful, sometimes not. VCDM crededentials are private and therefore not automatically discoverable but Public Attestations would give a decentralized identity the ability to post claims that *are* discoverable by any party. For Dock DIDs, attestations are linked on-chain but Public Attestations are not specicfic to Dock. Other DID methods can also implement public attestations by including them in DID documents.

Since RDF can represent, or link to, arbitrary types of data, Public Attestations can be used to publish arbitrary content.

## Data Model

Public Attestaions live in the DID document of their poster. A DID with a public attestation will have an extra property, "https://rdf.dock.io/alpha/2021#attestsDocumentContent". The value of that property is an IRI that is expected to point to an RDF document. Any statement contained in that document is considered to be a claim made by the DID.

If `DID attestsDocumentContent DOC` then for every statement `X` in `DOC` `DID claims X`.

The attestation crawler within the sdk currently supports two IRI schemes for pionting to attested documents: DIDs and ipfs links. DIDs are dereferenced and interpreted as [json-ld](https://www.w3.org/TR/json-ld/). Ipfs links are dereferenced and interpreted as [turtle](https://www.w3.org/TR/turtle/) documents.

### Example of A DID attesting to a document

`did:ex:ex`:

```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:ex:ex",
  "https://rdf.dock.io/alpha/2021#attestsDocumentContent": {
    "@id": "ipfs://Qmeg1Hqu2Dxf35TxDg19b7StQTMwjCqhWigm8ANgm8wA3p"
  }
}
```

Content of `ipfs://Qmeg1Hqu2Dxf35TxDg19b7StQTMwjCqhWigm8ANgm8wA3p`:

```turtle
<https://www.wikidata.org/wiki/Q25769>
  <https://www.wikidata.org/wiki/Property:P171>
  <https://www.wikidata.org/wiki/Q648422> .
```

From these documents we can derive two facts. The first is encodeded directly in the DID document.

Fact 1:

```turtle
# `did:ex:ed` attests to the content of `ipfs://Qmeg1..`
`<did:ex:ed> <https://rdf.dock.io/alpha/2021#attestsDocumentContent> <ipfs://Qmeg1..>
```

The second fact is infered. Since we know the content of `ipfs://Qmeg1..` we know that `ipfs://Qmeg1..` contains the statement `wd:Q25769 wd:Property:P171 wd:Q648422` (Short-eared Owl is in the genus "Asio"). `did:ex:ex` attests the document `ipfs://Qmeg1..` and `ipfs://Qmeg1..` states that the Short-eared Owl is in the genus "Asio", therefore:

Fact 2:

```turtle
# `did:ex:ex` claims that the Short-eared Owl is in the genus "Asio".
<https://www.wikidata.org/wiki/Q25769>
  <https://www.wikidata.org/wiki/Property:P171>
  <https://www.wikidata.org/wiki/Q648422>
  <did:ex:ex> .
```

### Example of A DID attesting to multiple documents

While it would be possible for other types of DID to include multiple attested IRIs in a single DID document, Dock artificially limits the number of attestation to one per Dock DID. This is to encourage off-chain (ipfs) data storage. If a DID wishes to attests to multiple documents, there are two suggested options: 1) merge the two documents into a single document or 2) attest to a single document which in turn notes an `attestsDocumentContents` for each other document.

`did:ex:ex`:

```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:ex:ex",
  "https://rdf.dock.io/alpha/2021#attestsDocumentContent": {
    "@id": "ipfs://Qmeg1Hqu2Dxf35TxDg19b7StQTMwjCqhWigm8ANgm8wA3p"
  }
}
```

`ipfs://Qmeg1Hqu2Dxf35TxDg19b7StQTMwjCqhWigm8ANgm8wA3p`:

```turtle
<did:ex:ex>
  <https://rdf.dock.io/alpha/2021#attestsDocumentContent>
  <ipfs://QmXoypizjW3WknFiJnLLwHCnL72vedxjQkDDP1mXWo6uco> . # document1
<did:ex:ex>
  <https://rdf.dock.io/alpha/2021#attestsDocumentContent>
  <ipfs://QmdycyxM3r882pHx3M63Xd8NUfsXoEmBnU8W6PgL9eY9cN> . # document2
```

## Uses

Two properties of RDF have the potential to supercharge Public Attestations.

1) It's a semantic knowlege representation, it can be [reasoned over](https://github.com/docknetwork/rify).
2) It's [queryable](https://en.wikipedia.org/wiki/SPARQL) in it's native form.

Via these properties the sdk implements a "Curious Agent". Pretty cool name, huh? The Curious Agent seeks out information. It starts with an initial kernel of knowlege and it follows a sense of curiosity, gradually building it's knowlege graph by dereferencing IRIs, stopping when it finds nothing new to be curious about. As it crawls, it reasons over the information it's found, deducing new facts, which may in turn spark new curiosity. The Curious Agent accepts it's curiosity as Sparql queries. The logical rules it uses to reason are also configurable, axioms are provided to the Agent as conjunctive if-then statements (like in [Claim Deduction](./concepts_claim_deduction.md)). Within the sdk, the Curious Agent is simply called `crawl()`.

The Curious Agent is sometimes refered to as "the crawler".

The use-case that drove implementation of the crawler is to search for [publicaly posted Delegation information](./concepts_public_delegation.md). As such, a bare minimum of functionality is implemented by `crawl()`. Want more? Consider contacting us.