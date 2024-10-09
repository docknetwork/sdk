import { Attest } from '@docknetwork/credential-sdk/types';
import {
  TypedStruct,
  TypedNumber,
} from '@docknetwork/credential-sdk/types/generic';

export class SetClaim extends TypedStruct {
  static Classes = {
    attest: Attest,
    nonce: TypedNumber,
  };
}
