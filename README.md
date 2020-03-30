# Dock Client SDK

Currently very early in-dev.

## Build
- Run `yarn` to install the dependencies
- Run `yarn build` to create a distribution version

![Build Status](https://github.com/docknetwork/client-sdk/workflows/CI/badge.svg "Build Status")

## Run example
`yarn start-node-example`

## Lint
`yarn lint --fix`

## Documentation

Early documentation available at: https://docknetwork.github.io/client-sdk/

## Connecting

Use dock substrate node: https://github.com/docknetwork/dock-substrate

Needs types from developer.json (https://github.com/docknetwork/dock-substrate/blob/did/developer.json)

Running dev node:
```
./target/release/dock-testnet --base-path /tmp/alice --chain local --alice --port 30333 --ws-port 9944 --rpc-port 9933 --telemetry-url ws://telemetry.polkadot.io:1024 --validator --dev
```

## Test
- Run unit tests with `yarn test`
- Run e2e integrations tests with `yarn test-integration` (required node to be running)
- Run a single test module with `yarn test <module name or prefix>`

## Basic SDK examples

Run example to create a new DID, register it, update its key and remove the DID.
```
yarn dock-did-example
```

Run example to resolve DID
```
yarn did-resolver-example
```

## JSON types
The types on Substrate node should be reflected in [types.json](./src/types.json)
