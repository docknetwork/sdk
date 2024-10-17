import { Any, TypedStruct, withProp } from '../generic';
import { CheqdBlobId, DockBlobId } from './blob-id';
import Blob from './blob';

export * from './blob-id';
export { default as Blob } from './blob';

export class BlobWithId extends TypedStruct {
  static Classes = {
    id: Any,
    blob: Blob,
  };
}

export class CheqdBlobWithId extends withProp(BlobWithId, 'id', CheqdBlobId) {}
export class DockBlobWithId extends withProp(BlobWithId, 'id', DockBlobId) {}
