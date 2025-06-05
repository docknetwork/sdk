# Introduction

The client SDK packages include an API-agnostic library for verifying and issuing credentials, as well as modules to simplify API interaction.

Currently, two blockchains are supported:

- [Dock](https://dock.io) is a blockchain built on [Substrate](https://www.parity.io/substrate/). It facilitates the use of [Verifiable Credentials Data Model 1.0](https://www.w3.org/TR/vc-data-model/) compliant documents and the creation/managing of [W3C spec](https://www.w3.org/TR/did-core) compliant DIDs, among other things.
- [Cheqd](https://cheqd.io/) is a blockchain built with the [Cosmos SDK](https://docs.cosmos.network/). It provides the trust and payment infrastructure necessary for the creation of Self-Sovereign Identity (SSI), eID, and digital credential ecosystems.

Overall, there're five packages located in the [GitHub repository](https://github.com/docknetwork/sdk):

- [`@docknetwork/credential-sdk`](https://github.com/docknetwork/sdk/tree/master/packages/credential-sdk) - An API-agnostic Javascript library for working with Verifiable Credentials, DIDs, Claim Deduction, and more.
- [`@docknetwork/cheqd-blockchain-api`](https://github.com/docknetwork/sdk/tree/master/packages/cheqd-blockchain-api) - A Javascript library built atop of `@cheqd/sdk` that allows to interact with the `Cheqd` blockchain.
- [`@docknetwork/cheqd-blockchain-modules`](https://github.com/docknetwork/sdk/tree/master/packages/cheqd-blockchain-modules) - A JavaScript library created for managing credential SDK components such as DIDs, accumulators etc on the Cheqd blockchain.

# Truvera Credential SDK

## Installation

Installing the SDK is straightforward. We use NPM, and the source is also available on GitHub (links below). To install via NPM or Yarn, run:

```bash
npm install @docknetwork/credential-sdk @docknetwork/dock-blockchain-modules @docknetwork/dock-blockchain-api
```

or

```bash
yarn add @docknetwork/credential-sdk @docknetwork/dock-blockchain-modules @docknetwork/dock-blockchain-api
```

Once the package and dependencies are installed, you can import it as an ES6/CJS module. The complete source for the SDK can be found at [GitHub](https://github.com/docknetwork/sdk) along with [tutorials](https://github.com/docknetwork/dock-tutorials).

## Running a Node

The simplest way to run a node is to use the script provided by the [GitHub repository](https://github.com/docknetwork/sdk). It requires Docker to be installed.

```bash
bash scripts/run_dock_node_in_docker
```

## Importing

In this tutorial series, we will use Node.js with Babel for ES6 support. This code will also work in browsers once transpiled. To start, import the Truvera Credential SDK. You can import the `DockAPI` class and instantiate your object:

```javascript
// Import the Truvera Credential SDK
import { DockAPI } from "@docknetwork/dock-blockchain-api";

const dock = new DockAPI();
```

We will also import shared constants across each tutorial, such as the node address and account secret:

```javascript
// Import shared variables
import { address, secretUri } from "./shared-constants";
```

Create the `shared-constants.js` file with the following contents:

```javascript
export const address = "ws://localhost:9944"; // WebSocket address of your Dock node
export const secretUri = "//Alice"; // Account secret in URI format, for local testing
```

## Connecting to a Node

With the required packages and variables imported, we can connect to our node. If you don't have a local testnet running, go to [Docker Substrate](https://github.com/docknetwork/dock-substrate) for setup instructions. You could also use the Truvera testnet if you have an account with sufficient funds. Begin by creating the following method:

```javascript
export async function connectToNode() {}
```

Initialize the SDK to connect to the node with the supplied address and create a keyring to manage accounts:

```javascript
// Initialize the SDK and connect to the node
await dock.init({ address });

console.log("Connected to the node and ready to go!");
```

## Creating an Account

To write to the chain, you need to set up an account. Read operations are possible without an account, but for our examples, you'll need one. Accounts can be generated using the `dock.keyring` object with methods such as URI, mnemonic phrase, and raw seed. For more details, see the [Polkadot keyring documentation](https://polkadot.js.org/api/start/keyring.html).

Use the URI secret `//Alice` for local testnet work. Add this code after `dock.init`:

```javascript
// Create an Alice account for our local node using the dock keyring.
const account = dock.keyring.addFromUri(secretUri);

dock.setAccount(account);

// Ready to transact
console.log("Account set and ready to go!");
```

## Basic Usage

To make the API object connect to the node, call the `init` method with the WebSocket RPC endpoint of the node:

```js
await dock.init({ address });
```

Disconnect from the node with:

```js
await dock.disconnect();
```

Set the account to send transactions and pay fees:

```js
const account = dock.keyring.addFromUri(secretUri);
dock.setAccount(account);
```

Retrieve the account:

```js
dock.getAccount();
```

Send a transaction using `signAndSend`:

```js
const res = await dock.signAndSend(transaction);
```

Instantiate Truvera modules with `DockCoreModules`:

```js
import { DockCoreModules } from "@docknetwork/dock-blockchain-modules";
const dockModules = new DockCoreModules(dock);
```

For the DID module:

```js
const didModule = dockModules.did;
```

For the accumulator module:

```js
const accumulator = dockModules.accumulator;
```

# Cheqd

## Installation

As with Truvera, the process is simple. Use NPM to install:

```bash
npm install @docknetwork/credential-sdk @docknetwork/cheqd-blockchain-modules @docknetwork/cheqd-blockchain-api
```

or Yarn:

```bash
yarn add @docknetwork/credential-sdk @docknetwork/cheqd-blockchain-modules @docknetwork/cheqd-blockchain-api
```

The complete source for the SDK is available at [GitHub](https://github.com/docknetwork/sdk) and tutorials at [GitHub Tutorials](https://github.com/docknetwork/dock-tutorials).

## Running a Node

Use the provided script, requiring Docker:

```bash
CHEQD_MNEMONIC="steak come surprise obvious remain black trouble measure design volume retreat float coach amused match album moment radio stuff crack orphan ranch dose endorse" bash scripts/run_cheqd_node_in_docker
```

## Importing

Similarly, use Node.js with Babel and import the Cheqd SDK:

```javascript
// Import the Cheqd SDK
import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";

const cheqd = new CheqdAPI();
```

Import shared constants:

```javascript
import { url, mnemonic } from "./shared-constants";
```

Create `shared-constants.js`:

```javascript
export const url = "http://localhost:26657"; // RPC URL of your Cheqd node
export const mnemonic =
  "steak come surprise obvious remain black trouble measure design volume retreat float coach amused match album moment radio stuff crack orphan ranch dose endorse"; // Mnemonic for testing
```

## Connecting to a Node

Initialize and connect to the node using the SDK:

```javascript
await cheqd.init({ url, mnemonic });

console.log("Connected to the node and ready to go!");
```

Disconnect from the node:

```js
await cheqd.disconnect();
```

Send a transaction:

```js
const res = await cheqd.signAndSend(transaction);
```

Instantiate Cheqd modules:

```js
import { CheqdCoreModules } from "@docknetwork/cheqd-blockchain-modules";
const cheqdModules = new CheqdCoreModules(cheqd);
```

For interacting with the DID module:

```js
const didModule = cheqdModules.did;
```

For the accumulator module:

```js
const accumulator = cheqdModules.accumulator;
```
