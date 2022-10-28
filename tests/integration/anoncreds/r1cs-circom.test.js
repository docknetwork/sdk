import { randomAsHex } from '@polkadot/util-crypto';
import {
  hexToU8a, stringToHex, u8aToHex,
} from '@polkadot/util';

import {
  Encoder,
  SignatureParamsG1,
  KeypairG2,
  SignatureG1,
  Statement,
  Statements,
  WitnessEqualityMetaStatement,
  MetaStatements,
  Witness,
  Witnesses,
  CompositeProofG1,
  BBSPlusPublicKeyG2,
  ProofSpecG1,
  R1CSSnarkSetup,
  initializeWasm,
  signMessageObject,
  verifyMessageObject,
  getSigParamsForMsgStructure,
  getRevealedAndUnrevealed,
  getIndicesForMsgNames, CircomInputs, encodeRevealedMsgs,
} from '@docknetwork/crypto-wasm-ts';

import { generateFieldElementFromNumber } from '@docknetwork/crypto-wasm';
import { DockAPI } from '../../../src';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { createNewDockDID } from '../../../src/utils/did';
import BBSPlusModule from '../../../src/modules/bbs-plus';
import { getWasmBytes, parseR1CSFile } from './utils';
import { checkMapsEqual, registerNewDIDUsingPair } from '../helpers';

// Test for a scenario where a user wants to prove that his blood group is AB- without revealing the blood group.
// Similar test can be written for other "not-equals" relations like user is not resident of certain city

