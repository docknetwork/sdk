import { CheqdDid, Iri } from '@docknetwork/credential-sdk/types';
import { TypedUUID, option } from '@docknetwork/credential-sdk/types/generic';
import { CheqdCreateResource, createInternalCheqdModule } from '../common';

const methods = {
  setClaim: (iri, targetDid) => new CheqdCreateResource(
    CheqdDid.from(targetDid).value,
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
  static MsgNames = {
    setClaim: 'MsgCreateResource',
  };

  async attest(did, attestId) {
    return option(Iri).from(
      (await this.resource(did, attestId))?.resource?.data,
    );
  }

  async attestId(did) {
    const res = await this.latestResourceMetadataBy(
      did,
      (meta) => meta.resourceType === 'attest',
    );

    return res?.id;
  }
}
