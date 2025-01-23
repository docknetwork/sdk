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

  /**
   *
   * Instantiates new `DockKeypair` from the provided source.
   * It can have one of two types: "seed" or "private".
   * @param {Uint8Array} seedOrPrivate
   * @param {"seed"|"private"} sourceType
   */
  constructor(seedOrPrivate, sourceType = 'seed') {
    let kp;
    switch (sourceType) {
      case 'seed':
        kp = generateKeyPairFromSeed(normalizeToU8a(seedOrPrivate));
        break;
      case 'private': {
        const secretKey = normalizeToU8a(seedOrPrivate);
        kp = {
          secretKey,
          publicKey: extractPublicKeyFromSecretKey(secretKey),
        };
        break;
      }
      default:
        throw new Error(
          `Unsupported source type: \`${sourceType}\`, it must be either "seed" or "private"`,
        );
    }

    super(kp);
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
