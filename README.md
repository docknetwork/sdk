# Dock Client SDK

Currently very early in-dev.

## Build
- Run `yarn` to install the dependencies
- Run `yarn build` to create a distribution version

![Build Status](https://github.com/docknetwork/client-sdk/workflows/CI/badge.svg "Build Status")

## Lint
`yarn lint --fix`

## Documentation

Early documentation available at: https://docknetwork.github.io/client-sdk/

## Connecting

Use dock substrate node: https://github.com/docknetwork/dock-substrate

Running dev node:
```
./target/release/dock-testnet --base-path /tmp/alice --chain local --alice --port 30333 --ws-port 9944 --rpc-port 9933 --telemetry-url ws://telemetry.polkadot.io:1024 --validator --dev
```

## Test and example Configuration
Configuration variables like websocket endpoint for node `FullNodeEndpoint`, URI for account to pay for extrinsics `TestAccountURI`
and keyring type `TestKeyringType` can be set as environment variables (or in an .env file). If they are not set, default values as
specified in file [test-constants.js](./tests/test-constants.js) are used.

## Test

Run unit tests with `yarn test`.

Run e2e integrations tests with `yarn test-integration` (required node to be running)

You can run tests against a temporary node in docker like so:

```
./scripts/checkout_submodule
yarn test-with-node
```

Run a single test module with `yarn test <module name or prefix>`.

## Basic SDK examples

Run example to create a new DID, register it, update its key and remove the DID.
```
yarn dock-did-example
```

Run example to resolve DID
```
yarn did-resolver-example
```

Run example to see revocation
```
yarn revocation-example
```

Run example to see verifiable credentials
```
yarn vcdm-example
```

## JSON types
The types on Substrate node should be reflected in [types.json](./src/types.json)
