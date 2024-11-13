import injectParams from '../common/inject-params';

export default class CheqdOffchainSignaturesInternalModule extends injectParams(
  class {},
) {
  filterMetadata(meta) {
    return meta.resourceType === 'offchain-signature-params';
  }
}
