# Utility for offline signing

## NOTE: THIS UTILITY IS USING A DEPRECATED PACKAGE AND IS PROBABLY OBSOLETE. WE WILL BE UPDATING IT SHORTLY TO BE FUNCTIONAL AGAIN

Signing a transaction requires having certain data like nonce, recent block, genesis, etc which needs to be fetched from the chain.
This means the signing code needs to connect to the network so that it can reach the node. The utilities here let you supply such data
manually. For a working example, check [this example script](../../example/offlinesigning.js) which is configured to work with the dev node.

## Prerequisites

To sign a transaction, chain information like spec name, spec version, genesis, metadata, etc are needed.

The chain information for mainnet, testnet and dev node is kept [here](./constants.js). Most of the fields are immutable,
but `specVersion` and `transactionVersion` will change as they change on the chain.

The metadata for 3 chains, dev, test and main are kept as json files and when chain upgrades the metadata must be changed also.
The metadata can be fetched from the node as `curl -H "Content-Type: application/json" -d '{"id":1, "jsonrpc":"2.0", "method": "state_getMetadata"}' http://localhost:9933/`. Here `http://localhost:9933/` is the TCP endpoint of the node.

## API

To create a signed transfer, there are 3 steps:

1. Create the registry object with the correct chain info and metadata

    ```js
    const registry = new Registry({ chainInfo, metadata });
    ```

1. Get the latest account nonce, block number, block hash and create the transfer txn

    ```js
    const txn = buildTransferTxn({
        from, to, value, tip, nonce, eraPeriod, blockNumber, blockHash, registry,
      });
    ```

1. Get the keypair or create a keyring and get the secret key/URI and sign the transaction

    ```js
    const signedTxn = await signTxn({
      keyring, secretUri, unsignedTxn: txn.unsignedTxn, signingPayload: txn.signingPayload, registry,
    });
    ```

  `signedTxn` can now be sent to the network using api-sidecar or similar tools.

1. Decode signed txn

    ```js
    const decoded = decodeSignedTxn(signedTxn, registry);
    ```
