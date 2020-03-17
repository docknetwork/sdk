class PublicKey {
  
  /**
   * Creates a new PublicKey enum variant Sr25519.
   * @param {string} value - Value of the public key
   * @return {PublicKey} The PublicKey enum variant Sr25519.
   */
  static newSr25519(value) {
    // TODO: Validate size of value
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
    // TODO: Validate size of value
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
    // TODO: Validate size of value
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