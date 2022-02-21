# Anonymous credentials

## Overview

This document talks about building anonymous credentials using mainly 2 primitives, BBS+ signature scheme which issuer uses to sign the
credential and accumulators for membership check needed for revocation. BBS+ implementation comes from [this](https://github.com/docknetwork/crypto-wasm-ts/)
Typescript package which uses [this](https://github.com/docknetwork/crypto-wasm) WASM wrapper which itself uses [our Rust crypto library](https://github.com/docknetwork/crypto).

For an overview of these primitives, see [this](https://github.com/docknetwork/crypto-wasm#overview).

## Implementation

On chain, there are 2 modules, one for BBS+ and the other for accumulator. The modules store the BBS+ params, public keys, accumulator params,
accumulator public keys and some accumulator details like current accumulated value, last updated, etc. They are somewhat agnostic
to the cryptographic details and treat the values as bytes with some size bounds.

- **BBS+ module**
  - At path `src/modules/bbs-plus.js` in the repo.
  - Used to create and remove signature parameters and public keys.
  - The public keys can either refer the signature params or not pass the reference while creating.
  - The params and public keys are owned by a DID and can be only removed by that DID.
  - See the tests at `tests/integration/anoncreds/bbs-plus.test.js` on how to create, query and remove these.

- **Accumulator module**
  - At path `src/modules/accumulator.js` in the repo.
  - The parameters and public keys are managed in the same way as BBS+ signatures.
  - Accumulators are owned by a DID and can be only removed by that DID.
  - Accumulators are identified by a unique id and that id is used to send updates or remove it.
  - The accumulator update contains the additions, removals and the witness update info and these are not stored in chain
    state but are present in the blocks and the accumulated value corresponding to the update is logged in the event.
  - In the chain state, only the most recent accumulated value is stored (along with some metadata like creation time,
    last update, etc), which is sufficient to verify the witness or the proof of knowledge.
  - To update the witness, the updates and witness update info should be parsed from the blocks and the accumulator module provides
    the functions get the updates and necessary events from the block,
  - See the tests at `tests/integration/anoncreds/accumulator.test.js` on how to create, query and remove params and keys as well as
    the accumulator.

- Composite proofs
  - Proofs that use BBS+ signatures and accumulator
  - The SDK itself doesn't include the Typescript package containing the crypto as a dependency. But it can be used with the SDK to issue, prove,
    verify and revoke credentials as shown in tests mentioned below.
  - See the test `tests/integration/anoncreds/demo.test.js` for an example of how a BBS+ signature can be used with an
    accumulator for anonymous credentials. The accumulator is used to hold a user/credential id. Presence of the id in accumulator
    means the credential is valid and absence means invalid.
