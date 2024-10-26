import { AbstractBaseModule } from '../common';
import { withExtendedPrototypeProperties } from '../../../utils';

/** Class to create and update Blobs on chain. */
class AbstractBlobModule extends AbstractBaseModule {
  /**
   * Write a new blob on chain.
   * @param blobWithId
   * @param targetDid - Signer of the blob
   * @param signingKeyRef - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @returns {Promise<*>}
   */
  async new(blobWithId, targetDid, didKeypair, params = {}) {
    return await this.signAndSend(
      await this.newTx(blobWithId, targetDid, didKeypair),
      params,
    );
  }

  /**
   * Get blob with given id from the chain. Throws if the blob can't be found.
   * @param {string} id - Can either be a full blob id like blob:dock:0x... or just the hex identifier
   * @returns {Promise<Blob>} - A 2-element array where the first is the author and the second is the blob contents.
   */
  async get(_id) {
    throw new Error('Unimplemented');
  }
}

export default withExtendedPrototypeProperties(
  ['newTx', 'get'],
  AbstractBlobModule,
);
