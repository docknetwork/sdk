import PublicKey from './public-key';

/** Class representing a compressed Secp256k1 PublicKey */
export default class PublicKeySecp256k1 extends PublicKey {
  static Type = 'secp256k1';
  static Size = 33;

  /**
   * Returns a compressed public key for Secp256k1 curve. The name is intentionally kept same with the base export class to
   * keep the API uniform
   * @param {object} pair - A KeyPair from elliptic library
   * @returns {PublicKeySecp256k1}
   */
  static fromKeyringPair(keyringPair) {
    // `true` is for compressed
    const publicKey = this.validateKeyringPair(keyringPair).getPublic(
      true,
      'hex',
    );
    // public key is in hex but doesn't contain a leading zero
    return new this(`0x${publicKey}`);
  }
}
