import PublicKey from './public-key';

/** Class representing a Sr25519 PublicKey */
export default class PublicKeySr25519 extends PublicKey {
  static Type = 'sr25519';
  static Size = 32;
}
