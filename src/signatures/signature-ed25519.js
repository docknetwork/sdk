import Signature from './signature';

/** Class representing a Ed25519 Signature */
export default class SignatureEd25519 extends Signature {
  /**
   * Generate a Ed25519 signature using Polkadot-js
   * @param {array} message - The message to sign as bytearray
   * @param {object} signingPair -The pair from Polkadot-js containing the signing key
   */
  constructor(message, signingPair) {
    super();
    this.fromPolkadotJSKeyringPair(message, signingPair);
  }

  /**
   * Create SignatureEd25519 from given hex string
   * @param {string} value - Hex string
   * @returns {Signature}
   */
  fromHex(value) {
    return super.fromHex(value, 64);
  }

  /**
   * @return {Object} The DidSignature JSON variant Ed25519.
   */
  toJSON() {
    return {
      Ed25519: this.value,
    };
  }
}
