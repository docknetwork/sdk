import { initializeWasm } from '@docknetwork/crypto-wasm';
import { randomAsHex } from '@polkadot/util-crypto';
import {
  hexToU8a, stringToHex, stringToU8a, u8aToHex,
} from '@polkadot/util';
import {
  Accumulator,
  SignatureParamsG1,
  KeypairG2,
  SignatureG1,
  Signature,
  PositiveAccumulator,
  Statement,
  Statements,
  WitnessEqualityMetaStatement,
  MetaStatement,
  MetaStatements,
  ProofSpecG1,
  Witness,
  Witnesses,
  CompositeProofG1,
  WitnessUpdatePublicInfo,
} from '@docknetwork/crypto-wasm-ts';
import { InMemoryState } from '@docknetwork/crypto-wasm-ts/lib/crypto-wasm-ts/src/accumulator/in-memory-persistence';
import { DockAPI } from '../../../src';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from '../../test-constants';
import {
  createKeyDetail,
  createNewDockDID,
  getHexIdentifierFromDID,
} from '../../../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../../../src/utils/misc';
import BBSPlusModule from '../../../src/modules/bbs-plus';
import AccumulatorModule from '../../../src/modules/accumulator';
import { getAllEventsFromBlock } from '../../../src/utils/chain-ops';

