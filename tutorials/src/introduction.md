# Intro
[Dock](https://dock.io) is a blockchain built using [Substrate](https://www.parity.io/substrate/) to facilitate the use of [Verifiable Credentials Data Model 1.0](https://www.w3.org/TR/vc-data-model/) compliant documents, creating/managing [W3C spec](https://www.w3.org/TR/did-core) compliant DIDs and more. The client SDK contains a library and tooling to interact with the Dock chain and also other things such as verifying and issuing credentials. View the video verison of this tutorial here: https://www.youtube.com/watch?v=jvgn9oSXBDQ 

# Pre-requisites for these tutorials
For these tutorials we will be a running our own local development node. Instructions to do this can be found at the [dock substrate repository](https://github.com/docknetwork/dock-substrate). Once you have followed the instructions and have your local node running, you can continue. Please note that you don't always need a node to use the Dock SDK, but certain features rely on it.

# Installation
Installation of the SDK is pretty simple, we use NPM and our source is also available at GitHub (links below). To install via NPM or Yarn, run either `npm install @docknetwork/sdk` or `yarn add @docknetwork/sdk` respectively. Once the package and dependencies are installed, you can import it like any ES6/CJS module. You can find the complete source for the SDK at https://github.com/docknetwork/sdk and the tutorials at https://github.com/docknetwork/dock-tutorials.

# Importing
In this tutorial series we will be using NodeJS with babel for ES6 support, however the same code should work in browsers too once it is transpiled. To begin with, we should import the Dock SDK. Importing the default reference will give us a DockAPI instance. With this we will communicate with the blockchain. You can also import the DockAPI class instanciate your own objects if you prefer. Simply do:
```javascript
// Import the dock SDK
import dock from '@docknetwork/sdk';
```

We will add one more import here for some shared constants across each tutorial, just the node address and account secret:
```javascript
// Import some shared variables
import { address, secretUri } from './shared-constants';
```

Lets also create this file, creating `shared-constants.js` with the contents:
```javascript
export const address = 'ws://localhost:9944'; // Websocket address of your Dock node
export const secretUri = '//Alice'; // Account secret in uri format, we will use Alice for local testing
```

# Connecting to a node
With the required packages and variables imported, we can go ahead and connect to our node. If you don't have a local testnet running alraedy, go to https://github.com/docknetwork/dock-substrate and follow the steps in the readme to start one. You could use the Dock testnet given a proper account with enough funds. First, create a method named `connectToNode` with an empty body for now:
```javascript
export async function connectToNode() {

}
```

Before working with the SDK, we need to initialize it. Upon initialization the SDK will connect to the node with the supplied address and create a keyring to manage accounts. Simply call `dock.init` and wait for the promise to resolve to connect to your node:
```javascript
// Initialize the SDK and connect to the node
await dock.init({ address });
console.log('Connected to the node and ready to go!');
```

# Creating an account
In order to write to the chain we will need to set an account. We can perform read operations with no account set, but for our purposes we will need one. Accounts can be generated using the `dock.keyring` object through multiple methods such as URI, memonic phrase and raw seeds. See the polkadot keyring documentation (https://polkadot.js.org/api/start/keyring.html) for more information.

We will use our URI secret of `//Alice` which was imported from `shared-constants.js` to work with our local testnet. Add this code after `dock.init`:
```javascript
// Create an Alice account for our local node
// using the dock keyring. You don't -need this
// to perform some read operations.
const account = dock.keyring.addFromUri(secretUri);
dock.setAccount(account);

// We are now ready to transact!
console.log('Connected to the node and ready to go!');
```

If all has gone well, you should be able to run this script and see that you are connected to the node. If any errors occur, the promise will fail and they will be outputted to the console.

# Basic usage
To construct your own API object, once the SDK has been installed, import the Dock API object as
```js
import { DockAPI } from '@docknetwork/sdk/api';
const dock = new DockAPI();
```

To make the API object connect to the node call `init` method. This method accepts the Websocket RPC endpoint of the node is
needed. Say you have it in `address`. It also accepts a Polkadot-js keyring as well.
```js
await dock.init({ address, keyring });
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

To send a transaction, use the `signAndSend` on the `DockAPI` object
```js
const res = await dock.signAndSend(transaction);
```

For interacting with the DID module, i.e. creating, updating and removing them, get the `didModule` with `did` getter
```js
const didModule = dock.did;
```

Similarly, for the revocation module, get the `revocationModule` with `revocation` getter
```js
const revocationModule = dock.revocation;
```
