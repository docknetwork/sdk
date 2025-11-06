import {
  DIDDocument,
  CheqdDeactivateDidDocument,
} from '@docknetwork/credential-sdk/types';
import { TypedUUID } from '@docknetwork/credential-sdk/types/generic';
import { DIDModule } from '@cheqd/sdk';
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
    // TODO: use sdk.methods.queryDidDoc eventually, but that requires an SDK did doc refactor
    // for now we can just gather the context through toSpecCompliantPayload
    const result = await this.apiProvider.sdk.querier.did.didDoc(
      String(this.types.Did.from(did)),
    );

    if (result?.didDoc) {
      const compliantDoc = await DIDModule.toSpecCompliantPayload(result.didDoc);
      result.didDoc.context = compliantDoc['@context'];
    }
    return result;
  }
}
