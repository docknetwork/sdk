import { isHexWithGivenByteSize } from '../utils/codec';

const SessionKeyByteSize = 64;
const MaxActiveValidators = 10;

/** Thin wrapper over PoA module to work with Proof of Authority nodes. This is only useful for sudo or Master
 * The methods return a transaction which can be sent by sudo (when testing) or Master.
*/
class PoAModule {
  // TODO: Once the Substrate and polkadot-js PRs are approved, check that addresses are valid Dock addresses.
  // Will have to declare mode for testnet and mainnet.

  /**
   * Creates a new instance of PoAModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api) {
    this.api = api;
    this.module = api.tx.poAModule;
  }

  /**
   * Set session key for a validator
   * @param {string} validatorAddress - validator's account
   * @param {string} sessionKey - session key of the validator
   * @return {object} The extrinsic to sign and send.
   */
  setSessionKey(validatorAddress, sessionKey) {
    if (!isHexWithGivenByteSize(sessionKey, SessionKeyByteSize)) {
      throw new Error(`Session key must be in hex and of ${SessionKeyByteSize} bytes`);
    }
    return this.module.setSessionKey(validatorAddress, sessionKey);
  }

  /**
   * Set maximum active validators
   * @param {number} count - The number of allowed validators
   * @returns {object} The extrinsic to sign and send.
   */
  setMaxActiveValidators(count) {
    if (!Number.isInteger(count) || count < 1 || count > MaxActiveValidators) {
      throw new Error(`Count must an integer between 1 and ${MaxActiveValidators}`);
    }
    return this.module.setMaxActiveValidators(count);
  }

  // The following 2 methods can be combined into one by making them accept a boolean argument but
  // as they are potentially dangerous operations, being very explicit.

  /**
   * Enable emission rewards.
   * @returns {object} The extrinsic to sign and send.
   */
  enableEmissions() {
    return this.module.setEmissionStatus(true);
  }

  /**
   * Disable emission rewards.
   * @returns {object} The extrinsic to sign and send.
   */
  disableEmissions() {
    return this.module.setEmissionStatus(false);
  }

  /**
   * Set minimum epoch length in terms of slots
   * @param {number} length - Number of slots
   * @returns {object} The extrinsic to sign and send.
   */
  setMinEpochLength(length) {
    if (!Number.isInteger(length) || length < 1) {
      throw new Error('length must an integer > 0');
    }
    return this.module.setMinEpochLength(length);
  }

  /**
   * Set maximum emission rewards per validator per epoch
   * @param {number} rewards - Amount of rewards
   * @returns {object} The extrinsic to sign and send.
   */
  setMaxEmissionRewardsPerValidatorForEpoch(rewards) {
    if (!Number.isInteger(rewards) || rewards < 0) {
      throw new Error('Rewards must be a positive integer');
    }
    return this.module.setMaxEmmValidatorEpoch(rewards);
  }

  /**
   * Set lock percentage of validator's emission rewards per epoch.
   * @param {number} lockPercent - Percentage of validator rewards
   * @returns {*}
   */
  setValidatorRewardLockPercent(lockPercent) {
    if (!Number.isInteger(lockPercent) || lockPercent < 0 || lockPercent > 100) {
      throw new Error('Lock percentage must a positive integer in [0, 100]');
    }
    return this.module.setValidatorRewardLockPc(lockPercent);
  }

  /**
   * Set treasury's emission reward percentage per epoch.
   * @param {number} rewardPercent - Percentage of epoch reward
   * @returns {*}
   */
  setTreasuryRewardPercent(rewardPercent) {
    if (!Number.isInteger(rewardPercent) || rewardPercent < 0 || rewardPercent > 100) {
      throw new Error('Reward percentage must a positive integer in [0, 100]');
    }
    return this.module.setTreasuryRewardPc(rewardPercent);
  }

  /**
   * Transfer funds from treasury to the recipient.
   * @param {string} recipientAddress - Address of the recipient
   * @param {number} amount
   * @returns {object} The extrinsic to sign and send.
   */
  withDrawFromTreasury(recipientAddress, amount) {
    if (!Number.isInteger(amount) || amount < 1) {
      throw new Error('Amount must be a positive integer > 0');
    }
    return this.module.withdrawFromTreasury(recipientAddress, amount);
  }

  /**
   * Add a new validator.
   * @param {string} validatorAddress - Address of the validator
   * @param {bool} shortCircuit - If true, don't wait till the end of epoch to add else wait for current epoch to finish
   * @returns {object} The extrinsic to sign and send.
   */
  addValidator(validatorAddress, shortCircuit) {
    return this.module.addValidator(validatorAddress, shortCircuit);
  }

  /**
   * Remove an existing validator.
   * @param {string} validatorAddress - Address of the validator
   * @param {bool} shortCircuit - If true, don't wait till the end of epoch to add else wait for current epoch to finish
   * @returns {object} The extrinsic to sign and send.
   */
  removeValidator(validatorAddress, shortCircuit) {
    return this.module.removeValidator(validatorAddress, shortCircuit);
  }

  /**
   * Swap an existing validator for a new one. Takes effect immediately.
   * @param {string} swapOutValidator - Address of the validator to remove
   * @param {string} swapInValidator - Address of the validator to add
   * @returns {object} The extrinsic to sign and send.
   */
  swapValidator(swapOutValidator, swapInValidator) {
    return this.module.swapValidator(swapOutValidator, swapInValidator);
  }

  /**
   * Get the free and reserved balance of the account. Useful when checking unlocked and locked balance of the validator.
   * @param {string} account
   * @returns {Promise<Array>} - A 2-element array where the first is the free (unlocked) balance and the second is the
   * reserved (locked) balance.
   */
  async getBalance(account) {
    const { data: balance } = await this.api.query.system.account(account);
    return [balance.free.toHex(), balance.reserved.toHex()];
  }
}

export default PoAModule;
