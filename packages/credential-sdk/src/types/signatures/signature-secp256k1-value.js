import SignatureValue from './signature-value';
import { PublicKeySecp256k1 } from '../public-keys';

/** Class representing a Secp256k1 Signature */
export default class SignatureSecp256k1Value extends SignatureValue {
  static PublicKey = PublicKeySecp256k1;

  static Size = 65;
}
