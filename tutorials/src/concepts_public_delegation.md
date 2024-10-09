# Public Delegation

This feature should be considered _Alpha_.

[RFC](https://github.com/docknetwork/planning/blob/master/rfc/0013-public-delegation.md)

We combine [Private Delegation](./concepts_private_delegation.md) and [Public Attestation](./concepts_public_attestation.md) to get Public Delegation.

When a delegation is attested via a credential, we call that a Private Delegation. As discussed in the [previous section](./concepts_public_attestation.md), attestations can be made in other ways. When a delegation is [attested publically](./concepts_public_attestation.md) we call it a Public Delegation.

Public Delegations remove the need for credential holders to manage and present delegation chains. With Public Delegations, credential verifiers may look up delegation information out-of-band.

Just like in [Private Delegation](./concepts_private_delegation.md), verified delegation information constitutes a knowlege graph that can be merged with the knowlege graph from a verified credential. The merged graphs are reasoned over to determine facts that are proven true.

## Example

Let's say there is trusted root issuer, `did:ex:root`. `did:ex:root` may delegate authority to make claims on behalf of `did:ex:root`. To do so, `did:ex:root` would attest to a claimgraph like this one:

`ipfs://Qmeg1Hqu2Dxf35TxDg19b7StQTMwjCqhWigm8ANgm8wA3p`:

```turtle
@prefix dockalpha: <https://rdf.dock.io/alpha/2021#> .
<did:ex:delegate1> dockalpha:mayClaim dockalpha:ANYCLAIM .
<did:ex:delegate2> dockalpha:mayClaim dockalpha:ANYCLAIM .
```

When `did:ex:root` attests to the above triples, the following dataset is true.

```turtle
@prefix dockalpha: <https://rdf.dock.io/alpha/2021#> .
<did:ex:delegate1> dockalpha:mayClaim dockalpha:ANYCLAIM <did:ex:root> .
<did:ex:delegate2> dockalpha:mayClaim dockalpha:ANYCLAIM <did:ex:root> .
```

`did:ex:root` may attests to `ipfs://Qmeg1Hq...` by adding the ipfs link to its DID document.

```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:ex:root",
  "https://rdf.dock.io/alpha/2021#attestsDocumentContent": {
    "@id": "ipfs://Qmeg1Hqu2Dxf35TxDg19b7StQTMwjCqhWigm8ANgm8wA3p"
  }
}
```

By modifying its DID document to include the ipfs link `did:ex:root` attests to the delegation publically.
