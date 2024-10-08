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
import {DockDid} from '@docknetwork/credential-sdk/types';

const did = DockDid.random();
```

The DID is not yet registered on the chain. Before the DID can be registered, a public key needs to created as well.

## Keypair creation
We can create a random `ed25519` keypair using `Ed25519Keypair` class.

```js
import {Ed25519Keypair} from '@docknetwork/credential-sdk/keypairs';

const kp = Ed25519Keypair.random();
```

The result pair can be used as following:

```javascript
const publicKey = kp.publicKey();
const privateKey = kp.privateKey();

const message = Uint8Array.from([1,2,3]);
const signature = kp.sign(message);
assert(Ed25519Keypair.verify(message, signature, publicKey));
```

## Registering a new DID on chain
Now that you have a DID and a public key, the DID can be registered on the Dock chain. Note that this public key associated
with DID is independent of the key used for sending the transaction and paying the fees.

### Self-controlled DIDs

In most cases, a DID will have its own keys and will control itself, i.e. a self-controlled DID. Following is an example of DID creation in this scenario.

1. First, create a `DidKeypair` object. The first argument is a DID reference and the second is the underlying keypair.

    ```js
    import { DidKeypair } from '@docknetwork/credential-sdk/keypair';

    const didKeypair = new DidKeypair([did, 1], kp);
    ```

2. Second, let's get a did key with verication relationship from the did's keypair. The only argument is
the verification relationship. A verification relationship can be 1 or more of these `authentication`, `assertion`, `capabilityInvocation` or `keyAgreement`

    ```js
    const didKey = didKeypair.didKey();
    ```

3. Now submit the transaction using a `DockAPI` object and the newly created DID `did` and `didKey`.
    ```js
    const document = DIDDocument.create(did, [didKey]);
    await dock.did.createDocument(document, didKeypair);
    ```

### Keyless DIDs

A DID might not have any keys and thus be controlled by other DIDs. Assuming a DID `did` already exists, it can register a
keyless DID `did2` as
  ```js
  const document = DIDDocument.create(did2);
  await dock.did.createDocument(document, didKeypair);
  ```

Moreover, a DID can have keys for certain functions like authentication but still be controlled by other DID(s).

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
    const newKp = Ed25519Keypair.random();
    ```
2. Now send the signed payload in a transaction to the chain in a transaction.
   In the arguments, the first `did` specifies that a key must be added to DID `did` and the second `did` specifies that DID `did` is signing the payload.
    ```js
    const document = await dock.did.getDocument(did);
    document.addKey([did, 2], newKp.didKey());
    await dock.did.updateDocument(document, didKeypair);
    ```

## Removing an existing DID from chain
A DID can be removed from the chain by sending the corresponding message signed with an appropriate key.
1. Now send the message with the signature to the chain in a transaction
   ```js
   dock.did.removeDocument(did, didKeypair)
   ```

For more details see example in `examples/dock-did.js` or the integration tests.


Note that they accounts used to send the transactions are independent of the keys associated with the DID.

So the DID could have been created with one account, updated with another account and removed with another account.

The accounts are not relevant in the data model and not associated with the DID in the chain-state.
