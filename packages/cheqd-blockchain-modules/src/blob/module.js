import AbstractBlobModule from '@docknetwork/credential-sdk/modules/abstract/blob/module';
import { NoBlobError } from '@docknetwork/credential-sdk/modules/abstract/blob/errors';
import { CheqdBlobId } from '@docknetwork/credential-sdk/types';
import { injectCheqd } from '../common';
import CheqdInternalBlobModule from './internal';
import { OwnerWithBlob } from './types';

export default class CheqdBlobModule extends injectCheqd(AbstractBlobModule) {
  static CheqdOnly = CheqdInternalBlobModule;

  /**
   * Write a new blob on chain.
   * @param blob
   * @param signerDid - Signer of the blob
   * @param signingKeyRef - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @returns {Promise<*>}
   */
  async newTx(blobWithId, targetDid, didKeypair) {
    return await this.cheqdOnly.tx.new(blobWithId, targetDid, didKeypair);
  }

  async get(blobId) {
    const id = CheqdBlobId.from(blobId);
    const blob = await this.cheqdOnly.blob(id);

    if (blob == null) {
      throw new NoBlobError(id);
    }

    return new OwnerWithBlob(id.value[0], blob);
  }
}
