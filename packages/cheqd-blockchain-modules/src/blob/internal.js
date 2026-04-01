import {
  Blob,
  CheqdBlobWithId,
  CheqdCreateResource,
} from '@docknetwork/credential-sdk/types';
import { createInternalCheqdModule, validateResource } from '../common';

const Name = 'Blob';
const Type = 'blob';

const methods = {
  new: (blobWithId) => {
    const {
      blob,
      id: [did, uuid],
    } = CheqdBlobWithId.from(blobWithId);

    return new CheqdCreateResource(
      did.value.value,
      uuid,
      '1.0',
      [],
      Name,
      Type,
      blob,
    );
  },
};

export default class CheqdInternalBlobModule extends createInternalCheqdModule(
  methods,
) {
  static MsgNames = {
    new: 'MsgCreateResource',
  };

  async blob(blobId) {
    const { BlobId } = this.types;

    return Blob.from(
      validateResource(
        await this.resource(...BlobId.from(blobId).value),
        Name,
        Type,
      ),
    );
  }
}
