import { AbstractDIDModule } from '../abstract';
import { DIDDocument, NamespaceDid } from '../../types';
import { injectModuleRouter } from './common';

export default class MultiApiDIDModule extends injectModuleRouter(
  AbstractDIDModule,
) {
  /**
   *
   * @param {DIDDocument} didDocument
   * @param {DidKeypair} didKeypair
   * @returns {Promise<void>}
   */
  async createDocument(didDocument, didKeypair, params) {
    const document = DIDDocument.from(didDocument);

    return await this.moduleById(document.id).createDocument(
      document,
      didKeypair,
      params,
    );
  }

  /**
   *
   * @param {DIDDocument} didDocument
   * @param {DidKeypair} didKeypair
   * @returns {Promise<void>}
   */
  async updateDocument(didDocument, didKeypair, params) {
    const document = DIDDocument.from(didDocument);

    return await this.moduleById(document.id).updateDocument(
      document,
      didKeypair,
      params,
    );
  }

  /**
   *
   * @param {*} did
   * @param {DidKeypair} didKeypair
   * @returns {Promise<void>}
   */
  async removeDocument(did, didKeypair, params) {
    const id = NamespaceDid.from(did);

    return await this.moduleById(id).removeDocument(id, didKeypair, params);
  }

  /**
   *
   * @param {*} did
   * @returns {Promise<DIDDocument>}
   */
  async getDocument(did) {
    const id = NamespaceDid.from(did);

    return await this.moduleById(id).getDocument(id);
  }

  /**
   *
   * @param {DIDDocument} didDocument
   * @param {DidKeypair} didKeypair
   * @returns {Promise<void>}
   */
  async createDocumentTx(didDocument, didKeypair) {
    const document = DIDDocument.from(didDocument);

    return await this.moduleById(document.id).createDocumentTx(
      document,
      didKeypair,
    );
  }

  /**
   *
   * @param {DIDDocument} didDocument
   * @param {DidKeypair} didKeypair
   * @returns {Promise<void>}
   */
  async updateDocumentTx(didDocument, didKeypair) {
    const document = DIDDocument.from(didDocument);

    return await this.moduleById(document.id).updateDocumentTx(
      document,
      didKeypair,
    );
  }

  /**
   *
   * @param {*} did
   * @param {DidKeypair} didKeypair
   * @returns {Promise<void>}
   */
  async removeDocumentTx(did, didKeypair) {
    const id = NamespaceDid.from(did);

    return await this.moduleById(id).removeDocumentTx(id, didKeypair);
  }
}
