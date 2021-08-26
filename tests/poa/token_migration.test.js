import { BTreeMap } from '@polkadot/types';
import { cryptoWaitReady } from '@polkadot/util-crypto/index';
import { Keyring } from '@polkadot/api/index';

import { DockAPI } from '../../src/index';
import { FullNodeEndpoint } from '../test-constants';
import { getFreeBalance } from './helpers';

describe('Token migration', () => {
  // charlie is the migrator
  const charlie = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';

  const dave = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy';
  const eve = '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw';
  const ferdie = '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL';

  const sudoHandle = new DockAPI();
  const charlieHandle = new DockAPI();
  const queryHandle = new DockAPI();

  beforeAll(async (done) => {
    await cryptoWaitReady();

    const sudoKeyring = new Keyring({ type: 'sr25519' });
    await sudoHandle.init({
      address: FullNodeEndpoint,
    });
    sudoHandle.setAccount(sudoKeyring.addFromUri('//Alice'));

    const charlieKeyring = new Keyring({ type: 'sr25519' });
    await charlieHandle.init({
      address: FullNodeEndpoint,
    });
    charlieHandle.setAccount(charlieKeyring.addFromUri('//Charlie'));

    await queryHandle.init({
      address: FullNodeEndpoint,
    });
    done();
  });

  test('Add migrator', async () => {
    let migrators = await sudoHandle.migrationModule.getMigrators();
    const initialMigratorCount = migrators.length;
    const txn = sudoHandle.migrationModule.addMigrator(charlie, 10, true);
    await sudoHandle.signAndSend(txn, false);
    migrators = await queryHandle.migrationModule.getMigrators();
    expect(migrators.length).toBe(initialMigratorCount + 1);
  }, 20000);

  test('Migrate', async () => {
    const charlieBal1 = parseInt(await getFreeBalance(queryHandle, charlie));
    const daveBal1 = parseInt(await getFreeBalance(queryHandle, dave));
    const eveBal1 = parseInt(await getFreeBalance(queryHandle, eve));
    const ferdieBal1 = parseInt(await getFreeBalance(queryHandle, ferdie));

    // BTreeMap can be initialed without argument.
    // @ts-ignore
    const recip1 = new BTreeMap();
    // @ts-ignore
    recip1.set(ferdie, '300');
    // @ts-ignore
    recip1.set(dave, '200');
    // @ts-ignore
    recip1.set(eve, '100');

    const txn = charlieHandle.migrationModule.migrate(recip1);
    await charlieHandle.signAndSend(txn, false);

    const charlieBal2 = parseInt(await getFreeBalance(queryHandle, charlie));
    const daveBal2 = parseInt(await getFreeBalance(queryHandle, dave));
    const eveBal2 = parseInt(await getFreeBalance(queryHandle, eve));
    const ferdieBal2 = parseInt(await getFreeBalance(queryHandle, ferdie));

    expect(charlieBal1).toBe(charlieBal2 + 300 + 200 + 100);
    expect(daveBal2).toBe(daveBal1 + 200);
    expect(eveBal2).toBe(eveBal1 + 100);
    expect(ferdieBal2).toBe(ferdieBal1 + 300);

    const recipList = [[dave, '100'], [eve, '110'], [ferdie, '120']];
    const txn1 = charlieHandle.migrationModule.migrateRecipAsList(recipList);
    await charlieHandle.signAndSend(txn1, false);

    const charlieBal3 = parseInt(await getFreeBalance(queryHandle, charlie));
    const daveBal3 = parseInt(await getFreeBalance(queryHandle, dave));
    const eveBal3 = parseInt(await getFreeBalance(queryHandle, eve));
    const ferdieBal3 = parseInt(await getFreeBalance(queryHandle, ferdie));

    expect(charlieBal2).toBe(charlieBal3 + 100 + 110 + 120);
    expect(daveBal3).toBe(daveBal2 + 100);
    expect(eveBal3).toBe(eveBal2 + 110);
    expect(ferdieBal3).toBe(ferdieBal2 + 120);

    const recipListWithRepeatedAddreses = [[dave, '100'], [eve, 110], [dave, '400'], [dave, '500'], [dave, 1000], [ferdie, '120'], [ferdie, 300]];
    const txn2 = charlieHandle.migrationModule.migrateRecipAsList(recipListWithRepeatedAddreses);
    await charlieHandle.signAndSend(txn2, false);

    const charlieBal4 = parseInt(await getFreeBalance(queryHandle, charlie));
    const daveBal4 = parseInt(await getFreeBalance(queryHandle, dave));
    const eveBal4 = parseInt(await getFreeBalance(queryHandle, eve));
    const ferdieBal4 = parseInt(await getFreeBalance(queryHandle, ferdie));

    expect(charlieBal3).toBe(charlieBal4 + 100 + 110 + 400 + 500 + 1000 + 120 + 300);
    expect(daveBal4).toBe(daveBal3 + 2000);
    expect(eveBal4).toBe(eveBal3 + 110);
    expect(ferdieBal4).toBe(ferdieBal3 + 420);
  }, 40000);

  afterAll(async (done) => {
    const txn = sudoHandle.migrationModule.removeMigrator(charlie, true);
    await sudoHandle.signAndSend(txn, false);

    await sudoHandle.disconnect();
    await charlieHandle.disconnect();
    await queryHandle.disconnect();
    done();
  }, 10000);
});
