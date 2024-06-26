import { randomAsHex } from '@polkadot/util-crypto';
import {
  hexToU8a, stringToHex, stringToU8a, u8aToHex,
} from '@polkadot/util';

import {
  Statement,
  Statements,
  WitnessEqualityMetaStatement,
  MetaStatement,
  MetaStatements,
  Witness,
  Witnesses,
  CompositeProof,
  SaverDecryptor,
  SaverEncryptionGens,
  SaverChunkedCommitmentKey,
  QuasiProofSpec,
  BoundCheckSnarkSetup,
  initializeWasm,
} from '@docknetwork/crypto-wasm-ts';

import { DockAPI } from '../../../src';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from '../../test-constants';
import { DockDid, DidKeypair } from '../../../src/utils/did';
import { getRevealedUnrevealed } from './utils';
import { registerNewDIDUsingPair } from '../helpers';

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
  const isKvac = Name === 'BDDT16';
  const skipIfKvac = isKvac ? describe.skip : describe;
  skipIfKvac(
    `${Name} Complete demo of verifiable encryption using SAVER and bound check using LegoGroth16`,
    () => {
      const dock = new DockAPI();
      let account;
      let issuerDid;
      let issuerKeypair;
      let issuerSchemeKeypair;

      const chunkBitSize = 16;
      let decryptorDid;
      let decryptorKeypair;
      let encryptionGens;
      let snarkPk;
      let encryptionKey;

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
            encoded.push(Signature.reversibleEncodeStringForSigning(attrs[i]));
          } else if (i === boundedAttrIdx) {
            encoded.push(Signature.encodePositiveNumberForSigning(attrs[i]));
          } else {
            encoded.push(Signature.encodeMessageForSigning(attrs[i]));
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

        issuerKeypair = new DidKeypair(
          dock.keyring.addFromUri(randomAsHex(32)),
          1,
        );
        issuerDid = DockDid.random();
        await registerNewDIDUsingPair(dock, issuerDid, issuerKeypair);

        decryptorKeypair = new DidKeypair(
          dock.keyring.addFromUri(randomAsHex(32)),
          1,
        );
        decryptorDid = DockDid.random();
        await registerNewDIDUsingPair(dock, decryptorDid, decryptorKeypair);

        await initializeWasm();
      }, 20000);

      test('Create params and keys', async () => {
        const label = stringToHex('My params');
        const sigParams = SignatureParams.generate(
          attributeCount,
          hexToU8a(label),
        );
        const bytes = u8aToHex(sigParams.toBytes());
        const params = Module.prepareAddParameters(bytes, undefined, label);
        await getModule(dock).addParams(
          params,
          issuerDid,
          issuerKeypair,
          { didModule: dock.didModule },
          false,
        );
        const paramsWritten = await getModule(dock).getLastParamsWritten(issuerDid);
        expect(paramsWritten.bytes).toEqual(params.bytes);
        expect(paramsWritten.label).toEqual(params.label);

        issuerSchemeKeypair = KeyPair.generate(sigParams);
        const pk = Module.prepareAddPublicKey(
          u8aToHex(issuerSchemeKeypair.publicKey.bytes),
          undefined,
          [issuerDid, 1],
        );
        await getModule(dock).addPublicKey(
          pk,
          issuerDid,
          issuerDid,
          issuerKeypair,
          { didModule: dock.didModule },
          false,
        );
      }, 10000);

      test('Sign attributes, i.e. issue credential', async () => {
        const encodedAttrs = encodedAttributes(attributes);
        const queriedPk = await getModule(dock).getPublicKey(
          issuerDid,
          2,
          true,
        );
        const paramsVal = SignatureParams.valueFromBytes(
          hexToU8a(queriedPk.params.bytes),
        );
        const params = new SignatureParams(
          paramsVal,
          hexToU8a(queriedPk.params.label),
        );
        signature = Signature.generate(
          encodedAttrs,
          issuerSchemeKeypair.secretKey,
          params,
          false,
        );

        // User verifies the credential (signature)
        const result = signature.verify(
          encodedAttrs,
          new PublicKey(hexToU8a(queriedPk.bytes)),
          params,
          false,
        );
        expect(result.verified).toEqual(true);
      });

      test('Setup for decryptor', async () => {
        encryptionGens = SaverEncryptionGens.generate();
        [snarkPk, , encryptionKey] = SaverDecryptor.setup(
          encryptionGens,
          chunkBitSize,
        );
      }, 20000);

      test('Encrypt attribute and prove verifiably encrypted', async () => {
        // Verifier creates and shares with the prover
        const gens = SaverChunkedCommitmentKey.generate(
          hexToU8a(stringToHex('some label')),
        );
        const commGens = gens.decompress();

        // Regarding publishing the decryptor parameters, there are several options like storing each parameter as a blob on the
        // chain or these could all be stored as one byteraary/blob by specifying the byte size of each parameter to later use for
        // offset in the bytearray. But a much better solution would be to store these on IPFS and store only the hash on chain.

        // Holder decompresses parameters
        const encGens = encryptionGens.decompress();
        const ek = encryptionKey.decompress();
        const pk = snarkPk.decompress();

        const queriedPk = await getModule(dock).getPublicKey(
          issuerDid,
          2,
          true,
        );
        const sigParams = new SignatureParams(
          SignatureParams.valueFromBytes(hexToU8a(queriedPk.params.bytes)),
        );
        const sigPk = new PublicKey(hexToU8a(queriedPk.bytes));

        const encodedAttrs = encodedAttributes(attributes);

        const revealedAttrIndices = new Set();
        const [revealedAttrs, unrevealedAttrs] = getRevealedUnrevealed(
          encodedAttrs,
          revealedAttrIndices,
        );

        const statement1 = 'adaptForLess' in sigPk
          ? buildProverStatement(
            sigParams,
            sigPk.adaptForLess(sigParams.supportedMessageCount()),
            revealedAttrs,
            false,
          )
          : buildProverStatement(sigParams, revealedAttrs, false);
        const statement2 = Statement.saverProver(
          encGens,
          commGens,
          ek,
          pk,
          chunkBitSize,
        );

        const proverStatements = new Statements();
        proverStatements.add(statement1);
        proverStatements.add(statement2);

        const witnessEq = new WitnessEqualityMetaStatement();
        witnessEq.addWitnessRef(0, encAttrIdx);
        witnessEq.addWitnessRef(1, 0);
        const metaStatements = new MetaStatements();
        metaStatements.add(MetaStatement.witnessEquality(witnessEq));

        const witness1 = buildWitness(signature, unrevealedAttrs, false);
        const witness2 = Witness.saver(encodedAttrs[encAttrIdx]);
        const witnesses = new Witnesses();
        witnesses.add(witness1);
        witnesses.add(witness2);

        const proverProofSpec = new QuasiProofSpec(
          proverStatements,
          metaStatements,
        );
        const proof = CompositeProof.generateUsingQuasiProofSpec(
          proverProofSpec,
          witnesses,
        );

        // Verifier only needs the verification key
        const vk = snarkPk.getVerifyingKeyUncompressed();
        const statement3 = Statement.saverVerifier(
          encGens,
          commGens,
          ek,
          vk,
          chunkBitSize,
        );
        const statement4 = !isKvac
          ? buildVerifierStatement(
            sigParams,
            'adaptForLess' in sigPk
              ? sigPk.adaptForLess(sigParams.supportedMessageCount())
              : sigPk,
            revealedAttrs,
            false,
          )
          : buildVerifierStatement(sigParams, revealedAttrs, false);
        const verifierStatements = new Statements();
        verifierStatements.add(statement4);
        verifierStatements.add(statement3);

        const verifierProofSpec = new QuasiProofSpec(
          verifierStatements,
          metaStatements,
        );
        expect(
          proof.verifyUsingQuasiProofSpec(verifierProofSpec).verified,
        ).toEqual(true);
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

        const queriedPk = await getModule(dock).getPublicKey(
          issuerDid,
          2,
          true,
        );
        const sigParams = new SignatureParams(
          SignatureParams.valueFromBytes(hexToU8a(queriedPk.params.bytes)),
        );
        const sigPk = new PublicKey(hexToU8a(queriedPk.bytes));

        const encodedAttrs = encodedAttributes(attributes);

        const revealedAttrIndices = new Set();
        revealedAttrIndices.add(0);
        const [revealedAttrs, unrevealedAttrs] = getRevealedUnrevealed(
          encodedAttrs,
          revealedAttrIndices,
        );

        const statement1 = 'adaptForLess' in sigPk
          ? buildProverStatement(
            sigParams,
            sigPk.adaptForLess(sigParams.supportedMessageCount()),
            revealedAttrs,
            false,
          )
          : buildProverStatement(sigParams, revealedAttrs, false);
        const statement2 = Statement.boundCheckLegoProver(
          min,
          max,
          snarkProvingKey,
        );
        const proverStatements = new Statements();
        proverStatements.add(statement1);
        proverStatements.add(statement2);

        const witnessEq = new WitnessEqualityMetaStatement();
        witnessEq.addWitnessRef(0, boundedAttrIdx);
        witnessEq.addWitnessRef(1, 0);
        const metaStatements = new MetaStatements();
        metaStatements.add(MetaStatement.witnessEquality(witnessEq));

        const witness1 = buildWitness(signature, unrevealedAttrs, false);
        const witness2 = Witness.boundCheckLegoGroth16(
          encodedAttrs[boundedAttrIdx],
        );
        const witnesses = new Witnesses();
        witnesses.add(witness1);
        witnesses.add(witness2);

        const proverProofSpec = new QuasiProofSpec(
          proverStatements,
          metaStatements,
        );
        const proof = CompositeProof.generateUsingQuasiProofSpec(
          proverProofSpec,
          witnesses,
        );

        const snarkVerifyingKey = pk.getVerifyingKeyUncompressed();
        const statement3 = Statement.boundCheckLegoVerifier(
          min,
          max,
          snarkVerifyingKey,
        );
        const statement4 = !isKvac
          ? buildVerifierStatement(
            sigParams,
            'adaptForLess' in sigPk
              ? sigPk.adaptForLess(sigParams.supportedMessageCount())
              : sigPk,
            revealedAttrs,
            false,
          )
          : buildVerifierStatement(sigParams, revealedAttrs, false);
        const verifierStatements = new Statements();
        verifierStatements.add(statement4);
        verifierStatements.add(statement3);

        const verifierProofSpec = new QuasiProofSpec(
          verifierStatements,
          metaStatements,
        );
        expect(
          proof.verifyUsingQuasiProofSpec(verifierProofSpec).verified,
        ).toEqual(true);
      }, 45000);

      afterAll(async () => {
        await dock.disconnect();
      }, 10000);
    },
  );
}
