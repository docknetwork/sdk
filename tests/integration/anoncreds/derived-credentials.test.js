import { randomAsHex } from '@polkadot/util-crypto';
import { stringToU8a, u8aToHex } from '@polkadot/util';
import { initializeWasm, BoundCheckSnarkSetup, MembershipWitness } from '@docknetwork/crypto-wasm-ts';
import { DockAPI } from '../../../src';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from '../../test-constants';
import { createNewDockDID, DidKeypair } from '../../../src/utils/did';
import { registerNewDIDUsingPair } from '../helpers';
import { getKeyDoc } from '../../../src/utils/vc/helpers';
import {
  issueCredential,
  signPresentation,
  verifyPresentation,
  verifyCredential,
} from '../../../src/utils/vc';
import { DockResolver } from '../../../src/resolver';
import { createPresentation } from '../../create-presentation';

// TODO: move to fixtures
const residentCardSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://ld.dock.io/examples/resident-card-schema.json',
  title: 'Resident Card Example',
  type: 'object',
  properties: {
    // TOOD: fix and restore below for future
    // // NOTE: schema here defines context/type to make sure
    // // that the string conversion works even with it defined in schema
    // '@context': {
    //   type: 'array',
    // },
    // type: {
    //   type: 'array',
    // },
    credentialSubject: {
      type: 'object',
      properties: {
        givenName: {
          title: 'Given Name',
          type: 'string',
        },
        familyName: {
          title: 'Family Name',
          type: 'string',
        },
        lprNumber: {
          title: 'LPR Number',
          type: 'integer',
          minimum: 0,
        },
      },
      required: [],
    },
  },
};

const embeddedSchema = {
  id: `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(residentCardSchema),
  )}`,
  type: 'JsonSchemaValidator2018',
};

