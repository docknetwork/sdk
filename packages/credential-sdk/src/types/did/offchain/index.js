import { sized, TypedBytes, TypedStruct } from '../../generic';
import { OffChainDidDocRef } from './doc-ref';

export * from './doc-ref';
export * from './service-endpoint';

export class OffchainDidDetailsValue extends TypedStruct {
  static Classes = {
    accountId: class AccountId extends sized(TypedBytes) {
      static Size = 32;
    },
    docRef: OffChainDidDocRef,
  };
}
