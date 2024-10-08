import { TypedStruct } from '../generic';
import { BlobId } from './blob-id';
import Blob from './blob';

export * from './blob-id';
export { default as Blob } from './blob';

export class BlobWithId extends TypedStruct {
  static Classes = {
    id: BlobId,
    blob: Blob,
  };
}
