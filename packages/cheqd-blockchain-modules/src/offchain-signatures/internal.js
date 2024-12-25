import { createInternalCheqdModule, injectParams } from '../common';

export default class CheqdOffchainSignaturesInternalModule extends injectParams(
  createInternalCheqdModule(),
) {
  static ParamsName = 'OffchainParams';

  static ParamsType = 'offchain-signature-params';
}
