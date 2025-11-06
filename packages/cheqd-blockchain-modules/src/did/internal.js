import {
  DIDDocument,
  CheqdDeactivateDidDocument,
} from '@docknetwork/credential-sdk/types';
import { TypedUUID } from '@docknetwork/credential-sdk/types/generic';
import { createInternalCheqdModule } from '../common';

function createOrUpdateDidDocument(document) {
  return DIDDocument.from(document).toCheqd(this.types.DidDocument);
}
function deactivateDidDocument(id) {
  return new CheqdDeactivateDidDocument(
    this.types.Did.from(id),
    TypedUUID.random(),
  );
}

const methods = {
  createDidDocument: createOrUpdateDidDocument,
  updateDidDocument: createOrUpdateDidDocument,
  deactivateDidDocument,
};

export class CheqdDIDModuleInternal extends createInternalCheqdModule(methods) {
  static MsgNames = {
    createDidDocument: 'MsgCreateDidDoc',
    updateDidDocument: 'MsgUpdateDidDoc',
    deactivateDidDocument: 'MsgDeactivateDidDoc',
  };

  async getDidDocumentWithMetadata(did) {
    return await this.apiProvider.sdk.querier.did.queryDidDoc({
      didUrl: String(this.types.Did.from(did)),
    });
  }
}
