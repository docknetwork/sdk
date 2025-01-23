import {
  generateKeyPairFromSeed,
  sign,
  verify,
  extractPublicKeyFromSecretKey,
} from '@stablelib/ed25519';
import { SignatureEd25519 } from '../types/signatures';
import { Ed25519VerKeyName } from '../vc/crypto/constants';
import { normalizeToU8a, valueBytes } from '../utils';
import DockKeypair from './dock-keypair';

export default class Ed25519Keypair extends DockKeypair {
  static Signature = SignatureEd25519;

  static VerKeyType = Ed25519VerKeyName;

  static SeedSize = 32;

  static _fromSeed = (seed) => generateKeyPairFromSeed(normalizeToU8a(seed));

  static _fromPrivateKey = (secretKey) => ({
    secretKey: normalizeToU8a(secretKey),
    publicKey: extractPublicKeyFromSecretKey(normalizeToU8a(secretKey)),
  });

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
