import { AbstractBaseModule } from '../common';
import { withExtendedPrototypeProperties } from '../../../utils';

/** Class to create, update and destroy DIDs */
class AbstractDIDModule extends AbstractBaseModule {
  /**
   * Creates a new DID document.
   * @param {DIDDocument} didDocument - The DID Document to be created.
   * @param {DidKeypair} didKeypair - The keypair used for signing the transaction.
   * @param {Object} params - Additional parameters for creating the document (optional).
   * @returns {Promise<*>} - A promise that resolves when the creation is complete.
   */
  async createDocument(didDocument, didKeypair, params) {
    return await this.signAndSend(
      await this.createDocumentTx(didDocument, didKeypair),
      params,
    );
  }

  /**
   * Updates an existing DID document.
   * @param {DIDDocument} didDocument - The updated DID Document.
   * @param {DidKeypair} didKeypair - The keypair used for signing the transaction.
   * @param {Object} params - Additional parameters for updating the document (optional).
   * @returns {Promise<*>} - A promise that resolves when the update is complete.
   */
  async updateDocument(didDocument, didKeypair, params) {
    return await this.signAndSend(
      await this.updateDocumentTx(didDocument, didKeypair),
      params,
    );
  }

  /**
   * Removes a DID document.
   * @param {DockDid} did - The ID of the DID to be removed.
   * @param {DidKeypair} didKeypair - The keypair used for signing the transaction.
   * @param {Object} params - Additional parameters for removing the document (optional).
   * @returns {Promise<*>} - A promise that resolves when the removal is complete.
   */
  async removeDocument(did, didKeypair, params) {
    return await this.signAndSend(
      await this.removeDocumentTx(did, didKeypair),
      params,
    );
  }

  /**
   * Retrieves a DID document by ID.
   * @param {DockDid} did - The ID of the DID to be retrieved.
   * @returns {Promise<DIDDocument>} - A promise that resolves with the requested DID Document.
   */
  async getDocument(_did) {
    throw new Error('Unimplemented');
  }

  /**
   * Generates a transaction to create a new DID document.
   * @param {DIDDocument} didDocument - The DID Document to be created.
   * @param {DidKeypair} didKeypair - The keypair used for signing the transaction.
   * @returns {Promise<*>} - A promise that resolves with the generated transaction.
   */
  async createDocumentTx(_didDocument, _didKeypair) {
    throw new Error('Unimplemented');
  }

  /**
   * Generates a transaction to update an existing DID document.
   * @param {DIDDocument} didDocument - The updated DID Document.
   * @param {DidKeypair} didKeypair - The keypair used for signing the transaction.
   * @returns {Promise<*>} - A promise that resolves with the generated transaction.
   */
  async updateDocumentTx(_didDocument, _didKeypair) {
    throw new Error('Unimplemented');
  }

  /**
   * Generates a transaction to remove an existing DID document.
   * @param {DockDid} did - The ID of the DID to be removed.
   * @param {DidKeypair} didKeypair - The keypair used for signing the transaction.
   * @returns {Promise<*>} - A promise that resolves with the generated transaction.
   */
  async removeDocumentTx(_did, _didKeypair) {
    throw new Error('Unimplemented');
  }
}

export default withExtendedPrototypeProperties(
  ['createDocumentTx', 'updateDocumentTx', 'removeDocumentTx', 'getDocument'],
  AbstractDIDModule,
);
