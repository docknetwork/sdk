import { PublicKeySr25519 } from '../public-keys';
import Signature from './signature';

/** Class representing a Sr25519 Signature */
export default class SignatureSr25519 extends Signature {
  static PublicKey = PublicKeySr25519;
  static Size = 64;
}
