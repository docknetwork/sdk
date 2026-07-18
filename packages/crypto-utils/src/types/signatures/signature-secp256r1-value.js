import SignatureValue from './signature-value';
import { PublicKeySecp256r1 } from '../public-keys';

/** Class representing a Secp256r1 Signature */
export default class SignatureSecp256r1Value extends SignatureValue {
  static PublicKey = PublicKeySecp256r1;

  static Size = 65;
}
