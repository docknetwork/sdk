import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { encodeAddress } from '@polkadot/keyring/index';
import { DockAPI } from '../../src/api';
import { FullNodeEndpoint, TestKeyringOpts } from '../test-constants';
import {
  getChainData,
  addValidatorWithHandle,
  removeValidatorWithHandle,
  setSessionKeyThroughRootWithHandle, genSessionKeyForHandle, getSlotNoFromHeader,
} from './helpers';

describe('Validator set change', () => {
  // Assumes nodes Alice, Bob and Charlie are running from a clean slate

  const queryHandle = new DockAPI();
  // Alice is sudo
  const aliceHandle = new DockAPI();
  const charlieHandle = new DockAPI();

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

  test('Add validator without short circuit', async (done) => {
    // Add a validator Charlie in mid of epoch.
    const key = await genSessionKeyForHandle(charlieHandle);
    await setSessionKeyThroughRootWithHandle(aliceHandle, Charlie, key);
    chainData = await getChainData(queryHandle);
    let epochForAddition;
    const block2 = await addValidatorWithHandle(aliceHandle, Charlie, false);
    console.log(`Validator added at block #${block2.blockNo}`);
    if (block2.slotNo < chainData.epochEndsAt) {
      console.log('slot no before epoch end');
      epochForAddition = (await getChainData(queryHandle)).epoch;
    } else {
      done.fail('slot no not before epoch end');
    }

    // Check if validator starts producing blocks in next epoch
    // Minimum slots in epoch
    let count = chainData.minEpochLength;
    const unsubscribe = await queryHandle.api.derive.chain.subscribeNewHeads(async (header) => {
      const currentSlotNo = getSlotNoFromHeader(queryHandle, header);
      if (encodeAddress(header.author) === Charlie) {
        // No short circuit
        expect(currentSlotNo).toBeGreaterThan(chainData.epochEndsAt);
        console.log(`Validator detected at block #${header.number}`);
        const e = (await getChainData(queryHandle)).epoch;
        expect(e).toBeGreaterThan(epochForAddition);
        console.log(`Validator detected at epoch #${e}`);
        unsubscribe();
        done();
      }
      if (--count === 0) {
        unsubscribe();
        done.fail('Test failed as block author was not charlie');
      }
    });
  }, 300000);

  test('Remove validator without short circuit', async (done) => {
    // Validator added, now remove
    chainData = await getChainData(queryHandle);
    let epochForRemoval;
    const block = await removeValidatorWithHandle(aliceHandle, Charlie, false);
    console.log(`Validator removed at block #${block.blockNo}`);
    if (block.slotNo < chainData.epochEndsAt) {
      console.log('slot no before epoch end');
      epochForRemoval = (await getChainData(queryHandle)).epoch;
    } else {
      done.fail('slot no not before epoch end');
    }

    let count = 4;
    const unsubscribe = await queryHandle.api.derive.chain.subscribeNewHeads(async (header) => {
      const currentEpoch = (await getChainData(queryHandle)).epoch;
      if (currentEpoch > epochForRemoval) {
        if (encodeAddress(header.author) === Charlie) {
          unsubscribe();
          done.fail('Test failed as block author was charlie');
        }
        --count;
        if (count === 0) {
          console.log('Validator removed');
          unsubscribe();
          done();
        }
      }
    });
  }, 300000);

  test('Add validator with short circuit', async (done) => {
    const startingEpoch = (await getChainData(queryHandle)).epoch;
    let validatorAdded;
    // 3 validators
    let count = 3;
    const unsubscribe = await queryHandle.api.derive.chain.subscribeNewHeads(async (header) => {
      if (!validatorAdded) {
        chainData = await getChainData(queryHandle);
        // Let new epoch begin
        if (startingEpoch < chainData.epoch) {
          const block = await addValidatorWithHandle(aliceHandle, Charlie, true);
          console.log(`Validator added at block #${block.blockNo}`);
          validatorAdded = block.blockNo;
        }
      } else {
        // Validator added
        if (encodeAddress(header.author) === Charlie) {
          const blockNumber = parseInt(`${header.number}`);
          console.log(`Validator detected at block #${blockNumber}`);
          const currentEpoch = (await getChainData(queryHandle)).epoch;
          expect(currentEpoch).toBeGreaterThan(chainData.epoch);
          expect(getSlotNoFromHeader(queryHandle, header)).toBeLessThan(chainData.epochEndsAt);
          // Worst case, the new validator ends up getting last slot in the epoch
          expect(blockNumber - validatorAdded).toBeLessThanOrEqual(4);
          unsubscribe();
          done();
        } else if (count === 0) {
          unsubscribe();
          done.fail('Could not add validator charlie');
        }
        --count;
      }
    });
  }, 300000);

  test('Remove validator with short circuit', async (done) => {
    const startingEpoch = (await getChainData(queryHandle)).epoch;
    let validatorRemoved;
    let count = 3;
    const unsubscribe = await queryHandle.api.derive.chain.subscribeNewHeads(async (header) => {
      if (!validatorRemoved) {
        chainData = await getChainData(queryHandle);
        // Let new epoch begin
        if (startingEpoch < chainData.epoch) {
          const block = await removeValidatorWithHandle(aliceHandle, Charlie, true);
          console.log(`Validator removed at block #${block.blockNo}`);
          validatorRemoved = block.blockNo;
        }
      } else {
        // Validator removed
        const currentEpoch = (await getChainData(queryHandle)).epoch;
        if (currentEpoch > chainData.epoch) {
          if (encodeAddress(header.author) === Charlie) {
            unsubscribe();
            done.fail('Test failed as block author was charlie');
          }
        }
        if (count === 0) {
          unsubscribe();
          done();
        }
        --count;
      }
    });
  });
});
