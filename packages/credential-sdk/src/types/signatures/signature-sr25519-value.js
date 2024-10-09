import { PublicKeySr25519 } from '../public-keys';
import SignatureValue from './signature-value';

/** Class representing a Sr25519 Signature */
export default class SignatureSr25519Value extends SignatureValue {
  static PublicKey = PublicKeySr25519;

  static Size = 64;
}
