import { sha256 } from 'js-sha256';
import Signature from './signature';

/** Class representing a Secp256k1 Signature */
export default class SignatureSecp256k1 extends Signature {
  /**
   * Generate an Ecdsa signature over Secp256k1 curve using elliptic library
   * @param {array} message - The message to sign as bytearray. Its assumed that the message is not hashed already
   * and hashed before signing
   * @param {object} signingPair -The pair from elliptic containing the signing key
   */
  constructor(message, signingPair) {
    super();
    // Hash the message before signing
    const hash = sha256.digest(message);
    this.value = this.signPrehashed(hash, signingPair);
  }

  /**
   * Create SignatureSecp256k1 from given hex string
   * @param {string} value - Hex string
   * @returns {Signature}
   */
  fromHex(value) {
    return super.fromHex(value, 65);
  }

  /**
   * @return {Object} The DidSignature JSON variant Secp256k1.
   */
  toJSON() {
    return {
      Secp256k1: this.value,
    };
  }

  /**
   * Sign an already hashed message
   * @param messageHash - Hash of the message
   * @param signingPair
   * @returns {string}
   */
  signPrehashed(messageHash, signingPair) {
    const sig = signingPair.sign(messageHash, { canonical: true });
    // The signature is recoverable in 65-byte { R | S | index } format
    const r = sig.r.toString('hex', 32);
    const s = sig.s.toString('hex', 32);
    const i = sig.recoveryParam.toString(16).padStart(2, '0');
    // Make it proper hex
    return `0x${r}${s}${i}`;
  }
}
