import { TypedStruct, withProp } from '../generic';
import { BlobId, CheqdBlobIdValue, DockBlobIdValue } from './blob-id';
import Blob from './blob';

export * from './id';
export { default as Blob } from './blob';

export class BlobWithId extends TypedStruct {
  static Classes = {
    id: BlobId,
    blob: Blob,
  };
}

export class CheqdBlobWithId extends withProp(
  BlobWithId,
  'id',
  CheqdBlobIdValue,
) {}
export class DockBlobWithId extends withProp(
  BlobWithId,
  'id',
  DockBlobIdValue,
) {}
