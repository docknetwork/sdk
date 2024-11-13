import {
  randomAsHex,
  hexToU8a,
  stringToHex,
  stringToU8a,
  u8aToHex,
} from "@docknetwork/credential-sdk/utils";
import {
  Accumulator,
  PositiveAccumulator,
  Statement,
  Statements,
  WitnessEqualityMetaStatement,
  MetaStatement,
  MetaStatements,
  ProofSpec,
  Witness,
  Witnesses,
  CompositeProof,
  VBWitnessUpdateInfo,
  AccumulatorParams,
  AccumulatorPublicKey,
  initializeWasm,
} from "@docknetwork/crypto-wasm-ts";
import { InMemoryState } from "@docknetwork/crypto-wasm-ts/lib/accumulator/in-memory-persistence";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from "../../test-constants";
import { DockDid, DockAccumulatorId } from "@docknetwork/credential-sdk/types";
import { AbstractAccumulatorModule } from "@docknetwork/credential-sdk/modules";
import { getAllEventsFromBlock } from "@docknetwork/dock-blockchain-api/utils/chain-ops";
import { getRevealedUnrevealed } from "./utils";
import { registerNewDIDUsingPair } from "../helpers";
import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";
import DockInternalAccumulatorModule from "../../../src/accumulator/internal";
import { DockCoreModules } from "../../../src";

