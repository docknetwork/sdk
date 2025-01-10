import { CheqdParamsId } from '@docknetwork/credential-sdk/types';
import { createInternalCheqdModule, injectParams } from '../common';

export default class CheqdOffchainSignaturesInternalModule extends injectParams(
  createInternalCheqdModule(),
) {
  static ParamsId = CheqdParamsId;

  static ParamsName = 'OffchainParams';

  static ParamsType = 'offchain-signature-params';
}
