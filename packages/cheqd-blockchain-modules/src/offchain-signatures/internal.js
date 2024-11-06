import { CheqdCreateResource, createInternalCheqdModule } from '../common';

const methods = {
  addParams: (id, params, did) => new CheqdCreateResource(
    did.value.value,
    id,
    '1.0',
    [],
    'OffchainSignatures',
    'offchain-signature-params',
    params.toJSON(),
  )
};

export default class CheqdInternalOffchainSignatures extends createInternalCheqdModule(
  methods,
) {
  static Prop = 'resource';

  static MsgNames = {
    addParams: 'MsgCreateResource',
  };

  filterMetadata(meta) {
    return meta.resourceType === 'offchain-signature-params';
  }
}
