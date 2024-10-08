import {
  DockDidOrDidMethodKey,
  Blob,
  BlobWithId,
} from '@docknetwork/credential-sdk/types';
import { DockBlobId } from '@docknetwork/credential-sdk/types/blob/blob-id';
import {
  TypedTuple,
  withProp,
} from '@docknetwork/credential-sdk/types/generic';

export class OwnerWithBlob extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, Blob];
}

export class BlobWithDockId extends withProp(BlobWithId, 'id', DockBlobId) {}
