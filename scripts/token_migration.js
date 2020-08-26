import { BTreeMap } from '@polkadot/types';

import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';

import { DockAPI } from '../src/api';

const dock = new DockAPI();

async function printBalance(name, account) {
  const { data: balance } = await dock.api.query.system.account(account);
  console.log(`${name}'s balance is ${balance.free}`);
}

async function getBalance(account) {
  const { data: balance } = await dock.api.query.system.account(account);
  return balance.free.toHex();
}

async function addMigrator(dock, migratorId, allowedMigrations) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri('//Alice');
  dock.setAccount(account);
  const txn = dock.api.tx.sudo.sudo(dock.api.tx.migrationModule.addMigrator(migratorId, allowedMigrations));
  const r = await dock.sendTransaction(txn, false);
  console.log(`Transaction finalized at blockHash ${r.status.asFinalized}`);
  return r;
}

async function migrate(dock, accountUri, recipients) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri(accountUri);
  dock.setAccount(account);
  const txn = await dock.api.tx.migrationModule.migrate(recipients);
  const r = await dock.sendTransaction(txn, false);
  console.log(`Transaction finalized at blockHash ${r.status.asFinalized}`);
  return r;
}

// Prototyping code.
async function main() {
  await dock.init({
    address: FullNodeEndpoint,
  });

  // dave is the migrator
  const dave = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy';

  const eve = '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw';
  const ferdie = '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL';

  // Uncomment to add migrator. A migrator can only be added once
  // await addMigrator(dock, dave, 100);

  await printBalance('Dave', dave);
  await printBalance('Eve', eve);
  const migratorBal1 = await getBalance(dave);
  const eveBal1 = await getBalance(eve);

  const recip1 = new BTreeMap();
  recip1.set(eve, 100);
  await migrate(dock, '//Dave', recip1);

  await printBalance('Dave', dave);
  await printBalance('Eve', eve);
  const migratorBal2 = await getBalance(dave);
  const eveBal2 = await getBalance(eve);

  if (eveBal2 - eveBal1 !== 100) {
    console.error('Migration did not happen.');
    process.exit(1);
  }

  if (migratorBal1 - migratorBal2 !== 100) {
    console.error('Migration consumed fees. This should not happen');
    process.exit(1);
  }

  await printBalance('Ferdie', ferdie);
  const ferdieBal1 = await getBalance(ferdie);

  const recip2 = new BTreeMap();
  recip2.set(ferdie, 300);
  recip2.set(eve, 200);
  await migrate(dock, '//Dave', recip2);

  await printBalance('Dave', dave);
  await printBalance('Eve', eve);
  await printBalance('Ferdie', ferdie);
  const migratorBal3 = await getBalance(dave);
  const eveBal3 = await getBalance(eve);
  const ferdieBal2 = await getBalance(ferdie);

  if (eveBal3 - eveBal2 !== 200) {
    console.error('Migration did not happen.');
    process.exit(1);
  }

  if (ferdieBal2 - ferdieBal1 !== 300) {
    console.error('Migration did not happen.');
    process.exit(1);
  }

  if (migratorBal2 - migratorBal3 !== 500) {
    console.error('Migration consumed fees. This should not happen');
    process.exit(1);
  }

  const recip3 = new BTreeMap();
  recip3.set(ferdie, 300);
  // This call should fail with Invalid Transaction: Custom error: 1
  await migrate(dock, '//Eve', recip3);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
