import { TypedTuple } from '../generic';
import {
  OffchainSignatureParams,
  OffchainSignatureParamsValue,
} from './params';
import {
  OffchainSignaturePublicKey,
  OffchainSignaturePublicKeyValue,
} from './public-keys';

export * from './params';
export * from './public-keys';
export * from './curve-type';

export class OffchainSignaturePublicKeyWithParams extends TypedTuple {
  static Classes = [OffchainSignaturePublicKey, OffchainSignatureParams];
}

export class OffchainSignaturePublicKeyValueWithParamsValue extends TypedTuple {
  static Classes = [
    OffchainSignaturePublicKeyValue,
    OffchainSignatureParamsValue,
  ];
}
