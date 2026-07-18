import {
  DockKeypair,
  Ed25519Keypair,
  Secp256k1Keypair,
  Secp256r1Keypair,
} from '@docknetwork/crypto-utils/keypairs';
import {
  PublicKeyEd25519,
  SignatureEd25519,
} from '@docknetwork/crypto-utils/types';
import {
  ensureBytes,
  ensureInstanceOf,
  maybeToJSON,
} from '@docknetwork/crypto-utils/utils';
import {
  createJws,
  createJwsSigner,
  createRawSigner,
  joseSignatureToDER,
  signJWS,
} from '@docknetwork/crypto-utils/vc';

import CredentialDockKeypair from '../src/keypairs/dock-keypair';
import CredentialEd25519Keypair from '../src/keypairs/keypair-ed25519';
import CredentialSecp256k1Keypair from '../src/keypairs/keypair-secp256k1';
import CredentialSecp256r1Keypair from '../src/keypairs/keypair-secp256r1';
import DidKeypair from '../src/keypairs/did-keypair';
import {
  PublicKeyEd25519 as CredentialPublicKeyEd25519,
} from '../src/types/public-keys';
import {
  SignatureEd25519 as CredentialSignatureEd25519,
} from '../src/types/signatures';
import {
  ensureBytes as credentialEnsureBytes,
  ensureInstanceOf as credentialEnsureInstanceOf,
  maybeToJSON as credentialMaybeToJSON,
} from '../src/utils';
import {
  createJws as credentialCreateJws,
  createJwsSigner as credentialCreateJwsSigner,
  createRawSigner as credentialCreateRawSigner,
  joseSignatureToDER as credentialJoseSignatureToDER,
  signJWS as credentialSignJWS,
} from '../src/vc/jws';

describe('crypto-utils compatibility shims', () => {
  test('preserve keypair constructor identity', () => {
    expect(CredentialDockKeypair).toBe(DockKeypair);
    expect(CredentialEd25519Keypair).toBe(Ed25519Keypair);
    expect(CredentialSecp256k1Keypair).toBe(Secp256k1Keypair);
    expect(CredentialSecp256r1Keypair).toBe(Secp256r1Keypair);
  });

  test('preserve public key and signature constructor identity', () => {
    expect(CredentialPublicKeyEd25519).toBe(PublicKeyEd25519);
    expect(CredentialSignatureEd25519).toBe(SignatureEd25519);
  });

  test('preserve utility function identity', () => {
    expect(credentialEnsureBytes).toBe(ensureBytes);
    expect(credentialEnsureInstanceOf).toBe(ensureInstanceOf);
    expect(credentialMaybeToJSON).toBe(maybeToJSON);
  });

  test('preserve JWS function identity', () => {
    expect(credentialCreateJws).toBe(createJws);
    expect(credentialCreateJwsSigner).toBe(createJwsSigner);
    expect(credentialCreateRawSigner).toBe(createRawSigner);
    expect(credentialJoseSignatureToDER).toBe(joseSignatureToDER);
    expect(credentialSignJWS).toBe(signJWS);
  });

  test('adapt DidKeypair signatures for ES256 JWS', async () => {
    const keypair = CredentialSecp256r1Keypair.fromEntropy(
      new Uint8Array(CredentialSecp256r1Keypair.SeedSize).fill(1),
    );
    const didKeypair = DidKeypair.didMethodKey(keypair);
    const signature = await credentialCreateJwsSigner(didKeypair).sign({
      data: Uint8Array.of(1, 2, 3),
    });

    expect(signature).toHaveLength(64);
    expect(CredentialSecp256r1Keypair.verify(
      Uint8Array.of(1, 2, 3),
      joseSignatureToDER(signature),
      didKeypair.publicKey(),
    )).toBe(true);
  });
});