for (const {
  Name,
  Module,
  PublicKey,
  getModule,
  SignatureParams,
  Signature,
  KeyPair,
  buildWitness,
  buildProverStatement,
  buildVerifierStatement,
} of Schemes) {
  const isKvac = Name === "BBDT16";
  const skipIfKvac = isKvac ? describe.skip : describe;

  skipIfKvac(
    `Complete demo of anonymous credentials using ${Name} and accumulator`,
    () => {
      const dock = new DockAPI();
      const modules = new DockCoreModules(dock);

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
        stringToU8a("John"), // First name
        stringToU8a("Smith"), // Last name
        stringToU8a("M"), // Gender
        stringToU8a("New York"), // City
        stringToU8a("129086521911"), // SSN
        stringToU8a("userid-xyz"), // user/credential id, this is put in the accumulator and used for revocation
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

        // User reveals 1 attribute at index 1 to verifier
        const revealedAttrIndices = new Set();
        revealedAttrIndices.add(1);
        const [revealedAttrs, unrevealedAttrs] = getRevealedUnrevealed(
          encodedAttrs,
          revealedAttrIndices
        );

        const queriedPk = await getModule(dock).dockOnly.getPublicKey(
          issuerDid,
          2,
          true
        );
        const sigParams = new SignatureParams(
          SignatureParams.valueFromBytes(queriedPk.params.bytes)
        );
        const sigPk = new PublicKey(queriedPk.bytes.bytes);

        const accum = await modules.accumulator.getAccumulator(
          accumulatorId,
          true,
          true
        );
        const accumParams = new AccumulatorParams(accum.publicKey.params.bytes);
        const accumPk = new AccumulatorPublicKey(accum.publicKey.bytes.bytes);
        const accumulated = accum.accumulated.bytes;
        const provingKey = Accumulator.generateMembershipProvingKey();

        const statement1 =
          "adaptForLess" in sigPk
            ? buildProverStatement(
                sigParams,
                sigPk.adaptForLess(sigParams.supportedMessageCount()),
                revealedAttrs,
                false
              )
            : buildProverStatement(sigParams, revealedAttrs, false);
        const statement2 = Statement.vbAccumulatorMembership(
          accumParams,
          accumPk,
          provingKey,
          accumulated
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

        const context = stringToU8a("some context");

        const proofSpec = new ProofSpec(
          statements,
          metaStatements,
          [],
          context
        );

        const witness1 = buildWitness(signature, unrevealedAttrs, false);
        const witness2 = Witness.vbAccumulatorMembership(
          encodedAttrs[attributeCount - 1],
          membershipWitness
        );
        const witnesses = new Witnesses();
        witnesses.add(witness1);
        witnesses.add(witness2);

        const proof = CompositeProof.generate(proofSpec, witnesses);
        const statement3 = !isKvac
          ? buildVerifierStatement(
              sigParams,
              "adaptForLess" in sigPk
                ? sigPk.adaptForLess(sigParams.supportedMessageCount())
                : sigPk,
              revealedAttrs,
              false
            )
          : buildVerifierStatement(sigParams, revealedAttrs, false);
        const verifierStatements = new Statements();
        verifierStatements.add(statement3);
        verifierStatements.add(statement2);

        const verifierProofSpec = new ProofSpec(
          verifierStatements,
          metaStatements,
          [],
          context
        );
        expect(proof.verify(verifierProofSpec).verified).toEqual(true);
      }

      beforeAll(async () => {
        await dock.init({
          keyring: TestKeyringOpts,
          address: FullNodeEndpoint,
        });
        account = dock.keyring.addFromUri(TestAccountURI);
        dock.setAccount(account);
        issuerDid = DockDid.random();
        issuerKeypair = new DidKeypair([issuerDid, 1], Ed25519Keypair.random());
        await registerNewDIDUsingPair(dock, issuerDid, issuerKeypair);
        accumulatorManagerDid = DockDid.random();
        accumulatorManagerKeypair = new DidKeypair(
          [accumulatorManagerDid, 1],
          Ed25519Keypair.random()
        );
        await registerNewDIDUsingPair(
          dock,
          accumulatorManagerDid,
          accumulatorManagerKeypair
        );
        await initializeWasm();
      }, 20000);

      test("Create params", async () => {
        const label = stringToHex("My params");
        const bytes = u8aToHex(
          SignatureParams.generate(attributeCount, hexToU8a(label)).toBytes()
        );
        const params = Module.prepareAddParameters(bytes, label);
        await getModule(dock).addParams(null, params, issuerDid, issuerKeypair);
        const paramsWritten = await getModule(dock).getParams(
          issuerDid,
          await getModule(dock).lastParamsId(issuerDid)
        );
        expect(paramsWritten.bytes).toEqual(params.bytes);
        expect(paramsWritten.label).toEqual(params.label);
      }, 10000);

      test("Create keypair", async () => {
        const queriedParams = await getModule(dock).getParams(issuerDid, 1);
        const paramsVal = SignatureParams.valueFromBytes(
          queriedParams.bytes.bytes
        );
        const params = new SignatureParams(
          paramsVal,
          queriedParams.label.bytes
        );
        issuerBbsPlusKeypair = KeyPair.generate(params);

        const pk = new Module.DockOnly.PublicKey(
          new Module.DockOnly.PublicKey.Class(
            u8aToHex(issuerBbsPlusKeypair.publicKey.bytes),
            [issuerDid, 1]
          )
        );
        await getModule(dock).dockOnly.send.addPublicKey(
          pk,
          issuerDid,
          issuerKeypair
        );
      }, 10000);

      test("Create Accumulator params", async () => {
        const label = stringToHex("My Accumulator params");
        const bytes = u8aToHex(
          Accumulator.generateParams(hexToU8a(label)).bytes
        );
        const params = AbstractAccumulatorModule.prepareAddParameters(
          bytes,
          label
        );
        await modules.accumulator.addParams(
          null,
          params,
          accumulatorManagerDid,
          accumulatorManagerKeypair
        );
        const paramsWritten = await modules.accumulator.getParams(
          accumulatorManagerDid,
          await modules.accumulator.lastParamsId(accumulatorManagerDid)
        );
        expect(paramsWritten.bytes).toEqual(params.bytes);
        expect(paramsWritten.label).toEqual(params.label);
      }, 10000);

      test("Create Accumulator keypair", async () => {
        const queriedParams = await modules.accumulator.getParams(
          accumulatorManagerDid,
          1
        );
        accumulatorKeypair = Accumulator.generateKeypair(
          new AccumulatorParams(queriedParams.bytes.bytes),
          hexToU8a(seedAccum)
        );

        const pk = AbstractAccumulatorModule.prepareAddPublicKey(
          u8aToHex(accumulatorKeypair.publicKey.bytes),
          [accumulatorManagerDid, 1]
        );
        await modules.accumulator.addPublicKey(
          null,
          pk,
          accumulatorManagerDid,
          accumulatorManagerKeypair
        );
      }, 10000);

      test("Create Accumulator", async () => {
        const queriedParams = await modules.accumulator.getParams(
          accumulatorManagerDid,
          1
        );
        accumulator = PositiveAccumulator.initialize(
          new AccumulatorParams(queriedParams.bytes.bytes),
          accumulatorKeypair.secretKey
        );

        accumulatorId = DockAccumulatorId.random(accumulatorManagerDid);
        const accumulated = u8aToHex(accumulator.accumulated);
        await modules.accumulator.addPositiveAccumulator(
          accumulatorId,
          accumulated,
          [accumulatorManagerDid, 1],
          accumulatorManagerKeypair
        );
      }, 10000);

      test("Sign attributes, i.e. issue credential", async () => {
        const encodedAttrs = encodedAttributes(attributes);
        const queriedPk = await getModule(dock).dockOnly.getPublicKey(
          issuerDid,
          2,
          true
        );
        const paramsVal = SignatureParams.valueFromBytes(
          queriedPk.params.bytes.bytes
        );
        const params = new SignatureParams(
          paramsVal,
          queriedPk.params.label.bytes
        );
        signature = Signature.generate(
          encodedAttrs,
          issuerBbsPlusKeypair.secretKey,
          params,
          false
        );

        // User verifies the credential (signature)
        const result = signature.verify(
          encodedAttrs,
          new PublicKey(queriedPk.bytes.bytes),
          params,
          false
        );
        expect(result.verified).toEqual(true);
      });

      test("Add attribute to accumulator for checking revocation later", async () => {
        const encodedAttrs = encodedAttributes(attributes);
        await accumulator.add(
          encodedAttrs[attributeCount - 1],
          accumulatorKeypair.secretKey,
          accumulatorState
        );
        await expect(
          accumulatorState.has(encodedAttrs[attributeCount - 1])
        ).resolves.toEqual(true);

        membershipWitness = await accumulator.membershipWitness(
          encodedAttrs[attributeCount - 1],
          accumulatorKeypair.secretKey,
          accumulatorState
        );

        const accumulated = u8aToHex(accumulator.accumulated);
        await modules.accumulator.updateAccumulator(
          accumulatorId,
          accumulated,
          { additions: [u8aToHex(encodedAttrs[attributeCount - 1])] },
          accumulatorManagerKeypair
        );

        const queriedAccum = await modules.accumulator.getAccumulator(
          accumulatorId,
          true,
          true
        );
        expect(queriedAccum.accumulated.value).toEqual(accumulated);

        const tempAccumulator = PositiveAccumulator.fromAccumulated(
          queriedAccum.accumulated.bytes
        );
        expect(
          tempAccumulator.verifyMembershipWitness(
            encodedAttrs[attributeCount - 1],
            membershipWitness,
            new AccumulatorPublicKey(queriedAccum.publicKey.bytes.bytes),
            new AccumulatorParams(queriedAccum.publicKey.params.bytes)
          )
        ).toEqual(true);
      }, 20000);

      test("Prove knowledge of signature, i.e. possession of credential and accumulator membership", async () => {
        await proveAndVerify();
      });

      test("Add new members to the accumulator and update witness", async () => {
        const encodedAttrs = encodedAttributes(attributes);
        const member1 =
          Accumulator.encodePositiveNumberAsAccumulatorMember(100);
        const member2 =
          Accumulator.encodePositiveNumberAsAccumulatorMember(105);
        await accumulator.addBatch(
          [member1, member2],
          accumulatorKeypair.secretKey,
          accumulatorState
        );

        let accum = await modules.accumulator.getAccumulator(
          accumulatorId,
          false
        );
        const witnessUpdInfo = VBWitnessUpdateInfo.new(
          accum.accumulated.bytes,
          [member1, member2],
          [],
          accumulatorKeypair.secretKey
        );
        await modules.accumulator.updateAccumulator(
          accumulatorId,
          u8aToHex(accumulator.accumulated),
          {
            additions: [u8aToHex(member1), u8aToHex(member2)],
            witnessUpdateInfo: u8aToHex(witnessUpdInfo.value),
          },
          accumulatorManagerKeypair
        );

        accum = await modules.accumulator.getAccumulator(accumulatorId, false);
        const updates = await modules.accumulator.dockOnly.getUpdatesFromBlock(
          accumulatorId,
          accum.lastModified
        );
        expect(updates.length).toEqual(1);
        const queriedWitnessInfo = new VBWitnessUpdateInfo(
          updates[0].witnessUpdateInfo.bytes
        );
        const additions = [];
        const removals = [];
        if (updates[0].additions !== null) {
          for (const a of updates[0].additions) {
            additions.push(a.bytes);
          }
        }
        if (updates[0].removals !== null) {
          for (const a of updates[0].removals) {
            removals.push(a.bytes);
          }
        }
        membershipWitness.updateUsingPublicInfoPostBatchUpdate(
          encodedAttrs[attributeCount - 1],
          additions,
          removals,
          queriedWitnessInfo
        );

        const queriedAccum = await modules.accumulator.getAccumulator(
          accumulatorId,
          true,
          true
        );
        const tempAccumulator = PositiveAccumulator.fromAccumulated(
          queriedAccum.accumulated.bytes
        );
        expect(
          tempAccumulator.verifyMembershipWitness(
            encodedAttrs[attributeCount - 1],
            membershipWitness,
            new AccumulatorPublicKey(queriedAccum.publicKey.bytes.bytes),
            new AccumulatorParams(queriedAccum.publicKey.params.bytes)
          )
        ).toEqual(true);
      });

      test("After witness update, prove knowledge of signature, i.e. possession of credential and accumulator membership", async () => {
        await proveAndVerify();
      });

      test("Do several updates to the accumulator and update witness", async () => {
        const encodedAttrs = encodedAttributes(attributes);

        const member1 =
          Accumulator.encodePositiveNumberAsAccumulatorMember(100);
        const member2 =
          Accumulator.encodePositiveNumberAsAccumulatorMember(105);

        const member3 =
          Accumulator.encodePositiveNumberAsAccumulatorMember(110);
        const member4 =
          Accumulator.encodePositiveNumberAsAccumulatorMember(111);

        await expect(accumulatorState.has(member1)).resolves.toEqual(true);
        await expect(accumulatorState.has(member2)).resolves.toEqual(true);
        await accumulator.addRemoveBatches(
          [member3, member4],
          [member1, member2],
          accumulatorKeypair.secret_key,
          accumulatorState
        );

        let accum = await modules.accumulator.getAccumulator(
          accumulatorId,
          false
        );
        let witnessUpdInfo = VBWitnessUpdateInfo.new(
          accum.accumulated.bytes,
          [member3, member4],
          [member1, member2],
          accumulatorKeypair.secretKey
        );
        await modules.accumulator.updateAccumulator(
          accumulatorId,
          u8aToHex(accumulator.accumulated),
          {
            additions: [u8aToHex(member3), u8aToHex(member4)],
            removals: [u8aToHex(member1), u8aToHex(member2)],
            witnessUpdateInfo: u8aToHex(witnessUpdInfo.value),
          },
          accumulatorManagerKeypair
        );

        const member5 =
          Accumulator.encodePositiveNumberAsAccumulatorMember(200);
        const member6 = Accumulator.encodePositiveNumberAsAccumulatorMember(25);

        await accumulator.addRemoveBatches(
          [member5, member6],
          [member4],
          accumulatorKeypair.secret_key,
          accumulatorState
        );

        accum = await modules.accumulator.getAccumulator(accumulatorId, false);
        const startingBlock = accum.lastModified;
        witnessUpdInfo = VBWitnessUpdateInfo.new(
          accum.accumulated.bytes,
          [member5, member6],
          [member4],
          accumulatorKeypair.secretKey
        );
        await modules.accumulator.updateAccumulator(
          accumulatorId,
          u8aToHex(accumulator.accumulated),
          {
            additions: [u8aToHex(member5), u8aToHex(member6)],
            removals: [u8aToHex(member4)],
            witnessUpdateInfo: u8aToHex(witnessUpdInfo.value),
          },
          accumulatorManagerKeypair
        );

        const member7 =
          Accumulator.encodePositiveNumberAsAccumulatorMember(201);
        const member8 =
          Accumulator.encodePositiveNumberAsAccumulatorMember(202);
        const member9 =
          Accumulator.encodePositiveNumberAsAccumulatorMember(203);

        await accumulator.addBatch(
          [member7, member8, member9],
          accumulatorKeypair.secret_key,
          accumulatorState
        );

        accum = await modules.accumulator.getAccumulator(accumulatorId, false);
        witnessUpdInfo = VBWitnessUpdateInfo.new(
          accum.accumulated.bytes,
          [member7, member8, member9],
          [],
          accumulatorKeypair.secretKey
        );
        await modules.accumulator.updateAccumulator(
          accumulatorId,
          u8aToHex(accumulator.accumulated),
          {
            additions: [
              u8aToHex(member7),
              u8aToHex(member8),
              u8aToHex(member9),
            ],
            removals: [],
            witnessUpdateInfo: u8aToHex(witnessUpdInfo.value),
          },
          accumulatorManagerKeypair
        );

        accum = await modules.accumulator.getAccumulator(
          accumulatorId,
          true,
          true
        );

        const latestUpdateBlockNo = accum.lastModified;
        const blockNosWithUpdates = [];
        let currentBlockNo = startingBlock;
        while (currentBlockNo <= latestUpdateBlockNo) {
          // eslint-disable-next-line no-await-in-loop
          const evs = await getAllEventsFromBlock(
            dock.api,
            currentBlockNo,
            false
          );
          for (const event of evs) {
            const ret =
              DockInternalAccumulatorModule.parseEventAsAccumulatorUpdate(
                event.event
              );
            if (ret !== null && accumulatorId.asDock.value === ret[0]) {
              blockNosWithUpdates.push(currentBlockNo);
            }
          }
          currentBlockNo += 1;
        }

        const updateInfo = [];
        for (const blockNo of blockNosWithUpdates) {
          // eslint-disable-next-line no-await-in-loop
          const updates =
            await modules.accumulator.dockOnly.getUpdatesFromBlock(
              accumulatorId,
              blockNo
            );
          console.log("!!!!", updates);
          const wi = new VBWitnessUpdateInfo(
            updates[0].witnessUpdateInfo.bytes
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
          [updateInfo[0], updateInfo[1], updateInfo[2]]
        );

        const tempAccumulator = PositiveAccumulator.fromAccumulated(
          accum.accumulated.bytes
        );
        expect(
          tempAccumulator.verifyMembershipWitness(
            encodedAttrs[attributeCount - 1],
            membershipWitness,
            new AccumulatorPublicKey(accum.publicKey.bytes.bytes),
            new AccumulatorParams(accum.publicKey.params.bytes.bytes)
          )
        ).toEqual(true);
      }, 30000);

      test("After another witness update, prove knowledge of signature, i.e. possession of credential and accumulator membership", async () => {
        await proveAndVerify();
      });

      test("Revoke by removing from the accumulator", async () => {
        const encodedAttrs = encodedAttributes(attributes);
        await accumulator.remove(
          encodedAttrs[attributeCount - 1],
          accumulatorKeypair.secretKey
        );
        const accum = await modules.accumulator.getAccumulator(
          accumulatorId,
          false
        );
        const witnessUpdInfo = VBWitnessUpdateInfo.new(
          accum.accumulated.bytes,
          [],
          [encodedAttrs[attributeCount - 1]],
          accumulatorKeypair.secretKey
        );
        await modules.accumulator.updateAccumulator(
          accumulatorId,
          u8aToHex(accumulator.accumulated),
          {
            additions: [],
            removals: [u8aToHex(encodedAttrs[attributeCount - 1])],
            witnessUpdateInfo: u8aToHex(witnessUpdInfo.value),
          },
          accumulatorManagerKeypair
        );
      });

      test("Witness update should not be possible after removal from accumulator", async () => {
        const encodedAttrs = encodedAttributes(attributes);
        const accum = await modules.accumulator.getAccumulator(
          accumulatorId,
          false
        );
        const updates = await modules.accumulator.dockOnly.getUpdatesFromBlock(
          accumulatorId,
          accum.lastModified
        );
        expect(updates.length).toEqual(1);
        const queriedWitnessInfo = new VBWitnessUpdateInfo(
          updates[0].witnessUpdateInfo.bytes
        );
        expect(() =>
          membershipWitness.updateUsingPublicInfoPostBatchUpdate(
            encodedAttrs[attributeCount - 1],
            [],
            [hexToU8a(updates[0].removals[0])],
            queriedWitnessInfo
          )
        ).toThrow();
      });

      test("After revocation, i.e. removing from accumulator, prove verification should fail", async () => {
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
    }
  );
}
