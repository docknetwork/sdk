# Private Delegation

Claim Deduction rules can express delegation of authority to issue credentials! It's expected to be a common enough use case that Dock has declared some rdf vocabulary and associated claim deduction rules aid potential delegators.

An issuer may grant delegation authority to another issuer simply by issuing them a vcdm credential. Let's say `did:ex:a` wants to grant delegation authority to `did:ex:b`. `did:ex:a` simply issues the credential saying that `did:ex:b` may make any claim.

```json
{
  "@context": [ "https://www.w3.org/2018/credentials/v1" ],
  "id": "urn:uuid:9b472d4e-492b-49f7-821c-d8c91e7fe767",
  "type": [ "VerifiableCredential" ],
  "issuer": "did:dock:a",
  "credentialSubject": {
    "id": "did:dock:b",
    "https://rdf.dock.io/alpha/2021#mayClaim": "https://rdf.dock.io/alpha/2021#ANYCLAIM"
  },
  "issuanceDate": "2021-03-18T19:23:24Z",
  "proof": { ... }
}
```

When `did:ex:b` wishes to issue a credential on behalf of `did:ex:a`, they should bundle it (e.g. in a presentation) with it this "delegation" credential. A delegation credential constitutes a proof of delegation. A proof of delegation bundled with a credential issued by the delegate can be prove that some statement[s] were made by authority of some root delegator.

In order to process delegated credentials a verifier accepts a bundle. The bundle includes both delegations and credentials issued by delegates. After verifying every credential within the bundle (including the delegations) the verifier uses [Claim Deduction](concepts_claim_deduction.md) to determine which statements are proven by the delegated credential.

Dock's delegation ontology (i.e. rdf vocabulary) and ruleset are currently in alpha. See [Private Delegation](tutorial_private_delegation.md) for an example of their use.
