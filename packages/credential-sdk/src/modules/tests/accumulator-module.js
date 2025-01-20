import { InMemoryState } from '@docknetwork/crypto-wasm-ts/lib/accumulator/in-memory-persistence';
import {
  hexToU8a, stringToHex, u8aToHex, randomAsHex,
} from '../../utils';
import {
  Accumulator,
  AccumulatorParams,
  PositiveAccumulator,
  VBWitnessUpdateInfo,
  VBMembershipWitness,
} from '../../crypto';
import { AccumulatorType } from '../abstract/accumulator/module';
import {
  DIDDocument,
  AccumulatorParams as AccumulatorParamsType,
} from '../../types';
import { Ed25519Keypair, DidKeypair } from '../../keypairs';

// eslint-disable-next-line jest/no-export
export default function generateAccumulatorTests(
  { did: didModule, accumulator: accumulatorModule },
  {
    Did, AccumulatorPublicKey, AccumulatorId, AccumulatorCommon,
  },
) {
  describe(`Using ${didModule.constructor.name} and ${accumulatorModule.constructor.name}`, () => {
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
    const seedAccum = randomAsHex(32);

    const did = Did.random();
    const pair = new DidKeypair([did, 1], Ed25519Keypair.random());

    const accumulatorModuleClass = accumulatorModule.constructor;

    let keypair;
    let accumulatorId = AccumulatorId.random(did);
    let accumulator;
    let params1Id;
    let pk1Id;
    const accumState = new InMemoryState();

    test('Prefill', async () => {
      await didModule.createDocument(
        DIDDocument.create(did, [pair.didKey()]),
        pair,
      );

      const label = stringToHex('accumulator-params-label');
      const params = Accumulator.generateParams(hexToU8a(label));
      const bytes1 = u8aToHex(params.bytes);
      const params1 = new AccumulatorParams(bytes1, label);
      params1Id = await accumulatorModule.nextParamsId(did);
      await accumulatorModule.addParams(params1Id, params1, did, pair);

      expect(
        (await accumulatorModule.getParams(did, params1Id)).toJSON(),
      ).toEqual(AccumulatorParamsType.from(params1).toJSON());
      expect((await accumulatorModule.getAllParamsByDid(did)).toJSON()).toEqual(
        [[params1Id.toJSON(), AccumulatorParamsType.from(params1).toJSON()]],
      );

      keypair = Accumulator.generateKeypair(params, seedAccum);
      const bytes2 = u8aToHex(keypair.publicKey.bytes);
      const pk1 = new AccumulatorPublicKey(bytes2, [did, params1Id]);
      pk1Id = await accumulatorModule.nextPublicKeyId(did);
      await accumulatorModule.addPublicKey(pk1Id, pk1, did, pair);

      expect(
        (await accumulatorModule.getPublicKey(did, pk1Id)).toJSON(),
      ).toEqual(pk1.toJSON());
      expect(
        (await accumulatorModule.getAllPublicKeysByDid(did)).toJSON(),
      ).toEqual([[pk1Id.toJSON(), pk1.toJSON()]]);

      const pk1WithParams = await pk1.withParams(accumulatorModule);
      expect(pk1WithParams.params).toBeInstanceOf(AccumulatorParamsType);

      expect(
        (await accumulatorModule.getPublicKey(did, pk1Id, true)).toJSON(),
      ).toEqual(pk1WithParams.toJSON());
      expect(
        (await accumulatorModule.getAllPublicKeysByDid(did, true)).toJSON(),
      ).toEqual([[pk1Id.toJSON(), pk1WithParams.toJSON()]]);

      accumulator = PositiveAccumulator.initialize(params, keypair.secretKey);

      for (let i = 1; i <= totalMembers; i++) {
        members.push(Accumulator.encodePositiveNumberAsAccumulatorMember(i));
      }
      await accumulator.addBatch(members, keypair.secretKey, accumState);
      expect(accumState.state.size).toEqual(totalMembers);

      accumulatorId = AccumulatorId.random(did);
      const accumulated = accumulatorModuleClass.accumulatedAsHex(
        accumulator.accumulated,
        AccumulatorType.VBPos,
      );

      await accumulatorModule.addPositiveAccumulator(
        accumulatorId,
        accumulated,
        [did, pk1Id],
        pair,
      );

      const queriedAccum = await accumulatorModule.getAccumulator(
        accumulatorId,
        true,
        true,
      );

      expect(queriedAccum.accumulated.value).toEqual(accumulated);
    });

    test('Can create/update all types of accumulators', async () => {
      const acc1Id = AccumulatorId.random(did);

      await accumulatorModule.addPositiveAccumulator(
        acc1Id,
        hexToU8a('0xff'),
        [did, pk1Id],
        pair,
      );

      let queriedAccum = await accumulatorModule.getAccumulator(acc1Id);

      expect(queriedAccum.accumulator.value.toJSON()).toEqual(
        new AccumulatorCommon(hexToU8a('0xff'), [did, pk1Id]).toJSON(),
      );

      await accumulatorModule.updatePositiveAccumulator(
        acc1Id,
        hexToU8a('0xfa'),
        {
          additions: [hexToU8a('0xfe')],
          removals: [hexToU8a('0xde')],
          witnessUpdateInfo: hexToU8a('0xef'),
        },
        [did, pk1Id],
        pair,
      );

      queriedAccum = await accumulatorModule.getAccumulator(acc1Id);

      expect(queriedAccum.accumulator.value.toJSON()).toEqual(
        new AccumulatorCommon(hexToU8a('0xfa'), [did, pk1Id]).toJSON(),
      );

      const acc2Id = AccumulatorId.random(did);

      await accumulatorModule.addKBUniversalAccumulator(
        acc2Id,
        hexToU8a('0xff'),
        [did, pk1Id],
        pair,
      );

      queriedAccum = await accumulatorModule.getAccumulator(acc2Id);

      expect(queriedAccum.accumulator.value.toJSON()).toEqual(
        new AccumulatorCommon(hexToU8a('0xff'), [did, pk1Id]).toJSON(),
      );

      await accumulatorModule.updateKBUniversalAccumulator(
        acc2Id,
        hexToU8a('0xfa'),
        {
          additions: [hexToU8a('0xfe')],
          removals: [hexToU8a('0xde')],
          witnessUpdateInfo: hexToU8a('0xef'),
        },
        [did, pk1Id],
        pair,
      );

      queriedAccum = await accumulatorModule.getAccumulator(acc2Id);

      expect(queriedAccum.accumulator.value.toJSON()).toEqual(
        new AccumulatorCommon(hexToU8a('0xfa'), [did, pk1Id]).toJSON(),
      );

      const acc3Id = AccumulatorId.random(did);

      await accumulatorModule.addUniversalAccumulator(
        acc3Id,
        hexToU8a('0xff'),
        [did, pk1Id],
        10,
        pair,
      );

      queriedAccum = await accumulatorModule.getAccumulator(acc3Id);

      expect(queriedAccum.accumulator.value.common.toJSON()).toEqual(
        new AccumulatorCommon(hexToU8a('0xff'), [did, pk1Id]).toJSON(),
      );

      await accumulatorModule.updateUniversalAccumulator(
        acc3Id,
        hexToU8a('0xfa'),
        {
          additions: [hexToU8a('0xfe')],
          removals: [hexToU8a('0xde')],
          witnessUpdateInfo: hexToU8a('0xef'),
        },
        [did, pk1Id],
        10,
        pair,
      );

      queriedAccum = await accumulatorModule.getAccumulator(acc3Id);

      expect(queriedAccum.accumulator.value.common.toJSON()).toEqual(
        new AccumulatorCommon(hexToU8a('0xfa'), [did, pk1Id]).toJSON(),
      );

      await accumulatorModule.removeAccumulator(acc3Id, pair);
      expect(await accumulatorModule.getAccumulator(acc3Id)).toBe(null);
    }, 60000);

    test('Witness creation, verification should work', async () => {
      let queriedAccum = await accumulatorModule.getAccumulator(
        accumulatorId,
        true,
        true,
      );
      let verifAccumulator = PositiveAccumulator.fromAccumulated(
        accumulatorModuleClass.accumulatedFromHex(
          queriedAccum.accumulated,
          AccumulatorType.VBPos,
        ),
      );

      // Witness created for member 1
      const member1 = members[10];
      const witness1 = await accumulator.membershipWitness(
        member1,
        keypair.secretKey,
        accumState,
      );

      let accumPk = new AccumulatorPublicKey(
        queriedAccum.publicKey.bytes.bytes,
      );

      let accumParams = new AccumulatorParams(
        queriedAccum.publicKey.params.bytes.bytes,
      );
      expect(
        verifAccumulator.verifyMembershipWitness(
          member1,
          witness1,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);

      // Witness created for member 2
      const member2 = members[25];
      const witness2 = await accumulator.membershipWitness(
        member2,
        keypair.secretKey,
        accumState,
      );
      expect(
        verifAccumulator.verifyMembershipWitness(
          member2,
          witness2,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);

      // Witness created for member 3
      const member3 = members[79];
      const witness3 = await accumulator.membershipWitness(
        member3,
        keypair.secretKey,
        accumState,
      );
      expect(
        verifAccumulator.verifyMembershipWitness(
          member3,
          witness3,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);

      // Previous users' witness still works
      expect(
        verifAccumulator.verifyMembershipWitness(
          member1,
          witness1,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);
      expect(
        verifAccumulator.verifyMembershipWitness(
          member2,
          witness2,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);

      // Manager decides to remove a member, the new accumulated value will be published along with witness update info
      const witnessUpdInfo = VBWitnessUpdateInfo.new(
        accumulator.accumulated,
        [],
        [member2],
        keypair.secretKey,
      );
      await accumulator.remove(member2, keypair.secretKey, accumState);

      let accum = await accumulatorModule.getAccumulator(accumulatorId, false);
      const accumulated = accumulatorModuleClass.accumulatedAsHex(
        accumulator.accumulated,
        AccumulatorType.VBPos,
      );
      const witUpdBytes = u8aToHex(witnessUpdInfo.value);
      await accumulatorModule.updatePositiveAccumulator(
        accumulatorId,
        accumulated,
        { removals: [u8aToHex(member2)], witnessUpdateInfo: witUpdBytes },
        [did, pk1Id],
        pair,
      );

      queriedAccum = await accumulatorModule.getAccumulator(
        accumulatorId,
        true,
        true,
      );
      expect(queriedAccum.accumulated.value).toEqual(accumulated);

      verifAccumulator = PositiveAccumulator.fromAccumulated(
        accumulatorModuleClass.accumulatedFromHex(
          queriedAccum.accumulated,
          AccumulatorType.VBPos,
        ),
      );

      accumPk = new AccumulatorPublicKey(queriedAccum.publicKey.bytes.bytes);
      accumParams = new AccumulatorParams(
        queriedAccum.publicKey.params.bytes.bytes,
      );

      // Witness created for member 3
      const member4 = members[52];
      const witness4 = await accumulator.membershipWitness(
        member4,
        keypair.secretKey,
        accumState,
      );
      expect(
        verifAccumulator.verifyMembershipWitness(
          member4,
          witness4,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);

      // Older witnesses need to be updated
      accum = await accumulatorModule.getAccumulator(accumulatorId);

      await accumulatorModule.updateWitness(
        accumulatorId,
        member1,
        witness1,
        accum.lastModified,
        accum.lastModified,
      );

      await accumulatorModule.updateWitness(
        accumulatorId,
        member3,
        witness3,
        accum.lastModified,
        accum.lastModified,
      );

      expect(
        verifAccumulator.verifyMembershipWitness(
          member1,
          witness1,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);

      expect(
        verifAccumulator.verifyMembershipWitness(
          member3,
          witness3,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);
    });

    test('Witness update after several batch upgrades', async () => {
      let queriedAccum = await accumulatorModule.getAccumulator(
        accumulatorId,
        true,
        true,
      );
      let verifAccumulator = PositiveAccumulator.fromAccumulated(
        accumulatorModuleClass.accumulatedFromHex(
          queriedAccum.accumulated,
          AccumulatorType.VBPos,
        ),
      );
      const member = members[10];
      let witness = await accumulator.membershipWitness(
        member,
        keypair.secretKey,
        accumState,
      );

      const accumPk = new AccumulatorPublicKey(
        queriedAccum.publicKey.bytes.bytes,
      );
      const accumParams = new AccumulatorParams(
        queriedAccum.publicKey.params.bytes.bytes,
      );
      expect(
        verifAccumulator.verifyMembershipWitness(
          member,
          witness,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);

      // Do some updates to the accumulator

      const removals1 = [members[85], members[86]];
      const witnessUpdInfo1 = VBWitnessUpdateInfo.new(
        accumulator.accumulated,
        [],
        removals1,
        keypair.secretKey,
      );
      await accumulator.removeBatch(removals1, keypair.secretKey, accumState);
      const accumulated1 = accumulatorModuleClass.accumulatedAsHex(
        accumulator.accumulated,
        AccumulatorType.VBPos,
      );
      const witUpdBytes1 = u8aToHex(witnessUpdInfo1.value);
      await accumulatorModule.updatePositiveAccumulator(
        accumulatorId,
        accumulated1,
        {
          removals: removals1.map((r) => u8aToHex(r)),
          witnessUpdateInfo: witUpdBytes1,
        },
        [did, pk1Id],
        pair,
      );

      const removals2 = [members[87], members[88]];
      const witnessUpdInfo2 = VBWitnessUpdateInfo.new(
        accumulator.accumulated,
        [],
        removals2,
        keypair.secretKey,
      );
      await accumulator.removeBatch(removals2, keypair.secretKey, accumState);
      const accumulated2 = accumulatorModuleClass.accumulatedAsHex(
        accumulator.accumulated,
        AccumulatorType.VBPos,
      );
      const witUpdBytes2 = u8aToHex(witnessUpdInfo2.value);
      await accumulatorModule.updatePositiveAccumulator(
        accumulatorId,
        accumulated2,
        {
          removals: removals2.map((r) => u8aToHex(r)),
          witnessUpdateInfo: witUpdBytes2,
        },
        [did, pk1Id],
        pair,
      );

      const removals3 = [members[89], members[90], members[91]];
      const witnessUpdInfo3 = VBWitnessUpdateInfo.new(
        accumulator.accumulated,
        [],
        removals3,
        keypair.secretKey,
      );
      await accumulator.removeBatch(removals3, keypair.secretKey, accumState);
      const accumulated3 = accumulatorModuleClass.accumulatedAsHex(
        accumulator.accumulated,
        AccumulatorType.VBPos,
      );
      const witUpdBytes3 = u8aToHex(witnessUpdInfo3.value);
      await accumulatorModule.updatePositiveAccumulator(
        accumulatorId,
        accumulated3,
        {
          removals: removals3.map((r) => u8aToHex(r)),
          witnessUpdateInfo: witUpdBytes3,
        },
        [did, pk1Id],
        pair,
      );

      // Get a witness from the accumulator manager. This will be updated after the following updates.
      witness = await accumulator.membershipWitness(
        member,
        keypair.secretKey,
        accumState,
      );

      // Do some more updates to the accumulator
      const removals4 = [members[92], members[93]];
      const witnessUpdInfo4 = VBWitnessUpdateInfo.new(
        accumulator.accumulated,
        [],
        removals4,
        keypair.secretKey,
      );
      await accumulator.removeBatch(removals4, keypair.secretKey, accumState);
      const accumulated4 = accumulatorModuleClass.accumulatedAsHex(
        accumulator.accumulated,
        AccumulatorType.VBPos,
      );
      const witUpdBytes4 = u8aToHex(witnessUpdInfo4.value);
      await accumulatorModule.updatePositiveAccumulator(
        accumulatorId,
        accumulated4,
        {
          removals: removals4.map((r) => u8aToHex(r)),
          witnessUpdateInfo: witUpdBytes4,
        },
        [did, pk1Id],
        pair,
      );

      const { lastModified: startFrom } = await accumulatorModule.getAccumulator(accumulatorId);

      const removals5 = [members[94], members[95], members[96]];
      const witnessUpdInfo5 = VBWitnessUpdateInfo.new(
        accumulator.accumulated,
        [],
        removals5,
        keypair.secretKey,
      );
      await accumulator.removeBatch(removals5, keypair.secretKey, accumState);
      const accumulated5 = accumulatorModuleClass.accumulatedAsHex(
        accumulator.accumulated,
        AccumulatorType.VBPos,
      );
      const witUpdBytes5 = u8aToHex(witnessUpdInfo5.value);
      await accumulatorModule.updatePositiveAccumulator(
        accumulatorId,
        accumulated5,
        {
          removals: removals5.map((r) => u8aToHex(r)),
          witnessUpdateInfo: witUpdBytes5,
        },
        [did, pk1Id],
        pair,
      );

      queriedAccum = await accumulatorModule.getAccumulator(
        accumulatorId,
        true,
        true,
      );
      verifAccumulator = PositiveAccumulator.fromAccumulated(
        accumulatorModuleClass.accumulatedFromHex(
          queriedAccum.accumulated,
          AccumulatorType.VBPos,
        ),
      );
      // Old witness doesn't verify with new accumulator
      expect(
        verifAccumulator.verifyMembershipWitness(
          member,
          witness,
          accumPk,
          accumParams,
        ),
      ).toEqual(false);

      const oldWitness1 = new VBMembershipWitness(witness.value);
      const oldWitness2 = new VBMembershipWitness(witness.value);
      const oldWitness3 = new VBMembershipWitness(witness.value);

      // Update witness by downloading necessary blocks and applying the updates if found
      await accumulatorModule.updateWitness(
        accumulatorId,
        member,
        witness,
        startFrom,
        queriedAccum.lastModified,
      );

      // Updated witness verifies with new accumulator
      expect(
        verifAccumulator.verifyMembershipWitness(
          member,
          witness,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);

      // Test again with a batch size bigger than the total number of blocks
      await accumulatorModule.updateWitness(
        accumulatorId,
        member,
        oldWitness1,
        startFrom,
        queriedAccum.lastModified,
        queriedAccum.lastModified - startFrom + 10,
      );
      expect(
        verifAccumulator.verifyMembershipWitness(
          member,
          oldWitness1,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);

      // Test again with few other batch sizes
      await accumulatorModule.updateWitness(
        accumulatorId,
        member,
        oldWitness2,
        startFrom,
        queriedAccum.lastModified,
        3,
      );
      expect(
        verifAccumulator.verifyMembershipWitness(
          member,
          oldWitness2,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);

      await accumulatorModule.updateWitness(
        accumulatorId,
        member,
        oldWitness3,
        startFrom,
        queriedAccum.lastModified,
        4,
      );
      expect(
        verifAccumulator.verifyMembershipWitness(
          member,
          oldWitness3,
          accumPk,
          accumParams,
        ),
      ).toEqual(true);
    }, 60000);
  });
}
