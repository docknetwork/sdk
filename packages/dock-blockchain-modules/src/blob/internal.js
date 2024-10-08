import { createInternalDockModule } from '../common';
import { AddBlob } from './actions';

const didMethods = {
  new: (blobWithId, _, __, nonce) => new AddBlob(blobWithId, nonce),
};

export default class DockBlobModuleInternal extends createInternalDockModule({
  didMethods,
}) {
  static Prop = 'blobStore';

  /**
   *  Maximum size of the blob in bytes
   */
  static BlobMaxByteSize = 8192;

  static MethodNameOverrides = {
    new: 'AddBlob',
  };
}
