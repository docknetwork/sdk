import { BTreeMap } from '@polkadot/types';
import { bnToBn } from '@polkadot/util';

const MaxAllowedMigrations = 65535;

class TokenMigration {
  /**
   * Creates a new instance of TokenMigration and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api) {
    this.api = api;
    this.module = api.tx.migrationModule;
  }

  addMigrator(migratorId, allowedMigrations, asSudo = false) {
    if (!Number.isInteger(allowedMigrations) || allowedMigrations < 1 || allowedMigrations > MaxAllowedMigrations) {
      throw new Error(`allowedMigrations must an integer between 1 and ${MaxAllowedMigrations}`);
    }
    const txn = this.module.addMigrator(migratorId, allowedMigrations);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  removeMigrator(migratorId, asSudo = false) {
    const txn = this.module.removeMigrator(migratorId);
    return this.asSudoIfNeeded(txn, asSudo);
  }

  /**
   * Accepts recipients as an BTreeMap of address -> amount
   * @param {*} recipients
   */
  migrate(recipients) {
    return this.api.tx.migrationModule.migrate(recipients);
  }

  /**
   * Accepts recipients as an array of pairs, each pair is (address, amount). Amount can either be a safe JS integer
   * or a string which will be expected in decimal format. If an address is repeated, its intended amounts are added.
   * @param {*} recipients
   */
  migrateRecipAsList(recipients) {
    // @ts-ignore
    const recipMap = new BTreeMap();
    [...recipients].sort().forEach(([address, amount]) => {
      const existingVal = recipMap.get(address);
      let value = amount;
      if (existingVal !== undefined) {
        // The list in argument repeated addresses. Convert both existing and new values to big number and add.
        // An alternative could be trying to parse both as either safe integer (`Number.isSafeInteger`) and then checking
        // if no overflow happens on add and if it does then try to convert to BN
        const newVal = bnToBn(amount);
        // @ts-ignore
        const oldVal = bnToBn(existingVal);
        const sum = newVal.add(oldVal);
        // Convert to string decimal representation.
        value = sum.toString();
      }
      recipMap.set(address, value);
    });
    return this.api.tx.migrationModule.migrate(recipMap);
  }

  /**
   * swapBonuses should be an array of arrays with each inner array of size 3 where first item is recipient account, 2nd item is bonus amount and 3rd item is offset (u32)
   * vestingBonuses should be an array of arrays with each inner array of size 3 where first item is recipient account, 2nd item is bonus amount and 3rd item is offset (u32)
   * @param {*} swapBonuses
   * @param {*} vestingBonuses
   */
  giveBonuses(swapBonuses, vestingBonuses) {
    return this.api.tx.migrationModule.giveBonuses(swapBonuses, vestingBonuses);
  }

  /**
   * Claim bonus for itself
   */
  claimBonus() {
    return this.api.tx.migrationModule.claimBonus();
  }

  /**
   * Claim bonus for other account
   * @param {*} other
   */
  claimBonusForOther(other) {
    return this.api.tx.migrationModule.claimBonusForOther(other);
  }

  /**
   * Claim swap bonus for itself
   */
  claimSwapBonus() {
    return this.api.tx.migrationModule.claimSwapBonus();
  }

  /**
   * Claim swap bonus for other account
   * @param {*} other
   */
  claimSwapBonusForOther(other) {
    return this.api.tx.migrationModule.claimSwapBonusForOther(other);
  }

  /**
   * Claim vesting bonus for itself
   */
  claimVestingBonus() {
    return this.api.tx.migrationModule.claimVestingBonus();
  }

  /**
   * Claim vesting bonus for other account
   * @param {*} other
   */
  claimVestingBonusForOther(other) {
    return this.api.tx.migrationModule.claimVestingBonusForOther(other);
  }

  /**
   * Get details of all migrators
   */
  async getMigrators() {
    return this.api.query.migrationModule.migrators.entries();
  }

  /**
   * Get detail of a given migrator
   * @param {*} address
   */
  async getMigrator(address) {
    return this.api.query.migrationModule.migrators(address);
  }

  /**
   * Get bonus of given account
   * @param {*} address
   */
  async getBonus(address) {
    const bonus = await this.api.query.migrationModule.bonuses(address);
    return this.api.createType('Option<Bonus>', bonus).unwrapOr(this.api.createType('Bonus'));
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

export default TokenMigration;
