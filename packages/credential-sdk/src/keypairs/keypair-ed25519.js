import { generateKeyPairFromSeed, sign, verify } from '@stablelib/ed25519';
import { SignatureEd25519 } from '../types/signatures';
import { Ed25519VerKeyName } from '../vc/crypto/constants';
import { normalizeToU8a, valueBytes } from '../utils';
import DockKeypair from './keypair';

export default class Ed25519Keypair extends DockKeypair {
  static Signature = SignatureEd25519;

  static VerKeyType = Ed25519VerKeyName;

  static SeedSize = 32;

  constructor(seed) {
    super(generateKeyPairFromSeed(normalizeToU8a(seed)));
  }

  _publicKey() {
    return this.keyPair.publicKey;
  }

  privateKey() {
    return this.keyPair.secretKey;
  }

  _sign(message) {
    return sign(this.keyPair.secretKey, message);
  }

  static verify(message, signature, publicKey) {
    return verify(valueBytes(publicKey), message, valueBytes(signature));
  }
}
