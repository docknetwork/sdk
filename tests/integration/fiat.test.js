import { randomAsHex } from '@polkadot/util-crypto';
import { DockAPI } from '../../src/api';

import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { createNewDockDID, createKeyDetail } from '../../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';
import { PublicKeyEd25519 } from '../../src/public-keys';

describe('Fiat filter', () => {
  const dock = new DockAPI();

  // Generate a random DID and controller seed
  const dockDID = createNewDockDID();
  const firstKeySeed = randomAsHex(32);

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    done();
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Fiat filter pays fees', async () => {
    // Get current balance
    const address = dock.account.address;
    const accountBalancePrevious = (await dock.api.query.system.account(address)).data;

    // Write a DID (fiat filter call)
    const pair = dock.keyring.addFromUri(firstKeySeed);
    const publicKey = getPublicKeyFromKeyringPair(pair);
    const keyDetail = createKeyDetail(publicKey, dockDID);
    await dock.did.new(dockDID, keyDetail, false);

    // Get new balance after call
    const accountBalance = (await dock.api.query.system.account(address)).data;
    const freeDifference = accountBalance.free.sub(accountBalancePrevious.free);

    // Ensure its negative, fees paid
    expect(freeDifference.isNeg()).toBe(true);
  }, 30000);
});
