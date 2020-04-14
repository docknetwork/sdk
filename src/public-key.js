import { u8aToHex } from '@polkadot/util';

import { isHexWithGivenByteSize } from './utils/codec';

/** Class representing a PublicKey. This export class should always be extended (abstract export class in some languages) */
export class PublicKey {
  /**
   * Creates a new PublicKey object. Validates the given value. Currently supported key
   * types only require validating the byte size.
   * @param {string} value - Value of the public key. This is validated
   * @return {PublicKey} The PublicKey object if the given value is valid.
   */
  constructor(value, expectedByteSize) {
    this.validateByteSize(value, expectedByteSize);
    this.value = value;
  }

  /**
   * Check that the given public key has the expected byte size. Assumes the public key is in hex.
   */
  validateByteSize(value, expectedByteSize) {
    if (!isHexWithGivenByteSize(value, expectedByteSize)) {
      throw new Error(`Public key must be ${expectedByteSize} bytes`);
    }
  }

  /**
   * Extracts the public key from a pair. Assumes the KeyringPair is of the correct type. The `type` is intentionally not
   * inspected to follow dependency inversion principle.
   * generate the instance correct subclass
   * @param {KeyringPair} A polkadot-js KeyringPair.
   * @returns {PublicKey}
   */
  static fromKeyringPair(pair) {
    // Use of `this` is legal in static methods, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Boxing_with_prototype_and_static_methods
    return new this(u8aToHex(pair.publicKey));
  }

  /**
   * @return {Object} The correct PublicKey JSON variant. The extending export class should implement it.
   */
  toJSON() {
    throw new Error('Not implemented. The extending export class should implement it');
  }
}

/** Class representing a Sr25519 PublicKey */
export class PublicKeySr25519 extends PublicKey {
  constructor(value) {
    super(value, 32);
  }

  /**
   * @return {Object} The PublicKey JSON variant Sr25519.
   */
  toJSON() {
    return {
      Sr25519: this.value,
    };
  }
}

/** Class representing a Ed25519 PublicKey */
export class PublicKeyEd25519 extends PublicKey {
  constructor(value) {
    super(value, 32);
  }

  /**
   * @return {Object} The PublicKey JSON variant Ed25519.
   */
  toJSON() {
    return {
      Ed25519: this.value,
    };
  }
}

/** Class representing a compressed Secp256k1 PublicKey */
export class PublicKeySecp256k1 extends PublicKey {
  constructor(value) {
    super(value, 33);
  }

  /**
   * @return {Object} The PublicKey JSON variant Secp256k1.
   */
  toJSON() {
    return {
      Secp256k1: this.value,
    };
  }

  /**
   * Returns a compressed public key for Secp256k1 curve. The name is intentionally kept same with the base export class to
   * keep the API uniform
   * @param {KeyPair} pair - A KeyPair from elliptic library
   * @returns {PublicKeySecp256k1}
   */
  static fromKeyringPair(pair) {
    // `true` is for compressed
    const pk = pair.getPublic(true, 'hex');
    // `pk` is hex but does not contain the leading `0x`
    return new this(`0x${pk}`);
  }
}
