import { randomAsHex } from '@polkadot/util-crypto';
import {
  hexToU8a, stringToHex, stringToU8a, u8aToHex,
} from '@polkadot/util';

import {
  BBSPlusSignatureParamsG1,
  BBSPlusKeypairG2,
  BBSPlusSignatureG1,
  Statement,
  Statements,
  WitnessEqualityMetaStatement,
  MetaStatement,
  MetaStatements,
  Witness,
  Witnesses,
  CompositeProofG1,
  BBSPlusPublicKeyG2,
  SaverDecryptor,
  SaverEncryptionGens,
  SaverChunkedCommitmentGens,
  QuasiProofSpecG1,
  BoundCheckSnarkSetup,
  initializeWasm,
} from '@docknetwork/crypto-wasm-ts';

import { DockAPI } from '../../../src';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { createNewDockDID } from '../../../src/utils/did';
import BBSPlusModule from '../../../src/modules/bbs-plus';
import { getRevealedUnrevealed } from './utils';
import { registerNewDIDUsingPair } from '../helpers';

describe('Complete demo of verifiable encryption using SAVER and bound check using LegoGroth16', () => {
  const dock = new DockAPI();
  let account;
  let issuerDid;
  let issuerKeypair;
  let issuerBbsPlusKeypair;

  const chunkBitSize = 16;
  let decryptorDid;
  let decryptorKeypair;
  let encryptionGens; let snarkPk; let decryptorSk; let encryptionKey; let
    decryptionKey;

  let signature;

  // User's attributes which will be signed by the issuer of the credential
  const attributes = [
    stringToU8a('John'), // First name
    stringToU8a('Smith'), // Last name
    10000, // Salary
    stringToU8a('New York'), // City
    '129086521911', // SSN
  ];
  const attributeCount = attributes.length;

  const encAttrIdx = 4;
  const boundedAttrIdx = 2;

  function encodedAttributes(attrs) {
    const encoded = [];
    for (let i = 0; i < attrs.length; i++) {
      if (i === encAttrIdx) {
        encoded.push(BBSPlusSignatureG1.reversibleEncodeStringForSigning(attrs[i]));
      } else if (i === boundedAttrIdx) {
        encoded.push(BBSPlusSignatureG1.encodePositiveNumberForSigning(attrs[i]));
      } else {
        encoded.push(BBSPlusSignatureG1.encodeMessageForSigning(attrs[i]));
      }
    }
    return encoded;
  }

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

    decryptorKeypair = dock.keyring.addFromUri(randomAsHex(32));
    decryptorDid = createNewDockDID();
    await registerNewDIDUsingPair(dock, decryptorDid, decryptorKeypair);

    await initializeWasm();
  }, 20000);

  test('Create BBS+ params and keys', async () => {
    const label = stringToHex('My BBS+ params');
    const sigParams = BBSPlusSignatureParamsG1.generate(attributeCount, hexToU8a(label));
    const bytes = u8aToHex(sigParams.toBytes());
    const params = BBSPlusModule.prepareAddParameters(bytes, undefined, label);
    await dock.bbsPlusModule.addParams(params, issuerDid, issuerKeypair, 1, { didModule: dock.didModule }, false);
    const paramsWritten = await dock.bbsPlusModule.getLastParamsWritten(issuerDid);
    expect(paramsWritten.bytes).toEqual(params.bytes);
    expect(paramsWritten.label).toEqual(params.label);

    issuerBbsPlusKeypair = BBSPlusKeypairG2.generate(sigParams);
    const pk = BBSPlusModule.prepareAddPublicKey(u8aToHex(issuerBbsPlusKeypair.publicKey.bytes), undefined, [issuerDid, 1]);
    await dock.bbsPlusModule.addPublicKey(pk, issuerDid, issuerDid, issuerKeypair, 1, { didModule: dock.didModule }, false);
  }, 10000);

  test('Sign attributes, i.e. issue credential', async () => {
    const encodedAttrs = encodedAttributes(attributes);
    const queriedPk = await dock.bbsPlusModule.getPublicKey(issuerDid, 2, true);
    const paramsVal = BBSPlusSignatureParamsG1.valueFromBytes(hexToU8a(queriedPk.params.bytes));
    const params = new BBSPlusSignatureParamsG1(paramsVal, hexToU8a(queriedPk.params.label));
    signature = BBSPlusSignatureG1.generate(encodedAttrs, issuerBbsPlusKeypair.secretKey, params, false);

    // User verifies the credential (signature)
    const result = signature.verify(encodedAttrs, new BBSPlusPublicKeyG2(hexToU8a(queriedPk.bytes)), params, false);
    expect(result.verified).toEqual(true);
  });

  test('Setup for decryptor', async () => {
    encryptionGens = SaverEncryptionGens.generate();
    [snarkPk, decryptorSk, encryptionKey, decryptionKey] = SaverDecryptor.setup(encryptionGens, chunkBitSize);
  }, 20000);

  test('Encrypt attribute and prove verifiably encrypted', async () => {
    // Verifier creates and shares with the prover
    const gens = SaverChunkedCommitmentGens.generate(hexToU8a(stringToHex('some label')));
    const commGens = gens.decompress();

    // Regarding publishing the decryptor parameters, there are several options like storing each parameter as a blob on the
    // chain or these could all be stored as one byteraary/blob by specifying the byte size of each parameter to later use for
    // offset in the bytearray. But a much better solution would be to store these on IPFS and store only the hash on chain.

    // Holder decompresses parameters
    const encGens = encryptionGens.decompress();
    const ek = encryptionKey.decompress();
    const pk = snarkPk.decompress();

    const queriedPk = await dock.bbsPlusModule.getPublicKey(issuerDid, 2, true);
    const sigParams = new BBSPlusSignatureParamsG1(BBSPlusSignatureParamsG1.valueFromBytes(hexToU8a(queriedPk.params.bytes)));
    const sigPk = new BBSPlusPublicKeyG2(hexToU8a(queriedPk.bytes));

    const encodedAttrs = encodedAttributes(attributes);

    const revealedAttrIndices = new Set();
    const [revealedAttrs, unrevealedAttrs] = getRevealedUnrevealed(encodedAttrs, revealedAttrIndices);

    const statement1 = Statement.bbsPlusSignature(sigParams, sigPk, revealedAttrs, false);
    const statement2 = Statement.saverProver(encGens, commGens, ek, pk, chunkBitSize);

    const proverStatements = new Statements();
    proverStatements.add(statement1);
    proverStatements.add(statement2);

    const witnessEq = new WitnessEqualityMetaStatement();
    witnessEq.addWitnessRef(0, encAttrIdx);
    witnessEq.addWitnessRef(1, 0);
    const metaStatements = new MetaStatements();
    metaStatements.add(MetaStatement.witnessEquality(witnessEq));

    const witness1 = Witness.bbsPlusSignature(signature, unrevealedAttrs, false);
    const witness2 = Witness.saver(encodedAttrs[encAttrIdx]);
    const witnesses = new Witnesses();
    witnesses.add(witness1);
    witnesses.add(witness2);

    const proverProofSpec = new QuasiProofSpecG1(proverStatements, metaStatements);
    const proof = CompositeProofG1.generateUsingQuasiProofSpec(proverProofSpec, witnesses);

    // Verifier only needs the verification key
    const vk = snarkPk.getVerifyingKeyUncompressed();
    const statement3 = Statement.saverVerifier(encGens, commGens, ek, vk, chunkBitSize);
    const verifierStatements = new Statements();
    verifierStatements.add(statement1);
    verifierStatements.add(statement3);

    const verifierProofSpec = new QuasiProofSpecG1(verifierStatements, metaStatements);
    expect(proof.verifyUsingQuasiProofSpec(verifierProofSpec).verified).toEqual(true);
  }, 180000);

  test('Prove bounded message', async () => {
    // Verifier does setup and shares proving key with prover. This key does not need to be published on chain.
    const pk = BoundCheckSnarkSetup();

    const min = 500;
    const max = 20000;
    expect(attributes[boundedAttrIdx]).toBeGreaterThanOrEqual(min);
    expect(attributes[boundedAttrIdx]).toBeLessThanOrEqual(max);

    // Prover decompresses the proving key
    const snarkProvingKey = pk.decompress();

    const queriedPk = await dock.bbsPlusModule.getPublicKey(issuerDid, 2, true);
    const sigParams = new BBSPlusSignatureParamsG1(BBSPlusSignatureParamsG1.valueFromBytes(hexToU8a(queriedPk.params.bytes)));
    const sigPk = new BBSPlusPublicKeyG2(hexToU8a(queriedPk.bytes));

    const encodedAttrs = encodedAttributes(attributes);

    const revealedAttrIndices = new Set();
    revealedAttrIndices.add(0);
    const [revealedAttrs, unrevealedAttrs] = getRevealedUnrevealed(encodedAttrs, revealedAttrIndices);

    const statement1 = Statement.bbsPlusSignature(sigParams, sigPk, revealedAttrs, false);
    const statement2 = Statement.boundCheckProver(min, max, snarkProvingKey);
    const proverStatements = new Statements();
    proverStatements.add(statement1);
    proverStatements.add(statement2);

    const witnessEq = new WitnessEqualityMetaStatement();
    witnessEq.addWitnessRef(0, boundedAttrIdx);
    witnessEq.addWitnessRef(1, 0);
    const metaStatements = new MetaStatements();
    metaStatements.add(MetaStatement.witnessEquality(witnessEq));

    const witness1 = Witness.bbsPlusSignature(signature, unrevealedAttrs, false);
    const witness2 = Witness.boundCheckLegoGroth16(encodedAttrs[boundedAttrIdx]);
    const witnesses = new Witnesses();
    witnesses.add(witness1);
    witnesses.add(witness2);

    const proverProofSpec = new QuasiProofSpecG1(proverStatements, metaStatements);
    const proof = CompositeProofG1.generateUsingQuasiProofSpec(proverProofSpec, witnesses);

    const snarkVerifyingKey = pk.getVerifyingKeyUncompressed();
    const statement3 = Statement.boundCheckVerifier(min, max, snarkVerifyingKey);
    const verifierStatements = new Statements();
    verifierStatements.add(statement1);
    verifierStatements.add(statement3);

    const verifierProofSpec = new QuasiProofSpecG1(verifierStatements, metaStatements);
    expect(proof.verifyUsingQuasiProofSpec(verifierProofSpec).verified).toEqual(true);
  }, 45000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
