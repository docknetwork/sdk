import { AbstractOffchainSignaturesModule } from '@docknetwork/credential-sdk/modules/abstract';
import { OffchainSignatureParams } from '@docknetwork/credential-sdk/types';
import { injectCheqd, withParams } from '../common';
import CheqdOffchainSignaturesInternalModule from './internal';

export default class CheqdOffchainSignaturesModule extends withParams(
  injectCheqd(AbstractOffchainSignaturesModule),
) {
  static CheqdOnly = class extends CheqdOffchainSignaturesInternalModule {
    static Params = OffchainSignatureParams;
  };
}
