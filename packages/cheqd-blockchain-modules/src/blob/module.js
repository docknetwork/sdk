import { AbstractBlobModule } from '@docknetwork/credential-sdk/modules';
import { NoBlobError } from '@docknetwork/credential-sdk/modules/abstract/blob';
import { CheqdBlobId } from '@docknetwork/credential-sdk/types';
import { injectCheqd } from '../common';
import CheqdInternalBlobModule from './internal';
import { OwnerWithBlob } from './types';

export default class CheqdBlobModule extends injectCheqd(AbstractBlobModule) {
  static CheqdOnly = CheqdInternalBlobModule;

  /**
   * Write a new blob on chain.
   * @param blobWithId
   * @param didKeypair - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @returns {Promise<*>}
   */
  async newTx(blobWithId, didKeypair) {
    return await this.cheqdOnly.tx.new(blobWithId, didKeypair);
  }

  /**
   *
   * @param {*} blobId
   * @returns {OwnerWithBlob}
   */
  async get(blobId) {
    const id = CheqdBlobId.from(blobId);
    const blob = await this.cheqdOnly.blob(id);

    if (blob == null) {
      throw new NoBlobError(id);
    }

    return new OwnerWithBlob(id.value[0], blob);
  }
}
