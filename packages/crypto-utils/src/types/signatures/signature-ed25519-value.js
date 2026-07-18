import { PublicKeyEd25519 } from '../public-keys';
import SignatureValue from './signature-value';

/** Class representing a Ed25519 Signature */
export default class SignatureEd25519Value extends SignatureValue {
  static PublicKey = PublicKeyEd25519;

  static Size = 64;
}
