import {
  AbstractDIDModule,
  NoDIDError,
} from '@docknetwork/credential-sdk/modules/did';
import {
  CheqdDIDDocument,
  CheqdDid,
} from '@docknetwork/credential-sdk/types/did';
import { DIDDocument } from '@docknetwork/credential-sdk/types';
import { CheqdDIDModuleInternal } from './internal';
import injectCheqd from '../common/inject-cheqd';
import CheqdAttestModule from '../attest/module';

export default class CheqdDIDModule extends injectCheqd(AbstractDIDModule) {
  static CheqdOnly = CheqdDIDModuleInternal;

  constructor(...args) {
    super(...args);

    this.attest = new CheqdAttestModule(...args);
  }

  async createDocumentTx(document, didSigners) {
    const didDocument = DIDDocument.from(document);
    if (didDocument.attests != null) {
      throw new Error(
        `Non-null \`attest\` was provided for DID document \`${didDocument.id}\`. Use \`attest\` module to set attestations.`,
      );
    }

    return await this.cheqdOnly.tx.createDidDocument(didDocument, didSigners);
  }

  async updateDocumentTx(document, didSigners) {
    const didDocument = DIDDocument.from(document);
    if (didDocument.attests != null) {
      const currentDocument = await this.getDocument(didDocument.id);

      if (!didDocument.attests.eq(currentDocument.attests)) {
        throw new Error(
          '`attests` modifications are not supported in the `updateDocument` transaction.',
        );
      }
    }

    return await this.cheqdOnly.tx.updateDidDocument(didDocument, didSigners);
  }

  async removeDocumentTx(document, didSigners) {
    return await this.cheqdOnly.tx.deactivateDidDocument(document, didSigners);
  }

  /**
   * Gets a DID from the Cheqd chain and create a DID document according to W3C spec.
   * Throws NoDID if the DID does not exist on chain.
   * @param {CheqdDid} did - The DID can be passed as fully qualified DID like `did:cheqd:UUID`
   * @return {Promise<DIDDocument>} The DID document.
   */
  async getDocument(did) {
    const cheqdDid = CheqdDid.from(did);

    let doc = null;
    try {
      const { didDoc, metadata } = await this.cheqdOnly.getDidDocumentWithMetadata(cheqdDid);

      if (!metadata.deactivated) {
        doc = didDoc;
      }
    } catch (err) {
      if (!String(err).includes(String(cheqdDid))) {
        throw err;
      }
    }
    if (doc == null) {
      throw new NoDIDError(cheqdDid);
    }

    return CheqdDIDDocument.from(doc)
      .toDIDDocument()
      .setAttests(await this.attest.getAttests(cheqdDid));
  }
}
