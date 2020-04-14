import PublicKey from './public-key';

/** Class representing a Sr25519 PublicKey */
export default class PublicKeySr25519 extends PublicKey {
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
