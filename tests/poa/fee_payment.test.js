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
  const firstKeySeed = randomAsHex(32);
  const firstPair = handle.keyring.addFromUri(firstKeySeed, null, 'sr25519');
  const publicKey = getPublicKeyFromKeyringPair(firstPair);
  const keyDetail = createKeyDetail(publicKey, dockDID);
  const transaction = handle.did.new(dockDID, keyDetail);

  const { status } = await handle.sendTransaction(transaction);
  const blockHash = status.asFinalized;
  return (await getBlockDetails(handle, blockHash)).author;
}

describe('Fee payment', () => {
  // Assumes nodes Alice and Bob are running

  const queryHandle = new DockAPI();
  const aliceHandle = new DockAPI();

  const Alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const Bob = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

  beforeAll(async (done) => {
    await cryptoWaitReady();

    const aliceKeyring = new Keyring({ type: 'sr25519' });
    await aliceHandle.init({
      address: 'ws://localhost:9944',
    });
    aliceHandle.setAccount(aliceKeyring.addFromUri('//Alice'));

    await queryHandle.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    done();
  });

  test('Check balance', async (done) => {
    // Disable emission rewards so that balance change can be detected
    await setEmissionRewardsStatusWithHandle(aliceHandle, false);

    const aliceBalOld = await getFreeBalance(queryHandle, Alice);
    const bobBalOld = await getFreeBalance(queryHandle, Bob);

    // Alice sends txn
    const blockAuthor = await sendDIDWriteTxn(aliceHandle);

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

    if (blockAuthor == Alice) {
      if (aliceBalNew != aliceBalOld) {
        done.fail('Block author was Alice still its balance changed');
      }
      if (bobBalNew != bobBalOld) {
        done.fail('Block author was Alice but Bob\'s balance changed');
      }
    } else {
      if (aliceBalNew >= aliceBalOld) {
        done.fail('Block author was Bob still Alice\'s balance has not decreased.');
      }
      if (bobBalNew <= bobBalOld) {
        done.fail('Block author was Bob but Bob\'s balance has not increased');
      }
    }

    done();
  }, 30000);
});
