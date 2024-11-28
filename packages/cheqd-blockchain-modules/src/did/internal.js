import { CheqdDid } from '@docknetwork/credential-sdk/types/did/onchain/typed-did';
import {
  TypedUUID,
  TypedStruct,
} from '@docknetwork/credential-sdk/types/generic';
import { DIDDocument } from '@docknetwork/credential-sdk/types/did';
import { createInternalCheqdModule } from '../common';

const parseDocument = (document) => DIDDocument.from(document).toCheqd();

class DeactivateDidDocument extends TypedStruct {
  static Classes = {
    id: CheqdDid,
    versionId: TypedUUID,
  };
}

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
    return await this.query.didDoc(String(CheqdDid.from(did)));
  }
}
