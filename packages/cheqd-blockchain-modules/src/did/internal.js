import { CheqdDid } from '@docknetwork/credential-sdk/types/did/onchain/typed-did';
import {
  TypedUUID,
} from '@docknetwork/credential-sdk/types/generic';
import { DIDDocument } from '@docknetwork/credential-sdk/types/did';
import { createInternalCheqdModule, DeactivateDidDocument } from '../common';

const parseDocument = (document) => DIDDocument.from(document).toCheqd();

const methods = {
  createDidDocument: parseDocument,
  updateDidDocument: parseDocument,
  deactivateDidDocument: (id) => new DeactivateDidDocument(id, TypedUUID.random()),
};

export class CheqdDIDModuleInternal extends createInternalCheqdModule(methods) {
  static MsgNames = {
    createDidDocument: 'MsgCreateDidDoc',
    updateDidDocument: 'MsgUpdateDidDoc',
    deactivateDidDocument: 'MsgDeactivateDidDoc',
  };

  async getDidDocumentWithMetadata(did) {
    return await this.apiProvider.sdk.querier.did.didDoc(String(CheqdDid.from(did)));
  }
}
