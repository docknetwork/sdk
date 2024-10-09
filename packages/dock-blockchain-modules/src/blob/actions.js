import {
  TypedStruct,
  TypedNumber,
} from '@docknetwork/credential-sdk/types/generic';
import { BlobWithDockId } from './types';

export class AddBlob extends TypedStruct {
  static Classes = {
    blob: BlobWithDockId,
    nonce: class Nonce extends TypedNumber {},
  };
}
