import {
  TypedStruct,
  TypedNumber,
} from '@docknetwork/credential-sdk/types/generic';
import { DockBlobWithId } from '@docknetwork/credential-sdk/types';

export class AddBlob extends TypedStruct {
  static Classes = {
    blob: DockBlobWithId,
    nonce: class Nonce extends TypedNumber {},
  };
}
