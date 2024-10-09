# @docknetwork/cheqd-blockchain-modules

A JavaScript library created for managing credential SDK components such as DIDs and accumulators etc on the Cheqd blockchain.

## Setup

Before using any module on the Cheqd blockchain, the initial setup is required to configure the necessary API connections and cryptographic elements. This setup is shared across all modules to ensure seamless interoperability and efficient management of Decentralized Identifiers (DIDs) and attestations.

### Initialization

```javascript
import { CheqdAPI } from '@docknetwork/cheqd-blockchain-api';
import { CheqdTestnetDid } from '@docknetwork/credential-sdk/types';
import { Ed25519Keypair, DidKeypair } from '@docknetwork/credential-sdk/keypairs';

// Initialize the Cheqd API connection
const cheqd = new CheqdAPI();
await cheqd.init(...);

// Create a random DID on the Cheqd Testnet
const did = CheqdTestnetDid.random();

// Generate a random Ed25519 keypair
const keyPair = Ed25519Keypair.random();

// Create a DidKeypair using the generated DID and keypair
const didKeypair = new DidKeypair([did, 1], keyPair);
```

## DID

The `CheqdDIDModule` handles Decentralized Identifiers (DIDs) specifically on the Cheqd blockchain network. By extending from `AbstractDIDModule`, it utilizes Cheqd-specific functionalities to manage DID documents effectively.

### Example

```javascript
import { CheqdDIDModule } from "@docknetwork/cheqd-blockchain-modules";

// Initialize the DID module using the shared setup
const didModule = new CheqdDIDModule(cheqd);

// Create a DID document
const document = DIDDocument.create(did, [didKeypair.didKey()]);

// Create the DID document on the blockchain
await didModule.createDocument(document, didKeypair);

// Validate that the created document matches the expected JSON
expect((await didModule.getDocument(did)).toJSON()).toEqual(document.toJSON());
```

## Attest

The `CheqdAttestModule` is a specialized extension of the `AbstractAttestModule` focused on managing attestations for Decentralized Identifiers (DIDs) on the Cheqd network.

### Example

```javascript
import { CheqdDIDModule } from "@docknetwork/cheqd-blockchain-modules";

// Initialize the Attest module using the shared setup
const attestModule = new CheqdAttestModule(cheqd);

// Define an Intersected Resource Identifier (IRI) for testing
const iri = "test";

// Set a claim for the given DID and DID keypair
await attestModule.setClaim(iri, did, didKeypair);

// Verify that the attestations on the document match the expected IRI
expect((await attestModule.getDocument(did)).attests.toJSON()).toEqual(iri);
```

## TODO:

- Accumulator
- Anchor
- Blob
- OffchainSignatures
- BBS
- BBSPlus
- PS
- StatusListCredential
- TrustRegistry
