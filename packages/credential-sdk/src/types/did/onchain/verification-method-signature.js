import { valueBytes, ensureInstanceOf } from '../../../utils';
import { TypedStruct, withProp } from '../../generic';
import { SignatureEd25519Value } from '../../signatures';
import { DidKeypair } from '../../../keypairs';
import {
  CheqdMainnetVerificationMethodRef,
  CheqdTestnetVerificationMethodRef,
  CheqdVerificationMethodRef,
} from '../document/verification-method-ref';

class BytesSignatureEd25519Value extends SignatureEd25519Value {
  toCheqdPayload() {
    return this.bytes;
  }
}

export class VerificationMethodSignature extends TypedStruct {
  static Classes = {
    verificationMethodId: CheqdVerificationMethodRef,
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

export class CheqdTestnetVerificationMethodSignature extends withProp(
  VerificationMethodSignature,
  'verificationMethodId',
  CheqdTestnetVerificationMethodRef,
) {}

export class CheqdMainnetVerificationMethodSignature extends withProp(
  VerificationMethodSignature,
  'verificationMethodId',
  CheqdMainnetVerificationMethodRef,
) {}
