import PublicKey from './public-key';

/** Class representing a compressed Secp256k1 PublicKey */
export default class PublicKeySecp256k1 extends PublicKey {
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
   * @param {object} pair - A KeyPair from elliptic library
   * @returns {PublicKeySecp256k1}
   */
  static fromKeyringPair(pair) {
    // `true` is for compressed
    const pk = pair.getPublic(true, 'hex');
    // `pk` is hex but does not contain the leading `0x`
    return new this(`0x${pk}`);
  }
}
