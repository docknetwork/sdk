# Public Delegation

This feature should be considered *Alpha*.

We combine [Private Delegation](./concepts_private_delegation.md) and [Public Attestation](./concepts_public_attestation.md) to get Public Delegation.

When a delegation is attested via a credential, we call that a Private Delegation. As discussed in the [previous section](./concepts_public_attestation.md), attestations can be made in other ways. When a delegation is [attested publically](./concepts_public_attestation.md) we call it a Public Delegation.

Public Delegations remove the need for credential holders to manage and present delegation chains. With Public Delegations, credential verifiers may look up delegation information out-of-band.

Just like in [Private Delegation](./concepts_private_delegation.md), verified delegation information constiutes a knowlege graph that can be merged with the knowlege graph from a verified credential. The merged graphs are reasoned over to determine which facts are proven true.

## Example

Lets say there is trusted root issuer, `did:ex:root`. `did:ex:root` may delegate authority to make claims on behalf of `did:ex:root`. To do so, `did:ex:root` would attest to a claimgraph like this:

```turtle
<did:ex:root>
```

`did:ex:root` attests to this claimgraph publically by adding the above turtle document to ipfs and setting the `https://rdf.dock.io/alpha/2021#attestsDocumentContents` property of their DID within their DID document. For Dock DIDs, this is done by [setting the attestation for the DID](https://github.com/docknetwork/sdk/blob/61cbaaf61e11cc8cc57d8582095bffafecd794b9/src/modules/did.js#L94) on-chain.
