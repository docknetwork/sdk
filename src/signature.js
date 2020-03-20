import {u8aToHex} from '@polkadot/util';

import {isHexWithGivenByteSize} from './utils';

/** Class representing a Signature. This class should always be extended (abstract class in some languages) */
class Signature {

  /**
   * Creates a new DidSignature object. Validates the given value. Currently supported signature
   * types only require validating the byte size.
   * @param {string} value - Value of the signature. This is validated
   * @return {Signature} The Signature object if the given value is valid.
   */
  constructor(value, expectedByteSize) {
    this.validateByteSize(value, expectedByteSize);
    this.value = value;
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
   * Signs the given message and wraps it in the Signature
   * @param {array} message - The message to sign as bytearry
   * @param {KeyringPair} signingPair -The pair containing the signing key
   * @returns {Signature}
   */
  static sign(message, signingPair) {
    // Use of `this` is legal in static methods, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Boxing_with_prototype_and_static_methods
    return new this(u8aToHex(signingPair.sign(message)));
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
  constructor(value) {
    super(value, 64);
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
  constructor(value) {
    super(value, 64);
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
