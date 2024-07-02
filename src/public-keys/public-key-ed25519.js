import PublicKey from './public-key';

/** Class representing a Ed25519 PublicKey */
export default class PublicKeyEd25519 extends PublicKey {
  static Type = 'ed25519';
  static Size = 32;
}
