# Dock Client SDK

Currently very early in-dev, prototype and skeleton.

## Build
- Run `npm install` or `yarn install` to install the dependencies
- yarn build

## Run example
yarn && yarn start

## Lint
yarn lint --fix

## Connecting

Use dock substrate node: https://github.com/docknetwork/dock-substrate

Needs types from developer.json (https://github.com/docknetwork/dock-substrate/blob/did/developer.json)

Running dev node:
```
./target/release/dock-testnet --base-path /tmp/alice --chain local --alice --port 30333 --ws-port 9944 --rpc-port 9933 --telemetry-url ws://telemetry.polkadot.io:1024 --validator --dev
```

## Basic SDK example

Simply run
```
yarn start-node-example
```

## Build status
![Build Status](https://github.com/docknetwork/client-sdk/workflows/Node.js%20CI/badge.svg "Build Status")
