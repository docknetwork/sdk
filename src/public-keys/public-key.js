import { u8aToHex } from '@polkadot/util';
import { isHexWithGivenByteSize } from '../utils/codec';

/** Class representing a PublicKey. This export class should always be extended (abstract export class in some languages) */
export default class PublicKey {
  /**
   * Creates a new PublicKey object. Validates the given value. Currently supported key
   * types only require validating the byte size.
   * @param {string} value - Value of the public key. This is validated
   * @param {number} expectedByteSize - Expected byte size of the key
   * @constructor
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
   * @param {object} pair A polkadot-js KeyringPair.
   * @returns {PublicKey}
   */
  static fromKeyringPair(pair) {
    // Use of `this` is legal in static methods, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Boxing_with_prototype_and_static_methods
    return new this(u8aToHex(pair.publicKey), 32);
  }

  /**
   * @return {Object} The correct PublicKey JSON variant. The extending export class should implement it.
   */
  toJSON() {
    throw new Error('Not implemented. The extending export class should implement it');
  }
}
