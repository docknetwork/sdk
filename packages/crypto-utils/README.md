# @docknetwork/crypto-utils

Lightweight crypto primitives shared by Dock SDK packages. The package provides
Ed25519, secp256k1, and secp256r1 keypairs, signature and public-key value
types, byte utilities, verification-method constants, and JWS helpers.

```js
import {
  Ed25519Keypair,
  createJwsSigner,
  createRawSigner,
  joseSignatureToDER,
  signJWS,
} from '@docknetwork/crypto-utils';

const keypair = Ed25519Keypair.random();
const signer = createRawSigner(keypair);
const signature = await signer.sign({ data: new Uint8Array([1, 2, 3]) });
const jwsSigner = createJwsSigner(keypair);
const jws = await signJWS(jwsSigner, 'EdDSA', { detached: true, header: {} }, new Uint8Array([1, 2, 3]));
```

`createRawSigner` unwraps the SDK signature value returned by
`DockKeypair.sign`. It intentionally preserves Dock's existing wire formats:
64-byte Ed25519 signatures and 65-byte `r || s || recovery` ECDSA signatures.
It does not perform JOSE or IEEE P1363 conversion.

Use `createJwsSigner` with `signJWS`. It unwraps `DockKeypair` and
`DidKeypair` signatures and converts Dock's 65-byte ECDSA representation to
the 64-byte `r || s` representation required by JOSE. To verify that JOSE
representation with a Dock ECDSA keypair, first convert it to DER with
`joseSignatureToDER`.

Subpath exports are available at `keypairs`, `types`, `utils`, `key-utils`, and
`vc`.

## Environments

Node is the default target. Browser and React Native bundlers resolve
`@sd-jwt/crypto-nodejs` to `@sd-jwt/crypto-browser` via this package's
`browser` / `react-native` fields. Apps still need a `Buffer` polyfill where
the runtime does not provide one.
