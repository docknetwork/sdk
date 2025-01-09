import {
  CheqdDid,
  DIDDocument,
  CheqdDeactivateDidDocument,
} from '@docknetwork/credential-sdk/types';
import { TypedUUID } from '@docknetwork/credential-sdk/types/generic';
import { createInternalCheqdModule } from '../common';

function parseDocument(document) {
  return DIDDocument.from(document).toCheqd(this.types.DidDocument);
}

const methods = {
  createDidDocument: parseDocument,
  updateDidDocument: parseDocument,
  deactivateDidDocument: (id) => new CheqdDeactivateDidDocument(id, TypedUUID.random()),
};

export class CheqdDIDModuleInternal extends createInternalCheqdModule(methods) {
  static MsgNames = {
    createDidDocument: 'MsgCreateDidDoc',
    updateDidDocument: 'MsgUpdateDidDoc',
    deactivateDidDocument: 'MsgDeactivateDidDoc',
  };

  async getDidDocumentWithMetadata(did) {
    return await this.apiProvider.sdk.querier.did.didDoc(
      String(CheqdDid.from(did)),
    );
  }
}
