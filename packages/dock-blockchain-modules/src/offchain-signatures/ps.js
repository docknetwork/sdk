/* eslint-disable camelcase */

import { PSPublicKey, PSParams } from '@docknetwork/credential-sdk/types';
import DockOffchainSignaturesModule from './module';
import DockInternalOffchainSignaturesModule from './internal';

/** Class to write `Pointcheval-Sanders` parameters and keys on chain */
export default class PSModule extends DockOffchainSignaturesModule {
  static DockOnly = class DockInternalPSModuleOverrides extends DockInternalOffchainSignaturesModule {
    static PublicKey = PSPublicKey;

    static Params = PSParams;
  };
}
