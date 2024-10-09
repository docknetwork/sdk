import { TypedEnum } from '../generic';
import SignatureEd25519Value from './signature-ed25519-value';
import SignatureSecp256k1Value from './signature-secp256k1-value';
import SignatureSr25519Value from './signature-sr25519-value';

/**
 * Class representing either Ed25519 or Secp256k1 or Sr25519 Signature
 * @class
 * @extends {TypedEnum}
 */
export class Signature extends TypedEnum {
  static get PublicKey() {
    return this.Class.PublicKey;
  }

  get bytes() {
    return this.value.bytes;
  }
}
/**
 * Class representing Ed25519 Signature
 * @class
 * @extends {Signature}
 */
export class SignatureEd25519 extends Signature {
  static Class = SignatureEd25519Value;
}
/**
 * Class representing Secp256k1 Signature
 * @class
 * @extends {Signature}
 */
export class SignatureSecp256k1 extends Signature {
  static Class = SignatureSecp256k1Value;
}
/**
 * Class representing Sr25519 Signature
 * @class
 * @extends {SignatureEd25519OrSignatureSecp256k1OrSignatureSr25519}
 */
export class SignatureSr25519 extends Signature {
  static Class = SignatureSr25519Value;
}

Signature.bindVariants(SignatureEd25519, SignatureSecp256k1, SignatureSr25519);