describe('Proving that blood group is not AB-', () => {
  const dock = new DockAPI();
  let account;
  let issuerDid;
  let issuerKeypair;

  let encoder;
  let encodedABNeg;

  const label = stringToHex('My BBS+ params');
  const labelBytes = hexToU8a(label);
  let issuerBbsPlusKeypair;

  let credential1;
  let credential2;

  let r1cs;
  let wasm;
  let snarkPk;
  let snarkVk;

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

    issuerKeypair = dock.keyring.addFromUri(randomAsHex(32));
    issuerDid = createNewDockDID();
    await registerNewDIDUsingPair(dock, issuerDid, issuerKeypair);

    await initializeWasm();

    // Setup encoder
    const defaultEncoder = (v) => {
      return SignatureG1.encodeMessageForSigning(Uint8Array.from(Buffer.from(v.toString(), 'utf-8')));
    };
    encoder = new Encoder(undefined, defaultEncoder);
    encodedABNeg = encoder.encodeDefault('AB-');

    // This should ideally be done by the verifier but the verifier can publish only the Circom program and
    // prover can check that the same R1CS and WASM are generated.
    r1cs = await parseR1CSFile('not_equal_public.r1cs');
    wasm = getWasmBytes('not_equal_public.wasm');
  }, 10000);

  test('Create BBS+ params and keys', async () => {
    // Message count shouldn't matter as `label` is known
    const sigParams = SignatureParamsG1.generate(1, labelBytes);
    // Not writing the BBS+ params on chain as its assumed that the label is hardcoded in the code as system parameter

    issuerBbsPlusKeypair = KeypairG2.generate(sigParams);
    const pk = BBSPlusModule.prepareAddPublicKey(u8aToHex(issuerBbsPlusKeypair.publicKey.bytes));
    await dock.bbsPlusModule.addPublicKey(pk, issuerDid, issuerDid, issuerKeypair, 1, { didModule: dock.didModule }, false);
  });

  test('Sign attributes, i.e. issue credentials', async () => {
    const queriedPk = await dock.bbsPlusModule.getPublicKey(issuerDid, 2, false);
    const sigPk = new BBSPlusPublicKeyG2(hexToU8a(queriedPk.bytes));

    credential1 = signMessageObject(attributes1, issuerBbsPlusKeypair.secretKey, labelBytes, encoder);
    expect(verifyMessageObject(attributes1, credential1.signature, sigPk, labelBytes, encoder).verified).toBe(true);

    credential2 = signMessageObject(attributes2, issuerBbsPlusKeypair.secretKey, labelBytes, encoder);
    expect(verifyMessageObject(attributes2, credential2.signature, sigPk, labelBytes, encoder).verified).toBe(true);
  });

  it('verifier generates SNARk proving and verifying key', async () => {
    const pk = R1CSSnarkSetup.fromParsedR1CSFile(r1cs, 1);
    snarkPk = pk.decompress();
    snarkVk = pk.getVerifyingKeyUncompressed();
  });

  it('proof verifies when blood groups is not AB-', async () => {
    expect(JSON.stringify(encodedABNeg)).not.toEqual(JSON.stringify(credential1.encodedMessages['physical.bloodGroup']));

    await check(attributes1, credential1, 'John', true);
  });

  it('proof does not verify when blood groups is AB-', async () => {
    expect(JSON.stringify(encodedABNeg)).toEqual(JSON.stringify(credential2.encodedMessages['physical.bloodGroup']));

    await check(attributes2, credential2, 'Carol', false);
  });

  async function check(credentialAttributesRaw, credential, expectedFirstName, shouldProofVerify) {
    const queriedPk = await dock.bbsPlusModule.getPublicKey(issuerDid, 2, false);
    const sigPk = new BBSPlusPublicKeyG2(hexToU8a(queriedPk.bytes));

    const revealedNames = new Set();
    revealedNames.add('fname');

    const sigParams = getSigParamsForMsgStructure(attributesStruct, labelBytes);
    const [revealedMsgs, unrevealedMsgs, revealedMsgsRaw] = getRevealedAndUnrevealed(
      credentialAttributesRaw,
      revealedNames,
      encoder,
    );
    expect(revealedMsgsRaw).toEqual({ fname: expectedFirstName });

    const statement1 = Statement.bbsSignature(sigParams, sigPk, revealedMsgs, false);
    const statement2 = Statement.r1csCircomProver(r1cs, wasm, snarkPk);

    const statementsProver = new Statements();
    const sIdx1 = statementsProver.add(statement1);
    const sIdx2 = statementsProver.add(statement2);

    // Enforce the equality between credential attribute and the Circom program input
    const witnessEq1 = new WitnessEqualityMetaStatement();
    witnessEq1.addWitnessRef(sIdx1, getIndicesForMsgNames(['physical.bloodGroup'], attributesStruct)[0]);
    witnessEq1.addWitnessRef(sIdx2, 0);

    const metaStmtsProver = new MetaStatements();
    metaStmtsProver.addWitnessEquality(witnessEq1);

    // The prover should independently construct this `ProofSpec`
    const proofSpecProver = new ProofSpecG1(statementsProver, metaStmtsProver);
    expect(proofSpecProver.isValid()).toEqual(true);

    const witness1 = Witness.bbsSignature(credential.signature, unrevealedMsgs, false);

    const inputs = new CircomInputs();
    inputs.setPrivateInput('in', credential.encodedMessages['physical.bloodGroup']);
    inputs.setPublicInput('pub', encodedABNeg);
    const witness2 = Witness.r1csCircomWitness(inputs);

    const witnesses = new Witnesses();
    witnesses.add(witness1);
    witnesses.add(witness2);

    const proof = CompositeProofG1.generate(proofSpecProver, witnesses);

    // Verifier independently encodes revealed messages
    const revealedMsgsFromVerifier = encodeRevealedMsgs(revealedMsgsRaw, attributesStruct, encoder);
    checkMapsEqual(revealedMsgs, revealedMsgsFromVerifier);

    const statement3 = Statement.bbsSignature(sigParams, sigPk, revealedMsgsFromVerifier, false);
    const pub = [generateFieldElementFromNumber(1), encodedABNeg];
    const statement4 = Statement.r1csCircomVerifier(pub, snarkVk);

    const statementsVerifier = new Statements();
    const sIdx3 = statementsVerifier.add(statement3);
    const sIdx4 = statementsVerifier.add(statement4);

    const witnessEq2 = new WitnessEqualityMetaStatement();
    witnessEq2.addWitnessRef(sIdx3, getIndicesForMsgNames(['physical.bloodGroup'], attributesStruct)[0]);
    witnessEq2.addWitnessRef(sIdx4, 0);

    const metaStmtsVerifier = new MetaStatements();
    metaStmtsVerifier.addWitnessEquality(witnessEq2);

    const proofSpecVerifier = new ProofSpecG1(statementsVerifier, metaStmtsVerifier);
    expect(proofSpecVerifier.isValid()).toEqual(true);

    expect(proof.verify(proofSpecVerifier).verified).toEqual(shouldProofVerify);
  }

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
