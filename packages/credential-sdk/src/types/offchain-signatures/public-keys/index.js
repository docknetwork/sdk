import { TypedEnum, withProp } from '../../generic';
import {
  Bls12381BBS23DockVerKeyName,
  Bls12381BBSDockVerKeyName,
  Bls12381PSDockVerKeyName,
} from '../../../vc/custom_crypto';
import {
  BBSPublicKeyValue,
  BBSPlusPublicKeyValue,
  PSPublicKeyValue,
} from './value';
import {
  CheqdOffchainSignatureParamsRef,
  DockOffchainSignatureParamsRef,
} from './ref';

export class OffchainSignaturePublicKey extends TypedEnum {
  get bytes() {
    return this.value.bytes;
  }

  get paramsRef() {
    return this.value.paramsRef;
  }

  get curveType() {
    return this.value.curveType;
  }

  get participantId() {
    return this.value.participantId;
  }
}
export class BBSPublicKey extends OffchainSignaturePublicKey {
  static Class = BBSPublicKeyValue;

  static Type = 'bbs';

  static VerKeyType = Bls12381BBS23DockVerKeyName;
}
export class BBSPlusPublicKey extends OffchainSignaturePublicKey {
  static Class = BBSPlusPublicKeyValue;

  static Type = 'bbsPlus';

  static VerKeyType = Bls12381BBSDockVerKeyName;
}
export class PSPublicKey extends OffchainSignaturePublicKey {
  static Class = PSPublicKeyValue;

  static Type = 'ps';

  static VerKeyType = Bls12381PSDockVerKeyName;
}

OffchainSignaturePublicKey.bindVariants(
  BBSPublicKey,
  BBSPlusPublicKey,
  PSPublicKey,
);

export class DockOffchainSignaturePublicKey extends withProp(
  OffchainSignaturePublicKey,
  'paramsRef',
  DockOffchainSignatureParamsRef,
) {}

export class CheqdOffchainSignaturePublicKey extends withProp(
  OffchainSignaturePublicKey,
  'paramsRef',
  CheqdOffchainSignatureParamsRef,
) {}

export * from './value';
export * from './ref';
