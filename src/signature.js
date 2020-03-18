import {isHexWithGivenByteSize} from './utils';

class Signature {

  /**
   * Creates a new Signature object. Validates the given value. Currently supported signature
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
      throw `Signature must be ${expectedByteSize} bytes`;
    }
  }

  /**
   * @return {Signature} The correct Signature JSON variant. The extending class should implement it.
   */
  toJSON() {
    throw 'Not implemented. The extending class should implement it';
  }
}

class SignatureSr25519 extends Signature {
  constructor(value) {
    super(value, 64);
  }

  toJSON() {
    return {
      Sr25519: this.value,
    };
  }
}

class SignatureEd25519 extends Signature {
  constructor(value) {
    super(value, 64);
  }

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
