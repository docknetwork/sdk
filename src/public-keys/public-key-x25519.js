import PublicKey from './public-key';

/** Class representing a X25519 PublicKey */
export default class PublicKeyX25519 extends PublicKey {
  constructor(value) {
    super(value, 32);
  }

  /**
   * @return {Object} The PublicKey JSON variant X25519.
   */
  toJSON() {
    return {
      X25519: this.value,
    };
  }
}
