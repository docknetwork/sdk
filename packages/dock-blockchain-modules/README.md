# `Dock` blockchain modules

A JavaScript library designed for handling the following elements on the Dock blockchain:

- Decentralized Identifiers (DIDs)
- Accumulators
- Anchors
- Blobs
- Support for public keys including BBS, BBS+, PS, Ed25519, Sr25519, and Secp256k1
- BBS/BBS+/PS parameters
- Status List credentials
- Trust Registries

## Install or build

- Run `yarn add @docknetwork/dock-blockchain-modules` or `npm install @docknetwork/dock-blockchain-modules` to install the package from npm
- When building from source:
  - Run `yarn` to install the dependencies
  - Run `yarn build` to create a distribution version.

## Documentation

Have a look at the [concepts and tutorials](https://docknetwork.github.io/sdk/tutorials). These are generated from markdown
present over [here](./tutorials/src). Files prefixed with `concepts` describe the concepts and files prefixed with
`tutorials` have a tutorial on using the API.
Checkout the [API reference](https://docknetwork.github.io/sdk/reference)

## Examples

The example scripts present in [example directory](./example) are meant to demonstrate a complete feature. The following
commands demonstrate different features.

## Connecting

Use Dock's substrate node: https://github.com/docknetwork/dock-substrate

Running dev node:

```
yarn dev-node
```

**Use the `mainnet` tag of this repo when interacting with mainnet as the `master` branch isn't guaranteed to be mainnet compatible.**

## Test and example Configuration

Configuration variables like websocket endpoint for node `FullNodeEndpoint`, URI for account to pay for extrinsics `TestAccountURI`
and keyring type `TestKeyringType` can be set as environment variables (or in an .env file). If they are not set, default values as
specified in file [test-constants.js](./tests/test-constants.js) are used.
The scripts read parameters from `.env` file. The available parameters are shown in an example env file [env_example](env_example)

## Test

Run tests with `yarn test` (required node to be running).

You can run tests against a temporary node in docker like so:

```
yarn test-with-node
```

## Linting and type checking

We use JSDoc and TypeScript for static type checking during the CI process. PRs must pass linting and type checking to be accepted.
You can run via: `yarn lint --fix` and `yarn type-check`
