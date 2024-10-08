import { TypedEnum } from '../generic';
import { OffchainDidDetailsValue } from './offchain';
import { StoredOnchainDidDetailsValue } from './onchain';

export * from './onchain';
export * from './offchain';
export * from './document';

export class StoredDidDetails extends TypedEnum {}

export class StoredOnchainDidDetails extends StoredDidDetails {
  static Type = 'onChain';

  static Class = StoredOnchainDidDetailsValue;
}
export class StoredOffchainDidDetails extends StoredDidDetails {
  static Type = 'offChain';

  static Class = OffchainDidDetailsValue;
}

StoredDidDetails.bindVariants(
  StoredOnchainDidDetails,
  StoredOffchainDidDetails,
);
