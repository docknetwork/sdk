import { cryptoWaitReady } from '@polkadot/util-crypto/index';
import { Keyring } from '@polkadot/api/index';
import { encodeAddress } from '@polkadot/keyring/index';
import { DockAPI } from '../../src/api';
import { FullNodeEndpoint, TestKeyringOpts } from '../test-constants';
import {
  genSessionKeyForHandle, getChainData, getSlotNoFromHeader,
  setSessionKeyThroughRootWithHandle,
  swapValidatorWithHandle,
} from './helpers';


describe('Validator swap', () => {
  // Assumes nodes Alice, Bob and Charlie are running

  const queryHandle = new DockAPI();
  // Alice is sudo
  const aliceHandle = new DockAPI();
  const charlieHandle = new DockAPI();

  const Bob = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
  const Charlie = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';

  let chainData;

  beforeAll(async (done) => {
    await cryptoWaitReady();
    const aliceKeyring = new Keyring({ type: 'sr25519' });
    await aliceHandle.init({
      address: 'ws://localhost:9944',
    });
    aliceHandle.setAccount(aliceKeyring.addFromUri('//Alice'));

    const charlieKeyring = new Keyring({ type: 'sr25519' });
    await charlieHandle.init({
      address: 'ws://localhost:9966',
    });
    charlieHandle.setAccount(charlieKeyring.addFromUri('//Charlie'));
    await queryHandle.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    done();
  }, 30000);

  test('Swap Charlie for Bob', async (done) => {
    const key = await genSessionKeyForHandle(charlieHandle);
    await setSessionKeyThroughRootWithHandle(aliceHandle, Charlie, key);
    chainData = await getChainData(queryHandle);
    const startingEpoch = chainData.epoch;
    let swapped;
    let count = 3;
    const unsubscribe = await queryHandle.api.derive.chain.subscribeNewHeads(async (header) => {
      if (!swapped) {
        await swapValidatorWithHandle(aliceHandle, Bob, Charlie);
        swapped = getSlotNoFromHeader(queryHandle, header);
      } else {
        if (encodeAddress(header.author) === Bob) {
          unsubscribe();
          done.fail('Test failed as block author was Bob');
        }
        const currentEpoch = (await getChainData(queryHandle)).epoch;
        expect(currentEpoch).toBeGreaterThan(startingEpoch);
        if (count === 0) {
          console.log('Swap successful');
          unsubscribe();
          done();
        }
        --count;
      }
    });
  }, 300000);
});
