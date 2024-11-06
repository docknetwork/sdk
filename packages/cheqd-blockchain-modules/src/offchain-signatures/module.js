import { AbstractOffchainSignaturesModule } from '@docknetwork/credential-sdk/modules/abstract';
import { OffchainSignatureParams } from '@docknetwork/credential-sdk/types';
import { injectCheqd, withParams } from '../common';
import CheqdInternalOffchainSignaturesModule from './internal';

export default class CheqdOffchainSignaturesModule extends withParams(injectCheqd(AbstractOffchainSignaturesModule)) {
  static CheqdOnly = class extends CheqdInternalOffchainSignaturesModule {
    static Params = OffchainSignatureParams;
  }
}
