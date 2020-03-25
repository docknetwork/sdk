import {u8aToHex} from '@polkadot/util';

import {isHexWithGivenByteSize} from './utils/misc';

/** Class representing a Signature. This class should always be extended (abstract class in some languages) */
class Signature {
  /**
   * Signs the given message and wraps it in the Signature
   * @param {array} message - The message to sign as bytearray
   * @param {KeyringPair} signingPair -The pair containing the signing key
   * @returns {Signature}
   */
  constructor(message, signingPair) {
    this.value = u8aToHex(signingPair.sign(message));
  }

  /**
   * Creates a new DidSignature object. Validates the given value. Currently supported signature
   * types only require validating the byte size.
   * @param {string} value - Value of the signature. This is validated
   * @return {Signature} The Signature object if the given value is valid.
   */
  fromHex(value, expectedByteSize) {
    this.validateByteSize(value, expectedByteSize);
    const sig = Object.create(this.prototype);
    sig.value = value;
  }

  /**
   * Check that the given signature has the expected byte size. Assumes the signature is in hex.
   */
  validateByteSize(value, expectedByteSize) {
    if (!isHexWithGivenByteSize(value, expectedByteSize)) {
      throw new Error(`Signature must be ${expectedByteSize} bytes`);
    }
  }

  /**
   * @return {Object} The correct DidSignature JSON variant. The extending class should implement it.
   */
  toJSON() {
    throw new Error('Not implemented. The extending class should implement it');
  }
}

/** Class representing a Ed25519 Signature */
class SignatureSr25519 extends Signature {
  /**
   * Create SignatureSr25519 from given hex string
   * @param {string} value - Hex string
   * @returns {Signature}
   */
  fromHex(value) {
    return super.fromHex(value, 64);
  }

  /**
   * @return {Object} The DidSignature JSON variant Sr25519.
   */
  toJSON() {
    return {
      Sr25519: this.value,
    };
  }
}

/** Class representing a Ed25519 Signature */
class SignatureEd25519 extends Signature {
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

export {
  Signature,
  SignatureSr25519,
  SignatureEd25519
};
