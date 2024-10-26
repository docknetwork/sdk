import { NoBlobError } from '@docknetwork/credential-sdk/modules/abstract/blob/errors';
import { option } from '@docknetwork/credential-sdk/types/generic';
import { DockBlobId } from '@docknetwork/credential-sdk/types';
import { AbstractBlobModule } from '@docknetwork/credential-sdk/modules/abstract/blob';
import { injectDock } from '../common';
import { OwnerWithBlob } from './types';
import DockBlobModuleInternal from './internal';

/** Class to create and update Blobs on chain. */
export default class BlobModule extends injectDock(AbstractBlobModule) {
  static DockOnly = DockBlobModuleInternal;

  /**
   * Write a new blob on chain.
   * @param blob
   * @param signerDid - Signer of the blob
   * @param signingKeyRef - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @returns {Promise<*>}
   */
  async newTx(blobWithId, targetDid, didKeypair) {
    return await this.dockOnly.tx.new(blobWithId, targetDid, didKeypair);
  }

  /**
   * Get blob with given id from the chain. Throws if the blob can't be found.
   * @param {string} id - Can either be a full blob id like blob:dock:0x... or just the hex identifier
   * @returns {Promise<Array>} - A 2-element array where the first is the author and the second is the blob contents.
   */
  async get(id) {
    const blobId = DockBlobId.from(id).asDock;
    const resp = option(OwnerWithBlob).from(
      await this.dockOnly.query.blobs(blobId),
    );
    if (resp == null) {
      throw new NoBlobError(blobId);
    }

    return resp;
  }
}
