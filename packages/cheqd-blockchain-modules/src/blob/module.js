import { AbstractBlobModule } from '@docknetwork/credential-sdk/modules';
import { NoBlobError } from '@docknetwork/credential-sdk/modules/abstract/blob';
import { NoResourceError, injectCheqd } from '../common';
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
   * Retrieves blob with owner from chain.
   * Throws an error in case if blob with supplied identifier doesn't exist.
   * @param {*} blobId
   * @returns {OwnerWithBlob}
   */
  async get(blobId) {
    const { BlobId } = this.types;

    const id = BlobId.from(blobId);

    try {
      return new OwnerWithBlob(id.value[0], await this.cheqdOnly.blob(id));
    } catch (err) {
      throw err instanceof NoResourceError ? new NoBlobError(id) : err;
    }
  }
}
