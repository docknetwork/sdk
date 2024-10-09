import { withExtendedStaticProperties } from '../../utils/inheritance';
import { sized, TypedBytes } from '../generic';

/** Class representing a Signature. This export class should always be extended (abstract export class in some languages) */
export default withExtendedStaticProperties(
  ['PublicKey'],
  class SignatureValue extends sized(TypedBytes) {
    /**
     * Public key associated with the signature.
     * @type {typeof PublicKey}
     */
    static PublicKey;

    static get Type() {
      return this.PublicKey.Type;
    }

    /**
     * Returns the size of the underlying signature.
     */
    get size() {
      return this.constructor.Size;
    }
  },
);
