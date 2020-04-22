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

An example Dock DID.
```
did:dock:5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW
```
Above DID has method `dock` and the DID identifier is `5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW`. Dock DID identifiers
are 32 bytes in size.

An example DID Document
```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:dock:5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW",
  "authentication": [
    "did:dock:5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW#keys-1"
  ],
  "assertionMethod": [
    "did:dock:5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW#keys-1"
  ],
  "publicKey": [
    {
      "id": "did:dock:5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW#keys-1",
      "type": "Sr25519VerificationKey2020",
      "controller": "did:dock:5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW",
      "publicKeyBase58": "8bEsU4JWBVVFQCdd8du7Txo6L3JHdJYQByHBqzL1WXwy"
    }
  ]
}
```
Note that Dock DIDs support only one key as of now. The key is present in the `publicKey` section. Note how that public key
is referred to using its `id` in `authentication` and `assertionMethod` sections. The above document states that the DID
`did:dock:5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW` authenticates with public key under `publicKey` and also when
it attests to some fact (becomes issuer), it uses that key. As there is only one public key supported for a DID, that
public key is used for both `authentication` and `assertionMethod`. When support for multiple keys is added, the DID can
specify which key(s) needs to be used for `authentication` and which ones for `assertionMethod`.

Another thing to keep in mind is that the keys associated with the Dock DID are independent of the keys used to send the
transaction on chain and pay fees. Eg. Alice might not have any tokens to write anything on chain but can still create a
DID and corresponding key and ask Bob who has tokens to register the DID on chain. Even though Bob wrote the DID on chain,
he cannot update or remove it since only Alice has the keys associated with that DID. Similarly, when Alice wants to update
the DID (public key or controller), it can create the update, sign it and send it to Carol this time to send the update on
chain.
