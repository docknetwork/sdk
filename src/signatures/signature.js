import { isHexWithGivenByteSize } from '../utils/codec';
import { TypedEnum } from '../utils/typed-enum';
import { withExtendedStaticProperties } from '../utils/inheritance';

/** Class representing a Signature. This export class should always be extended (abstract export class in some languages) */
export default withExtendedStaticProperties(
  ['Size', 'PublicKey'],
  class Signature extends TypedEnum {
    /**
     * Public key associated with the signature.
     * @type {typeof PublicKey}
     */
    static PublicKey;

    static get Type() {
      return this.PublicKey.Type;
    }

    /**
     * Check that the given public key has the expected byte size. Assumes the signature is in hex.
     */
    static validateSize(value) {
      if (!isHexWithGivenByteSize(value, this.Size)) {
        throw new Error(`Signature must be ${this.Size} bytes`);
      }

      return value;
    }

    /**
     * @returns {Signature}
     */
    static signWithKeyringPair(message, signingPair, signingOpts = {}) {
      const signed = this.PublicKey.validateKeyringPair(signingPair).sign(
        message,
        signingOpts,
      );

      return new this(signed);
    }

    /**
     * Returns the size of the underlying signature.
     */
    get size() {
      return this.constructor.Size;
    }
  },
);
