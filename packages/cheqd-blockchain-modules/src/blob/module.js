import AbstractBlobModule from '@docknetwork/credential-sdk/modules/blob/module';
import { NoBlobError } from '@docknetwork/credential-sdk/modules/blob/errors';
import { CheqdBlobId } from '@docknetwork/credential-sdk/types';
import { injectCheqd } from '../common';
import CheqdInternalBlobModule from './internal';
import { OwnerWithBlob } from './types';

export default class CheqdBlobModule extends injectCheqd(AbstractBlobModule) {
  static CheqdOnly = CheqdInternalBlobModule;

  async newTx(blobWithId, targetDid, didKeypair) {
    return await this.cheqdOnly.tx.new(blobWithId, targetDid, didKeypair);
  }

  async get(blobId) {
    const id = CheqdBlobId.from(blobId);
    const blob = await this.cheqdOnly.blob(id);

    if (blob == null) {
      throw new NoBlobError(id);
    }

    return new OwnerWithBlob(id[0], blob);
  }
}
