import { sized, TypedBytes } from '../generic';
import { EcdsaSecp256k1VerKeyName } from '../../vc/crypto/constants';

/** Class representing value of a compressed Secp256k1 PublicKey */
export default class PublicKeySecp256k1Value extends sized(TypedBytes) {
  static Type = 'secp256k1';

  static Size = 33;

  static VerKeyType = EcdsaSecp256k1VerKeyName;
}
