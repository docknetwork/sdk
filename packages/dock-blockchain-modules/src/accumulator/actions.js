import {
  DockAccumulator,
  AccumulatorParams,
  DockAccumulatorPublicKey,
  DockAccumulatorIdIdent,
  DockAccumulatorPublicKeyRef,
  DockDidOrDidMethodKey,
} from '@docknetwork/credential-sdk/types';
import {
  TypedBytes,
  TypedStruct,
  option,
  TypedNumber,
  TypedArrayOfBytesArrays,
  TypedBytesArray,
} from '@docknetwork/credential-sdk/types/generic';

export class AddAccumulator extends TypedStruct {
  static Classes = {
    id: DockAccumulatorIdIdent,
    accumulator: DockAccumulator,
    nonce: TypedNumber,
  };
}

export class UpdateAccumulator extends TypedStruct {
  static Classes = {
    id: DockAccumulatorIdIdent,
    newAccumulated: class Accumulated extends TypedBytes {},
    additions: option(TypedArrayOfBytesArrays),
    removals: option(TypedArrayOfBytesArrays),
    witnessUpdateInfo: option(TypedBytesArray),
    nonce: TypedNumber,
  };
}

export class RemoveAccumulator extends TypedStruct {
  static Classes = {
    id: DockAccumulatorIdIdent,
    nonce: TypedNumber,
  };
}

export class AddAccumulatorPublicKey extends TypedStruct {
  static Classes = {
    publicKey: DockAccumulatorPublicKey,
    did: DockDidOrDidMethodKey,
    nonce: TypedNumber,
  };
}

export class RemoveAccumulatorPublicKey extends TypedStruct {
  static Classes = {
    keyRef: DockAccumulatorPublicKeyRef,
    did: DockDidOrDidMethodKey,
    nonce: TypedNumber,
  };
}

export class AddAccumulatorParams extends TypedStruct {
  static Classes = { params: AccumulatorParams, nonce: TypedNumber };
}

export class RemoveAccumulatorParams extends TypedStruct {
  static Classes = {
    paramsRef: DockAccumulatorPublicKeyRef,
    nonce: TypedNumber,
  };
}
