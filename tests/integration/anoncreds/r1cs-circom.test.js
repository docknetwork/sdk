import { randomAsHex } from '@polkadot/util-crypto';
import { hexToU8a, stringToHex, u8aToHex } from '@polkadot/util';

import {
  Encoder,
  Statement,
  Statements,
  WitnessEqualityMetaStatement,
  MetaStatements,
  Witness,
  Witnesses,
  CompositeProof,
  ProofSpec,
  R1CSSnarkSetup,
  initializeWasm,
  getRevealedAndUnrevealed,
  getIndicesForMsgNames,
  CircomInputs,
  encodeRevealedMsgs,
  MessageEncoder,
} from '@docknetwork/crypto-wasm-ts';

import { DockAPI } from '../../../src';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from '../../test-constants';
import { DockDid, DidKeypair } from '../../../src/did';
import { getWasmBytes, parseR1CSFile } from './utils';
import { checkMapsEqual, registerNewDIDUsingPair } from '../helpers';

// Test for a scenario where a user wants to prove that his blood group is AB- without revealing the blood group.
// Similar test can be written for other "not-equals" relations like user is not resident of certain city

for (const {
  Name,
  Module,
  PublicKey,
  Signature,
  SignatureParams,
  KeyPair,
  buildProverStatement,
  buildVerifierStatement,
  buildWitness,
  getModule,
} of Schemes) {
  const attrName = 'physical.bloodGroup';
  describe(`${Name} Proving that blood group is not AB-`, () => {
    const dock = new DockAPI();
    let account;
    let issuerDid;
    let issuerKeypair;

    let encoder;
    let encodedABNeg;

    const label = stringToHex('My params');
    const labelBytes = hexToU8a(label);
    let issuerSchemeKeypair;

    let credential1;
    let credential2;

    let r1cs;
    let wasm;
    let snarkPk;
    let snarkVk;
    const isKvac = Name === 'BBDT16';

    // Structure of credential that has the blood group attribute
    const attributesStruct = {
      fname: undefined,
      lname: undefined,
      verySensitive: {
        email: undefined,
        SSN: undefined,
      },
      physical: {
        gender: undefined,
        bloodGroup: undefined,
      },
      'user-id': undefined,
    };

    // 1st credential where blood group is AB+ and a satisfactory proof can be created
    const attributes1 = {
      fname: 'John',
      lname: 'Smith',
      verySensitive: {
        email: 'john.smith@example.com',
        SSN: '123-456789-0',
      },
      physical: {
        gender: 'male',
        bloodGroup: 'AB+',
      },
      'user-id': 'user:123-xyz-#',
    };

    // 2nd credential where blood group is AB- and its not acceptable so proof will fail
    const attributes2 = {
      fname: 'Carol',
      lname: 'Smith',
      verySensitive: {
        email: 'carol.smith@example.com',
        SSN: '233-456788-1',
      },
      physical: {
        gender: 'female',
        bloodGroup: 'AB-',
      },
      'user-id': 'user:764-xyz-#',
    };

    beforeAll(async () => {
      await dock.init({
        keyring: TestKeyringOpts,
        address: FullNodeEndpoint,
      });
      account = dock.keyring.addFromUri(TestAccountURI);
      dock.setAccount(account);

      issuerKeypair = new DidKeypair(
        dock.keyring.addFromUri(randomAsHex(32)),
        1,
      );
      issuerDid = DockDid.random();
      await registerNewDIDUsingPair(dock, issuerDid, issuerKeypair);

      await initializeWasm();

      // Setup encoder
      const defaultEncoder = (v) => Signature.encodeMessageForSigningConstantTime(
        Uint8Array.from(Buffer.from(v.toString(), 'utf-8')),
      );
      encoder = new Encoder(undefined, defaultEncoder);
      encodedABNeg = encoder.encodeDefault('AB-');

      // This should ideally be done by the verifier but the verifier can publish only the Circom program and
      // prover can check that the same R1CS and WASM are generated.
      r1cs = await parseR1CSFile('not_equal_public.r1cs');
      wasm = getWasmBytes('not_equal_public.wasm');

      // Message count shouldn't matter as `label` is known
      const sigParams = SignatureParams.generate(100, labelBytes);
      // Not writing the params on chain as its assumed that the label is hardcoded in the code as system parameter

      issuerSchemeKeypair = KeyPair.generate(sigParams);

      if (!isKvac) {
        const pk = Module.prepareAddPublicKey(
          u8aToHex(issuerSchemeKeypair.publicKey.bytes),
        );
        await getModule(dock).addPublicKey(
          pk,
          issuerDid,
          issuerDid,
          issuerKeypair,
          { didModule: dock.didModule },
          false,
        );
      }
    }, 10000);

    test('Sign attributes, i.e. issue credentials', async () => {
      let verifParam;
      if (isKvac) {
        verifParam = issuerSchemeKeypair.sk;
      } else {
        const queriedPk = await getModule(dock).getPublicKey(
          issuerDid,
          2,
          false,
        );
        verifParam = new PublicKey(hexToU8a(queriedPk.bytes));
      }

      credential1 = Signature.signMessageObject(
        attributes1,
        issuerSchemeKeypair.sk,
        labelBytes,
        encoder,
      );
      expect(
        credential1.signature.verifyMessageObject(
          attributes1,
          verifParam,
          labelBytes,
          encoder,
        ).verified,
      ).toBe(true);

      credential2 = Signature.signMessageObject(
        attributes2,
        issuerSchemeKeypair.sk,
        labelBytes,
        encoder,
      );
      expect(
        credential2.signature.verifyMessageObject(
          attributes2,
          verifParam,
          labelBytes,
          encoder,
        ).verified,
      ).toBe(true);
    });

    it('verifier generates SNARk proving and verifying key', async () => {
      const pk = R1CSSnarkSetup.fromParsedR1CSFile(r1cs, 1);
      snarkPk = pk.decompress();
      snarkVk = pk.getVerifyingKeyUncompressed();
    });

    it('proof verifies when blood groups is not AB-', async () => {
      expect(JSON.stringify(encodedABNeg)).not.toEqual(
        JSON.stringify(credential1.encodedMessages[attrName]),
      );

      await check(attributes1, credential1, 'John', true);
    });

    it('proof does not verify when blood groups is AB-', async () => {
      expect(JSON.stringify(encodedABNeg)).toEqual(
        JSON.stringify(credential2.encodedMessages[attrName]),
      );

      await check(attributes2, credential2, 'Carol', false);
    });

    async function check(
      credentialAttributesRaw,
      credential,
      expectedFirstName,
      shouldProofVerify,
    ) {
      let sigPk;
      if (!isKvac) {
        const queriedPk = await getModule(dock).getPublicKey(
          issuerDid,
          2,
          false,
        );
        sigPk = new PublicKey(hexToU8a(queriedPk.bytes));
      }

      const revealedNames = new Set();
      revealedNames.add('fname');

      const sigParams = !isKvac
        ? SignatureParams.getSigParamsForMsgStructure(
          attributesStruct,
          labelBytes,
        )
        : SignatureParams.getMacParamsForMsgStructure(
          attributesStruct,
          labelBytes,
        );
      const [revealedMsgs, unrevealedMsgs, revealedMsgsRaw] = getRevealedAndUnrevealed(
        credentialAttributesRaw,
        revealedNames,
        encoder,
      );
      expect(revealedMsgsRaw).toEqual({ fname: expectedFirstName });

      const statement1 = !isKvac && 'adaptForLess' in sigPk
        ? buildProverStatement(
          sigParams,
          sigPk.adaptForLess(sigParams.supportedMessageCount()),
          revealedMsgs,
          false,
        )
        : buildProverStatement(sigParams, revealedMsgs, false);
      const statement2 = Statement.r1csCircomProver(r1cs, wasm, snarkPk);

      const statementsProver = new Statements();
      const sIdx1 = statementsProver.add(statement1);
      const sIdx2 = statementsProver.add(statement2);

      // Enforce the equality between credential attribute and the Circom program input
      const witnessEq1 = new WitnessEqualityMetaStatement();
      witnessEq1.addWitnessRef(
        sIdx1,
        getIndicesForMsgNames([attrName], attributesStruct)[0],
      );
      witnessEq1.addWitnessRef(sIdx2, 0);

      const metaStmtsProver = new MetaStatements();
      metaStmtsProver.addWitnessEquality(witnessEq1);

      // The prover should independently construct this `ProofSpec`
      const proofSpecProver = new ProofSpec(statementsProver, metaStmtsProver);
      expect(proofSpecProver.isValid()).toEqual(true);

      const witness1 = buildWitness(
        credential.signature,
        unrevealedMsgs,
        false,
      );

      const inputs = new CircomInputs();
      inputs.setPrivateInput('in', credential.encodedMessages[attrName]);
      inputs.setPublicInput('pub', encodedABNeg);
      const witness2 = Witness.r1csCircomWitness(inputs);

      const witnesses = new Witnesses();
      witnesses.add(witness1);
      witnesses.add(witness2);

      const proof = CompositeProof.generate(proofSpecProver, witnesses);

      // Verifier independently encodes revealed messages
      const revealedMsgsFromVerifier = encodeRevealedMsgs(
        revealedMsgsRaw,
        attributesStruct,
        encoder,
      );
      checkMapsEqual(revealedMsgs, revealedMsgsFromVerifier);

      const statement3 = !isKvac
        ? buildVerifierStatement(
          sigParams,
          'adaptForLess' in sigPk
            ? sigPk.adaptForLess(sigParams.supportedMessageCount())
            : sigPk,
          revealedMsgsFromVerifier,
          false,
        )
        : buildVerifierStatement(sigParams, revealedMsgsFromVerifier, false);
      const pub = [
        MessageEncoder.encodePositiveNumberForSigning(1),
        encodedABNeg,
      ];
      const statement4 = Statement.r1csCircomVerifier(pub, snarkVk);

      const statementsVerifier = new Statements();
      const sIdx3 = statementsVerifier.add(statement3);
      const sIdx4 = statementsVerifier.add(statement4);

      const witnessEq2 = new WitnessEqualityMetaStatement();
      witnessEq2.addWitnessRef(
        sIdx3,
        getIndicesForMsgNames([attrName], attributesStruct)[0],
      );
      witnessEq2.addWitnessRef(sIdx4, 0);

      const metaStmtsVerifier = new MetaStatements();
      metaStmtsVerifier.addWitnessEquality(witnessEq2);

      const proofSpecVerifier = new ProofSpec(
        statementsVerifier,
        metaStmtsVerifier,
      );
      expect(proofSpecVerifier.isValid()).toEqual(true);

      expect(proof.verify(proofSpecVerifier).verified).toEqual(
        shouldProofVerify,
      );
    }

    afterAll(async () => {
      await dock.disconnect();
    }, 10000);
  });
}
