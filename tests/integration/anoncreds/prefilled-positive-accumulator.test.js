import { hexToU8a, stringToHex, u8aToHex } from '@polkadot/util';
import {
  initializeWasm,
  Accumulator, AccumulatorParams,
  AccumulatorPublicKey,
  PositiveAccumulator,
  WitnessUpdatePublicInfo,
} from '@docknetwork/crypto-wasm-ts';
import { randomAsHex } from '@polkadot/util-crypto';
import { InMemoryState } from '@docknetwork/crypto-wasm-ts/lib/accumulator/in-memory-persistence';
import { DockAPI } from '../../../src';
import AccumulatorModule from '../../../src/modules/accumulator';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { createNewDockDID } from '../../../src/utils/did';
import { registerNewDIDUsingPair } from '../helpers';

describe('Prefilled positive accumulator', () => {
  // Incase updating an accumulator is expensive like making a blockchain txn, a cheaper strategy
  // is to add the members to the accumulator beforehand but not giving out the witnesses yet.
  // Eg. accumulator manager wants to add a million members over an year, rather than publishing
  // the new accumulator after each addition, the manager can initialize the accumulator with a million
  // member ids (member ids are either predictable like monotonically increasing numbers or the manager
  // can internally keep a map of random ids like UUIDs to a number). Now when the manager actually
  // wants to allow a member to prove membership, he can create a witness for that member but the
  // accumulator value remains same and thus the witness for existing members also remain same. It
  // should be noted though that changing the accumulator
  // value causes change in all existing witnesses and thus its better to make a good estimate
  // of the number of members during prefill stage

  // Manager estimates that he will have `total_members` members over the course of time
  const totalMembers = 100;
  const members = [];

  const dock = new DockAPI();
  let account;
  let did;
  let pair;
  let chainModule;
  const chainModuleClass = AccumulatorModule;

  const seed1 = randomAsHex(32);
  const seedAccum = randomAsHex(32);
  let keypair;
  let accumulatorId;
  let accumulator;
  const accumState = new InMemoryState();

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    chainModule = dock.accumulatorModule;
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    pair = dock.keyring.addFromUri(seed1);
    did = createNewDockDID();
    await registerNewDIDUsingPair(dock, did, pair);
    await initializeWasm();
  }, 20000);

  test('Prefill', async () => {
    const label = stringToHex('accumulator-params-label');
    const params = Accumulator.generateParams(hexToU8a(label));
    const bytes1 = u8aToHex(params.bytes);
    const params1 = chainModuleClass.prepareAddParameters(bytes1, undefined, label);
    await chainModule.addParams(params1, did, pair, 1, { didModule: dock.didModule }, false);

    keypair = Accumulator.generateKeypair(params, seedAccum);
    const bytes2 = u8aToHex(keypair.publicKey.bytes);
    const pk1 = chainModuleClass.prepareAddPublicKey(bytes2, undefined, [did, 1]);
    await chainModule.addPublicKey(pk1, did, pair, 1, { didModule: dock.didModule }, false);

    accumulator = PositiveAccumulator.initialize(params, keypair.secretKey);

    for (let i = 1; i <= totalMembers; i++) {
      members.push(Accumulator.encodePositiveNumberAsAccumulatorMember(i));
    }
    await accumulator.addBatch(members, keypair.secretKey, accumState);
    expect(accumState.state.size).toEqual(totalMembers);

    accumulatorId = randomAsHex(32);
    const accumulated = u8aToHex(accumulator.accumulated);
    await dock.accumulatorModule.addPositiveAccumulator(accumulatorId, accumulated, [did, 1], did, pair, 1, { didModule: dock.didModule }, false);
    const queriedAccum = await dock.accumulatorModule.getAccumulator(accumulatorId, true);
    expect(queriedAccum.accumulated).toEqual(u8aToHex(accumulator.accumulated));
  });

  test('Witness creation, verification should work', async () => {
    let queriedAccum = await dock.accumulatorModule.getAccumulator(accumulatorId, true);
    let verifAccumulator = PositiveAccumulator.fromAccumulated(hexToU8a(queriedAccum.accumulated));

    // Witness created for member 1
    const member1 = members[10];
    const witness1 = await accumulator.membershipWitness(member1, keypair.secretKey, accumState);
    let accumPk = new AccumulatorPublicKey(hexToU8a(queriedAccum.public_key.bytes));
    let accumParams = new AccumulatorParams(hexToU8a(queriedAccum.public_key.params.bytes));
    expect(verifAccumulator.verifyMembershipWitness(member1, witness1, accumPk, accumParams)).toEqual(true);

    // Witness created for member 2
    const member2 = members[25];
    const witness2 = await accumulator.membershipWitness(member2, keypair.secretKey, accumState);
    expect(verifAccumulator.verifyMembershipWitness(member2, witness2, accumPk, accumParams)).toEqual(true);

    // Witness created for member 3
    const member3 = members[79];
    const witness3 = await accumulator.membershipWitness(member3, keypair.secretKey, accumState);
    expect(verifAccumulator.verifyMembershipWitness(member3, witness3, accumPk, accumParams)).toEqual(true);

    // Previous users' witness still works
    expect(verifAccumulator.verifyMembershipWitness(member1, witness1, accumPk, accumParams)).toEqual(true);
    expect(verifAccumulator.verifyMembershipWitness(member2, witness2, accumPk, accumParams)).toEqual(true);

    // Manager decides to remove a member, the new accumulated value will be published along with witness update info
    const witnessUpdInfo = WitnessUpdatePublicInfo.new(accumulator.accumulated, [], [member2], keypair.secretKey);
    await accumulator.remove(member2, keypair.secretKey, accumState);

    let accum = await dock.accumulatorModule.getAccumulator(accumulatorId, false);
    const accumulated = u8aToHex(accumulator.accumulated);
    const witUpdBytes = u8aToHex(witnessUpdInfo.value);
    await dock.accumulatorModule.updateAccumulator(accumulatorId, accumulated, { removals: [u8aToHex(member2)], witnessUpdateInfo: witUpdBytes }, did, pair, 1, { didModule: dock.didModule }, false);

    queriedAccum = await dock.accumulatorModule.getAccumulator(accumulatorId, true);
    expect(queriedAccum.accumulated).toEqual(accumulated);

    verifAccumulator = PositiveAccumulator.fromAccumulated(hexToU8a(queriedAccum.accumulated));

    accumPk = new AccumulatorPublicKey(hexToU8a(queriedAccum.public_key.bytes));
    accumParams = new AccumulatorParams(hexToU8a(queriedAccum.public_key.params.bytes));

    // Witness created for member 3
    const member4 = members[52];
    const witness4 = await accumulator.membershipWitness(member4, keypair.secretKey, accumState);
    expect(verifAccumulator.verifyMembershipWitness(member4, witness4, accumPk, accumParams)).toEqual(true);

    // Older witnesses need to be updated
    accum = await dock.accumulatorModule.getAccumulator(accumulatorId, false);
    const updates = await dock.accumulatorModule.getUpdatesFromBlock(accumulatorId, accum.lastModified);
    const additions = [];
    const removals = [];
    if (updates[0].additions !== null) {
      for (const a of updates[0].additions) {
        additions.push(hexToU8a(a));
      }
    }
    if (updates[0].removals !== null) {
      for (const a of updates[0].removals) {
        removals.push(hexToU8a(a));
      }
    }
    const queriedWitnessInfo = new WitnessUpdatePublicInfo(hexToU8a(updates[0].witness_update_info));

    witness1.updateUsingPublicInfoPostBatchUpdate(member1, additions, removals, queriedWitnessInfo);
    expect(verifAccumulator.verifyMembershipWitness(member1, witness1, accumPk, accumParams)).toEqual(true);

    witness3.updateUsingPublicInfoPostBatchUpdate(member3, additions, removals, queriedWitnessInfo);
    expect(verifAccumulator.verifyMembershipWitness(member3, witness3, accumPk, accumParams)).toEqual(true);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
