import { AbstractBaseModule } from '../common';
import { withExtendedPrototypeProperties } from '../../../utils';

/** Class to create, update and destroy DIDs */
class AbstractDIDModule extends AbstractBaseModule {
  /**
   *
   * @param {DIDDocument} didDocument
   * @param {*} didKeypair
   * @param {DidKeypair} didKeypair
   * @returns {Promise<void>}
   */
  async createDocument(didDocument, didKeypair, params) {
    return await this.signAndSend(
      await this.createDocumentTx(didDocument, didKeypair),
      params,
    );
  }

  /**
   *
   * @param {DIDDocument} didDocument
   * @param {*} didKeypair
   * @param {DidKeypair} didKeypair
   * @returns {Promise<void>}
   */
  async updateDocument(didDocument, didKeypair, params) {
    return await this.signAndSend(
      await this.updateDocumentTx(didDocument, didKeypair),
      params,
    );
  }

  /**
   *
   * @param {*} did
   * @param {*} didKeypair
   * @param {DidKeypair} didKeypair
   * @returns {Promise<void>}
   */
  async removeDocument(did, didKeypair, params) {
    return await this.signAndSend(
      await this.removeDocumentTx(did, didKeypair),
      params,
    );
  }

  /**
   *
   * @param {*} did
   * @returns {Promise<DIDDocument>}
   */
  async getDocument(_did) {
    throw new Error('Unimplemented');
  }

  /**
   *
   * @param {DIDDocument} didDocument
   * @returns {Promise<void>}
   */
  async createDocumentTx(_didDocument, _didKeypair) {
    throw new Error('Unimplemented');
  }

  /**
   *
   * @param {DIDDocument} didDocument
   * @param {*} didKeypair
   * @param {DidKeypair} didKeypair
   * @returns {Promise<void>}
   */
  async updateDocumentTx(_didDocument, _didKeypair) {
    throw new Error('Unimplemented');
  }

  /**
   *
   * @param {*} did
   * @param {*} didKeypair
   * @param {DidKeypair} didKeypair
   * @returns {Promise<void>}
   */
  async removeDocumentTx(_did, _didKeypair) {
    throw new Error('Unimplemented');
  }
}

export default withExtendedPrototypeProperties(
  ['createDocumentTx', 'updateDocumentTx', 'removeDocumentTx', 'getDocument'],
  AbstractDIDModule,
);
