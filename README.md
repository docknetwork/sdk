# Dock Client SDK

A JavaScript SDK built ontop of PolkadotJS for interaction with the Dock Substrate node and testnet.

## Install or build
- Run `yarn add @docknetwork/sdk` or `npm install @docknetwork/sdk` to install the package from npm
- When building from source:
    - Run `yarn` to install the dependencies
    - Run `yarn build` to create a distribution version.

![Build Status](https://github.com/docknetwork/client-sdk/workflows/CI/badge.svg "Build Status")

## Documentation
Have a look at the [concepts and tutorials](https://docknetwork.github.io/sdk/tutorials). These are generated from markdown
present over [here](./tutorials/src). Files prefixed with `concepts` describe the concepts and files prefixed with
`tutorials` have a tutorial on using the API.
Checkout the [API reference](https://docknetwork.github.io/sdk/reference)


## Examples
The example scripts present in [example directory](./example) are meant to demonstrate a complete feature. The following
commands demonstrate different features.
- Run example to create a new DID, register it, update its key and remove the DID.
    ```
    yarn dock-did-example
    ```

- Run example to resolve DID
    ```
    yarn did-resolver-example
    ```

- Run example to see revocation
    ```
    yarn revocation-example
    ```

- Run example to see verifiable credentials
    ```
    yarn vcdm-example
    ```

## Connecting
Use Dock's substrate node: https://github.com/docknetwork/dock-substrate

Running dev node:
```
./target/release/dock-testnet --base-path /tmp/alice --chain local --alice --port 30333 --ws-port 9944 --rpc-port 9933 --telemetry-url ws://telemetry.polkadot.io:1024 --validator --dev
```

## Test and example Configuration
Configuration variables like websocket endpoint for node `FullNodeEndpoint`, URI for account to pay for extrinsics `TestAccountURI`
and keyring type `TestKeyringType` can be set as environment variables (or in an .env file). If they are not set, default values as
specified in file [test-constants.js](./tests/test-constants.js) are used.  
The scripts read parameters from `.env` file. The available parameters are shown in an example env file [env_example](env_example)

## Test

Run unit tests with `yarn test`.

Run e2e integrations tests with `yarn test-integration` (required node to be running)

You can run tests against a temporary node in docker like so:

```
./scripts/checkout_submodule
yarn test-with-node
```

Run a single test module with `yarn test <module name or prefix>`.

## Linting and type checking
We use JSDoc and TypeScript for static type checking during the CI process. PRs must pass linting and type checking to be accepted.
You can run via: `yarn lint --fix` and `yarn type-check`

## JSON types
The types on Substrate node should be reflected in [types.json](./src/types.json)
