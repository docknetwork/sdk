import { CheqdDid, Iri } from '@docknetwork/credential-sdk/types';
import { TypedUUID, option } from '@docknetwork/credential-sdk/types/generic';
import { CheqdCreateResource, createInternalCheqdModule } from '../common';

const methods = {
  setClaim: (iri, targetDid) => new CheqdCreateResource(
    targetDid.value,
    TypedUUID.random(),
    '1.0',
    [],
    'Attestation',
    'attest',
    Iri.from(iri),
  ),
};

export default class CheqdInternalAttestModule extends createInternalCheqdModule(
  methods,
) {
  static Prop = 'resource';

  static MsgNames = {
    setClaim: 'MsgCreateResource',
  };

  async attest(did, attestId) {
    const stringDid = CheqdDid.from(did).toEncodedString();
    const stringAttestId = String(TypedUUID.from(attestId));
    const item = await this.query.resource(stringDid, stringAttestId);

    return option(Iri).from(item?.resource?.data);
  }

  async attestId(did) {
    let resources = [];
    let paginationKey;

    do {
      // eslint-disable-next-line no-await-in-loop
      const res = await this.query.collectionResources(
        CheqdDid.from(did).toEncodedString(),
        paginationKey,
      );
      resources = resources.concat(
        res.resources.filter((resource) => resource.resourceType === 'attest'),
      );
      ({ paginationKey } = res);
    } while (!resources.length && paginationKey != null);

    return resources.find((resource) => !resource.nextVersionId)?.id;
  }
}
