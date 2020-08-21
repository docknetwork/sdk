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
   * Create extrinsic to set session key for a validator
   * @param {string} validatorAddress - validator's account
   * @param {string} sessionKey - session key of the validator
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @return {object} The extrinsic to sign and send.
   */
  setSessionKey(validatorAddress, sessionKey, asSudo = false) {
    if (!isHexWithGivenByteSize(sessionKey, SessionKeyByteSize)) {
      throw new Error(`Session key must be in hex and of ${SessionKeyByteSize} bytes`);
    }
    const txn = this.module.setSessionKey(validatorAddress, sessionKey);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Create extrinsic to set maximum active validators
   * @param {number} count - The number of allowed validators
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @returns {object} The extrinsic to sign and send.
   */
  setMaxActiveValidators(count, asSudo = false) {
    if (!Number.isInteger(count) || count < 1 || count > MaxActiveValidators) {
      throw new Error(`Count must an integer between 1 and ${MaxActiveValidators}`);
    }
    const txn = this.module.setMaxActiveValidators(count);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  // The following 2 methods can be combined into one by making them accept a boolean argument but
  // as they are potentially dangerous operations, being very explicit.

  /**
   * Create extrinsic to enable emission rewards.
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @returns {object} The extrinsic to sign and send.
   */
  enableEmissions(asSudo = false) {
    const txn = this.module.setEmissionStatus(true);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Create extrinsic to disable emission rewards.
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @returns {object} The extrinsic to sign and send.
   */
  disableEmissions(asSudo = false) {
    const txn = this.module.setEmissionStatus(false);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Create extrinsic to set minimum epoch length in terms of slots
   * @param {number} length - Number of slots
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @returns {object} The extrinsic to sign and send.
   */
  setMinEpochLength(length, asSudo = false) {
    if (!Number.isInteger(length) || length < 1) {
      throw new Error('length must an integer > 0');
    }
    const txn = this.module.setMinEpochLength(length);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Create extrinsic to set maximum emission rewards per validator per epoch
   * @param {number} rewards - Amount of rewards
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @returns {object} The extrinsic to sign and send.
   */
  setMaxEmissionRewardsPerValidatorForEpoch(rewards, asSudo = false) {
    if (!Number.isInteger(rewards) || rewards < 0) {
      throw new Error('Rewards must be a positive integer');
    }
    const txn = this.module.setMaxEmmValidatorEpoch(rewards);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Create extrinsic to set lock percentage of validator's emission rewards per epoch.
   * @param {number} lockPercent - Percentage of validator rewards
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @returns {object} The extrinsic to sign and send.
   */
  setValidatorRewardLockPercent(lockPercent, asSudo = false) {
    if (!Number.isInteger(lockPercent) || lockPercent < 0 || lockPercent > 100) {
      throw new Error('Lock percentage must a positive integer in [0, 100]');
    }
    const txn = this.module.setValidatorRewardLockPc(lockPercent);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Create extrinsic to set treasury's emission reward percentage per epoch.
   * @param {number} rewardPercent - Percentage of epoch reward
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @returns {object} The extrinsic to sign and send.
   */
  setTreasuryRewardPercent(rewardPercent, asSudo = false) {
    if (!Number.isInteger(rewardPercent) || rewardPercent < 0 || rewardPercent > 100) {
      throw new Error('Reward percentage must a positive integer in [0, 100]');
    }
    const txn = this.module.setTreasuryRewardPc(rewardPercent);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Create extrinsic to transfer funds from treasury to the recipient.
   * @param {string} recipientAddress - Address of the recipient
   * @param {number} amount
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @returns {object} The extrinsic to sign and send.
   */
  withDrawFromTreasury(recipientAddress, amount, asSudo = false) {
    if (!Number.isInteger(amount) || amount < 1) {
      throw new Error('Amount must be a positive integer > 0');
    }
    const txn = this.module.withdrawFromTreasury(recipientAddress, amount);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Create extrinsic to add a new validator.
   * @param {string} validatorAddress - Address of the validator
   * @param {boolean} shortCircuit - If true, don't wait till the end of epoch to add else wait for current epoch to finish
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @returns {object} The extrinsic to sign and send.
   */
  addValidator(validatorAddress, shortCircuit, asSudo = false) {
    const txn = this.module.addValidator(validatorAddress, shortCircuit);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Create extrinsic to remove an existing validator.
   * @param {string} validatorAddress - Address of the validator
   * @param {boolean} shortCircuit - If true, don't wait till the end of epoch to add else wait for current epoch to finish
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @returns {object} The extrinsic to sign and send.
   */
  removeValidator(validatorAddress, shortCircuit, asSudo = false) {
    const txn = this.module.removeValidator(validatorAddress, shortCircuit);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Create extrinsic to swap an existing validator for a new one. Takes effect immediately.
   * @param {string} swapOutValidator - Address of the validator to remove
   * @param {string} swapInValidator - Address of the validator to add
   * @param {boolean} asSudo - The extrinsic needs to be sent by sudo.
   * @returns {object} The extrinsic to sign and send.
   */
  swapValidator(swapOutValidator, swapInValidator, asSudo = false) {
    const txn = this.module.swapValidator(swapOutValidator, swapInValidator);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Create extrinsic to get the free and reserved balance of the account. Useful when checking unlocked and
   * locked balance of the validator.
   * @param {string} account
   * @returns {Promise<Array>} - A 2-element array where the first is the free (unlocked) balance and the second is the
   * reserved (locked) balance.
   */
  async getBalance(account) {
    const { data: balance } = await this.api.query.system.account(account);
    return [balance.free.toHex(), balance.reserved.toHex()];
  }

  /**
   * Takes an extrinsic and returns a modified extrinsic if it needs to be sent by sudo otherwise returns the given
   * extrinsic as it is
   * @param {object} txn - The extrinsic to send
   * @param {boolean} asSudo - If the extrinsic needs to be sent by sudo
   * @returns {object} The extrinsic to sign and send.
   */
  asSudoIfNeeded(txn, asSudo = false) {
    if (asSudo) {
      return this.api.tx.sudo.sudo(txn);
    }
    return txn;
  }
}

export default PoAModule;
