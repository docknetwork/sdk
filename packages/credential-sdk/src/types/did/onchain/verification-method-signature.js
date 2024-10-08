import { valueBytes } from '../../../utils/bytes';
import { TypedStruct } from '../../generic';
import { SignatureEd25519Value } from '../../signatures';
import { VerificationMethodRef } from '../document';

class BytesSignatureEd25519Value extends SignatureEd25519Value {
  toJSON() {
    return Array.from(this);
  }
}

export class VerificationMethodSignature extends TypedStruct {
  static Classes = {
    verificationMethodId: VerificationMethodRef,
    signature: BytesSignatureEd25519Value,
  };

  static fromDidKeypair(signer, bytes) {
    return new this(
      signer.verificationMethodId,
      valueBytes(signer.sign(bytes)),
    );
  }
}
