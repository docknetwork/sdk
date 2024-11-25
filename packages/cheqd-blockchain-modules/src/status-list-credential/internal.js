import {
  StatusListCredential,
  CheqdStatusListCredentialId,
  CheqdStatusListCredentialWithId,
} from '@docknetwork/credential-sdk/types';
import { option } from '@docknetwork/credential-sdk/types/generic';
import { stringToU8a, maybeToJSONString } from '@docknetwork/credential-sdk/utils';
import { CheqdCreateResource, createInternalCheqdModule } from '../common';

const methods = {
  create: (statusListCredentialId, rawStatusListCredential) => {
    const [did, id] = CheqdStatusListCredentialId.from(statusListCredentialId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      '1.0',
      [],
      id,
      'status-list-credential',
      stringToU8a(maybeToJSONString(StatusListCredential.from(rawStatusListCredential))),
    );
  },
  update: (statusListCredentialId, statusListCredential) => {
    const [did, id] = CheqdStatusListCredentialId.from(statusListCredentialId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      '1.0',
      [],
      id,
      'status-list-credential',
      stringToU8a(maybeToJSONString(StatusListCredential.from(rawStatusListCredential))),
    );
  },
  remove: (statusListCredentialId) => {
    const [did, id] = CheqdStatusListCredentialId.from(statusListCredentialId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      '1.0',
      [],
      id,
      'status-list-credential',
      null,
    );
  }
};

export default class CheqdInternalStatusListCredentialModule extends createInternalCheqdModule(
  methods,
) {
  static Prop = 'resource';

  static MsgNames = {
    create: 'MsgCreateResource',
    update: 'MsgCreateResource',
    remove: 'MsgCreateResource'
  };

  async lastStatusListCredentialId(id) {
    const [did, name] = CheqdStatusListCredentialId.from(id).value;

    const res = await this.latestResourceMetadataBy(
      did,
      (meta) => meta.name === String(name),
    );

    return res?.id;
  }

  async statusListCredential(id) {
    const item = await this.resource(...this.lastStatusListCredentialId(id));

    return option(StatusListCredential).from(
      item && JSON.parse(u8aToString(item.resource.data)),
    );
  }
}
