import { TypedEnum } from '../../../../generic';
import {
  SignatureEd25519Value,
  SignatureSecp256k1Value,
  SignatureSecp256r1Value,
} from '../../../../signatures';

export class DidMethodKeySignatureValue extends TypedEnum {}
export class DidMethodKeySignatureValueEd25519 extends DidMethodKeySignatureValue {
  static Class = SignatureEd25519Value;
}
export class DidMethodKeySignatureValueSecp256k1 extends DidMethodKeySignatureValue {
  static Class = SignatureSecp256k1Value;
}
export class DidMethodKeySignatureValueSecp256r1 extends DidMethodKeySignatureValue {
  static Class = SignatureSecp256r1Value;
}

DidMethodKeySignatureValue.bindVariants(
  DidMethodKeySignatureValueEd25519,
  DidMethodKeySignatureValueSecp256k1,
  DidMethodKeySignatureValueSecp256r1,
);
