import { BBSParams } from '@docknetwork/credential-sdk/types';
import CheqdOffchainSignaturesInternalModule from './internal';
import CheqdOffchainSignaturesModule from './module';

export default class CheqdBBSModule extends CheqdOffchainSignaturesModule {
  static CheqdOnly = class extends CheqdOffchainSignaturesInternalModule {
    static Params = BBSParams;
  };
}
