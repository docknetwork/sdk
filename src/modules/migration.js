import { BTreeMap } from '@polkadot/types';

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

  // Accepts recipients as an BtreeMap of address -> amount
  migrate(recipients) {
    return this.api.tx.migrationModule.migrate(recipients);
  }

  // Accepts recipients as an array of pairs, each pair is (address, amount)
  migrateRecipAsList(recipients) {
    // @ts-ignore
    const recipMap = new BTreeMap();
    recipients.sort().forEach(([address, amount]) => {
      recipMap.set(address, amount);
    });
    return this.api.tx.migrationModule.migrate(recipMap);
  }

  async getMigrators() {
    return this.api.query.migrationModule.migrators.entries();
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
