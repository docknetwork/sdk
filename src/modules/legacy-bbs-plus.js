/* eslint-disable camelcase */

import OffchainSignaturesModule from './offchain-signatures';

const LEGACY_STATE_CHANGES = {
  AddParams: 'AddBBSPlusParams',
  RemoveParams: 'RemoveBBSPlusParams',
  AddPublicKey: 'AddBBSPlusPublicKey',
  RemovePublicKey: 'RemoveBBSPlusPublicKey',
};

const LEGACY_METHODS = {
  Params: 'bbsPlusParams',
  PublicKeys: 'bbsPlusKeys',
};

/** Legacy class to write `BBS+` parameters and keys on chain.
 * Use to interact with chains without offchain signatures module.
 */
export default class LegacyBBSPlusModule extends OffchainSignaturesModule {
  constructor(...args) {
    super(...args);
    this.moduleName = 'bbsPlus';
    this.module = this.api.tx[this.moduleName];
    this.methods = LEGACY_METHODS;
    this.stateChanges = LEGACY_STATE_CHANGES;
  }
}
