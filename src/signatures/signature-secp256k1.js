import { sha256 } from 'js-sha256';
import Signature from './signature';
import { PublicKeySecp256k1 } from '../public-keys';

/** Class representing a Secp256k1 Signature */
export default class SignatureSecp256k1 extends Signature {
  static PublicKey = PublicKeySecp256k1;
  static Size = 65;

  static signWithKeyringPair(message, keyringPair) {
    return this.signPrehashed(sha256.digest(message), keyringPair);
  }

  /**
   * Sign an already hashed message
   * @param messageHash - Hash of the message
   * @param signingPair
   * @returns {string}
   */
  static signPrehashed(messageHash, keyringPair) {
    const sig = this.PublicKey.validateKeyringPair(keyringPair).sign(
      messageHash,
      {
        canonical: true,
      },
    );
    // The signature is recoverable in 65-byte { R | S | index } format
    const r = sig.r.toString('hex', 32);
    const s = sig.s.toString('hex', 32);
    const i = sig.recoveryParam.toString(16).padStart(2, '0');
    // Make it proper hex
    return new this(`0x${r}${s}${i}`);
  }
}
