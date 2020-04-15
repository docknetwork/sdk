import Signature from './signature';

/** Class representing a Secp256k1 Signature */
export default class SignatureSecp256k1 extends Signature {
  /**
   * Generate an Ecdsa signature over Secp256k1 curve using elliptic library
   * @param {array} message - The message to sign as bytearray
   * @param {KeyringPair} signingPair -The pair from elliptic containing the signing key
   */
  constructor(message, signingPair) {
    super();
    // Generate the signature
    const sig = signingPair.sign(message, { canonical: true });

    // The signature is recoverable in 65-byte { R | S | index } format
    const r = sig.r.toString('hex', 32);
    const s = sig.s.toString('hex', 32);
    const i = sig.recoveryParam.toString(16).padStart(2, '0');
    // Make it proper hex
    this.value = `0x${r}${s}${i}`;
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
}
