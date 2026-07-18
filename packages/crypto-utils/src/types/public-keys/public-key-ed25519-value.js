import { sized, TypedBytes } from '../generic';
import { Ed25519VerKeyName } from '../../vc/crypto/constants';

/** Class representing value of a Ed25519 PublicKey */
export default class PublicKeyEd25519Value extends sized(TypedBytes) {
  static Type = 'ed25519';

  static Size = 32;

  static VerKeyType = Ed25519VerKeyName;
}
