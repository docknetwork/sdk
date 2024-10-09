/* eslint-disable camelcase */

import { BBSPublicKey, BBSParams } from '@docknetwork/credential-sdk/types';
import DockOffchainSignaturesModule from './module';
import DockInternalOffchainSignaturesModule from './internal';

/** Class to write `BBS` parameters and keys on chain */
export default class BBSModule extends DockOffchainSignaturesModule {
  static DockOnly = class DockInternalBBSModuleOverrides extends DockInternalOffchainSignaturesModule {
    static PublicKey = BBSPublicKey;

    static Params = BBSParams;
  };
}
