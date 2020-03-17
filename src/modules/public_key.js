import {isHexWithGivenByteSize} from './utils';

const Sr25519ByteSize = 32;
const Ed25519ByteSize = 32;
const Secp256k1ByteSize = 33;

class PublicKey {
  
  /**
   * Creates a new PublicKey object.
   * @param {string} value - Value of the public key. This is validated
   * @return {PublicKey} The PublicKey object if the given value is valid.
   */
  constructor(value) {
    this.validate(value);
    this.value = value;
  }
}

class PublicKeySr25519 extends PublicKey {
  validate(value) {
    if (!isHexWithGivenByteSize(value, Sr25519ByteSize)) {
      throw `Public key must be ${Sr25519ByteSize} bytes`;
    }
  }

  /**
   * @return {PublicKey} The PublicKey enum variant Sr25519.
   */
  asEnum() {
    return {
      Sr25519: this.value,
    };
  }
}

class PublicKeyEd25519 extends PublicKey {
  validate(value) {
    if (!isHexWithGivenByteSize(value, Ed25519ByteSize)) {
      throw `Public key must be ${Ed25519ByteSize} bytes`;
    }
  }

  /**
   * @return {PublicKey} The PublicKey enum variant Ed25519.
   */
  asEnum() {
    return {
      Ed25519: this.value,
    };
  }
}

class PublicKeySecp256k1 extends PublicKey {
  validate(value) {
    if (!isHexWithGivenByteSize(value, Secp256k1ByteSize)) {
      throw `Public key must be ${Secp256k1ByteSize} bytes`;
    }
  }

  /**
   * @return {PublicKey} The PublicKey enum variant Secp256k1.
   */
  asEnum() {
    return {
      Secp256k1: this.value,
    };
  }
}


export {
  PublicKey,
  PublicKeySr25519,
  PublicKeyEd25519,
  PublicKeySecp256k1
};
