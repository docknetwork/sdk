import { hexToU8a, stringToHex, u8aToHex } from "@polkadot/util";
import {
  initializeWasm,
  Accumulator,
  AccumulatorParams,
  AccumulatorPublicKey,
  PositiveAccumulator,
  VBWitnessUpdateInfo,
  VBMembershipWitness,
} from "@docknetwork/crypto-wasm-ts";
import { randomAsHex } from "@polkadot/util-crypto";
import { InMemoryState } from "@docknetwork/crypto-wasm-ts/lib/accumulator/in-memory-persistence";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { AccumulatorType } from "@docknetwork/credential-sdk/modules/abstract/accumulator/module";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";
import { DockDid, DockAccumulatorId } from "@docknetwork/credential-sdk/types";
import { registerNewDIDUsingPair } from "../helpers";
import {
  getLastBlockNo,
  waitForBlocks,
} from "@docknetwork/dock-blockchain-api/utils/chain-ops";
import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";
import { DockCoreModules } from "../../../src";
import { AbstractAccumulatorModule as AccumulatorModule } from "@docknetwork/credential-sdk/modules";

describe("Prefilled positive accumulator", () => {
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
  const seed1 = randomAsHex(32);
  const seedAccum = randomAsHex(32);

  const dock = new DockAPI();
  const modules = new DockCoreModules(dock);
  let account;
  const did = DockDid.random();
  const pair = new DidKeypair([did, 1], new Ed25519Keypair(seed1));

  let chainModule;
  const chainModuleClass = AccumulatorModule;

  let keypair;
  let accumulatorId;
  let accumulator;
  const accumState = new InMemoryState();

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    chainModule = modules.accumulator;
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    await registerNewDIDUsingPair(dock, did, pair);
    await initializeWasm();
  }, 20000);

  test("Prefill", async () => {
    const label = stringToHex("accumulator-params-label");
    const params = Accumulator.generateParams(hexToU8a(label));
    const bytes1 = u8aToHex(params.bytes);
    const params1 = chainModuleClass.prepareAddParameters(bytes1, label);
    await chainModule.addParams(null, params1, did, pair);

    keypair = Accumulator.generateKeypair(params, seedAccum);
    const bytes2 = u8aToHex(keypair.publicKey.bytes);
    const pk1 = chainModuleClass.prepareAddPublicKey(bytes2, [did, 1]);
    await chainModule.addPublicKey(null, pk1, did, pair);

    accumulator = PositiveAccumulator.initialize(params, keypair.secretKey);

    for (let i = 1; i <= totalMembers; i++) {
      members.push(Accumulator.encodePositiveNumberAsAccumulatorMember(i));
    }
    await accumulator.addBatch(members, keypair.secretKey, accumState);
    expect(accumState.state.size).toEqual(totalMembers);

    accumulatorId = DockAccumulatorId.random(did);
    const accumulated = AccumulatorModule.accumulatedAsHex(
      accumulator.accumulated,
      AccumulatorType.VBPos
    );
    await modules.accumulator.addPositiveAccumulator(
      accumulatorId,
      accumulated,
      [did, 1],
      pair
    );
    const queriedAccum = await modules.accumulator.getAccumulator(
      accumulatorId,
      true,
      true
    );
    expect(queriedAccum.accumulated.value).toEqual(accumulated);
  });

  test("Witness creation, verification should work", async () => {
    let queriedAccum = await modules.accumulator.getAccumulator(
      accumulatorId,
      true,
      true
    );
    let verifAccumulator = PositiveAccumulator.fromAccumulated(
      AccumulatorModule.accumulatedFromHex(
        queriedAccum.accumulated,
        AccumulatorType.VBPos
      )
    );

    // Witness created for member 1
    const member1 = members[10];
    const witness1 = await accumulator.membershipWitness(
      member1,
      keypair.secretKey,
      accumState
    );
    let accumPk = new AccumulatorPublicKey(queriedAccum.publicKey.bytes.bytes);
    let accumParams = new AccumulatorParams(
      queriedAccum.publicKey.params.bytes.bytes
    );
    expect(
      verifAccumulator.verifyMembershipWitness(
        member1,
        witness1,
        accumPk,
        accumParams
      )
    ).toEqual(true);

    // Witness created for member 2
    const member2 = members[25];
    const witness2 = await accumulator.membershipWitness(
      member2,
      keypair.secretKey,
      accumState
    );
    expect(
      verifAccumulator.verifyMembershipWitness(
        member2,
        witness2,
        accumPk,
        accumParams
      )
    ).toEqual(true);

    // Witness created for member 3
    const member3 = members[79];
    const witness3 = await accumulator.membershipWitness(
      member3,
      keypair.secretKey,
      accumState
    );
    expect(
      verifAccumulator.verifyMembershipWitness(
        member3,
        witness3,
        accumPk,
        accumParams
      )
    ).toEqual(true);

    // Previous users' witness still works
    expect(
      verifAccumulator.verifyMembershipWitness(
        member1,
        witness1,
        accumPk,
        accumParams
      )
    ).toEqual(true);
    expect(
      verifAccumulator.verifyMembershipWitness(
        member2,
        witness2,
        accumPk,
        accumParams
      )
    ).toEqual(true);

    // Manager decides to remove a member, the new accumulated value will be published along with witness update info
    const witnessUpdInfo = VBWitnessUpdateInfo.new(
      accumulator.accumulated,
      [],
      [member2],
      keypair.secretKey
    );
    await accumulator.remove(member2, keypair.secretKey, accumState);

    let accum = await modules.accumulator.getAccumulator(accumulatorId, false);
    const accumulated = AccumulatorModule.accumulatedAsHex(
      accumulator.accumulated,
      AccumulatorType.VBPos
    );
    const witUpdBytes = u8aToHex(witnessUpdInfo.value);
    await modules.accumulator.updateAccumulator(
      accumulatorId,
      accumulated,
      { removals: [u8aToHex(member2)], witnessUpdateInfo: witUpdBytes },
      pair
    );

    queriedAccum = await modules.accumulator.getAccumulator(
      accumulatorId,
      true,
      true
    );
    expect(queriedAccum.accumulated.value).toEqual(accumulated);

    verifAccumulator = PositiveAccumulator.fromAccumulated(
      AccumulatorModule.accumulatedFromHex(
        queriedAccum.accumulated,
        AccumulatorType.VBPos
      )
    );

    accumPk = new AccumulatorPublicKey(queriedAccum.publicKey.bytes.bytes);
    accumParams = new AccumulatorParams(
      queriedAccum.publicKey.params.bytes.bytes
    );

    // Witness created for member 3
    const member4 = members[52];
    const witness4 = await accumulator.membershipWitness(
      member4,
      keypair.secretKey,
      accumState
    );
    expect(
      verifAccumulator.verifyMembershipWitness(
        member4,
        witness4,
        accumPk,
        accumParams
      )
    ).toEqual(true);

    // Older witnesses need to be updated
    accum = await modules.accumulator.getAccumulator(accumulatorId);

    await modules.accumulator.updateWitness(
      accumulatorId,
      member1,
      witness1,
      accum.lastModified,
      accum.lastModified
    );

    await modules.accumulator.updateWitness(
      accumulatorId,
      member3,
      witness3,
      accum.lastModified,
      accum.lastModified
    );

    expect(
      verifAccumulator.verifyMembershipWitness(
        member1,
        witness1,
        accumPk,
        accumParams
      )
    ).toEqual(true);

    expect(
      verifAccumulator.verifyMembershipWitness(
        member3,
        witness3,
        accumPk,
        accumParams
      )
    ).toEqual(true);
  });

  test("Witness update after several batch upgrades", async () => {
    let queriedAccum = await modules.accumulator.getAccumulator(
      accumulatorId,
      true,
      true
    );
    let verifAccumulator = PositiveAccumulator.fromAccumulated(
      AccumulatorModule.accumulatedFromHex(
        queriedAccum.accumulated,
        AccumulatorType.VBPos
      )
    );
    const member = members[10];
    let witness = await accumulator.membershipWitness(
      member,
      keypair.secretKey,
      accumState
    );

    const accumPk = new AccumulatorPublicKey(
      queriedAccum.publicKey.bytes.bytes
    );
    const accumParams = new AccumulatorParams(
      queriedAccum.publicKey.params.bytes.bytes
    );
    expect(
      verifAccumulator.verifyMembershipWitness(
        member,
        witness,
        accumPk,
        accumParams
      )
    ).toEqual(true);

    // Do some updates to the accumulator

    const removals1 = [members[85], members[86]];
    const witnessUpdInfo1 = VBWitnessUpdateInfo.new(
      accumulator.accumulated,
      [],
      removals1,
      keypair.secretKey
    );
    await accumulator.removeBatch(removals1, keypair.secretKey, accumState);
    const accumulated1 = AccumulatorModule.accumulatedAsHex(
      accumulator.accumulated,
      AccumulatorType.VBPos
    );
    const witUpdBytes1 = u8aToHex(witnessUpdInfo1.value);
    await modules.accumulator.updateAccumulator(
      accumulatorId,
      accumulated1,
      {
        removals: removals1.map((r) => u8aToHex(r)),
        witnessUpdateInfo: witUpdBytes1,
      },
      pair
    );

    const removals2 = [members[87], members[88]];
    const witnessUpdInfo2 = VBWitnessUpdateInfo.new(
      accumulator.accumulated,
      [],
      removals2,
      keypair.secretKey
    );
    await accumulator.removeBatch(removals2, keypair.secretKey, accumState);
    const accumulated2 = AccumulatorModule.accumulatedAsHex(
      accumulator.accumulated,
      AccumulatorType.VBPos
    );
    const witUpdBytes2 = u8aToHex(witnessUpdInfo2.value);
    await modules.accumulator.updateAccumulator(
      accumulatorId,
      accumulated2,
      {
        removals: removals2.map((r) => u8aToHex(r)),
        witnessUpdateInfo: witUpdBytes2,
      },
      pair
    );

    const removals3 = [members[89], members[90], members[91]];
    const witnessUpdInfo3 = VBWitnessUpdateInfo.new(
      accumulator.accumulated,
      [],
      removals3,
      keypair.secretKey
    );
    await accumulator.removeBatch(removals3, keypair.secretKey, accumState);
    const accumulated3 = AccumulatorModule.accumulatedAsHex(
      accumulator.accumulated,
      AccumulatorType.VBPos
    );
    const witUpdBytes3 = u8aToHex(witnessUpdInfo3.value);
    await modules.accumulator.updateAccumulator(
      accumulatorId,
      accumulated3,
      {
        removals: removals3.map((r) => u8aToHex(r)),
        witnessUpdateInfo: witUpdBytes3,
      },
      pair
    );

    // Get a witness from the accumulator manager. This will be updated after the following updates.
    witness = await accumulator.membershipWitness(
      member,
      keypair.secretKey,
      accumState
    );
    // The user should be told the block number from which he is supposed to update the witnesses from. It will be one block
    // ahead from where the last update was posted.
    const blockNoToUpdateFrom =
      (await modules.accumulator.getAccumulator(accumulatorId)).lastModified +
      1;

    // Do some more updates to the accumulator
    const removals4 = [members[92], members[93]];
    const witnessUpdInfo4 = VBWitnessUpdateInfo.new(
      accumulator.accumulated,
      [],
      removals4,
      keypair.secretKey
    );
    await accumulator.removeBatch(removals4, keypair.secretKey, accumState);
    const accumulated4 = AccumulatorModule.accumulatedAsHex(
      accumulator.accumulated,
      AccumulatorType.VBPos
    );
    const witUpdBytes4 = u8aToHex(witnessUpdInfo4.value);
    await modules.accumulator.updateAccumulator(
      accumulatorId,
      accumulated4,
      {
        removals: removals4.map((r) => u8aToHex(r)),
        witnessUpdateInfo: witUpdBytes4,
      },
      pair
    );
    console.log(`Updated witness at block ${await getLastBlockNo(dock.api)}`);

    const removals5 = [members[94], members[95], members[96]];
    const witnessUpdInfo5 = VBWitnessUpdateInfo.new(
      accumulator.accumulated,
      [],
      removals5,
      keypair.secretKey
    );
    await accumulator.removeBatch(removals5, keypair.secretKey, accumState);
    const accumulated5 = AccumulatorModule.accumulatedAsHex(
      accumulator.accumulated,
      AccumulatorType.VBPos
    );
    const witUpdBytes5 = u8aToHex(witnessUpdInfo5.value);
    await modules.accumulator.updateAccumulator(
      accumulatorId,
      accumulated5,
      {
        removals: removals5.map((r) => u8aToHex(r)),
        witnessUpdateInfo: witUpdBytes5,
      },
      pair
    );
    console.log(`Updated witness at block ${await getLastBlockNo(dock.api)}`);

    queriedAccum = await modules.accumulator.getAccumulator(
      accumulatorId,
      true,
      true
    );
    verifAccumulator = PositiveAccumulator.fromAccumulated(
      AccumulatorModule.accumulatedFromHex(
        queriedAccum.accumulated,
        AccumulatorType.VBPos
      )
    );
    // Old witness doesn't verify with new accumulator
    expect(
      verifAccumulator.verifyMembershipWitness(
        member,
        witness,
        accumPk,
        accumParams
      )
    ).toEqual(false);

    const oldWitness1 = new VBMembershipWitness(witness.value);
    const oldWitness2 = new VBMembershipWitness(witness.value);
    const oldWitness3 = new VBMembershipWitness(witness.value);

    // Update witness by downloading necessary blocks and applying the updates if found
    await modules.accumulator.updateWitness(
      accumulatorId,
      member,
      witness,
      blockNoToUpdateFrom,
      queriedAccum.lastModified
    );

    // Updated witness verifies with new accumulator
    expect(
      verifAccumulator.verifyMembershipWitness(
        member,
        witness,
        accumPk,
        accumParams
      )
    ).toEqual(true);

    // Test again with a batch size bigger than the total number of blocks
    await modules.accumulator.updateWitness(
      accumulatorId,
      member,
      oldWitness1,
      blockNoToUpdateFrom,
      queriedAccum.lastModified,
      queriedAccum.lastModified - blockNoToUpdateFrom + 10
    );
    expect(
      verifAccumulator.verifyMembershipWitness(
        member,
        oldWitness1,
        accumPk,
        accumParams
      )
    ).toEqual(true);

    // Test again with few other batch sizes
    await modules.accumulator.updateWitness(
      accumulatorId,
      member,
      oldWitness2,
      blockNoToUpdateFrom,
      queriedAccum.lastModified,
      3
    );
    expect(
      verifAccumulator.verifyMembershipWitness(
        member,
        oldWitness2,
        accumPk,
        accumParams
      )
    ).toEqual(true);

    await modules.accumulator.updateWitness(
      accumulatorId,
      member,
      oldWitness3,
      blockNoToUpdateFrom,
      queriedAccum.lastModified,
      4
    );
    expect(
      verifAccumulator.verifyMembershipWitness(
        member,
        oldWitness3,
        accumPk,
        accumParams
      )
    ).toEqual(true);
  }, 60000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
