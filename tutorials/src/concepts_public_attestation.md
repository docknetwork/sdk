# Public Attestation

This feature should be considered *Alpha*.

[RFC](https://github.com/docknetwork/planning/blob/master/rfc/0014-public-attestation.md)

VCDM Verifiable credentials are a way to prove an *attestation*. Valid credentials prove statements of the form `Issuer claims X`, where `X` is itself a statement. One property of verifiable credentials is that the holder may keep them private simply by not sharing them with other parties. That property will be sometimes useful, sometimes not. VCDM crededentials are private and therefore not automatically discoverable but Public Attestations would give a decentralized identity the ability to post claims that *are* discoverable by any party. For Dock DIDs, attestations are linked on-chain but Public Attestations are not specicfic to Dock. Other DID methods can also implement public attestations by including them in DID documents.

Since RDF can represent, or link to, arbitrary types of data, Public Attestations can be used to publish arbitrary content.

## Data Model

Public Attestaion live in the DID document of their poster. A DID with a public attestation will have an extra property, "https://rdf.dock.io/alpha/2021#attestsDocumentContent". The value of that property is an IRI that is expected to point to an RDF document. Any statement contained in that document is considered to be a claim made by the DID.

If `DID attestsDocumentContent DOC` then for every statement `X` in `DOC` `DID claims X`.

The attestation crawler within the sdk currently supports two IRI schema for use as attestation documents: DIDs and ipfs links. DIDs are dereferenced and interpreted as [json-ld](https://www.w3.org/TR/json-ld/). Ipfs links are dereferenced and interpreted as [turtle](https://www.w3.org/TR/turtle/) documents.

## Uses

Two properties of RDF have the potential to supercharge Public Attestations.

1) It's a semantic knowlege representation, it can be [reasoned over](https://github.com/docknetwork/rify).
2) It's [queryable](https://en.wikipedia.org/wiki/SPARQL) in it's native form.

Via these properties the sdk implements a "Curious Agent". Pretty cool name, huh? The Curious Agent seeks out information. It starts with an initial kernel of knowlege and it follows a sense of curiosity, gradually building it's knowlege graph, stopping when it find nothing new to be curious about. As it crawls, it reasons over the information it's found, deducing new facts, which may spark new curiosity. The Curious Agent accepts it's curiosity as Sparql queries. The Agents ability to reason is also configurable, axioms are provided to the Agent as conjunctive logical rules. Within the sdk, the Curious Agent is simply called `crawl()`.

The Curious Agent is sometimes refered to as "the crawler".

The crawler's driving use-case is to search for [publicaly posted Delegation information](./concepts_public_delegation.md). As such, a bare minimum of functionality is implemented. Want more? Consider contacting us.
