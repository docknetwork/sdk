import { TypedEnum } from '../../../../generic';
import {
  SignatureEd25519Value,
  SignatureSecp256k1Value,
} from '../../../../signatures';

export class DidMethodKeySignature extends TypedEnum {}
export class DidMethodKeySignatureEd25519 extends DidMethodKeySignature {
  static Class = SignatureEd25519Value;
}
export class DidMethodKeySignatureSecp256k1 extends DidMethodKeySignature {
  static Class = SignatureSecp256k1Value;
}

DidMethodKeySignature.bindVariants(
  DidMethodKeySignatureEd25519,
  DidMethodKeySignatureSecp256k1,
);
