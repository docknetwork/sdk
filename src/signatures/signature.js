import { u8aToHex } from '@polkadot/util';
import { isHexWithGivenByteSize } from '../utils/codec';

/** Class representing a Signature. This export class should always be extended (abstract export class in some languages) */
export default class Signature {
  /**
   * Creates a new DidSignature object. Validates the given value. Currently supported signature
   * types only require validating the byte size.
   * @param {string} value - Value of the signature. This is validated
   * @return {Signature} The Signature object if the given value is valid.
   */
  fromHex(value, expectedByteSize) {
    this.validateByteSize(value, expectedByteSize);

    // @ts-ignore
    const sig = Object.create(this.prototype);
    sig.value = value;
    return sig;
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
   * @param {array} message - The message to sign as bytearray
   * @param {object} signingPair -The pair from Polkadot-js containing the signing key
   */
  fromPolkadotJSKeyringPair(message, signingPair) {
    this.value = u8aToHex(signingPair.sign(message));
  }

  /**
   * @return {Object} The correct DidSignature JSON variant. The extending export class should implement it.
   */
  toJSON() {
    throw new Error('Not implemented. The extending export class should implement it');
  }
}
