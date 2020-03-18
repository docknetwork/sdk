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
   * @return {DidSignature} The correct DidSignature JSON variant. The extending class should implement it.
   */
  toJSON() {
    throw 'Not implemented. The extending class should implement it';
  }
}

/** Class representing a Ed25519 Signature */
class SignatureSr25519 extends Signature {
  constructor(value) {
    super(value, 64);
  }

  /**
   * @return {SignatureSr25519} The DidSignature JSON variant Sr25519.
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
   * @return {SignatureEd25519} The DidSignature JSON variant Ed25519.
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