describe.each(Schemes)('Derived Credentials', ({
  Name,
  Module,
  Presentation,
  CryptoKeyPair,
  VerKey,
  getModule,
  Context,
  convertToPresentation,
}) => {
  const dock = new DockAPI();
  const resolver = new DockResolver(dock);
  let account;
  let did1;
  let pair1;
  let chainModule;
  let keypair;
  let didDocument;

  const holder3DID = createNewDockDID();
  // seed used for 3rd holder keys
  const holder3KeySeed = randomAsHex(32);

  // TODO: move to fixtures
  const credentialJSON = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/citizenship/v1',
      Context,
    ],
    id: 'https://issuer.oidp.uscis.gov/credentials/83627465',
    type: ['VerifiableCredential', 'PermanentResidentCard'],
    credentialSchema: embeddedSchema,
    identifier: '83627465',
    name: 'Permanent Resident Card',
    description: 'Government of Example Permanent Resident Card.',
    issuanceDate: '2019-12-03T12:19:52Z',
    expirationDate: '2029-12-03T12:19:52Z',
    credentialSubject: {
      id: 'did:example:b34ca6cd37bbf23',
      type: ['PermanentResident', 'Person'],
      givenName: 'JOHN',
      familyName: 'SMITH',
      lprNumber: 1234,
    },
  };

  beforeAll(async () => {
    await initializeWasm();
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    chainModule = getModule(dock);
    account = dock.keyring.addFromUri(TestAccountURI);

    dock.setAccount(account);
    pair1 = new DidKeypair(dock.keyring.addFromUri(randomAsHex(32)), 1);
    did1 = createNewDockDID();
    await registerNewDIDUsingPair(dock, did1, pair1);

    keypair = CryptoKeyPair.generate({
      controller: did1, msgCount: 100,
    });

    const pk1 = Module.prepareAddPublicKey(dock.api, u8aToHex(keypair.publicKeyBuffer));
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

    // Register holder DID with sr25519 key
    await registerNewDIDUsingPair(
      dock,
      holder3DID,
      new DidKeypair(dock.keyring.addFromUri(holder3KeySeed, null, 'sr25519'), 1),
    );
  }, 30000);

  async function createAndVerifyPresentation(credentials, verifyOptions = {}) {
    const holderKey = getKeyDoc(
      holder3DID,
      new DidKeypair(dock.keyring.addFromUri(holder3KeySeed, null, 'sr25519'), 1),
      'Sr25519VerificationKey2020',
    );

    const presId = randomAsHex(32);
    const chal = randomAsHex(32);
    const domain = 'test domain';
    const presentation = createPresentation(credentials, presId);

    expect(presentation).toMatchObject(
      expect.objectContaining({
        type: ['VerifiablePresentation'],
        verifiableCredential: credentials,
        id: presId,
      }),
    );

    // Question: What is the point of this? Verifying this would require knowing the holder's public key which makes
    // the holder linkable and defeats the purpose of BBS+
    const signedPres = await signPresentation(
      presentation,
      holderKey,
      chal,
      domain,
      resolver,
    );

    expect(signedPres).toMatchObject(
      expect.objectContaining({
        type: ['VerifiablePresentation'],
        verifiableCredential: credentials,
        id: presId,
        proof: expect.objectContaining({
          type: 'Sr25519Signature2020',
          challenge: chal,
          domain,
          proofPurpose: 'authentication',
        }),
      }),
    );

    const result = await verifyPresentation(signedPres, {
      challenge: chal,
      domain,
      resolver,
      ...verifyOptions,
    });

    expect(result.verified).toBe(true);
    expect(result.presentationResult.verified).toBe(true);
    expect(result.credentialResults.length).toBe(1);
    expect(result.credentialResults[0].verified).toBe(true);
  }

  test(`For ${Name}, holder creates a derived verifiable credential from a credential with selective disclosure`, async () => {
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };

    const presentationOptions = {
      nonce: stringToU8a('noncetest'),
      context: 'my context',
    };

    // Create W3C credential
    const credential = await issueCredential(issuerKey, unsignedCred);

    // Begin to derive a credential from the above issued one
    const presentationInstance = new Presentation();
    const idx = await presentationInstance.addCredentialToPresent(
      credential,
      { resolver },
    );

    // Reveal subject attributes
    presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.lprNumber',
    ]);

    // NOTE: revealing subject type because of JSON-LD processing for this certain credential
    // you may not always need to do this depending on your JSON-LD contexts
    presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.0',
    ]);
    presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.1',
    ]);

    // Begin to derive a credential from the above issued one
    const presentationInstance2 = new Presentation();
    const idx2 = await presentationInstance2.addCredentialToPresent(
      credential,
      { resolver },
    );

    // Reveal subject attributes
    presentationInstance2.addAttributeToReveal(idx2, [
      'credentialSubject.lprNumber',
    ]);

    // NOTE: revealing subject type because of JSON-LD processing for this certain credential
    // you may not always need to do this depending on your JSON-LD contexts
    presentationInstance2.addAttributeToReveal(idx2, [
      'credentialSubject.type.0',
    ]);
    presentationInstance2.addAttributeToReveal(idx2, [
      'credentialSubject.type.1',
    ]);

    // Derive a W3C Verifiable Credential JSON from the above presentation
    const credentials = await presentationInstance.deriveCredentials(
      presentationOptions,
    );
    expect(credentials.length).toEqual(1);
    expect(credentials[0].proof).toBeDefined();
    expect(credentials[0]).toHaveProperty('credentialSubject');
    expect(credentials[0].credentialSubject).toMatchObject(
      expect.objectContaining({
        type: unsignedCred.credentialSubject.type,
        lprNumber: 1234,
      }),
    );

    // Ensure reconstructing presentation from credential matches
    // NOTE: ignoring proof here as itll differ when signed twice as above
    const presentation = await presentationInstance2.createPresentation(
      presentationOptions,
    );

    // Question: What is the point of this? A single credential cant be converted to a presentation and a presentation
    // has other data that credential won't have
    const reconstructedPres = convertToPresentation(credentials[0]);
    expect(reconstructedPres.proof).toBeDefined();
    expect({
      ...reconstructedPres,
      proof: '',
    }).toMatchObject({ ...presentation, proof: '' });

    // Try to verify the derived credential alone
    const credentialResult = await verifyCredential(credentials[0], {
      resolver,
    });
    expect(credentialResult.verified).toBe(true);
    expect(credentialResult.error).toBe(undefined);

    // Create a VP and verify it from this credential
    await createAndVerifyPresentation(credentials);
  }, 30000);

  test(`For ${Name}, persist credential status when deriving`, async () => {
    const provingKeyId = 'provingKeyId';
    const pk = BoundCheckSnarkSetup();
    const provingKey = pk.decompress();
    const credentialStatus = { // Mock data
      "id": "dock:accumulator:0xa632a41f2fbdb681c14b33daae4fcc46af41661b90b35c4ac1545c9bebf0d7cc",
      "type": "DockVBAccumulator2022",
      "revocationCheck": "membership",
      "revocationId": "10"
    };

    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      credentialStatus,
      issuer: did1,
    };

    const presentationOptions = {
      nonce: stringToU8a('noncetest'),
      context: 'my context',
    };

    // Create W3C credential
    const credential = await issueCredential(issuerKey, unsignedCred);

    // Begin to derive a credential from the above issued one
    const presentationInstance = new Presentation();
    const idx = await presentationInstance.addCredentialToPresent(
      credential,
      { resolver },
    );
    
    // Mock data
    presentationInstance.presBuilder.credStatuses.set(0, [
      new MembershipWitness(new Uint8Array([128, 181, 205, 177, 121, 245, 130, 199, 51, 197, 203, 218, 159, 242, 230, 129, 133, 124, 147, 19, 102, 32, 112, 206, 154, 23, 252, 109, 183, 202, 224, 157, 62, 109, 236, 142, 240, 65, 45, 114, 61, 192, 145, 53, 77, 20, 251, 97])),
      new Uint8Array([134, 94, 152, 141, 109, 226, 220, 161, 148, 169, 112, 11, 254, 108, 78, 101, 165, 79, 12, 41, 6, 173, 60, 69, 107, 106, 216, 13, 122, 210, 137, 152, 201, 27, 236, 37, 208, 32, 223, 114, 88, 142, 55, 204, 36, 13, 147, 235]),
      {
        value: new Uint8Array([144, 222, 74, 116, 11, 85, 191, 161, 154, 160, 165, 58, 28, 247, 188, 193, 151, 115, 185, 194, 145, 137, 220, 171, 101, 205, 91, 72, 133, 234, 215, 244, 184, 128, 176, 115, 142, 63, 222, 45, 128, 75, 229, 32, 214, 57, 129, 93, 11, 22, 152, 101, 220, 48, 128, 52, 9, 130, 75, 194, 131, 36, 80, 117, 100, 118, 83, 139, 233, 181, 112, 243, 19, 80, 75, 183, 60, 223, 18, 43, 58, 114, 158, 229, 88, 103, 40, 195, 140, 114, 185, 179, 219, 240, 58, 244]),
      },
      {
      },
    ]);

    // NOTE: revealing subject type because of JSON-LD processing for this certain credential
    // you may not always need to do this depending on your JSON-LD contexts
    await presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.0',
    ]);
    await presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.1',
    ]);

    // Enforce LPR number to be between values aswell as revealed
    // NOTE: unlike other tests, we cannot "reveal" this value and enforce bounds at the same time!
    presentationInstance.presBuilder.enforceBounds(
      idx,
      'credentialSubject.lprNumber',
      1233,
      1235,
      provingKeyId,
      provingKey,
    );

    // Derive a W3C Verifiable Credential JSON from the above presentation
    const credentials = await presentationInstance.deriveCredentials(
      presentationOptions,
    );

    expect(credentials.length).toEqual(1);
    expect(credentials[0].credentialStatus).toBeDefined();
    expect(credentials[0].credentialStatus).toEqual({
      ...credentialStatus,
      revocationId: undefined,
      accumulated: '5vtBeJk2aRi6J2KaVhg7hiVbcDoBWmnhRrWZ4ohnR37FsaFq1XquTBeneqMATg3HQv',
      extra: {},
    });
  });

  test('Holder creates a derived verifiable credential from a credential with range proofs', async () => {
    const provingKeyId = 'provingKeyId';
    const pk = BoundCheckSnarkSetup();
    const provingKey = pk.decompress();

    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };

    const presentationOptions = {
      nonce: stringToU8a('noncetest'),
      context: 'my context',
    };

    // Create W3C credential
    const credential = await issueCredential(issuerKey, unsignedCred);

    // Begin to derive a credential from the above issued one
    const presentationInstance = new Presentation();
    const idx = await presentationInstance.addCredentialToPresent(
      credential,
      { resolver },
    );

    // NOTE: revealing subject type because of JSON-LD processing for this certain credential
    // you may not always need to do this depending on your JSON-LD contexts
    await presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.0',
    ]);
    await presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.1',
    ]);

    // Enforce LPR number to be between values aswell as revealed
    // NOTE: unlike other tests, we cannot "reveal" this value and enforce bounds at the same time!
    presentationInstance.presBuilder.enforceBounds(
      idx,
      'credentialSubject.lprNumber',
      1233,
      1235,
      provingKeyId,
      provingKey,
    );

    // Enforce issuance date to be between values
    // NOTE: we dont need to set proving key value here (must still set ID though!) as its done above, should pass undefined
    presentationInstance.presBuilder.enforceBounds(
      idx,
      'issuanceDate',
      new Date('2019-10-01'),
      new Date('2020-01-01'),
      provingKeyId,
      undefined,
    );

    // Derive a W3C Verifiable Credential JSON from the above presentation
    const credentials = await presentationInstance.deriveCredentials(
      presentationOptions,
    );
    expect(credentials.length).toEqual(1);
    expect(credentials[0].proof).toBeDefined();
    expect(credentials[0].proof.bounds).toBeDefined();
    expect(credentials[0].proof.bounds).toEqual({
      issuanceDate: {
        min: 1569888000000,
        max: 1577836800000,
        paramId: 'provingKeyId',
        protocol: 'LegoGroth16',
      },
      credentialSubject: {
        lprNumber: {
          min: 1233,
          max: 1235,
          paramId: 'provingKeyId',
          protocol: 'LegoGroth16',
        },
      },
    });
    expect(credentials[0]).toHaveProperty('credentialSubject');
    expect(credentials[0].credentialSubject).toMatchObject(
      expect.objectContaining({
        type: unsignedCred.credentialSubject.type,
      }),
    );

    const reconstructedPres = convertToPresentation(credentials[0]);
    expect(reconstructedPres.proof).toBeDefined();
    expect(reconstructedPres.spec.credentials[0].bounds).toEqual(credentials[0].proof.bounds);

    // Setup predicate params with the verifying key for range proofs
    const predicateParams = new Map();
    predicateParams.set(provingKeyId, pk.getVerifyingKey());

    // Try to verify the derived credential alone
    const credentialResult = await verifyCredential(credentials[0], {
      resolver,
      predicateParams,
    });
    if (credentialResult.error) {
      console.log('credentialResult.error', JSON.stringify(credentialResult.error, null, 2));
    }
    expect(credentialResult.error).toBe(undefined);
    expect(credentialResult.verified).toBe(true);

    // Create a VP and verify it from this credential
    await createAndVerifyPresentation(credentials, { predicateParams });
  }, 60000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
