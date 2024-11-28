import {
  CheqdStatusListCredentialId,
  CheqdStatusListCredentialWithId
} from '@docknetwork/credential-sdk/types';
import { StatusList2021Credential } from '@docknetwork/credential-sdk/vc';
import { option, TypedUUID } from '@docknetwork/credential-sdk/types/generic';
import { stringToU8a, maybeToJSONString, u8aToString } from '@docknetwork/credential-sdk/utils';
import { CheqdCreateResource, createInternalCheqdModule } from '../common';

const methods = {
  create: (statusListCredentialId, rawStatusListCredential) => {
    const [did, id] = CheqdStatusListCredentialId.from(statusListCredentialId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      '1.0',
      [],
      String(id),
      'status-list-credential',
      stringToU8a(maybeToJSONString(StatusList2021Credential.fromJSON(rawStatusListCredential))),
    );
  },
  update: (statusListCredentialId, statusListCredential) => {
    const [did, id] = CheqdStatusListCredentialId.from(statusListCredentialId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      '1.0',
      [],
      String(id),
      'status-list-credential',
      stringToU8a(maybeToJSONString(StatusList2021Credential.fromJSON(statusListCredential))),
    );
  },
  remove: (statusListCredentialId) => {
    const [did, id] = CheqdStatusListCredentialId.from(statusListCredentialId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      '1.0',
      [],
      String(id),
      'status-list-credential',
      stringToU8a('null'),
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

  async statusListCredential(statusListCredentialId) {
    const [did, id] = CheqdStatusListCredentialId.from(statusListCredentialId).value;
    const item = await this.resource(did, await this.lastStatusListCredentialId(statusListCredentialId));

    return option(StatusList2021Credential).fromJSON(
      item && JSON.parse(u8aToString(item.resource.data)),
    );
  }
}
