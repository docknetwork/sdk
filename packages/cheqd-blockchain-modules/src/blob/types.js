import { CheqdDid, Blob } from '@docknetwork/credential-sdk/types';
import { TypedTuple } from '@docknetwork/credential-sdk/types/generic';

export class OwnerWithBlob extends TypedTuple {
  static Classes = [CheqdDid, Blob];
}
