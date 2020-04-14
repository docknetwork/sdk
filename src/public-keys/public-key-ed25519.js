import PublicKey from './public-key';

/** Class representing a Ed25519 PublicKey */
export default class PublicKeyEd25519 extends PublicKey {
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
