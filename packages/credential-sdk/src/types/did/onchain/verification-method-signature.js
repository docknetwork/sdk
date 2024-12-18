import { valueBytes, ensureInstanceOf } from '../../../utils';
import { TypedStruct } from '../../generic';
import { SignatureEd25519Value } from '../../signatures';
import { VerificationMethodRef } from '../document';
import { DidKeypair } from '../../../keypairs';

class BytesSignatureEd25519Value extends SignatureEd25519Value {
  toCheqdPayload() {
    return this.bytes;
  }
}

export class VerificationMethodSignature extends TypedStruct {
  static Classes = {
    verificationMethodId: VerificationMethodRef,
    signature: BytesSignatureEd25519Value,
  };

  static fromDidKeypair(signer, bytes) {
    ensureInstanceOf(signer, DidKeypair);

    return new this(
      signer.verificationMethodId,
      valueBytes(signer.sign(bytes)),
    );
  }
}
