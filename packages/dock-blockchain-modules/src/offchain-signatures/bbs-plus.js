/* eslint-disable camelcase */

import {
  BBSPlusPublicKey,
  BBSPlusParams,
} from '@docknetwork/credential-sdk/types';
import DockOffchainSignaturesModule from './module';
import DockInternalOffchainSignaturesModule from './internal';

/** Class to write `BBS+` parameters and keys on chain */
export default class DockBBSPlusModule extends DockOffchainSignaturesModule {
  static DockOnly = class DockInternalBBSPlusModuleOverrides extends DockInternalOffchainSignaturesModule {
    static PublicKey = BBSPlusPublicKey;

    static Params = BBSPlusParams;
  };
}
