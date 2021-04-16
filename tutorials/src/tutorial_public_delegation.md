# Public Delegation

This feature should be considered *Alpha*.

Public Delegations use the same data model as Private Delegations. A delegator attests to some delegation. The verifier somehow gets and verifies that attestation then reasons over it in conjuction with a some credential. The difference is that while Private Delegations are passed around as credentials, Public Delegations are linked from the DID document of the delegator.

## Create a Delegation

It's assumed that the delegator already controls a DID. See the [tutorial on DIDs](./tutorial_did.md) for instructions on creating your own on-chain DID.

Like in the Private Delegation tutorial, let's assume a root authority, `did:ex:a`, wants to grant `did:ex:b` full authority to make claims on behalf of `did:ex:a`. `did:ex:a` will post an attestation delegating to `did:ex:b`.

<details>
<summary>Boilerplate</summary>

```js
import createClient from 'ipfs-http-client';
import { graphResolver } from '@docknetwork/sdk/crawl.js';
const { v4: uuidv4 } = require('uuid');

// A running ipfs node is required for crawling.
const ipfsUrl = 'http://localhost:5001';

function uuid() {
  return `uuid:${uuidv4()}`;
}

// Check out the Issuance, Presentation, Verification tutorial for info on signing
// credentials.
function signCredential(cred, issuer_secret) { ... }

// Check out the Issuance, Presentation, Verification tutorial for info on verifying
// VCDM presentations.
async function verifyPresentation(presentation) { ... }

// This function can be implemeted using setClaim().
// An example of setClaim() usage can be found here:
//  https://github.com/docknetwork/sdk/blob/master/tests/integration/did.test.js
async function setAttestation(did, didKey, iri) { ... }

// See the DID resolver tutorial For information about implementing a documentLoader.
const documentLoader = ...;

const ipfsClient = createClient(ipfsUrl);
const resolveGraph = graphResolver(ipfsClient, documentLoader);
```

</details>

Instead of a credential, the delegation will be expressed as a turtle document, posted on ipfs.

```turtle
@prefix dockalpha: <https://rdf.dock.io/alpha/2021#> .
<did:ex:b> dockalpha:mayClaim dockalpha:ANYCLAIM .
```

A link to this ipfs document is then added to the delegators DID document. For a Dock DID, this is done by submitting a transaction on-chain.

```js
await setAttestation(
  delegatorDid,
  delegatorSk,
  'ipfs://Qmeg1Hqu2Dxf35TxDg19b7StQTMwjCqhWigm8ANgm8wA3p'
);
```

## Issue a Credential as a Delegate

With Public Delegation, the delegate doesn't need to worry about the passing on delegation credentials to the holder. The delegations are already posted where the verifier can find them.

## Present a Delegated Credential

With Public Delegation the holder does not need to include a delegation chain when presenting their credential. From the holders perspective, the process of presenting a publically delegated credential is exactly the same as the [process for presenting a normal credential](./tutorial_ipv.md).

## Accept a Delegated Credential

The verifier accepts Publicly delegated credentials by merging the credential's claimgraph representation with publically posted delegation information, then reasoning over the result. Once found, the delegation information is also a claimgraph. The delegation information is found by [crawling the public attestation supergraph](./concepts_public_attestation.md#uses). Crawling is potentially slow, so when verification speed is important it should be done early on, like at program startup. Delegation information can be re-used across multiple credential verifications.

As with any Public Attestations, delegation information is revocable by removing the delegation attestation from the delegators DID doc. As such it is possible for cached delegation information to become out of date. Long running validator processes should devise a mechanism for invalidating out-of-date delegation information, such as re-crawing whenever a change is detected to the DID doc of a delegator (or sub-delegator). This tutorial does not cover invalidation of out-of-date delegations.

The following example shows how a verifier might

```js
import { ANYCLAIM, MAYCLAIM, MAYCLAIM_DEF_1 } from '@docknetwork/sdk/rdf-defs';
import { crawl } from '@docknetwork/sdk/crawl.js';
import { proveCompositeClaims, presentationToEEClaimGraph, inferh } from '@docknetwork/sdk/utils/cd';
import { merge } from '@docknetwork/sdk/utils/claimgraph';
import jsonld from 'jsonld';

// These logical rules will be used for reasoning during both crawing and verifiying
// credentials.
const RULES = [
  // Imports the definition of dockalpha:mayClaim from sdk
  ...MAYCLAIM_DEF_1,
  // Adds a custom rule stating that by attesting to a document the attester grants the
  // document full delegation authority.
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

// This query dictates what the crawler will be "curious" about. Any matches to
// `?lookupNext` will be dereferenced as IRIs. When an IRI is successfully dereferenced
// the resultant data is merged into the crawlers knowlege graph.
const CURIOSITY = `
  prefix dockalpha: <https://rdf.dock.io/alpha/2021#>

  # Any entity to which "did:ex:a" grants full delegation authority is interesting.
  select ?lookupNext where {
    graph <did:ex:a> {
      ?lookupNext dockalpha:mayClaim dockalpha:ANYCLAIM .
    }
  }
`;

// To spark the crawlers interest we'll feed it some initial knowlege about did:ex:a .
const initialFacts = await resolveGraph({ Iri: 'did:ex:a' });

// `allFact` contains our delegation information, it will be merged with verified
// credentials in order to reason over delegations
let allFacts = await crawl(initialFacts, RULES, CURIOSITY, resolveGraph);

// Now that we've obtained delegation information for `did:ex:a` we can verify credentials much
// like normal. The only difference is that we merge claimgraphs before reasoning over
// the verified credentials.
//
// `presentation` is assumed to be a VCDM presentation provided by a credential holder
let ver = await verifyPresentation(presentation);
if (!ver.verified) {
  throw ver;
}
const expPres = await jsonld.expand(presentation);
const presCg = await presentationToEEClaimGraph(expPres);
const cg = inferh(merge(presCg, allFacts), RULES);

// At this point all the RDF quads in `cg` are known to be true.
// doSomethingWithVerifiedData(cg);
```

More examples of `crawl()` usage can be found [here](https://github.com/docknetwork/sdk/blob/master/tests/integration/crawl.test.js) and [here](https://github.com/docknetwork/sdk/blob/master/tests/unit/crawl.test.js).
