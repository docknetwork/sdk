import { cryptoWaitReady, randomAsHex } from '@polkadot/util-crypto/index';
import { Keyring } from '@polkadot/api/index';
import { DockAPI } from '../../src/api';
import { FullNodeEndpoint, TestKeyringOpts } from '../test-constants';
import { getBlockDetails, getFreeBalance, setEmissionRewardsStatusWithHandle } from './helpers';
import { createKeyDetail, createNewDockDID } from '../../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';

async function sendDIDWriteTxn(handle) {
  // DID will be generated randomly
  const dockDID = createNewDockDID();
  const seed = randomAsHex(32);
  const pair = handle.keyring.addFromUri(seed, null, 'sr25519');
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, dockDID);
  const { status } = await handle.did.new(dockDID, keyDetail, false);

  const blockHash = status.asInBlock;
  return (await getBlockDetails(handle, blockHash)).author;
}

describe('Fee payment', () => {
  // Assumes nodes Alice and Bob are running

  const queryHandle = new DockAPI();
  const aliceHandle = new DockAPI();
  const charlieHandle = new DockAPI();

  const Alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const Bob = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
  const Charlie = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';

  beforeAll(async () => {
    await cryptoWaitReady();

    const aliceKeyring = new Keyring({ type: 'sr25519' });
    await aliceHandle.init({
      address: FullNodeEndpoint,
    });
    aliceHandle.setAccount(aliceKeyring.addFromUri('//Alice'));

    const charlieKeyring = new Keyring({ type: 'sr25519' });
    await charlieHandle.init({
      address: FullNodeEndpoint,
    });
    charlieHandle.setAccount(charlieKeyring.addFromUri('//Charlie'));

    await queryHandle.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // Disable emission rewards so that balance change due to txn fee can be detected
    await setEmissionRewardsStatusWithHandle(aliceHandle, false);
  });

  test('Check balance', async (done) => {
    const aliceBalOld = await getFreeBalance(queryHandle, Alice);
    const bobBalOld = await getFreeBalance(queryHandle, Bob);
    const charlieBalOld = await getFreeBalance(queryHandle, Charlie);

    // Charlie sends txn
    const blockAuthor = await sendDIDWriteTxn(charlieHandle);

    if (blockAuthor != Alice && blockAuthor != Bob) {
      done.fail(`Block author must be Alice or Bob but was ${blockAuthor}`);
    }

    if (blockAuthor == Alice) {
      console.log('Block author is Alice');
    } else {
      console.log('Block author is Bob');
    }

    const aliceBalNew = await getFreeBalance(queryHandle, Alice);
    const bobBalNew = await getFreeBalance(queryHandle, Bob);
    const charlieBalNew = await getFreeBalance(queryHandle, Charlie);

    // Charlie paid fee
    expect(parseInt(charlieBalOld)).toBeGreaterThan(charlieBalNew);

    // Block author collected fee
    if (blockAuthor == Alice) {
      expect(parseInt(aliceBalNew)).toBeGreaterThan(aliceBalOld);
    } else {
      expect(parseInt(bobBalNew)).toBeGreaterThan(bobBalOld);
    }

    done();
  }, 30000);

  afterAll(async () => {
    await aliceHandle.disconnect();
    await queryHandle.disconnect();
  }, 10000);
});
