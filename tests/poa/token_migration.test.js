import { BTreeMap } from '@polkadot/types';
import { cryptoWaitReady } from '@polkadot/util-crypto/index';
import { Keyring } from '@polkadot/api/index';

import { DockAPI } from '../../src/api';
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
    expect(migrators.length).toBe(0);
    const txn = sudoHandle.migrationModule.addMigrator(charlie, 3, true);
    await sudoHandle.signAndSend(txn, false);
    migrators = await queryHandle.migrationModule.getMigrators();
    expect(migrators.length).toBe(1);
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
    recip1.set(ferdie, 300);
    // @ts-ignore
    recip1.set(dave, 200);
    // @ts-ignore
    recip1.set(eve, 100);

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
