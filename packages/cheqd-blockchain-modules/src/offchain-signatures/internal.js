import injectParams from '../common/inject-params';

export default class CheqdOffchainSignaturesInternalModule extends injectParams(
  class {},
) {
  filterParamsMetadata(meta) {
    return meta.resourceType === 'offchain-signature-params';
  }
}
