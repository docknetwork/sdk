import { sized, TypedBytes } from '../generic';
import { EcdsaSecp256r1VerKeyName } from '../../vc/crypto/constants';

/** Class representing value of a compressed Secp256r1 PublicKey */
export default class PublicKeySecp256r1Value extends sized(TypedBytes) {
  static Type = 'secp256r1';

  static Size = 33;

  static VerKeyType = EcdsaSecp256r1VerKeyName;
}
