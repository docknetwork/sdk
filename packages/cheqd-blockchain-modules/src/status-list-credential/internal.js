import { CheqdCreateResource } from '@docknetwork/credential-sdk/types';
import { StatusList2021Credential } from '@docknetwork/credential-sdk/vc';
import { TypedUUID } from '@docknetwork/credential-sdk/types/generic';
import {
  stringToU8a,
  maybeToJSONStringBytes,
  u8aToString,
} from '@docknetwork/credential-sdk/utils';
import { createInternalCheqdModule, validateResource } from '../common';

const Type = 'status-list-credential';

const methods = {
  create(statusListCredentialId, rawStatusListCredential) {
    const { StatusListCredentialId } = this.types;

    const [did, id] = StatusListCredentialId.from(statusListCredentialId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      '1.0',
      [],
      String(id),
      Type,
      maybeToJSONStringBytes(
        StatusList2021Credential.fromJSON(rawStatusListCredential),
      ),
    );
  },
  update(statusListCredentialId, statusListCredential) {
    const { StatusListCredentialId } = this.types;

    const [did, id] = StatusListCredentialId.from(statusListCredentialId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      '1.0',
      [],
      String(id),
      Type,
      maybeToJSONStringBytes(
        StatusList2021Credential.fromJSON(statusListCredential),
      ),
    );
  },
  remove(statusListCredentialId) {
    const { StatusListCredentialId } = this.types;

    const [did, id] = StatusListCredentialId.from(statusListCredentialId).value;

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
    const { StatusListCredentialId } = this.types;

    const [did, name] = StatusListCredentialId.from(id).value;

    const res = await this.latestResourceMetadataBy(
      did,
      (meta) => meta.name === String(name),
    );

    return res?.id;
  }

  async statusListCredential(statusListCredentialId) {
    const { StatusListCredentialId } = this.types;

    const credId = StatusListCredentialId.from(statusListCredentialId);

    const [did, name] = credId.value;
    const versionId = await this.lastStatusListCredentialId(credId);
    if (versionId == null) {
      return null;
    }
    const json = JSON.parse(
      u8aToString(
        validateResource(
          await this.resource(did, versionId),
          String(name),
          Type,
        ),
      ),
    );
    if (json == null) {
      return null;
    }

    return StatusList2021Credential.fromJSON(json);
  }
}
