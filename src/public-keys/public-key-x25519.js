import PublicKey from './public-key';

/** Class representing a X25519 PublicKey */
export default class PublicKeyX25519 extends PublicKey {
  static Type = 'x25519';
  static Size = 32;
}
