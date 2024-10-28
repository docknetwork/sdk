import { AbstractBlobModule } from '../abstract';
import { BlobId, BlobWithId } from '../../types';
import { injectModuleRouter } from './common';

export default class MultiApiBlobModule extends injectModuleRouter(
  AbstractBlobModule,
) {
  /**
   * Write a new blob on chain.
   * @param blobWithId
   * @param targetDid - Signer of the blob
   * @param signingKeyRef - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @returns {Promise<*>}
   */
  async new(blobWithId, targetDid, didKeypair, params = {}) {
    const parsedBlobWithId = BlobWithId.from(blobWithId);

    return await this.moduleById(parsedBlobWithId.id).new(
      parsedBlobWithId,
      targetDid,
      didKeypair,
      params,
    );
  }

  /**
   * Write a new blob on chain.
   * @param blob
   * @param signerDid - Signer of the blob
   * @param signingKeyRef - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @returns {Promise<*>}
   */
  async newTx(blobWithId, targetDid, didKeypair) {
    const parsedBlobWithId = BlobWithId.from(blobWithId);

    return await this.moduleById(parsedBlobWithId.id).new(
      parsedBlobWithId,
      targetDid,
      didKeypair,
    );
  }

  /**
   * Get blob with given id from the chain. Throws if the blob can't be found.
   * @param {string} id - Can either be a full blob id like blob:dock:0x... or just the hex identifier
   * @returns {Promise<Blob>} - A 2-element array where the first is the author and the second is the blob contents.
   */
  async get(id) {
    const parsedId = BlobId.from(id);

    return await this.moduleById(parsedId).get(parsedId);
  }
}