describe('Complete demo of anonymous credentials', () => {
  const dock = new DockAPI();
  let account;
  let issuerDid;
  let issuerKeypair;
  let accumulatorManagerDid;
  let accumulatorManagerKeypair;

  let issuerBbsPlusKeypair;
  let accumulatorKeypair;
  let accumulatorId;
  let accumulator;

  const seedAccum = randomAsHex(32);
  const accumulatorState = new InMemoryState();

  let signature;
  let membershipWitness;

  // User's attributes which will be signed by the issuer of the credential
  const attributes = [
    stringToU8a('John'), // First name
    stringToU8a('Smith'), // Last name
    stringToU8a('M'), // Gender
    stringToU8a('New York'), // City
    stringToU8a('129086521911'), // SSN
    stringToU8a('userid-xyz'), // user/credential id, this is put in the accumulator and used for revocation
  ];
  const attributeCount = attributes.length;

  function encodedAttributes(attrs) {
    const encoded = [];
    for (let i = 0; i < attrs.length; i++) {
      if (i === attributeCount - 1) {
        // The last attribute is used for revocation and is thus put into the accumulator so encoding it in a
        // different way.
        encoded.push(Accumulator.encodeBytesAsAccumulatorMember(attrs[i]));
      } else {
        encoded.push(Signature.encodeMessageForSigning(attrs[i]));
      }
    }
    return encoded;
  }

  async function proveAndVerify() {
    const encodedAttrs = encodedAttributes(attributes);

    // User reveals 1 message at index 1 to verifier
    const revealedMsgIndices = new Set();
    revealedMsgIndices.add(1);
    const revealedMsgs = new Map();
    const unrevealedMsgs = new Map();
    for (let i = 0; i < attributeCount; i++) {
      if (revealedMsgIndices.has(i)) {
        revealedMsgs.set(i, encodedAttrs[i]);
      } else {
        unrevealedMsgs.set(i, encodedAttrs[i]);
      }
    }

    const queriedPk = await dock.bbsPlusModule.getPublicKey(issuerDid, 1, true);
    const sigParams = new SignatureParamsG1(
      SignatureParamsG1.valueFromBytes(hexToU8a(queriedPk.params.bytes)),
    );
    const sigPk = hexToU8a(queriedPk.bytes);

    const accum = await dock.accumulatorModule.getAccumulator(
      accumulatorId,
      true,
    );
    const accumParams = hexToU8a(accum.publicKey.params.bytes);
    const accumPk = hexToU8a(accum.publicKey.bytes);
    const accumulated = hexToU8a(accum.accumulated);
    const provingKey = Accumulator.generateMembershipProvingKey();

    const statement1 = Statement.bbsSignature(
      sigParams,
      sigPk,
      revealedMsgs,
      false,
    );
    const statement2 = Statement.accumulatorMembership(
      accumParams,
      accumPk,
      provingKey,
      accumulated,
    );
    const statements = new Statements();
    statements.add(statement1);
    statements.add(statement2);

    const witnessEq = new WitnessEqualityMetaStatement();
    witnessEq.addWitnessRef(0, attributeCount - 1);
    witnessEq.addWitnessRef(1, 0);
    const ms = MetaStatement.witnessEquality(witnessEq);

    const metaStatements = new MetaStatements();
    metaStatements.add(ms);

    const context = stringToU8a('some context');

    const proofSpec = new ProofSpecG1(statements, metaStatements, context);

    const witness1 = Witness.bbsSignature(signature, unrevealedMsgs, false);
    const witness2 = Witness.accumulatorMembership(
      encodedAttrs[attributeCount - 1],
      membershipWitness,
    );
    const witnesses = new Witnesses();
    witnesses.add(witness1);
    witnesses.add(witness2);

    const proof = CompositeProofG1.generate(proofSpec, witnesses);

    expect(proof.verify(proofSpec).verified).toEqual(true);
  }

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    issuerKeypair = dock.keyring.addFromUri(randomAsHex(32));
    issuerDid = createNewDockDID();
    await dock.did.new(
      issuerDid,
      createKeyDetail(
        getPublicKeyFromKeyringPair(issuerKeypair),
        getHexIdentifierFromDID(issuerDid),
      ),
      false,
    );
    accumulatorManagerKeypair = dock.keyring.addFromUri(randomAsHex(32));
    accumulatorManagerDid = createNewDockDID();
    await dock.did.new(
      accumulatorManagerDid,
      createKeyDetail(
        getPublicKeyFromKeyringPair(accumulatorManagerKeypair),
        getHexIdentifierFromDID(accumulatorManagerDid),
      ),
      false,
    );
    await initializeWasm();
    done();
  }, 20000);

  test('Create BBS+ params', async () => {
    const label = stringToHex('My BBS+ params');
    const bytes = u8aToHex(
      SignatureParamsG1.generate(attributeCount, hexToU8a(label)).toBytes(),
    );
    const params = BBSPlusModule.prepareAddParameters(
      bytes,
      undefined,
      label,
    );
    await dock.bbsPlusModule.createNewParams(
      params,
      getHexIdentifierFromDID(issuerDid),
      issuerKeypair,
      undefined,
      false,
    );
    const paramsWritten = await dock.bbsPlusModule.getLastParamsWritten(
      issuerDid,
    );
    expect(paramsWritten.bytes).toEqual(params.bytes);
    expect(paramsWritten.label).toEqual(params.label);
  }, 10000);

  test('Create BBS+ keypair', async () => {
    const queriedParams = await dock.bbsPlusModule.getParams(issuerDid, 1);
    const paramsVal = SignatureParamsG1.valueFromBytes(
      hexToU8a(queriedParams.bytes),
    );
    const params = new SignatureParamsG1(
      paramsVal,
      hexToU8a(queriedParams.label),
    );
    issuerBbsPlusKeypair = KeypairG2.generate(params);

    const pk = BBSPlusModule.prepareAddPublicKey(
      u8aToHex(issuerBbsPlusKeypair.publicKey),
      undefined,
      [issuerDid, 1],
    );
    await dock.bbsPlusModule.createNewPublicKey(
      pk,
      getHexIdentifierFromDID(issuerDid),
      issuerKeypair,
      undefined,
      false,
    );
  }, 10000);

  test('Create Accumulator params', async () => {
    const label = stringToHex('My Accumulator params');
    const bytes = u8aToHex(Accumulator.generateParams(hexToU8a(label)));
    const params = AccumulatorModule.prepareAddParameters(
      bytes,
      undefined,
      label,
    );
    await dock.accumulatorModule.createNewParams(
      params,
      getHexIdentifierFromDID(accumulatorManagerDid),
      accumulatorManagerKeypair,
      undefined,
      false,
    );
    const paramsWritten = await dock.accumulatorModule.getLastParamsWritten(
      accumulatorManagerDid,
    );
    expect(paramsWritten.bytes).toEqual(params.bytes);
    expect(paramsWritten.label).toEqual(params.label);
  }, 10000);

  test('Create Accumulator keypair', async () => {
    const queriedParams = await dock.accumulatorModule.getParams(
      accumulatorManagerDid,
      1,
    );
    accumulatorKeypair = Accumulator.generateKeypair(
      hexToU8a(queriedParams.bytes),
      hexToU8a(seedAccum),
    );

    const pk = AccumulatorModule.prepareAddPublicKey(
      u8aToHex(accumulatorKeypair.public_key),
      undefined,
      [accumulatorManagerDid, 1],
    );
    await dock.accumulatorModule.createNewPublicKey(
      pk,
      getHexIdentifierFromDID(accumulatorManagerDid),
      accumulatorManagerKeypair,
      undefined,
      false,
    );
  }, 10000);

  test('Create Accumulator', async () => {
    const queriedParams = await dock.accumulatorModule.getParams(
      accumulatorManagerDid,
      1,
    );
    accumulator = PositiveAccumulator.initialize(
      hexToU8a(queriedParams.bytes),
      accumulatorKeypair.secret_key,
    );

    accumulatorId = randomAsHex(32);
    const accumulated = u8aToHex(accumulator.accumulated);
    await dock.accumulatorModule.createNewPositiveAccumulator(
      accumulatorId,
      accumulated,
      [accumulatorManagerDid, 1],
      accumulatorManagerKeypair,
      undefined,
      false,
    );
  }, 10000);

  test('Sign attributes, i.e. issue credential', async () => {
    const encodedAttrs = encodedAttributes(attributes);
    const queriedPk = await dock.bbsPlusModule.getPublicKey(issuerDid, 1, true);
    const paramsVal = SignatureParamsG1.valueFromBytes(
      hexToU8a(queriedPk.params.bytes),
    );
    const params = new SignatureParamsG1(
      paramsVal,
      hexToU8a(queriedPk.params.label),
    );
    signature = SignatureG1.generate(
      encodedAttrs,
      issuerBbsPlusKeypair.secretKey,
      params,
      false,
    );
    // User verifies the credential (signature)
    const result = signature.verify(
      encodedAttrs,
      hexToU8a(queriedPk.bytes),
      params,
      false,
    );
    expect(result.verified).toEqual(true);
  });

  test('Add attribute to accumulator for checking revocation later', async () => {
    const encodedAttrs = encodedAttributes(attributes);
    await accumulator.add(
      encodedAttrs[attributeCount - 1],
      accumulatorKeypair.secret_key,
      accumulatorState,
    );
    expect(
      accumulatorState.state.has(encodedAttrs[attributeCount - 1]),
    ).toEqual(true);
    membershipWitness = await accumulator.membershipWitness(
      encodedAttrs[attributeCount - 1],
      accumulatorKeypair.secret_key,
      accumulatorState,
    );
    const accumulated = u8aToHex(accumulator.accumulated);
    const accum = await dock.accumulatorModule.getAccumulator(
      accumulatorId,
      true,
    );
    await dock.accumulatorModule.updateAccumulator(
      accumulatorId,
      accumulated,
      { additions: [u8aToHex(encodedAttrs[attributeCount - 1])] },
      accum.created,
      accum.nonce + 1,
      accumulatorManagerKeypair,
      undefined,
      false,
    );
    const queriedAccum = await dock.accumulatorModule.getAccumulator(
      accumulatorId,
      true,
    );
    expect(queriedAccum.accumulated).toEqual(accumulated);
    const tempAccumulator = PositiveAccumulator.fromAccumulated(
      hexToU8a(queriedAccum.accumulated),
    );
    expect(
      tempAccumulator.verifyMembershipWitness(
        encodedAttrs[attributeCount - 1],
        membershipWitness,
        hexToU8a(queriedAccum.publicKey.bytes),
        hexToU8a(queriedAccum.publicKey.params.bytes),
      ),
    ).toEqual(true);
  }, 20000);

  test('Prove knowledge of signature, i.e. possession of credential and accumulator membership', async () => {
    await proveAndVerify();
  });

  test('Add new members to the accumulator and update witness', async () => {
    const encodedAttrs = encodedAttributes(attributes);
    const member1 = Accumulator.encodePositiveNumberAsAccumulatorMember(100);
    const member2 = Accumulator.encodePositiveNumberAsAccumulatorMember(105);
    await accumulator.addBatch(
      [member1, member2],
      accumulatorKeypair.secret_key,
      accumulatorState,
    );

    let accum = await dock.accumulatorModule.getAccumulator(
      accumulatorId,
      false,
    );
    const witnessUpdInfo = WitnessUpdatePublicInfo.new(
      hexToU8a(accum.accumulated),
      [member1, member2],
      [],
      accumulatorKeypair.secret_key,
    );
    await dock.accumulatorModule.updateAccumulator(
      accumulatorId,
      u8aToHex(accumulator.accumulated),
      {
        additions: [u8aToHex(member1), u8aToHex(member2)],
        witnessUpdateInfo: u8aToHex(witnessUpdInfo.value),
      },
      accum.created,
      accum.nonce + 1,
      accumulatorManagerKeypair,
      undefined,
      false,
    );

    accum = await dock.accumulatorModule.getAccumulator(accumulatorId, false);
    const updates = await dock.accumulatorModule.getUpdatesFromBlock(
      accumulatorId,
      accum.lastModified,
    );
    expect(updates.length).toEqual(1);
    const queriedWitnessInfo = new WitnessUpdatePublicInfo(
      hexToU8a(updates[0].witnessUpdateInfo),
    );
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
    membershipWitness.updateUsingPublicInfoPostBatchUpdate(
      encodedAttrs[attributeCount - 1],
      additions,
      removals,
      queriedWitnessInfo,
    );

    const queriedAccum = await dock.accumulatorModule.getAccumulator(
      accumulatorId,
      true,
    );
    const tempAccumulator = PositiveAccumulator.fromAccumulated(
      hexToU8a(queriedAccum.accumulated),
    );
    expect(
      tempAccumulator.verifyMembershipWitness(
        encodedAttrs[attributeCount - 1],
        membershipWitness,
        hexToU8a(queriedAccum.publicKey.bytes),
        hexToU8a(queriedAccum.publicKey.params.bytes),
      ),
    ).toEqual(true);
  });

  test('After witness update, prove knowledge of signature, i.e. possession of credential and accumulator membership', async () => {
    await proveAndVerify();
  });

  test('Do several updates to the accumulator and update witness', async () => {
    const encodedAttrs = encodedAttributes(attributes);

    const member1 = Accumulator.encodePositiveNumberAsAccumulatorMember(100);
    const member2 = Accumulator.encodePositiveNumberAsAccumulatorMember(105);

    const member3 = Accumulator.encodePositiveNumberAsAccumulatorMember(110);
    const member4 = Accumulator.encodePositiveNumberAsAccumulatorMember(111);

    // TODO: Figure out why the state check doesn't work    // expect(accumulatorState.state.has(member1)).toEqual(true);
    // expect(accumulatorState.state.has(member2)).toEqual(true);
    // await accumulator.addRemoveBatches([member3, member4], [member1, member2], accumulatorKeypair.secret_key, accumulatorState);
    await accumulator.addRemoveBatches(
      [member3, member4],
      [member1, member2],
      accumulatorKeypair.secret_key,
    );

    let accum = await dock.accumulatorModule.getAccumulator(
      accumulatorId,
      false,
    );
    let witnessUpdInfo = WitnessUpdatePublicInfo.new(
      hexToU8a(accum.accumulated),
      [member3, member4],
      [member1, member2],
      accumulatorKeypair.secret_key,
    );
    await dock.accumulatorModule.updateAccumulator(
      accumulatorId,
      u8aToHex(accumulator.accumulated),
      {
        additions: [u8aToHex(member3), u8aToHex(member4)],
        removals: [u8aToHex(member1), u8aToHex(member2)],
        witnessUpdateInfo: u8aToHex(witnessUpdInfo.value),
      },
      accum.created,
      accum.nonce + 1,
      accumulatorManagerKeypair,
      undefined,
      false,
    );

    const member5 = Accumulator.encodePositiveNumberAsAccumulatorMember(200);
    const member6 = Accumulator.encodePositiveNumberAsAccumulatorMember(25);

    // await accumulator.addRemoveBatches([member5, member6], [member4], accumulatorKeypair.secret_key, accumulatorState);
    await accumulator.addRemoveBatches(
      [member5, member6],
      [member4],
      accumulatorKeypair.secret_key,
    );

    accum = await dock.accumulatorModule.getAccumulator(accumulatorId, false);
    const startingBlock = accum.lastModified;
    witnessUpdInfo = WitnessUpdatePublicInfo.new(
      hexToU8a(accum.accumulated),
      [member5, member6],
      [member4],
      accumulatorKeypair.secret_key,
    );
    await dock.accumulatorModule.updateAccumulator(
      accumulatorId,
      u8aToHex(accumulator.accumulated),
      {
        additions: [u8aToHex(member5), u8aToHex(member6)],
        removals: [u8aToHex(member4)],
        witnessUpdateInfo: u8aToHex(witnessUpdInfo.value),
      },
      accum.created,
      accum.nonce + 1,
      accumulatorManagerKeypair,
      undefined,
      false,
    );

    const member7 = Accumulator.encodePositiveNumberAsAccumulatorMember(201);
    const member8 = Accumulator.encodePositiveNumberAsAccumulatorMember(202);
    const member9 = Accumulator.encodePositiveNumberAsAccumulatorMember(203);

    // await accumulator.addBatch([member7, member8, member9], accumulatorKeypair.secret_key, accumulatorState);
    await accumulator.addBatch(
      [member7, member8, member9],
      accumulatorKeypair.secret_key,
    );

    accum = await dock.accumulatorModule.getAccumulator(accumulatorId, false);
    witnessUpdInfo = WitnessUpdatePublicInfo.new(
      hexToU8a(accum.accumulated),
      [member7, member8, member9],
      [],
      accumulatorKeypair.secret_key,
    );
    await dock.accumulatorModule.updateAccumulator(
      accumulatorId,
      u8aToHex(accumulator.accumulated),
      {
        additions: [u8aToHex(member7), u8aToHex(member8), u8aToHex(member9)],
        removals: [],
        witnessUpdateInfo: u8aToHex(witnessUpdInfo.value),
      },
      accum.created,
      accum.nonce + 1,
      accumulatorManagerKeypair,
      undefined,
      false,
    );

    accum = await dock.accumulatorModule.getAccumulator(accumulatorId, true);

    const latestUpdateBlockNo = accum.lastModified;
    const blockNosWithUpdates = [];
    let currentBlockNo = startingBlock;
    while (currentBlockNo <= latestUpdateBlockNo) {
      // eslint-disable-next-line no-await-in-loop
      const evs = await getAllEventsFromBlock(dock.api, currentBlockNo, false);
      for (const event of evs) {
        const ret = AccumulatorModule.parseEventAsAccumulatorUpdate(
          event.event,
        );
        if (ret !== null && ret[0] === accumulatorId) {
          blockNosWithUpdates.push(currentBlockNo);
        }
      }
      currentBlockNo += 1;
    }

    const updateInfo = [];
    for (const blockNo of blockNosWithUpdates) {
      // eslint-disable-next-line no-await-in-loop
      const updates = await dock.accumulatorModule.getUpdatesFromBlock(
        accumulatorId,
        blockNo,
      );
      const wi = new WitnessUpdatePublicInfo(
        hexToU8a(updates[0].witnessUpdateInfo),
      );
      updateInfo.push(wi);
    }

    membershipWitness.updateUsingPublicInfoPostMultipleBatchUpdates(
      encodedAttrs[attributeCount - 1],
      [
        [member3, member4],
        [member5, member6],
        [member7, member8, member9],
      ],
      [[member1, member2], [member4], []],
      [updateInfo[0], updateInfo[1], updateInfo[2]],
    );

    const tempAccumulator = PositiveAccumulator.fromAccumulated(
      hexToU8a(accum.accumulated),
    );
    expect(
      tempAccumulator.verifyMembershipWitness(
        encodedAttrs[attributeCount - 1],
        membershipWitness,
        hexToU8a(accum.publicKey.bytes),
        hexToU8a(accum.publicKey.params.bytes),
      ),
    ).toEqual(true);
  }, 30000);

  test('After another witness update, prove knowledge of signature, i.e. possession of credential and accumulator membership', async () => {
    await proveAndVerify();
  });

  test('Revoke by removing from the accumulator', async () => {
    const encodedAttrs = encodedAttributes(attributes);
    await accumulator.remove(
      encodedAttrs[attributeCount - 1],
      accumulatorKeypair.secret_key,
    );
    const accum = await dock.accumulatorModule.getAccumulator(
      accumulatorId,
      false,
    );
    const witnessUpdInfo = WitnessUpdatePublicInfo.new(
      hexToU8a(accum.accumulated),
      [],
      [encodedAttrs[attributeCount - 1]],
      accumulatorKeypair.secret_key,
    );
    await dock.accumulatorModule.updateAccumulator(
      accumulatorId,
      u8aToHex(accumulator.accumulated),
      {
        additions: [],
        removals: [u8aToHex(encodedAttrs[attributeCount - 1])],
        witnessUpdateInfo: u8aToHex(witnessUpdInfo.value),
      },
      accum.created,
      accum.nonce + 1,
      accumulatorManagerKeypair,
      undefined,
      false,
    );
  });

  test('Witness update should not be possible after removal from accumulator', async () => {
    const encodedAttrs = encodedAttributes(attributes);
    const accum = await dock.accumulatorModule.getAccumulator(
      accumulatorId,
      false,
    );
    const updates = await dock.accumulatorModule.getUpdatesFromBlock(
      accumulatorId,
      accum.lastModified,
    );
    expect(updates.length).toEqual(1);
    const queriedWitnessInfo = new WitnessUpdatePublicInfo(
      hexToU8a(updates[0].witnessUpdateInfo),
    );
    expect(() => membershipWitness.updateUsingPublicInfoPostBatchUpdate(
      encodedAttrs[attributeCount - 1],
      [],
      [hexToU8a(updates[0].removals[0])],
      queriedWitnessInfo,
    )).toThrow();
  });

  test('After revocation, i.e. removing from accumulator, prove verification should fail', async () => {
    let failed = false;
    try {
      await proveAndVerify();
    } catch (e) {
      failed = true;
    }
    expect(failed).toEqual(true);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
