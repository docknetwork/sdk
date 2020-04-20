# Dock SDK

## Introduction
[Dock](https://dock.io) is a blockchain built using [Substrate](https://www.parity.io/substrate/) and uses [polkadot-js](https://github.com/polkadot-js/)
for interacting with the chain. The current version of Dock supports creating and managing DIDs compliant with the
[W3C spec](https://www.w3.org/TR/did-core) and verifiable credentials compliant with the
[Verifiable Credentials Data Model 1.0](https://www.w3.org/TR/vc-data-model/). This SDK is meant to build client-side or server side javascript applications.

## Installation
- Install from npm with `npm install @docknetwork/sdk` or `yarn add @docknetwork/sdk`
- Or clone from github and run
    1. `yarn install`
    1. `yarn build`

## Usage
Once the SDK has been installed, import the Dock API object as
```js
import { DockAPI } from '@docknetwork/sdk/api';
```

To construct the API object
```js
const dock = new DockAPI();
```

To make the API object connect to the node call `init` method. This method accepts the Websocket RPC endpoint of the node is
needed. Say you have it in `rpcEndpoint`. It also accepts a Polkadot-js keyring as well.
```js
await dock.init(rpcEndpoint, keyring);
```

To disconnect from the node
```js
await dock.disconnect();
```

To set the account used in sending the transaction and pay fees, call `setAccount` with the polkadot-js `account`
```js
// the `account` object might have been generated as
const account = dock.keyring.addFromUri(secretURI);
// Set the account to pay fees for transactions
dock.setAccount(account);
```

To get the account, call `getAccount`
```js
dock.getAccount();
```

To send a transaction, use the `sendTransaction` on the `DockAPI` object
```js
const res = await dock.sendTransaction(transaction);
```

For interacting with the DID module, i.e. creating, updating and removing them, get the `didModule` with `did` getter
```js
const didModule = dock.did;
```

Similarly, for the revocation module, get the `revocationModule` with `revocation` getter
```js
const revocationModule = dock.revocation;
```
