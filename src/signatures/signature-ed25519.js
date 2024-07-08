import { PublicKeyEd25519 } from '../public-keys';
import Signature from './signature';

/** Class representing a Ed25519 Signature */
export default class SignatureEd25519 extends Signature {
  static PublicKey = PublicKeyEd25519;
  static Size = 64;
}
