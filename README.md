# `Dock` SDK

## Overview

The Dock SDK is an opensource library that powers Dock's SaaS API. It provides the credential management, cryptography, and blockchain storage features for Dock's supported credential variants:

* W3C VC JSON-LD ed25519 credential using StatusList 2021 for revocation targetted at interoperability
* W3C VC JSON-LD BBS credential using accumulators for revocation targetted at privacy
* W3C VC JSON-LD KVAC credential using accumulators for revocation allowing monetization of credentials

Most of the SDK is written in JavaScript / TypeScript with safety-critical code written in Rust. The SDK depends on [the Arkworks math library](https://github.com/arkworks-rs/algebra).

## Monorepository Packages

Features five packages, such as

- [`@docknetwork/credential-sdk`](./packages/credential-sdk) - An API-agnostic Javascript library for working with Verifiable Credentials, DIDs, Claim Deduction, and more.
- [`@docknetwork/dock-blockchain-api`](./packages/dock-blockchain-api) - A Javascript library built with PolkadotJS, for use with the [Dock Substrate Node] (https://github.com/docknetwork/dock-substrate) or our public main/test networks.*
- [`@docknetwork/dock-blockchain-modules`](./packages/dock-blockchain-modules) - A JavaScript library designed for handling credential SDK elements (DIDS, Accumulators, etc) on the Dock blockchain.
- [`@docknetwork/cheqd-blockchain-api`](./packages/cheqd-blockchain-api) - A Javascript library built atop of `@cheqd/sdk` that allows to interact with the `Cheqd` blockchain.
- [`@docknetwork/cheqd-blockchain-modules`](./packages/cheqd-blockchain-modules) - A JavaScript library created for managing credential SDK components such as DIDs, accumulators etc on the Cheqd blockchain.

You are welcome to explore the [tutorials](./tutorials) and [examples](./examples) to get a basic understanding.

In essence, the architecture is structured as follows:

- The fundamentals of VC, including types, cryptography, and abstract modules, are housed in `@docknetwork/credential-sdk`.
- Specific implementations for the `Dock` and `Cheqd` blockchain modules can be found in `@docknetwork/dock-blockchain-modules`* and `@docknetwork/cheqd-blockchain-modules`, respectively.
- Basic blockchain connectors for the `Dock` and `Cheqd` blockchain are available through `@docknetwork/dock-blockchain-api`* and `@docknetwork/cheqd-blockchain-api`.

## Deprecated Features

* Dock blockchain will be sunset in 2025. [More information.](https://www.dock.io/post/dock-and-cheqd-form-alliance-to-accelerate-global-adoption-of-decentralized-id#stronglong-termstrong)

Some features of the SDK are deprecated and will be removed in a future release:
* StatusList2017
