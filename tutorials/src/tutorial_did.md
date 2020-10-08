# DID

If you are not familiar with DIDs, you can get a conceptual overview [here](./concepts_did.md).

## Overview
DIDs in Dock are created by choosing a 32 byte unique (on Dock chain) identifier along with a public key. The public key
can be changed by providing a signature with the currently active key. The DID can also be removed by providing a signature
with the currently active key. As of now, a DID can have only one key at a time.
The chain-state stores a few things for a DID, the current public key, the controller and the block number when the DID was
last updated, so in the beginning the block number would be the one where the DID was created, when a DID's key is updated,
that block number is changed to the one in which the key got updated. This is done for replay protection as every
update (or removal) to the DID must include the last block number where the DID was updated and after each update the block
number changes, thus giving replay protection. This detail however is hidden in the API so the caller should not have to worry
about this.

## DID creation
Create a new random DID.
```js
import {createNewDockDID} from '@docknetwork/sdk/utils/did';

const did = createNewDockDID();
```

The DID is not yet registered on the chain. Before the DID can be registered, a public key needs to created as well.

## Public key creation
Dock supports 3 kinds of public keys, Sr25519, Ed25519 and EcdsaSecp256k1. These public keys are supported
through 3 classes, `PublicKeySr25519`, `PublicKeyEd25519` and `PublicKeySecp256k1` respectively. These 3 classes
extend from the same class called `PublicKey`. These can be instantiated directly by passing them as hex encoded bytes
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
1. First create a key detail object. The first argument of this function is a `PublicKey` and the second argument is
the controller. The controller is the DID that controls the public key and this can be the same as the DID being
registered.
    ```js
    import {createKeyDetail} from '@docknetwork/sdk/utils/did';
    const keyDetail = createKeyDetail(publicKey, did);
    ```
1. Now submit the transaction using a `DockAPI` object and the newly created DID `did` and `keyDetail`.
    ```js
    await dock.did.new(did, keyDetail);
    ```

## Fetching a DID from chain
To get a DID document, use `getDocument`
    ```js
    const result = await dock.did.getDocument(did);
    ```

## Updating an existing DID on chain
The public key or the controller of an on-chain DID can be updated by preparing a signed key update.
1. Create a new public key and fetch the current keypair to sign the key update message
    ```js
    // the current pair, its a sr25519 in this example
    const currentPair = dock.keyring.addFromUri(secretUri, null, 'sr25519');
    const newPk = // Using any of the above methods
    ```
1. The caller might directly create a signed key update
    ```js
    import {createSignedKeyUpdate} from '@docknetwork/sdk/utils/did';
    // If you do not wish to update the controller, don't pass `newController`
    const [keyUpdate, signature] = await createSignedKeyUpdate(dock.did, did, newPk, currentPair, newController);
    ```
1. In some cases the caller might not have the keypair like a hardware wallet or a remote signer, in that case, the caller
creates the key update message bytes with `createKeyUpdate` to pass to the signer and get the signature
    ```js
    import {createKeyUpdate} from '@docknetwork/sdk/utils/did';
    const keyUpdate = await createKeyUpdate(dock.did, did, newPk, newController);
    const signature = // Get the signature on `keyUpdate`
    ```
1. Now send the key update message with the signature to the chain in a transaction
    ```js
    await dock.did.updateKey(keyUpdate, signature);
    ```

## Removing an existing DID from chain
A DID can be removed from the chain by sending the corresponding message signed with the current key.
1. Fetch the current keypair to sign the DID removal message
    ```js
    // the current pair, its a sr25519 in this example
    const currentPair = dock.keyring.addFromUri(secretUri, null, 'sr25519');
    ```
1. The caller might directly create a signed message
    ```js
    import {createSignedDidRemoval} from '@docknetwork/sdk/utils/did';
    const [didRemoval, signature] = await createSignedDidRemoval(dock.did, dockDID, currentPair);
    ```
1. As mentioned above, in some cases the caller might not have the keypair, then he creates the removal message bytes
with `createKeyUpdate` to pass to the signer and get the signature
    ```js
    import {createDidRemoval} from '@docknetwork/sdk/utils/did';
    const didRemoval = await createDidRemoval(dock.did, did);
    const signature = // Get the signature on `didRemoval`
    ```
1. Now send the message with the signature to the chain in a transaction
   ```js
   await dock.did.remove(didRemoval, signature);
   ```


Note that they accounts used to send the transactions are independent of the keys associated with the DID. So the DID could
have been created with one account, updated with another account and removed with another account. The accounts are not relevant
in the data model and not associated with the DID in the chain-state.
