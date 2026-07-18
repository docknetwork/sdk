import { sized, TypedBytes } from '../generic';
import { Sr25519VerKeyName } from '../../vc/crypto/constants';

/** Class representing value of a Sr25519 PublicKey */
export default class PublicKeySr25519Value extends sized(TypedBytes) {
  static Type = 'sr25519';

  static Size = 32;

  static VerKeyType = Sr25519VerKeyName;
}
