import { sized, TypedBytes } from '../generic';

/** Class representing value of a X25519 PublicKey */
export default class PublicKeyX25519Value extends sized(TypedBytes) {
  static Type = 'x25519';

  static Size = 32;

  static VerKeyType = 'X25519KeyAgreementKey2019';
}
