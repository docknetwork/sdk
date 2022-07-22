# DID

If you are not familiar with DIDs, you can get a conceptual overview [here](./concepts_did.md).

## Overview
DIDs in Dock are created by choosing a 32 byte unique (on Dock chain) identifier along with 1 ore more public keys or controllers.
The public key can be added or removed by the DID's controller (which the DID maybe itself) signature with a key having
`capabilityInvocation` verification relationship.

The DID can also be removed by providing a signature from the DID's controller.

The chain-state stores a few things for a DID, the active public keys, the controllers, service endpoints and the current nonce
of the DID. The nonce starts as the block number where the DID was created and each subsequent action like adding/removing a key
for itself or any DID it controls, adding a blob, etc should supply a nonce 1 higher than the previous one.

This is done for replay protection but this detail however is hidden in the API so the caller should not have to worry about this.

## DID creation
Create a new random DID.
```js
import {createNewDockDID} from '@docknetwork/sdk/utils/did';

const did = createNewDockDID();
```

The DID is not yet registered on the chain. Before the DID can be registered, a public key needs to created as well.

## Public key creation
Dock supports 3 kinds of public keys, Sr25519, Ed25519 and EcdsaSecp256k1. These public keys are supported
through 3 classes, `PublicKeySr25519`, `PublicKeyEd25519` and `PublicKeySecp256k1` respectively.

These 3 classes extend from the same class called `PublicKey`. These can be instantiated directly by passing them as hex
encoded bytes.

```js
import {PublicKeySr25519, PublicKeyEd25519, PublicKeySecp256k1} from '@docknetwork/sdk/api';

const pk1 = new PublicKeySr25519(bytesAsHex);
const pk2 = new PublicKeyEd25519(bytesAsHex);
const pk3 = new PublicKeySecp256k1(bytesAsHex);
```

Or they can be created by first creating a keyring
```js
import {PublicKeySr25519, PublicKeyEd25519} from '@docknetwork/sdk/api';

// Assuming you had a keyring, you can create keypairs or used already created keypairs
const pair1 = keyring.addFromUri(secretUri, someMetadata, 'ed25519');
const pk1 = PublicKeyEd25519.fromKeyringPair(pair1);

const pair2 = keyring.addFromUri(secretUri2, someMetadata, 'sr25519');
const pk2 = PublicKeySr25519.fromKeyringPair(pair2);

```

Polkadot-js keyring does not support ECDSA with secp256k1 so there is a function `generateEcdsaSecp256k1Keypair` that
takes some entropy and generate a keypair.
```js
import { generateEcdsaSecp256k1Keypair } from '@docknetwork/sdk/utils/misc';
import {PublicKeySecp256k1} from '@docknetwork/sdk/api';
// The pers and entropy are optional but must be used when keys need to be deterministic
const pair3 = generateEcdsaSecp256k1Keypair(pers, entropy);
const pk3 = PublicKeySecp256k1.fromKeyringPair(pair3);
```

Or you can directly pass any of the above keypairs in the function `getPublicKeyFromKeyringPair` and it will return an
object of the proper child class of `PublicKey`
```js
import { getPublicKeyFromKeyringPair } from '@docknetwork/sdk/utils/misc';
const publicKey = getPublicKeyFromKeyringPair(pair);
```

## Registering a new DID on chain
Now that you have a DID and a public key, the DID can be registered on the Dock chain. Note that this public key associated
with DID is independent of the key used for sending the transaction and paying the fees.
1. First create a `DidKey` object. The first argument of this function is a `PublicKey` and the second argument is
the verification relationship. A verification relationship can be 1 or more of these `authentication`, `assertion`, `capabilityInvocation` or `keyAgreement`

    ```js
    import { DidKey, VerificationRelationship } from '@docknetwork/sdk/public-keys';
    const didKey = new DidKey(publicKey, new VerificationRelationship());
    ```
1. Now submit the transaction using a `DockAPI` object and the newly created DID `did` and `didKey`.
    ```js
    await dock.did.new(did, [didKey], []);
    ```

## Fetching a DID from chain
To get a DID document, use `getDocument`
    ```js
    const result = await dock.did.getDocument(did);
    ```

## Adding a key to an existing DID
A DID's controller can add a public key to an on-chain DID by preparing a signed payload. Each new key is given a number key index
which 1 is greater than the last used index. Key indices start from 1.
1. Create a new public key and use the current keypair to sign the message
    ```js
    // the current pair, its a sr25519 in this example
    const currentPair = dock.keyring.addFromUri(secretUri, null, 'sr25519');
    const newPk = // Using any of the above methods
    ```
1. The caller might directly create a signed key update
    ```js
    const vr = new VerificationRelationship();
    // This new key can only be used for issuance.
    vr.setAssertion();
    const newDidKey = new DidKey(newPk, vr);
    ```
1. Now send the signed payload in a transaction to the chain in a transaction.
   In the arguments, the first `did` specifies that a key must be added to DID `did` and the second `did` specifies that DID `did` is signing the payload
   The `1` below is for the key index.
    ```js
    dock.did.addKeys([newDidKey], did, did, currentPair, 1, undefined, false);
    ```

## Removing an existing DID from chain
A DID can be removed from the chain by sending the corresponding message signed with an appropriate key.
1. Fetch the current keypair to sign the DID removal message
    ```js
    // the current pair, its a sr25519 in this example
    const currentPair = dock.keyring.addFromUri(secretUri, null, 'sr25519');
    ```
1. Now send the message with the signature to the chain in a transaction
   ```js
   dock.did.remove(did, did, pair, 1)
   ```

For more details see example in `examples/dock-did.js` or the integration tests.


Note that they accounts used to send the transactions are independent of the keys associated with the DID.

So the DID could have been created with one account, updated with another account and removed with another account.

The accounts are not relevant in the data model and not associated with the DID in the chain-state.
