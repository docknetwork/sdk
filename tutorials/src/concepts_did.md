# W3C DID

DID stands for Decentralized IDentifiers. DIDs are meant to be globally unique identifiers that allow their owner to
prove cryptographic control over them. The owner(s) of the DID is called the `controller`. The identifiers are not just assignable
to humans but to anything. Quoting the [DID spec](https://www.w3.org/TR/did-core/),

> A DID identifies any subject (e.g., a person, organization, thing, data model, abstract entity, etc.) that the controller
> of the DID decides that it identifies.

DIDs differ from public keys in that DIDs are persistent, i.e. a public key has to be changed if the private key is stolen/lost
or the cryptographic scheme of the public key is no longer considered safe. This is not the case with DIDs, they can remain
unchanged even when the associated cryptographic material changes. Moreover, a DID can have multiple keys and any of its
keys can be rotated. Additionally, depending on the scheme, public keys can be quite large (several hundred bytes in RSA)
whereas a unique identifier can be much smaller.

Each DID is associated with a `DID Document` that specifies the subject, the public keys, the authentication mechanisms usable
by the subject, authorizations the subject has given to others, service endpoints to communicate with the subject, etc,
for all properties that can be put in the DID Document, refer [this section of the spec](https://www.w3.org/TR/did-core/#core-properties).
DIDs and their associated DID Documents are stored on the DID registry which is a term used for the centralized on decentralized
database persisting the DID and its Document.

The process of discovering the DID Document for a DID is called DID resolution and the tool (library or a service) is called DID
resolver. To resolve the DID, the resolver first needs to check on which registry the DID is hosted and then decide whether it
is capable or willing to lookup that registry. The registry is indicated by the `DID method` of that DID. In addition to the
registry, the method also specifies other details of that DID like the supported operations, crypto, etc. Each DID method
defines its own specification, Docks's DID method spec is [here](https://github.com/docknetwork/dock-did-driver/blob/master/Dock%20DID%20method%20specification.md).
In case of Dock, the registry is the Dock blockchain, and the method is `dock`.
We support 2 kinds of DIDs, on-chain and off-chain.
With off-chain DIDs, only a reference to the DID Document is kept on chain and this reference can be an CID (for IPFS) or a URL or any
custom format.
With on-chain DIDs, the keys, controllers and service endpoints of the DID are stored on chain. A DID key can have 1 or more [verification
methods](https://www.w3.org/TR/did-core/#verification-relationships) which indicates what that key can be used for. Only a DID key with verification
relationship `capabilityInvocation` can update the DID document, i.e. add/remove keys, add/remove controllers,
add/remove service endpoints and remove the DID. Also a DID can have 1 or more controllers and these controllers can also
update its DID document. A DID with a key with `capabilityInvocation` verification relationship is its own controller.

An example on-chain Dock DID.
```
did:dock:5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW
```
Above DID has method `dock` and the DID identifier is `5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW`. Dock DID identifiers
are 32 bytes in size.

An example DID Document

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1"
  ],
  "id": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn",
  "controller": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn"
  ],
  "publicKey": [
    {
      "id": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1",
      "type": "Sr25519VerificationKey2020",
      "controller": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn",
      "publicKeyBase58": "7d3QsaW6kP7bGiJtRZBxdyZsbJqp6HXv1owwr8aYBjbg"
    },
    {
      "id": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-2",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn",
      "publicKeyBase58": "p6gb7WNh9SWC4hkye4VV5epo1LYpLXKH21ojfwJLayg"
    }
  ],
  "authentication": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1",
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-2"
  ],
  "assertionMethod": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1"
  ],
  "capabilityInvocation": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1"
  ]
}
```

Dock DIDs support multiple keys. The keys are present in the `publicKey` section. As per the above DID document, the DID `did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn`
has 2 public keys and 1 controller which is itself.
Note how that public key  is referred to using its `id` in `authentication`, `assertionMethod` and `capabilityInvocation` sections.
The above document states that the DID `did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn` can authenticate with 2 public keys
whose id is specified under `authentication`. When it attests to some fact (becomes issuer), it can only use 1 key, which is under `assertionMethod`.
The keys specified under `capabilityInvocation` can be used to update the DID document, i.e. add/remove keys, etc.

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1"
  ],
  "id": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn",
  "controller": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn",
    "did:dock:5Hc3RZyfJd98QbFENrDP57Lga8mSofDFwKQpodN2g2ZcYscz"
  ],
  "publicKey": [
    {
      "id": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1",
      "type": "Sr25519VerificationKey2020",
      "controller": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn",
      "publicKeyBase58": "7d3QsaW6kP7bGiJtRZBxdyZsbJqp6HXv1owwr8aYBjbg"
    },
    {
      "id": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-2",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn",
      "publicKeyBase58": "p6gb7WNh9SWC4hkye4VV5epo1LYpLXKH21ojfwJLayg"
    }
  ],
  "authentication": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1",
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-2"
  ],
  "assertionMethod": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1"
  ],
  "capabilityInvocation": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1"
  ]
}
```

In the above DID document, there are controllers, 1 is the DID `did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn` itself
and the other is `did:dock:5Hc3RZyfJd98QbFENrDP57Lga8mSofDFwKQpodN2g2ZcYscz`. This means that DID `did:dock:5Hc3RZyfJd98QbFENrDP57Lga8mSofDFwKQpodN2g2ZcYscz`
can also modify above DID document, i.e. add/remove keys, add/remove controller, etc.

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1"
  ],
  "id": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn",
  "controller": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn",
    "did:dock:5Hc3RZyfJd98QbFENrDP57Lga8mSofDFwKQpodN2g2ZcYscz"
  ],
  "publicKey": [
    {
      "id": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1",
      "type": "Sr25519VerificationKey2020",
      "controller": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn",
      "publicKeyBase58": "7d3QsaW6kP7bGiJtRZBxdyZsbJqp6HXv1owwr8aYBjbg"
    },
    {
      "id": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-2",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn",
      "publicKeyBase58": "p6gb7WNh9SWC4hkye4VV5epo1LYpLXKH21ojfwJLayg"
    }
  ],
  "authentication": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1",
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-2"
  ],
  "assertionMethod": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1"
  ],
  "capabilityInvocation": [
    "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#keys-1"
  ],
  "service": [
    {
      "id": "did:dock:5Hhnorjqd7vXPKdT7Y1ZpHksMBHsVRNewntZjMF2NHm3PoFn#linked-domain-1",
      "type": "LinkedDomains",
      "serviceEndpoint": [
        "https://foo.example.com"
      ]
    }
  ]
}
```

In the above document, there is also a service endpoint for the DID.

Another thing to keep in mind is that the keys associated with the Dock DID are independent of the keys used to send the
transaction on chain and pay fees. Eg. Alice might not have any tokens to write anything on chain but can still create a
DID and corresponding key and ask Bob who has tokens to register the DID on chain. Even though Bob wrote the DID on chain,
he cannot update or remove it since only Alice has the keys associated with that DID. Similarly, when Alice wants to update
the DID , it can create the update, sign it and send it to Carol this time to send the update on chain. Similar to blockchain
accounts, DIDs also have their own nonce which increments by 1 on each action of a DID. The nonce of a DID is set to the block number on
which its created and the DID is expected to send signed payloads, each with nonce 1 more than the previous nonce.
