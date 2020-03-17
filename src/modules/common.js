import {isHexWithGivenByteSize} from './utils';

const Sr25519ByteSize = 32;
const Ed25519ByteSize = 32;
const Secp256k1ByteSize = 33;

class PublicKey {
  
  /**
   * Creates a new PublicKey enum variant Sr25519.
   * @param {string} value - Value of the public key
   * @return {PublicKey} The PublicKey enum variant Sr25519.
   */
  static newSr25519(value) {
    if (!isHexWithGivenByteSize(value, Sr25519ByteSize)) {
      throw `Public key must be ${Sr25519ByteSize} bytes`;
    }
    return {
      Sr25519: value,
    };
  }

  /**
   * Creates a new PublicKey enum variant Ed25519.
   * @param {string} value - Value of the public key
   * @return {PublicKey} The PublicKey enum variant Ed25519.
   */
  static newEd25519(value) {
    if (!isHexWithGivenByteSize(value, Ed25519ByteSize)) {
      throw `Public key must be ${Ed25519ByteSize} bytes`;
    }
    return {
      Ed25519: value,
    };
  }

  /**
   * Creates a new PublicKey enum variant Secp256k1.
   * @param {string} value - Value of the public key
   * @return {PublicKey} The PublicKey enum variant Secp256k1.
   */
  static newSecp256k1(value) {
    if (!isHexWithGivenByteSize(value, Secp256k1ByteSize)) {
      throw `Public key must be ${Secp256k1ByteSize} bytes`;
    }
    return {
      Secp256k1: value,
    };
  }
}


class Signature {
  // TODO:
}

export {
  PublicKey,
  Signature
};