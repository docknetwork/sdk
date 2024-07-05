import { randomAsHex } from '@polkadot/util-crypto';
import { u8aToHex, stringToU8a } from '@polkadot/util';
import b58 from 'bs58';
import {
  BBDT16MacSecretKey,
  BoundCheckSnarkSetup,
  CredentialBuilder,
  initializeWasm,
  PresentationBuilder,
} from '@docknetwork/crypto-wasm-ts';
import { DockAPI } from '../../../src';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from '../../test-constants';
import { DockDid, DidKeypair } from '../../../src/did';
import { registerNewDIDUsingPair } from '../helpers';
import { getKeyDoc } from '../../../src/utils/vc/helpers';
import { issueCredential, verifyPresentation } from '../../../src/utils/vc';
import { DockResolver } from '../../../src/resolver';
import {
  getResidentCardCredentialAndSchema,
  setupExternalSchema,
} from './utils';
import {
  getKeyedProofsFromVerifiedPresentation,
  getJsonSchemasFromPresentation,
} from '../../../src/utils/vc/presentations';
import defaultDocumentLoader from '../../../src/utils/vc/document-loader';

describe.each(Schemes)(
  'Presentation',
  ({
    Name,
    Module,
    Presentation,
    Context,
    VerKey,
    CryptoKeyPair,
    getModule,
  }) => {
    const dock = new DockAPI();
    const resolver = new DockResolver(dock);
    let account;
    let did1;
    let pair1;
    let keypair;
    let didDocument;
    let chainModule;

    const [credentialJSON, residentCardSchema] = getResidentCardCredentialAndSchema(Context);

    beforeAll(async () => {
      await initializeWasm();
      await dock.init({
        keyring: TestKeyringOpts,
        address: FullNodeEndpoint,
      });
      account = dock.keyring.addFromUri(TestAccountURI);

      dock.setAccount(account);
      pair1 = new DidKeypair(dock.keyring.addFromUri(randomAsHex(32)), 1);
      did1 = DockDid.random();
      await registerNewDIDUsingPair(dock, did1, pair1);

      keypair = CryptoKeyPair.generate({
        controller: did1,
        msgCount: 100,
      });

      if (Name !== 'BBDT16') {
        chainModule = getModule(dock);

        const pk1 = Module.prepareAddPublicKey(
          u8aToHex(keypair.publicKeyBuffer),
        );
        await chainModule.addPublicKey(
          pk1,
          did1,
          did1,
          pair1,
          { didModule: dock.did },
          false,
        );

        didDocument = await dock.did.getDocument(did1);
        const { publicKey } = didDocument;
        expect(publicKey.length).toEqual(2);
        expect(publicKey[1].type).toEqual(VerKey);
        keypair.id = publicKey[1].id;
      } else {
        // For KVAC, the public doesn't need to published as its not used in credential or presentation verification (except issuers).
        // But the signer still adds a key identifier in the credential to determine which key will be used for verification
        keypair.id = 'my-key-id';
      }
    }, 30000);

    function checkCommonRevealedFields(presentation, credentials) {
      expect(presentation.version).toEqual(PresentationBuilder.VERSION);

      for (let i = 0; i < presentation.spec.credentials.length; i++) {
        // Ensure verificationMethod & type is revealed always
        expect(
          presentation.spec.credentials[i].revealedAttributes.proof,
        ).toBeDefined();
        expect(
          presentation.spec.credentials[i].revealedAttributes.proof,
        ).toHaveProperty(
          'verificationMethod',
          credentials[i].proof.verificationMethod,
        );
        expect(
          presentation.spec.credentials[0].revealedAttributes.proof,
        ).toHaveProperty('type', credentials[i].proof.type);

        expect(presentation.spec.credentials[i].schema).toBeDefined();
        expect(presentation.spec.credentials[i].sigType).toBeDefined();
        expect(presentation.spec.credentials[i].version).toEqual(
          CredentialBuilder.VERSION,
        );
      }
    }

    test(`from ${Name} credentials with external schema reference and embedded schema`, async () => {
      const [externalSchemaEncoded, schemaId] = await setupExternalSchema(
        residentCardSchema,
        'Resident Card Example',
        did1,
        pair1,
        dock,
      );
      const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);

      // This credential has external schema
      const unsignedCred = {
        ...credentialJSON,
        issuer: String(did1),
      };
      unsignedCred.credentialSchema = externalSchemaEncoded;
      const credential = await issueCredential(
        issuerKey,
        unsignedCred,
        true,
        defaultDocumentLoader(resolver),
      );

      // This credential has embedded schema
      const unsignedCred2 = {
        ...credentialJSON,
        issuer: String(did1),
      };
      const credential2 = await issueCredential(issuerKey, unsignedCred2);

      const presentationInstance = new Presentation();
      const idx = await presentationInstance.addCredentialToPresent(
        credential,
        { resolver },
      );

      const idx2 = await presentationInstance.addCredentialToPresent(
        credential2,
        { resolver },
      );

      await presentationInstance.addAttributeToReveal(idx, [
        'credentialSubject.lprNumber',
      ]);

      await presentationInstance.addAttributeToReveal(idx2, [
        'credentialSubject.lprNumber',
      ]);

      const presentation = await presentationInstance.createPresentation();

      expect(
        presentation.spec.credentials[0].revealedAttributes,
      ).toHaveProperty('credentialSubject');
      expect(
        presentation.spec.credentials[0].revealedAttributes.credentialSubject,
      ).toHaveProperty('lprNumber', 1234);
      expect(
        presentation.spec.credentials[1].revealedAttributes,
      ).toHaveProperty('credentialSubject');
      expect(
        presentation.spec.credentials[1].revealedAttributes.credentialSubject,
      ).toHaveProperty('lprNumber', 1234);

      const schemas = getJsonSchemasFromPresentation(presentation, false);
      // For schema with external reference, it should be equal to the reference id (on-chain id here)
      expect(schemas[0].$id).toEqual(schemaId);
      // For schema with properties, it should be same as the id of the document
      expect(schemas[1].$id).toEqual(residentCardSchema.$id);

      checkCommonRevealedFields(presentation, [credential, credential2]);

      const { verified } = await verifyPresentation(presentation, { resolver });
      expect(verified).toEqual(true);

      const keyedProofs = getKeyedProofsFromVerifiedPresentation(presentation);
      const isKvac = Name === 'BBDT16';
      // Keyed proofs only exist for KVAC
      expect(keyedProofs.size).toEqual(isKvac ? 2 : 0);
      if (isKvac) {
        const sk = new BBDT16MacSecretKey(keypair.privateKeyBuffer);
        // eslint-disable-next-line jest/no-conditional-expect
        expect(
          keyedProofs.get(0)?.credential?.proof.verify(sk).verified,
        ).toEqual(true);
        // eslint-disable-next-line jest/no-conditional-expect
        expect(
          keyedProofs.get(1)?.credential?.proof.verify(sk).verified,
        ).toEqual(true);
      }
    }, 40000);

    test('expect to reveal specified attributes', async () => {
      const presentationInstance = new Presentation();
      const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
      const unsignedCred = {
        ...credentialJSON,
        issuer: String(did1),
      };

      const credential = await issueCredential(issuerKey, unsignedCred);

      const idx = await presentationInstance.addCredentialToPresent(
        credential,
        { resolver },
      );

      await presentationInstance.addAttributeToReveal(idx, [
        'credentialSubject.lprNumber',
      ]);

      const presentation = await presentationInstance.createPresentation();

      expect(
        presentation.spec.credentials[0].revealedAttributes,
      ).toHaveProperty('credentialSubject');
      expect(
        presentation.spec.credentials[0].revealedAttributes.credentialSubject,
      ).toHaveProperty('lprNumber', 1234);

      checkCommonRevealedFields(presentation, [credential]);

      const { verified } = await verifyPresentation(presentation, { resolver });
      expect(verified).toEqual(true);

      const keyedProofs = getKeyedProofsFromVerifiedPresentation(presentation);
      const isKvac = Name === 'BBDT16';
      // Keyed proofs only exist for KVAC
      expect(keyedProofs.size).toEqual(isKvac ? 1 : 0);
      if (isKvac) {
        const sk = new BBDT16MacSecretKey(keypair.privateKeyBuffer);
        // eslint-disable-next-line jest/no-conditional-expect
        expect(
          keyedProofs.get(0)?.credential?.proof.verify(sk).verified,
        ).toEqual(true);
      }
    }, 30000);

    test('expect to create presentation from multiple credentials', async () => {
      const presentationInstance = new Presentation();

      const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
      const unsignedCred = {
        ...credentialJSON,
        issuer: String(did1),
      };

      const credential = await issueCredential(issuerKey, unsignedCred);
      const credential2 = await issueCredential(issuerKey, unsignedCred);

      const idx = await presentationInstance.addCredentialToPresent(
        credential,
        { resolver },
      );
      const idx2 = await presentationInstance.addCredentialToPresent(
        credential2,
        { resolver },
      );
      await presentationInstance.addAttributeToReveal(idx, [
        'credentialSubject.lprNumber',
      ]);
      await presentationInstance.addAttributeToReveal(idx2, [
        'credentialSubject.familyName',
      ]);

      const presentation = await presentationInstance.createPresentation();

      expect(
        presentation.spec.credentials[0].revealedAttributes,
      ).toHaveProperty('credentialSubject');
      expect(
        presentation.spec.credentials[0].revealedAttributes.credentialSubject,
      ).toHaveProperty('lprNumber', 1234);

      expect(
        presentation.spec.credentials[1].revealedAttributes,
      ).toHaveProperty('credentialSubject');
      expect(
        presentation.spec.credentials[1].revealedAttributes.credentialSubject,
      ).toHaveProperty('familyName', 'SMITH');

      checkCommonRevealedFields(presentation, [credential, credential2]);

      const { verified } = await verifyPresentation(presentation, { resolver });
      expect(verified).toEqual(true);
    }, 30000);

    test('expect to range proofs', async () => {
      const provingKeyId = 'provingKeyId';
      const pk = BoundCheckSnarkSetup();
      const provingKey = pk.decompress();
      const presentationInstance = new Presentation();
      const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
      const unsignedCred = {
        ...credentialJSON,
        issuer: String(did1),
      };

      const credential = await issueCredential(issuerKey, unsignedCred);

      const idx = await presentationInstance.addCredentialToPresent(
        credential,
        { resolver },
      );

      await presentationInstance.addAttributeToReveal(idx, [
        'credentialSubject.lprNumber',
      ]);

      // Enforce issuance date to be between values
      presentationInstance.presBuilder.enforceBounds(
        idx,
        'issuanceDate',
        new Date('2019-10-01'),
        new Date('2020-01-01'),
        provingKeyId,
        provingKey,
      );

      const presentation = await presentationInstance.createPresentation();

      expect(presentation.spec.credentials[0].bounds).toBeDefined();
      expect(presentation.spec.credentials[0].bounds).toEqual({
        issuanceDate: [
          {
            min: 1569888000000,
            max: 1577836800000,
            paramId: 'provingKeyId',
            protocol: 'LegoGroth16',
          },
        ],
      });

      expect(
        presentation.spec.credentials[0].revealedAttributes,
      ).toHaveProperty('credentialSubject');
      expect(
        presentation.spec.credentials[0].revealedAttributes.credentialSubject,
      ).toHaveProperty('lprNumber', 1234);

      checkCommonRevealedFields(presentation, [credential]);

      // Setup predicate params with the verifying key for range proofs
      const predicateParams = new Map();
      predicateParams.set(provingKeyId, pk.getVerifyingKey());

      // Verify the presentation, note that we must pass predicateParams with the verification key
      const { verified } = await verifyPresentation(presentation, {
        resolver,
        predicateParams,
      });
      expect(verified).toEqual(true);
    }, 60000);

    test('expect to throw exception when attributes provided is not an array', async () => {
      const presentationInstance = new Presentation();
      const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
      const unsignedCred = {
        ...credentialJSON,
        issuer: String(did1),
      };
      const credential = await issueCredential(issuerKey, unsignedCred);

      const idx = await presentationInstance.addCredentialToPresent(
        credential,
        { resolver },
      );

      expect(() => {
        presentationInstance.addAttributeToReveal(idx, {});
      }).toThrow();
    }, 30000);

    test('expect to create presentation with nonce', async () => {
      const presentationInstance = new Presentation();

      const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
      const unsignedCred = {
        ...credentialJSON,
        issuer: String(did1),
      };

      const credential = await issueCredential(issuerKey, unsignedCred);

      const idx = await presentationInstance.addCredentialToPresent(
        credential,
        { resolver },
      );
      await presentationInstance.addAttributeToReveal(idx, [
        'credentialSubject.lprNumber',
      ]);

      const presentation = await presentationInstance.createPresentation({
        nonce: '1234',
      });
      expect(presentation.nonce).toEqual(b58.encode(stringToU8a('1234')));
      expect(
        presentation.spec.credentials[0].revealedAttributes,
      ).toHaveProperty('credentialSubject');
      expect(
        presentation.spec.credentials[0].revealedAttributes.credentialSubject,
      ).toHaveProperty('lprNumber', 1234);

      const { verified } = await verifyPresentation(presentation, { resolver });
      expect(verified).toEqual(true);
    }, 30000);

    afterAll(async () => {
      await dock.disconnect();
    }, 10000);
  },
);
