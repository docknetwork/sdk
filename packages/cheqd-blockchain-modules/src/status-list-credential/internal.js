import {
  CheqdStatusListCredentialId,
  CheqdCreateResource,
} from '@docknetwork/credential-sdk/types';
import { StatusList2021Credential } from '@docknetwork/credential-sdk/vc';
import { option, TypedUUID } from '@docknetwork/credential-sdk/types/generic';
import { stringToU8a, maybeToJSONString, u8aToString } from '@docknetwork/credential-sdk/utils';
import { createInternalCheqdModule } from '../common';

const Type = 'status-list-credential';

const methods = {
  create: (statusListCredentialId, rawStatusListCredential) => {
    const [did, id] = CheqdStatusListCredentialId.from(statusListCredentialId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      '1.0',
      [],
      String(id),
      Type,
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
      Type,
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
      Type,
      stringToU8a('null'),
    );
  },
};

export default class CheqdInternalStatusListCredentialModule extends createInternalCheqdModule(
  methods,
) {
  static MsgNames = {
    create: 'MsgCreateResource',
    update: 'MsgCreateResource',
    remove: 'MsgCreateResource',
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
    const credId = CheqdStatusListCredentialId.from(statusListCredentialId);

    const [did, _] = credId.value;
    const item = await this.resource(did, await this.lastStatusListCredentialId(credId));

    return option(StatusList2021Credential).fromJSON(
      item && JSON.parse(u8aToString(item.resource.data)),
    );
  }
}
